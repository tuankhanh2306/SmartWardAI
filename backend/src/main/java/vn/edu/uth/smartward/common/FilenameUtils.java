package vn.edu.uth.smartward.common;

/**
 * Utility for sanitizing client-supplied file names to prevent log injection
 * and path traversal vulnerabilities, and masking sensitive tokens in logs (SEC-08).
 */
public final class FilenameUtils {

    private FilenameUtils() {}

    public static String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "unnamed_file";
        }
        // Extract base name after any / or \
        int lastUnix = filename.lastIndexOf('/');
        int lastWindows = filename.lastIndexOf('\\');
        int lastSep = Math.max(lastUnix, lastWindows);
        String base = (lastSep >= 0 && lastSep < filename.length() - 1)
                ? filename.substring(lastSep + 1)
                : filename;

        // Replace any character not in [a-zA-Z0-9._-] with underscore
        String sanitized = base.replaceAll("[^a-zA-Z0-9._-]", "_");
        // Remove consecutive dots to prevent path traversal hints
        sanitized = sanitized.replaceAll("\\.{2,}", ".");

        if (sanitized.length() > 60) {
            sanitized = sanitized.substring(sanitized.length() - 60);
        }
        return sanitized.isEmpty() ? "sanitized_file" : sanitized;
    }

    public static String maskToken(String token) {
        if (token == null || token.isBlank()) return "null";
        if (token.startsWith("OTT_") && token.length() > 8) {
            return "OTT_" + token.substring(4, 8) + "***REDACTED***";
        }
        return "***REDACTED_TOKEN***";
    }
}
