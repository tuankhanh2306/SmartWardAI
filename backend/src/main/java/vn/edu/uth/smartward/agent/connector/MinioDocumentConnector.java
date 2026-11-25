package vn.edu.uth.smartward.agent.connector;

import io.minio.BucketExistsArgs;
import io.minio.ListObjectsArgs;
import io.minio.MinioClient;
import io.minio.Result;
import io.minio.messages.Item;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reference CivicDataConnector indexing encrypted MinIO document metadata headers (TASK-041).
 * Never loads encrypted binary blobs into JVM heap and always tags records OFFICER_ONLY.
 */
@Slf4j
@Component
public class MinioDocumentConnector implements CivicDataConnector {

    private final MinioClient minioClient;
    private final String bucketName;

    @Autowired
    public MinioDocumentConnector(@Autowired(required = false) MinioClient minioClient,
                                  @Value("${minio.bucket-name:smartward-vault}") String bucketName) {
        this.minioClient = minioClient;
        this.bucketName = bucketName != null && !bucketName.isBlank() ? bucketName.trim() : "smartward-vault";
    }

    @Override
    public String sourceId() {
        return "minio-document-vault";
    }

    @Override
    public String sourceName() {
        return "Kho tài liệu MinIO SmartWard (Metadata Only)";
    }

    @Override
    public List<CivicDocumentRecord> fetchDocuments(int limit) {
        if (minioClient == null) {
            return List.of();
        }
        int safeLimit = limit > 0 ? Math.min(limit, 50) : 20;
        List<CivicDocumentRecord> records = new ArrayList<>();
        try {
            Iterable<Result<Item>> results = minioClient.listObjects(
                    ListObjectsArgs.builder().bucket(bucketName).recursive(true).build()
            );
            for (Result<Item> res : results) {
                if (records.size() >= safeLimit) break;
                Item item = res.get();
                if (item.isDir()) continue;

                Map<String, String> meta = new LinkedHashMap<>();
                meta.put("bucket", bucketName);
                meta.put("sizeBytes", String.valueOf(item.size()));
                if (item.etag() != null) {
                    meta.put("etag", item.etag());
                }

                records.add(new CivicDocumentRecord(
                        item.objectName(),
                        item.objectName(),
                        "Encrypted object metadata: " + item.objectName() + " (" + item.size() + " bytes)",
                        "minio://" + bucketName + "/" + item.objectName(),
                        "OFFICER_ONLY",
                        null,
                        meta
                ));
            }
        } catch (Exception ex) {
            log.debug("MinioDocumentConnector unable to list bucket [{}]: {}", bucketName, ex.getMessage());
        }
        return records;
    }

    @Override
    public boolean isHealthy() {
        if (minioClient == null) {
            return false;
        }
        try {
            return minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        } catch (Exception ex) {
            return false;
        }
    }
}
