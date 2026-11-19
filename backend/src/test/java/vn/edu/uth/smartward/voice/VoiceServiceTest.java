package vn.edu.uth.smartward.voice;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class VoiceServiceTest {

    @Test
    @DisplayName("VoiceService rejects blank or null text")
    void testBlankTextThrows() {
        VoiceService voiceService = new VoiceService(true, "http://localhost:8000", 2);
        assertThrows(IllegalArgumentException.class, () -> voiceService.synthesize(null));
        assertThrows(IllegalArgumentException.class, () -> voiceService.synthesize("   "));
    }

    @Test
    @DisplayName("VoiceService throws IllegalStateException when disabled")
    void testDisabledThrows() {
        VoiceService voiceService = new VoiceService(false, "http://localhost:8000", 2);
        assertThrows(IllegalStateException.class, () -> voiceService.synthesize("Xin chào"));
    }
}
