package vn.edu.uth.smartward.vault;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Iterator;

/**
 * Java2D Watermarking Service for Administrative Citizen Documents.
 * Draws semi-transparent diagonal watermarks across uploaded documents to prevent
 * unauthorized repurposing or data theft in accordance with personal data protection requirements.
 */
@Slf4j
@Service
public class ImageWatermarkService {

    @Value("${smartward.vault.watermark-text:CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND}")
    private String baseWatermarkText;

    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /**
     * Applies diagonal semi-transparent watermark onto declaration form image.
     *
     * @param imageBytes raw image bytes
     * @return watermarked image bytes (PNG format)
     */
    public byte[] applyWatermark(byte[] imageBytes) {
        if (imageBytes == null || imageBytes.length == 0) {
            return imageBytes;
        }

        // 1. Inspect image dimensions before decoding to protect against pixel flood / decompression bombs (max 4096px, 16M pixels)
        try (ImageInputStream iis = ImageIO.createImageInputStream(new ByteArrayInputStream(imageBytes))) {
            if (iis != null) {
                Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
                if (readers.hasNext()) {
                    ImageReader reader = readers.next();
                    try {
                        reader.setInput(iis, true, true);
                        int w = reader.getWidth(0);
                        int h = reader.getHeight(0);
                        if (w > 4096 || h > 4096 || ((long) w * h) > 16_777_216L) {
                            log.warn("Image dimensions exceed allowed security limits: {}x{} (area={})", w, h, (long) w * h);
                            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                                    "Kích thước ảnh vượt quá giới hạn cho phép (tối đa 4096x4096 px).");
                        }
                    } finally {
                        reader.dispose();
                    }
                }
            }
        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.warn("Could not inspect image metadata header: {}", e.getMessage());
        }

        BufferedImage original = null;
        BufferedImage watermarked = null;
        try {
            original = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (original == null) {
                log.warn("ImageIO could not decode image format; returning original bytes.");
                return imageBytes;
            }

            int width = original.getWidth();
            int height = original.getHeight();

            // Create target image with RGB channels
            watermarked = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = watermarked.createGraphics();

            // Enable High-Quality Anti-Aliasing
            g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

            // Draw original image first
            g2d.drawImage(original, 0, 0, null);

            // Configure watermark text & timestamp
            String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMAT);
            String fullWatermarkText = baseWatermarkText + " - " + timestamp;

            // Compute dynamic font size based on image resolution
            int fontSize = Math.max(16, width / 28);
            Font font = new Font(Font.SANS_SERIF, Font.BOLD, fontSize);
            g2d.setFont(font);

            FontMetrics fm = g2d.getFontMetrics();
            int textWidth = fm.stringWidth(fullWatermarkText);

            // Semi-transparent red-gray overlay (Alpha = 0.38)
            g2d.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 0.38f));
            g2d.setColor(new Color(180, 20, 20)); // Subtle administrative red

            // Draw repeated diagonal watermark lines across the page
            int stepX = textWidth + (width / 5);
            int stepY = fontSize * 7;

            g2d.rotate(Math.toRadians(-28), width / 2.0, height / 2.0);

            for (int y = -height; y < height * 2; y += stepY) {
                for (int x = -width; x < width * 2; x += stepX) {
                    g2d.drawString(fullWatermarkText, x, y);
                }
            }

            g2d.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(watermarked, "png", baos);
            byte[] result = baos.toByteArray();

            log.info("Successfully applied Java2D watermark (dim={}x{}, text='{}')",
                    width, height, fullWatermarkText);
            return result;

        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.error("Failed to apply watermark to image: {}", e.getMessage());
            return imageBytes; // Graceful fallback to original bytes
        } finally {
            if (original != null) original.flush();
            if (watermarked != null) watermarked.flush();
        }
    }
}
