package vn.edu.uth.smartward.triage;

import io.minio.GetObjectArgs;
import io.minio.GetObjectResponse;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.security.OfficerAuthService.OfficerPrincipal;
import vn.edu.uth.smartward.triage.dto.IssueClusterDto;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class IncidentPhotoAndClusterPrivacyTest {

    private MinioClient minioClient;
    private IncidentPhotoService photoService;
    private Map<String, byte[]> fakeMinioStore;

    @BeforeEach
    void setUp() throws Exception {
        minioClient = mock(MinioClient.class);
        fakeMinioStore = new ConcurrentHashMap<>();
        when(minioClient.bucketExists(any())).thenReturn(true);
        when(minioClient.putObject(any(PutObjectArgs.class))).thenAnswer(inv -> {
            PutObjectArgs args = inv.getArgument(0);
            byte[] bytes = args.stream().readAllBytes();
            fakeMinioStore.put(args.object(), bytes);
            return null;
        });
        when(minioClient.getObject(any(GetObjectArgs.class))).thenAnswer(inv -> {
            GetObjectArgs args = inv.getArgument(0);
            byte[] stored = fakeMinioStore.get(args.object());
            if (stored == null) throw new RuntimeException("NoSuchKey");
            return new GetObjectResponse(null, "smartward-vault", null, args.object(), new ByteArrayInputStream(stored));
        });
        photoService = new IncidentPhotoService(minioClient);
    }

    @Test
    @DisplayName("1. V16 Migration adds JSONB photo_keys column idempotently")
    void testV16MigrationSql() throws Exception {
        Path v16 = Path.of("src/main/resources/db/migration/V16__add_civic_report_photo_keys.sql");
        assertTrue(Files.exists(v16));
        String sql = Files.readString(v16);
        assertTrue(sql.contains("ADD COLUMN IF NOT EXISTS photo_keys JSONB NOT NULL DEFAULT '[]'::jsonb"));
    }

    @Test
    @DisplayName("2. Upload JPEG strips EXIF marker, stores under incident-photos/<wardCode>/, rejects fake 415 & >5MB 413")
    void testUploadPhoto_stripsExifAndEnforcesLimits() throws Exception {
        // Build real JPEG and inject a fake APP1 Exif GPS payload right after SOI (FF D8)
        BufferedImage img = new BufferedImage(32, 24, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "jpg", baos);
        byte[] cleanJpeg = baos.toByteArray();

        byte[] exifPayload = "Exif\0\0FAKE_GPS_10.386_105.435_IPHONE16".getBytes(StandardCharsets.US_ASCII);
        int segLen = exifPayload.length + 2;
        ByteArrayOutputStream withExif = new ByteArrayOutputStream();
        withExif.write(cleanJpeg, 0, 2); // FF D8
        withExif.write(0xFF);
        withExif.write(0xE1); // APP1 EXIF marker
        withExif.write((segLen >> 8) & 0xFF);
        withExif.write(segLen & 0xFF);
        withExif.write(exifPayload);
        withExif.write(cleanJpeg, 2, cleanJpeg.length - 2);

        MockMultipartFile file = new MockMultipartFile("file", "pothole.jpg", "image/jpeg", withExif.toByteArray());
        IncidentPhotoService.UploadedPhotoResult uploaded = photoService.uploadPhoto(file, "AG_P_LONGXUYEN");

        assertTrue(uploaded.exifStripped());
        assertTrue(uploaded.photoKey().startsWith("AG_P_LONGXUYEN__"));
        assertTrue(uploaded.photoKey().endsWith(".jpg"));
        assertEquals("image/jpeg", uploaded.contentType());

        String expectedObjectPath = "incident-photos/AG_P_LONGXUYEN/" + uploaded.photoKey();
        byte[] storedBytes = fakeMinioStore.get(expectedObjectPath);
        assertNotNull(storedBytes, "Photo must be stored under incident-photos/<wardCode>/ prefix");
        String asciiStored = new String(storedBytes, StandardCharsets.ISO_8859_1);
        assertFalse(asciiStored.contains("FAKE_GPS_10.386"), "EXIF GPS/device string MUST be stripped");

        // Fake file with .jpg extension but PDF magic bytes -> 415 UNSUPPORTED_MEDIA_TYPE
        MockMultipartFile fakeJpg = new MockMultipartFile("file", "fake.jpg", "image/jpeg", "%PDF-1.7 malicious".getBytes(StandardCharsets.UTF_8));
        BusinessException fakeEx = assertThrows(BusinessException.class, () -> photoService.uploadPhoto(fakeJpg, "AG_P_LONGXUYEN"));
        assertEquals(ErrorCode.UNSUPPORTED_MEDIA_TYPE, fakeEx.getErrorCode());

        // Oversized > 5MB -> 413 PAYLOAD_TOO_LARGE
        byte[] over5Mb = new byte[(int) IncidentPhotoService.MAX_PHOTO_BYTES + 16];
        over5Mb[0] = (byte) 0xFF; over5Mb[1] = (byte) 0xD8; over5Mb[2] = (byte) 0xFF;
        BusinessException largeEx = assertThrows(BusinessException.class, () -> photoService.uploadPhotoBytes(over5Mb, "AG_P_LONGXUYEN"));
        assertEquals(ErrorCode.PAYLOAD_TOO_LARGE, largeEx.getErrorCode());
    }

    @Test
    @DisplayName("3. SEC-09: Same-ward officer can view photo repeatedly; cross-ward officer & admin get 403")
    void testOfficerPhotoView_enforcesSec09AndAllowsMultipleViews() throws Exception {
        BufferedImage img = new BufferedImage(16, 16, BufferedImage.TYPE_INT_ARGB);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", baos);

        IncidentPhotoService.UploadedPhotoResult uploaded = photoService.uploadPhotoBytes(baos.toByteArray(), "AG_P_LONGXUYEN");

        long exp = Instant.now().getEpochSecond() + 3600;
        OfficerPrincipal sameWardOfficer = new OfficerPrincipal("CC-AG-8942", "Officer LX", "AG_P_LONGXUYEN", "OFFICER", "j1", exp);
        OfficerPrincipal otherWardOfficer = new OfficerPrincipal("CB-AG_DK_PHUQUOC", "Officer PQ", "AG_DK_PHUQUOC", "OFFICER", "j2", exp);
        OfficerPrincipal admin = new OfficerPrincipal("ADM-AG-0001", "Admin", "AG_PROVINCE", "ADMIN", "j3", exp);

        // Same-ward officer can open multiple times (not burn-after-reading like OTT Vault)
        IncidentPhotoService.OfficerPhotoResource view1 = photoService.loadPhotoForOfficer(uploaded.photoKey(), sameWardOfficer);
        IncidentPhotoService.OfficerPhotoResource view2 = photoService.loadPhotoForOfficer(uploaded.photoKey(), sameWardOfficer);
        assertEquals("image/png", view1.contentType());
        assertArrayEquals(view1.bytes(), view2.bytes());

        // Cross-ward officer blocked with 403 SEC-09
        BusinessException crossWardEx = assertThrows(BusinessException.class, () ->
                photoService.loadPhotoForOfficer(uploaded.photoKey(), otherWardOfficer));
        assertEquals(ErrorCode.FORBIDDEN, crossWardEx.getErrorCode());
        assertTrue(crossWardEx.getMessage().contains("SEC-09"));

        // Admin blocked with 403
        BusinessException adminEx = assertThrows(BusinessException.class, () ->
                photoService.loadPhotoForOfficer(uploaded.photoKey(), admin));
        assertEquals(ErrorCode.FORBIDDEN, adminEx.getErrorCode());
    }

    @Test
    @DisplayName("4. Officer cluster aggregates photoUrls & reports; sanitizeForPublic strips 100% of photos")
    void testClusterPhotoAggregationAndPublicSanitization() {
        IssueClusterRepository clusterRepo = mock(IssueClusterRepository.class);
        CivicReportRepository reportRepo = mock(CivicReportRepository.class);
        TwoStageTriageService triageService = new TwoStageTriageService(
                mock(SpatialIndexService.class), clusterRepo, reportRepo, mock(AiModelClient.class));

        String k1 = "AG_P_LONGXUYEN__20261125_11111111-1111-1111-1111-111111111111.jpg";
        String k2 = "AG_P_LONGXUYEN__20261125_22222222-2222-2222-2222-222222222222.png";
        CivicReport r1 = CivicReport.builder().reportCode("RPT_1").description("Ổ gà sâu 20cm").photoKeys(List.of(k1)).addressText("18 Trần Hưng Đạo").build();
        CivicReport r2 = CivicReport.builder().reportCode("RPT_2").description("Nước đọng lớn").photoKeys(List.of(k2)).addressText("20 Trần Hưng Đạo").build();
        IssueCluster cluster = IssueCluster.builder()
                .id(10L)
                .clusterCode("CLUST_20261125_ABCDE")
                .category("ROAD_DAMAGE")
                .wardCode("AG_P_LONGXUYEN")
                .title("Ổ gà sâu 20cm")
                .centerLatitude(new BigDecimal("10.3864123"))
                .centerLongitude(new BigDecimal("105.4352456"))
                .reportCount(2)
                .status("OPEN")
                .reports(List.of(r1, r2))
                .build();

        when(clusterRepo.findByStatus("OPEN")).thenReturn(List.of(cluster));

        // Officer gets full photoUrls & sub-reports
        List<IssueClusterDto> officerList = triageService.getOfficerClusters("OPEN", null, "AG_P_LONGXUYEN");
        assertEquals(1, officerList.size());
        IssueClusterDto officerDto = officerList.get(0);
        assertEquals(2, officerDto.getPhotoCount());
        assertEquals(List.of(
                "/api/v1/issues/officer/photos/" + k1,
                "/api/v1/issues/officer/photos/" + k2
        ), officerDto.getPhotoUrls());
        assertEquals(2, officerDto.getReports().size());

        // Public API strictly strips photoUrls, photoCount=0, reports=null
        IssueClusterDto publicDto = TwoStageTriageService.sanitizeForPublic(officerDto);
        assertNull(publicDto.getPhotoUrls());
        assertEquals(0, publicDto.getPhotoCount());
        assertNull(publicDto.getReports());
        assertNull(publicDto.getAddressText());
    }
}
