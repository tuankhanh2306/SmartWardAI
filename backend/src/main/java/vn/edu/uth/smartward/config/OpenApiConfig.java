package vn.edu.uth.smartward.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile({"dev", "staging", "test", "eval"})
@ConditionalOnProperty(name = "springdoc.api-docs.enabled", havingValue = "true", matchIfMissing = true)
public class OpenApiConfig {

    @Value("${smartward.openapi.contact-email:support@smartward.angiang.gov.vn}")
    private String contactEmail;

    @Bean
    public OpenAPI smartWardOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SmartWard AI - Civic Governance & Legal RAG Platform")
                        .description("API Documentation for SmartWard AI - Đồ án Tốt nghiệp & Thực tập Doanh nghiệp (Trường ĐH Giao thông vận tải TP.HCM - UTH)")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("SmartWard AI Engineering Team")
                                .email(contactEmail)
                                .url("https://github.com/tuankhanh2306/SmartWardAI"))
                        .license(new License().name("Apache 2.0").url("https://springdoc.org")));
    }
}
