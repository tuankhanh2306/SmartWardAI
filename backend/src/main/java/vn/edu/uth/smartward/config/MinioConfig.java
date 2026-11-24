package vn.edu.uth.smartward.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MinioConfig {

    @Value("${minio.endpoint:http://localhost:9000}")
    private String endpoint;

    @Value("${minio.access-key:minio_admin}")
    private String accessKey;

    @Value("${minio.secret-key:minio_secret_key}")
    private String secretKey;

    @Value("${minio.region:}")
    private String region;

    @Value("${minio.virtual-style:false}")
    private boolean virtualStyle;

    @Bean
    public MinioClient minioClient() {
        MinioClient.Builder builder = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey);
        if (region != null && !region.isBlank()) {
            builder.region(region.trim());
        }
        MinioClient client = builder.build();
        if (virtualStyle) {
            client.enableVirtualStyleEndpoint();
        }
        return client;
    }
}
