import type { A4FormTemplate } from './types';

export const SOCIAL_AND_RESIDENCE_TEMPLATES: Record<string, A4FormTemplate> = {
  "TTHC-BT-01": {
    "procedureCode": "TTHC-BT-01",
    "formCode": "Mẫu số 1a, 1b, 1c, 1d, 1đ - NĐ 20/2021/NĐ-CP & NĐ 76/2024/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI THÔNG TIN ĐỀ NGHỊ TRỢ CẤP XÃ HỘI HẰNG THÁNG",
    "legalNote": "(Ban hành kèm theo Nghị định số 20/2021/NĐ-CP, sửa đổi bổ sung tại Nghị định số 76/2024/NĐ-CP & Luật BHXH 2024)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN CỦA ĐỐI TƯỢNG ĐỀ NGHỊ TRỢ CẤP",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên",
            "placeholder": "NGUYỄN VĂN A",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày, tháng, năm sinh",
            "placeholder": "01/01/1950",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nam / Nữ"
          },
          {
            "label": "4. Số CCCD/Số định danh cá nhân",
            "placeholder": "089050012345",
            "type": "grid2",
            "secondLabel": "5. Ngày cấp / Nơi cấp",
            "secondPlaceholder": "Cục CSQLHC về TTXH"
          },
          {
            "label": "6. Nơi thường trú",
            "placeholder": "Ấp Vĩnh Phước, {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "7. Nơi ở hiện tại",
            "placeholder": "Như trên",
            "type": "text"
          },
          {
            "label": "8. Dân tộc",
            "placeholder": "Kinh",
            "type": "grid2",
            "secondLabel": "9. Số điện thoại liên hệ",
            "secondPlaceholder": "0912345678"
          }
        ]
      },
      {
        "title": "II. TÌNH TRẠNG VÀ HOÀN CẢNH ĐỀ NGHỊ HƯỞNG TRỢ CẤP",
        "fields": [
          {
            "label": "1. Thuộc đối tượng bảo trợ xã hội",
            "placeholder": "Người cao tuổi từ đủ 80 tuổi trở lên không có lương hưu / Người khuyết tật đặc biệt nặng / Trẻ em mồ côi",
            "type": "text"
          },
          {
            "label": "2. Tình trạng sức khỏe / khả năng tự phục vụ",
            "placeholder": "Không có khả năng tự phục vụ sinh hoạt cá nhân hàng ngày",
            "type": "text"
          },
          {
            "label": "3. Giấy xác nhận mức độ khuyết tật (nếu có)",
            "placeholder": "Số: ......../G-XNKT cấp ngày ...../...../.........",
            "type": "text"
          },
          {
            "label": "4. Tài khoản ngân hàng nhận trợ cấp (Đề án 06)",
            "placeholder": "Số TK: ............................... tại Ngân hàng .................................................",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan những thông tin kê khai trên đây là hoàn toàn đúng sự thật. Nếu có gì sai trái, tôi xin chịu hoàn toàn trách nhiệm trước pháp luật và hoàn trả toàn bộ số tiền trợ cấp đã nhận sai.",
    "signatures": [
      {
        "role": "CÁN BỘ TIẾP NHẬN MỘT CỬA",
        "note": "(Ký, ghi rõ họ tên và kiểm tra hồ sơ)"
      },
      {
        "role": "NGƯỜI KÊ KHAI / NGƯỜI ĐẠI DIỆN",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-BT-02": {
    "procedureCode": "TTHC-BT-02",
    "formCode": "Mẫu số 04 - NĐ 20/2021/NĐ-CP & NĐ 76/2024/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐỀ NGHỊ HỖ TRỢ CHI PHÍ MAI TÁNG",
    "legalNote": "(Ban hành kèm theo Nghị định số 20/2021/NĐ-CP ngày 15/03/2021 & Nghị định số 76/2024/NĐ-CP của Chính phủ)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI ĐỨNG TÊN LO MAI TÁNG",
        "fields": [
          {
            "label": "1. Họ và tên người yêu cầu",
            "placeholder": "NGUYỄN VĂN B",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD/Định danh cá nhân",
            "placeholder": "089078004567",
            "type": "grid2",
            "secondLabel": "3. Quan hệ với người chết",
            "secondPlaceholder": "Con đẻ / Thân nhân"
          },
          {
            "label": "4. Nơi cư trú của người yêu cầu",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "5. Số điện thoại liên hệ",
            "placeholder": "0987654321",
            "type": "grid2",
            "secondLabel": "6. Số tài khoản nhận hỗ trợ",
            "secondPlaceholder": "STK chính chủ nhận mai táng phí"
          }
        ]
      },
      {
        "title": "II. THÔNG TIN CỦA ĐỐI TƯỢNG ĐÃ CHẾT",
        "fields": [
          {
            "label": "1. Họ và tên người chết",
            "placeholder": "NGUYỄN VĂN A",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "01/01/1940",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nam"
          },
          {
            "label": "4. Đã chết vào ngày",
            "placeholder": "...../...../.........",
            "type": "grid2",
            "secondLabel": "5. Nơi chết",
            "secondPlaceholder": "Tại nơi cư trú"
          },
          {
            "label": "6. Trích lục khai tử / Giấy báo tử số",
            "placeholder": "Số: ......../TLKT cấp ngày ...../...../......... do UBND {WARD_NAME} cấp",
            "type": "text"
          },
          {
            "label": "7. Thuộc đối tượng được hưởng",
            "placeholder": "Đối tượng đang hưởng trợ cấp xã hội hằng tháng theo Nghị định 20/2021/NĐ-CP",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan là người trực tiếp đứng ra tổ chức mai táng cho đối tượng nêu trên và chịu trách nhiệm trước pháp luật về tính chính xác của thông tin kê khai.",
    "signatures": [
      {
        "role": "CÁN BỘ TIẾP NHẬN MỘT CỬA",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI LÀM ĐƠN ĐỀ NGHỊ",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-BT-03": {
    "procedureCode": "TTHC-BT-03",
    "formCode": "Mẫu số 07 - NĐ 20/2021/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "ĐƠN ĐỀ NGHỊ TIẾP NHẬN VÀO CƠ SỞ TRỢ GIÚP XÃ HỘI",
    "legalNote": "(Ban hành kèm theo Nghị định số 20/2021/NĐ-CP ngày 15 tháng 3 năm 2021 của Chính phủ)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN ĐỐI TƯỢNG / NGƯỜI LÀM ĐƠN",
        "fields": [
          {
            "label": "1. Họ và tên",
            "placeholder": "NGUYỄN THỊ C",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "15/06/1945",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nữ"
          },
          {
            "label": "4. Số CCCD",
            "placeholder": "089145009876",
            "type": "grid2",
            "secondLabel": "5. Nơi cư trú",
            "secondPlaceholder": "{WARD_NAME}, Tỉnh An Giang"
          },
          {
            "label": "6. Tình trạng sức khỏe & hoàn cảnh",
            "placeholder": "Người cao tuổi đơn thân, không người phụng dưỡng, thuộc diện hộ nghèo",
            "type": "text"
          },
          {
            "label": "7. Nguyện vọng",
            "placeholder": "Kính đề nghị được tiếp nhận chăm sóc nuôi dưỡng tại Trung tâm Bảo trợ xã hội tỉnh An Giang",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan hoàn cảnh nêu trên là hoàn toàn đúng sự thật và tự nguyện làm đơn này đề nghị cơ quan có thẩm quyền xem xét tiếp nhận.",
    "signatures": [
      {
        "role": "XÁC NHẬN CỦA UBND CẤP XÃ",
        "note": "(Chủ tịch UBND ký, đóng dấu)"
      },
      {
        "role": "NGƯỜI LÀM ĐƠN / ĐẠI DIỆN",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-BT-04": {
    "procedureCode": "TTHC-BT-04",
    "formCode": "Mẫu số 04/BHXH - NĐ 20/2021/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI HỖ TRỢ MAI TÁNG PHÍ ĐỐI TƯỢNG HƯU TRÍ XÃ HỘI",
    "legalNote": "(Theo quy định Luật Bảo hiểm xã hội & Nghị định số 20/2021/NĐ-CP)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI ĐỨNG TÊN TỔ CHỨC MAI TÁNG",
        "fields": [
          {
            "label": "1. Họ và tên người đề nghị",
            "placeholder": "TRẦN VĂN D",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD",
            "placeholder": "089065001234",
            "type": "grid2",
            "secondLabel": "3. Quan hệ với người mất",
            "secondPlaceholder": "Con / Cháu / Thân nhân"
          },
          {
            "label": "4. Nơi thường trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "5. Số tài khoản ngân hàng",
            "placeholder": "Số tài khoản nhận kinh phí mai táng",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. THÔNG TIN ĐỐI TƯỢNG HƯỞNG HƯU TRÍ XÃ HỘI ĐÃ MẤT",
        "fields": [
          {
            "label": "1. Họ và tên người mất",
            "placeholder": "TRẦN THỊ E",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "05/04/1938",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nữ"
          },
          {
            "label": "4. Mã số BHXH / Mã trợ cấp hưu trí xã hội",
            "placeholder": "BHXH-................................",
            "type": "text"
          },
          {
            "label": "5. Ngày mất",
            "placeholder": "...../...../.........",
            "type": "grid2",
            "secondLabel": "6. Trích lục khai tử số",
            "secondPlaceholder": "Số: ......../TLKT"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan các thông tin kê khai là chính xác và chịu trách nhiệm trước pháp luật.",
    "signatures": [
      {
        "role": "CÁN BỘ TIẾP NHẬN MỘT CỬA",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI KÊ KHAI",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-BT-05": {
    "procedureCode": "TTHC-BT-05",
    "formCode": "Mẫu số 04 - NĐ 20/2021/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐỀ NGHỊ MAI TÁNG PHÍ ĐỐI TƯỢNG BẢO TRỢ XÃ HỘI TẠI CỘNG ĐỒNG",
    "legalNote": "(Ban hành kèm theo Nghị định số 20/2021/NĐ-CP của Chính phủ)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN ĐƠN VỊ / CÁ NHÂN MAI TÁNG",
        "fields": [
          {
            "label": "1. Họ tên cá nhân / Đại diện tổ chức",
            "placeholder": "LÊ VĂN F",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD",
            "placeholder": "089088002345",
            "type": "grid2",
            "secondLabel": "3. Số điện thoại",
            "secondPlaceholder": "0903123456"
          },
          {
            "label": "4. Nơi cư trú / Địa chỉ",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. THÔNG TIN ĐỐI TƯỢNG ĐÃ CHẾT TẠI CỘNG ĐỒNG",
        "fields": [
          {
            "label": "1. Họ tên người chết",
            "placeholder": "LÊ VĂN G",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Năm sinh",
            "placeholder": "1942",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nam"
          },
          {
            "label": "4. Chết ngày",
            "placeholder": "...../...../.........",
            "type": "grid2",
            "secondLabel": "5. Nơi mai táng",
            "secondPlaceholder": "Nghĩa trang địa phương"
          },
          {
            "label": "6. Căn cứ hồ sơ trợ cấp",
            "placeholder": "Đang hưởng trợ cấp BTXH hằng tháng theo Quyết định số: ................. của Chủ tịch UBND cấp xã",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan các thông tin kê khai là đúng sự thật và chịu trách nhiệm trước pháp luật.",
    "signatures": [
      {
        "role": "CÁN BỘ KIỂM TRA HỒ SƠ",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI ĐỨNG TÊN TỜ KHAI",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-CR-01": {
    "procedureCode": "TTHC-CR-01",
    "formCode": "Mẫu CT01 - TT 66/2023/TT-BCA (sửa đổi tại TT 53/2025/TT-BCA & TT 116/2026/TT-BCA)",
    "agencyType": "POLICE",
    "title": "TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ",
    "legalNote": "Mẫu CT01 ban hành kèm theo Thông tư số 66/2023/TT-BCA (sửa đổi tại TT 53/2025/TT-BCA & TT 116/2026/TT-BCA) của Bộ trưởng Bộ Công an",
    "recipient": "Công an {WARD_NAME}",
    "sections": [
      {
        "title": "",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên khai sinh",
            "placeholder": "NGUYỄN MINH TUẤN KHANH",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày, tháng, năm sinh",
            "placeholder": "12/08/1998",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nam"
          },
          {
            "label": "4. Số định danh cá nhân",
            "placeholder": "089205023490",
            "type": "text",
            "isBold": true
          },
          {
            "label": "5. Số điện thoại liên hệ",
            "placeholder": "0918234567",
            "type": "grid2",
            "secondLabel": "6. Email",
            "secondPlaceholder": "congdan@angiang.gov.vn"
          },
          {
            "label": "7. Họ, chữ đệm và tên chủ hộ",
            "placeholder": "NGUYỄN VĂN BÌNH",
            "type": "grid2",
            "secondLabel": "8. Mối quan hệ với chủ hộ",
            "secondPlaceholder": "Con đẻ"
          },
          {
            "label": "9. Số định danh cá nhân của chủ hộ",
            "placeholder": "089075001234",
            "type": "text",
            "isBold": true
          },
          {
            "label": "10. Nội dung đề nghị",
            "placeholder": "Đăng ký thường trú tại Số 18 Đường Trần Hưng Đạo, {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "11. Những thành viên trong hộ gia đình cùng thay đổi",
            "placeholder": "1. NGUYỄN MINH TUẤN KHANH - Sinh: 12/08/1998 - Giới tính: Nam - Số ĐDCN: 089205023490 - Quan hệ với chủ hộ: Con đẻ",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan những thông tin kê khai trên là đúng sự thật và chịu trách nhiệm trước pháp luật về cam đoan của mình.",
    "signatures": [
      {
        "role": "Ý KIẾN CỦA CHỦ HỘ",
        "note": "......, ngày......tháng....năm......"
      },
      {
        "role": "Ý KIẾN CỦA CHỦ SỞ HỮU CHỖ Ở HỢP PHÁP",
        "note": "......, ngày......tháng....năm......"
      },
      {
        "role": "Ý KIẾN CỦA CHA HOẶC MẸ HOẶC NGƯỜI GIÁM HỘ",
        "note": "......, ngày......tháng....năm......"
      },
      {
        "role": "NGƯỜI KÊ KHAI",
        "note": "......, ngày......tháng....năm......"
      }
    ]
  },
  "TTHC-CR-02": {
    "procedureCode": "TTHC-CR-02",
    "formCode": "Mẫu số 02 Phụ lục - NĐ 63/2024/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI LIÊN THÔNG ĐIỆN TỬ: ĐĂNG KÝ KHAI TỬ, XÓA THƯỜNG TRÚ & MAI TÁNG PHÍ",
    "legalNote": "(Mẫu số 02 ban hành kèm theo Nghị định số 63/2024/NĐ-CP ngày 10/06/2024 của Chính phủ & Đề án 06)",
    "recipient": "Ủy ban nhân dân {WARD_NAME} & Công an {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI YÊU CẦU LIÊN THÔNG",
        "fields": [
          {
            "label": "1. Họ và tên người yêu cầu",
            "placeholder": "NGUYỄN THỊ MAI",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD/Định danh cá nhân",
            "placeholder": "089185002345",
            "type": "grid2",
            "secondLabel": "3. Quan hệ với người chết",
            "secondPlaceholder": "Vợ / Con"
          },
          {
            "label": "4. Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "5. Số điện thoại",
            "placeholder": "0912987654",
            "type": "grid2",
            "secondLabel": "6. STK nhận mai táng phí",
            "secondPlaceholder": "STK: ......................................."
          }
        ]
      },
      {
        "title": "II. THÔNG TIN NGƯỜI ĐƯỢC KHAI TỬ VÀ XÓA ĐĂNG KÝ THƯỜNG TRÚ",
        "fields": [
          {
            "label": "1. Họ và tên người chết",
            "placeholder": "NGUYỄN VĂN BÌNH",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD/Số định danh",
            "placeholder": "089052001122",
            "type": "grid2",
            "secondLabel": "3. Ngày sinh / Giới tính",
            "secondPlaceholder": "12/05/1952 - Nam"
          },
          {
            "label": "4. Ngày chết",
            "placeholder": "...../...../.........",
            "type": "grid2",
            "secondLabel": "5. Giấy báo tử số",
            "secondPlaceholder": "Số: ......../GBT do Trạm Y tế cấp"
          },
          {
            "label": "6. Nơi thường trú trước khi chết",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi cam đoan thông tin trên là chính xác và đồng ý chuyển dữ liệu liên thông giữa Tư pháp, Công an và Bảo trợ xã hội.",
    "signatures": [
      {
        "role": "CÁN BỘ BỘ PHẬN MỘT CỬA LIÊN THÔNG",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI KÊ KHAI",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-CR-03": {
    "procedureCode": "TTHC-CR-03",
    "formCode": "Mẫu CT01 - TT 66/2023/TT-BCA (sửa đổi tại TT 53/2025/TT-BCA & TT 116/2026/TT-BCA)",
    "agencyType": "POLICE",
    "title": "TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ (ĐĂNG KÝ TẠM TRÚ)",
    "legalNote": "Mẫu CT01 ban hành kèm theo TT 66/2023/TT-BCA (sửa đổi tại TT 53/2025/TT-BCA & TT 116/2026/TT-BCA)",
    "recipient": "Công an {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI ĐĂNG KÝ TẠM TRÚ",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên",
            "placeholder": "PHẠM VĂN HÙNG",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "20/08/1996",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nam"
          },
          {
            "label": "4. Số CCCD",
            "placeholder": "089096007890",
            "type": "grid2",
            "secondLabel": "5. Số điện thoại",
            "secondPlaceholder": "0978123456"
          },
          {
            "label": "6. Nơi thường trú hiện tại",
            "placeholder": "Huyện Chợ Mới, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "7. Nơi dự kiến tạm trú",
            "placeholder": "Nhà trọ số ..., Đường ..., {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "8. Thời hạn tạm trú từ ngày",
            "placeholder": "Từ ngày ...../...../......... đến ngày ...../...../.........",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan các nội dung khai trên là đúng sự thật và chịu trách nhiệm trước pháp luật về lời khai của mình.",
    "signatures": [
      {
        "role": "Ý KIẾN CỦA CHỦ NHÀ TRỌ / CHỖ Ở HỢP PHÁP",
        "note": "(Đồng ý cho tạm trú, ký và ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI ĐĂNG KÝ TẠM TRÚ",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-CR-04": {
    "procedureCode": "TTHC-CR-04",
    "formCode": "Mẫu CT01 - TT 66/2023/TT-BCA (sửa đổi tại TT 53/2025/TT-BCA & TT 116/2026/TT-BCA)",
    "agencyType": "POLICE",
    "title": "TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ (GIA HẠN TẠM TRÚ)",
    "legalNote": "Mẫu CT01 ban hành kèm theo TT 66/2023/TT-BCA (sửa đổi tại TT 53/2025/TT-BCA & TT 116/2026/TT-BCA)",
    "recipient": "Công an {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI GIA HẠN TẠM TRÚ",
        "fields": [
          {
            "label": "1. Họ và tên người gia hạn",
            "placeholder": "VÕ THỊ HÀ",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "14/02/1998",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nữ"
          },
          {
            "label": "4. Số CCCD/Định danh cá nhân",
            "placeholder": "089198005678",
            "type": "grid2",
            "secondLabel": "5. Số điện thoại",
            "secondPlaceholder": "0939112233"
          },
          {
            "label": "6. Đang tạm trú tại địa chỉ",
            "placeholder": "Ấp Bình Hòa, {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "7. Đã đăng ký tạm trú đến ngày",
            "placeholder": "...../...../......... (Sắp hết hạn)",
            "type": "grid2",
            "secondLabel": "8. Đề nghị gia hạn đến",
            "secondPlaceholder": "...../...../......... (Tối đa 2 năm)"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan tiếp tục cư trú hợp pháp tại địa chỉ trên và tuân thủ nghiêm chỉnh pháp luật về cư trú.",
    "signatures": [
      {
        "role": "Ý KIẾN CỦA CHỦ HỘ / CHỦ NHÀ",
        "note": "(Ký và ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI LÀM ĐƠN GIA HẠN",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-CR-06": {
    "procedureCode": "TTHC-CR-06",
    "formCode": "Mẫu CT05 - TT 66/2023/TT-BCA (sửa đổi tại TT 53/2025/TT-BCA & TT 116/2026/TT-BCA)",
    "agencyType": "POLICE",
    "title": "PHIẾU TIẾP NHẬN THÔNG BÁO LƯU TRÚ",
    "legalNote": "(Ban hành kèm theo TT 66/2023/TT-BCA, sửa đổi tại TT 53/2025/TT-BCA & TT 116/2026/TT-BCA của Bộ Công an)",
    "recipient": "Công an {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN CƠ SỞ / HỘ GIA ĐÌNH THÔNG BÁO LƯU TRÚ",
        "fields": [
          {
            "label": "1. Tên cơ sở lưu trú / Chủ hộ",
            "placeholder": "Nhà nghỉ ABC / Hộ gia đình Nguyễn Văn X",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Địa chỉ lưu trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "3. Số điện thoại liên hệ",
            "placeholder": "0296.3855xxx",
            "type": "grid2",
            "secondLabel": "4. Thời điểm thông báo",
            "secondPlaceholder": "..... giờ ..... phút ngày ...../...../........."
          }
        ]
      },
      {
        "title": "II. DANH SÁCH NGƯỜI LƯU TRÚ",
        "fields": [
          {
            "label": "1. Họ tên người lưu trú 1",
            "placeholder": "NGUYỄN VĂN A - Sinh: 1990 - CCCD: 089090001234 - Thường trú: TP.HCM",
            "type": "text"
          },
          {
            "label": "2. Thời gian lưu trú",
            "placeholder": "Từ ngày ...../...../......... đến ngày ...../...../.........",
            "type": "grid2",
            "secondLabel": "3. Lý do lưu trú",
            "secondPlaceholder": "Công tác / Thăm thân / Khách du lịch"
          }
        ]
      }
    ],
    "commitText": "Người thông báo cam đoan thông tin lưu trú của khách là chính xác.",
    "signatures": [
      {
        "role": "CÁN BỘ CÔNG AN TIẾP NHẬN",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI THÔNG BÁO LƯU TRÚ",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  }
};
