package vn.edu.uth.smartward.vault;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

class ImageWatermarkServiceTest {

    private ImageWatermarkService watermarkService;

    @BeforeEach
    void setUp() {
        watermarkService = new ImageWatermarkService();
        ReflectionTestUtils.setField(watermarkService, "baseWatermarkText", "CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND");
    }

    @Test
    void testApplyWatermark_success() throws IOException {
        // Create sample in-memory 300x200 image
        BufferedImage img = new BufferedImage(300, 200, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, 300, 200);
        g.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", baos);
        byte[] inputBytes = baos.toByteArray();

        // Apply watermark
        byte[] watermarkedBytes = watermarkService.applyWatermark(inputBytes);

        assertNotNull(watermarkedBytes);
        assertTrue(watermarkedBytes.length > 0);

        // Verify result can be decoded back to a valid BufferedImage
        BufferedImage resultImg = ImageIO.read(new ByteArrayInputStream(watermarkedBytes));
        assertNotNull(resultImg, "Watermarked bytes should be decodable image");
        assertEquals(300, resultImg.getWidth());
        assertEquals(200, resultImg.getHeight());
    }

    @Test
    void testApplyWatermark_invalidBytes_shouldFallbackGracefully() {
        byte[] invalidBytes = new byte[]{1, 2, 3, 4};
        byte[] result = watermarkService.applyWatermark(invalidBytes);
        assertArrayEquals(invalidBytes, result, "Should gracefully return original bytes if not decodable");
    }

    @Test
    void testApplyWatermark_pixelFloodExceedsLimit_shouldThrowBusinessException() throws IOException {
        BufferedImage hugeDimImg = new BufferedImage(4097, 2, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(hugeDimImg, "png", baos);
        byte[] inputBytes = baos.toByteArray();

        vn.edu.uth.smartward.common.BusinessException ex = assertThrows(
                vn.edu.uth.smartward.common.BusinessException.class,
                () -> watermarkService.applyWatermark(inputBytes)
        );
        assertEquals(vn.edu.uth.smartward.common.ErrorCode.INVALID_REQUEST, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("4096x4096"));
    }
}
