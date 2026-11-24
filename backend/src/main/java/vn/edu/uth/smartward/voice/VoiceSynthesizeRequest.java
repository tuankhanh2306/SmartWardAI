package vn.edu.uth.smartward.voice;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceSynthesizeRequest {

    @NotBlank(message = "Text cannot be blank")
    @Size(max = 2000, message = "Text exceeds maximum 2000 characters limit")
    private String text;
}
