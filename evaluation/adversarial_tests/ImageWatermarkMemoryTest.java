package evaluation.adversarial_tests;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;

public class ImageWatermarkMemoryTest {

    public static void main(String[] args) throws Exception {
        System.out.println("======================================================================");
        System.out.println("JAVA 21 EMPIRICAL BENCHMARK: BufferedImage Watermark Memory Allocation");
        System.out.println("======================================================================");

        int width = 4000;
        int height = 3000;

        System.gc();
        Thread.sleep(200);
        long beforeMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();

        System.out.println("Creating BufferedImage (" + width + "x" + height + ", TYPE_INT_ARGB)...");
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g2d = image.createGraphics();
        g2d.setColor(new Color(255, 0, 0, 128));
        g2d.setFont(new Font("Arial", Font.BOLD, 48));
        g2d.drawString("CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND PHƯỜNG", 100, 500);
        g2d.dispose();

        long afterMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        long diffMb = (afterMemory - beforeMemory) / (1024 * 1024);

        System.out.println("Heap Memory consumed by a SINGLE watermarked BufferedImage: " + diffMb + " MB");

        int concurrentThreads = 4;
        System.out.println("Projected Heap for 4 concurrent worker threads: " + (diffMb * concurrentThreads) + " MB");
        System.out.println("Proposed JVM -Xmx in report: 384 MB (in 512 MB Docker container)");
        System.out.println("Percentage of max heap consumed just by 4 images: " 
                + String.format("%.1f", ((diffMb * concurrentThreads * 100.0) / 384.0)) + "%");

        if (diffMb * concurrentThreads > 150) {
            System.out.println("[EMPIRICAL FINDING]: Watermarking 4 concurrent 12MP CCCD photos consumes ~" 
                    + (diffMb * concurrentThreads) + "MB of heap.");
            System.out.println("This directly contradicts the claim in Scenario 4 that 'concurrent processing only takes 4 x 8KB = 32KB buffer'.");
            System.out.println("In a 384MB heap with 180MB baseline Spring Boot services, this WILL trigger GC thrashing and OOM spikes.");
        }
    }
}
