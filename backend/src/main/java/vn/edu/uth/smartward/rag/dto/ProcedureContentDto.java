package vn.edu.uth.smartward.rag.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProcedureContentDto {

    @JsonProperty("trinh_tu")
    private String trinhTu;

    @JsonProperty("thanh_phan_ho_so")
    private String thanhPhanHoSo;

    @JsonProperty("thoi_han_le_phi")
    private String thoiHanLePhi;

    @JsonProperty("co_quan_thuc_hien")
    private String coQuanThucHien;

    @JsonProperty("can_cu_phap_ly")
    private String canCuPhapLy;

    public int countFilledSections() {
        int count = 0;
        if (isNonBlank(trinhTu)) count++;
        if (isNonBlank(thanhPhanHoSo)) count++;
        if (isNonBlank(thoiHanLePhi)) count++;
        if (isNonBlank(coQuanThucHien)) count++;
        if (isNonBlank(canCuPhapLy)) count++;
        return count;
    }

    public boolean isComplete() {
        return countFilledSections() == 5;
    }

    private static boolean isNonBlank(String s) {
        return s != null && !s.trim().isEmpty();
    }
}
