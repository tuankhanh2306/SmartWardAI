package vn.edu.uth.smartward.common;

import ch.qos.logback.classic.pattern.MessageConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;

import java.util.regex.Pattern;

/**
 * Logback MessageConverter that masks sensitive personal identifiable information (PII)
 * and security tokens from all console and file log outputs (SEC-08):
 * - 9-12 digit CCCD / CMND numbers
 * - Vietnamese mobile phone numbers
 * - Vault One-Time Tokens (OTT_...)
 * - JWT / HMAC Bearer tokens
 */
public class MaskingMessageConverter extends MessageConverter {

    private static final Pattern CCCD_PATTERN = Pattern.compile("\\b\\d{9,12}\\b");
    private static final Pattern PHONE_PATTERN = Pattern.compile("(?:\\+84|0)(?:3|5|7|8|9)\\d{8}\\b");
    private static final Pattern OTT_PATTERN = Pattern.compile("\\bOTT_[A-Za-z0-9_\\-]{8,}\\b");
    private static final Pattern JWT_PATTERN = Pattern.compile("Bearer\\s+[A-Za-z0-9_.\\-]{20,}");

    @Override
    public String convert(ILoggingEvent event) {
        String message = event.getFormattedMessage();
        if (message == null || message.isEmpty()) {
            return message;
        }

        // Mask Vietnamese phone numbers first to avoid 10-digit phones being misclassified as CCCD
        String masked = PHONE_PATTERN.matcher(message).replaceAll("***REDACTED_PHONE***");
        masked = CCCD_PATTERN.matcher(masked).replaceAll("***REDACTED_CCCD***");
        masked = OTT_PATTERN.matcher(masked).replaceAll("OTT_***REDACTED***");
        masked = JWT_PATTERN.matcher(masked).replaceAll("Bearer ***REDACTED_JWT***");

        return masked;
    }
}
