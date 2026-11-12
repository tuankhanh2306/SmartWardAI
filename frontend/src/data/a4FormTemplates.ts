// Auto-generated 40 A4 Administrative Document Templates
// Fully standardized per Decree 30/2020/ND-CP and specific ministerial circulars

export interface A4FormField {
  label: string;
  placeholder?: string;
  type?: 'text' | 'grid2' | 'textarea';
  isBold?: boolean;
  secondLabel?: string;
  secondPlaceholder?: string;
}

export interface A4FormSection {
  title?: string;
  fields: A4FormField[];
}

export interface A4FormSignature {
  role: string;
  note: string;
}

export interface A4FormTemplate {
  procedureCode: string;
  formCode: string;
  agencyType: 'POLICE' | 'COMMUNE_UBND';
  title: string;
  legalNote: string;
  recipient: string;
  sections: A4FormSection[];
  commitText: string;
  signatures: A4FormSignature[];
}

export const A4_FORM_TEMPLATES: Record<string, A4FormTemplate> = {
  "TTHC-BT-01": {
    "procedureCode": "TTHC-BT-01",
    "formCode": "Mẫu số 01 - NĐ 20/2021/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI THÔNG TIN ĐỀ NGHỊ TRỢ CẤP XÃ HỘI HẰNG THÁNG",
    "legalNote": "(Ban hành kèm theo Nghị định số 20/2021/NĐ-CP ngày 15 tháng 3 năm 2021 của Chính phủ)",
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
    "formCode": "Mẫu số 04 - NĐ 20/2021/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐỀ NGHỊ HỖ TRỢ CHI PHÍ MAI TÁNG",
    "legalNote": "(Ban hành kèm theo Nghị định số 20/2021/NĐ-CP ngày 15 tháng 3 năm 2021 của Chính phủ)",
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
    "formCode": "Mẫu CT01 - TT 66/2023/TT-BCA",
    "agencyType": "POLICE",
    "title": "TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ",
    "legalNote": "(Ban hành kèm theo Thông tư số 66/2023/TT-BCA ngày 17/11/2023 của Bộ Công an)",
    "recipient": "Công an {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI KÊ KHAI",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên",
            "placeholder": "NGUYỄN VĂN AN",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày, tháng, năm sinh",
            "placeholder": "10/10/1992",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nam"
          },
          {
            "label": "4. Số định danh cá nhân (CCCD)",
            "placeholder": "089092003456",
            "type": "grid2",
            "secondLabel": "5. Số điện thoại",
            "secondPlaceholder": "0918123456"
          },
          {
            "label": "6. Nơi thường trú",
            "placeholder": "Ấp Vĩnh Hòa, {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "7. Nơi ở hiện tại",
            "placeholder": "Như trên",
            "type": "text"
          },
          {
            "label": "8. Nghề nghiệp, nơi làm việc",
            "placeholder": "Kinh doanh tự do",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. NỘI DUNG ĐỀ NGHỊ GIẢI QUYẾT",
        "fields": [
          {
            "label": "1. Nội dung đề nghị",
            "placeholder": "Đăng ký thường trú về chỗ ở hợp pháp tại: Số nhà ......, {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "2. Chủ hộ nơi chuyển đến",
            "placeholder": "NGUYỄN VĂN CHỦ HỘ - CCCD số: ............................",
            "type": "text"
          },
          {
            "label": "3. Quan hệ với chủ hộ",
            "placeholder": "Chủ hộ / Con đẻ / Vợ / Chồng",
            "type": "text"
          },
          {
            "label": "4. Những thành viên cùng chuyển đến",
            "placeholder": "1. Nguyễn Văn C (Con) - 01/01/2018 | 2. Trần Thị D (Vợ) - 02/02/1995",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan những lời khai trên đây là hoàn toàn đúng sự thật và chịu trách nhiệm trước pháp luật về lời khai của mình.",
    "signatures": [
      {
        "role": "Ý KIẾN CỦA CHỦ HỘ / CHỦ SỞ HỮU CHỖ Ở",
        "note": "(Đồng ý cho đăng ký, ký và ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI KÊ KHAI",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-CR-02": {
    "procedureCode": "TTHC-CR-02",
    "formCode": "Mẫu Liên thông Đề án 06 - QĐ 06/QĐ-TTg",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI LIÊN THÔNG ĐIỆN TỬ: KHAI TỬ, XÓA ĐĂNG KÝ THƯỜNG TRÚ, MAI TÁNG PHÍ",
    "legalNote": "(Theo Quyết định số 06/QĐ-TTg ngày 06/01/2022 của Thủ tướng Chính phủ)",
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
    "formCode": "Mẫu CT01 - TT 66/2023/TT-BCA",
    "agencyType": "POLICE",
    "title": "TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ (ĐĂNG KÝ TẠM TRÚ)",
    "legalNote": "(Ban hành kèm theo Thông tư số 66/2023/TT-BCA của Bộ Công an)",
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
    "formCode": "Mẫu CT01 - TT 66/2023/TT-BCA",
    "agencyType": "POLICE",
    "title": "TỜ KHAI GIA HẠN TẠM TRÚ TẠI ĐỊA BÀN XÃ/PHƯỜNG",
    "legalNote": "(Ban hành kèm theo Thông tư số 66/2023/TT-BCA của Bộ Công an)",
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
    "formCode": "Mẫu CT05 - TT 66/2023/TT-BCA",
    "agencyType": "POLICE",
    "title": "PHIẾU TIẾP NHẬN THÔNG BÁO LƯU TRÚ",
    "legalNote": "(Ban hành kèm theo Thông tư số 66/2023/TT-BCA ngày 17/11/2023 của Bộ Công an)",
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
  },
  "TTHC-CR-07": {
    "procedureCode": "TTHC-CR-07",
    "formCode": "Mẫu CT03 - TT 66/2023/TT-BCA",
    "agencyType": "POLICE",
    "title": "TỜ KHAI KHAI BÁO TẠM VẮNG",
    "legalNote": "(Ban hành kèm theo Thông tư số 66/2023/TT-BCA của Bộ Công an)",
    "recipient": "Công an {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI KHAI BÁO TẠM VẮNG",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên",
            "placeholder": "ĐẶNG VĂN TÀI",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "09/09/1988",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nam"
          },
          {
            "label": "4. Số CCCD",
            "placeholder": "089088009988",
            "type": "grid2",
            "secondLabel": "5. Số điện thoại",
            "secondPlaceholder": "0908765432"
          },
          {
            "label": "6. Nơi thường trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "7. Tạm vắng từ ngày",
            "placeholder": "Từ ngày ...../...../......... đến ngày ...../...../.........",
            "type": "text"
          },
          {
            "label": "8. Địa chỉ nơi đến tạm vắng",
            "placeholder": "Số ..., Đường ..., Quận/Huyện ..., Tỉnh/Thành phố ...",
            "type": "text"
          },
          {
            "label": "9. Lý do tạm vắng",
            "placeholder": "Đi làm ăn xa / Chữa bệnh / Học tập trên 03 tháng liên tục",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan các nội dung khai trên là đúng sự thật và chịu trách nhiệm trước pháp luật.",
    "signatures": [
      {
        "role": "XÁC NHẬN CỦA CÔNG AN XÃ/PHƯỜNG",
        "note": "(Ký, đóng dấu)"
      },
      {
        "role": "NGƯỜI KHAI BÁO TẠM VẮNG",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-CR-08": {
    "procedureCode": "TTHC-CR-08",
    "formCode": "Mẫu CT07 - TT 66/2023/TT-BCA",
    "agencyType": "POLICE",
    "title": "GIẤY XÁC NHẬN THÔNG TIN VỀ CƯ TRÚ",
    "legalNote": "(Ban hành kèm theo Thông tư số 66/2023/TT-BCA của Bộ Công an)",
    "recipient": "Công an {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN CÔNG DÂN CẦN XÁC NHẬN",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên",
            "placeholder": "TRẦN THỊ NGỌC",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "12/12/1994",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nữ"
          },
          {
            "label": "4. Số định danh cá nhân/CCCD",
            "placeholder": "089194008765",
            "type": "grid2",
            "secondLabel": "5. Dân tộc/Quốc tịch",
            "secondPlaceholder": "Kinh - Việt Nam"
          },
          {
            "label": "6. Nơi thường trú",
            "placeholder": "Ấp Phú Hiệp, {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "7. Nơi tạm trú / Nơi ở hiện tại",
            "placeholder": "Như trên",
            "type": "text"
          },
          {
            "label": "8. Họ tên chủ hộ và quan hệ",
            "placeholder": "Trần Văn Mẹ - Quan hệ: Con đẻ",
            "type": "text"
          },
          {
            "label": "9. Mục đích xin xác nhận cư trú",
            "placeholder": "Làm thủ tục nhập học / Vay vốn / Đăng ký kết hôn / Giao dịch dân sự",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Công an xã/phường xác nhận các thông tin trên khớp đúng với Cơ sở dữ liệu quốc gia về dân cư.",
    "signatures": [
      {
        "role": "TRƯỞNG CÔNG AN XÃ / PHƯỜNG",
        "note": "(Ký, ghi rõ họ tên và đóng dấu)"
      },
      {
        "role": "NGƯỜI YÊU CẦU XÁC NHẬN",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-CR-09": {
    "procedureCode": "TTHC-CR-09",
    "formCode": "Mẫu Đơn đề nghị xác nhận hoàn cảnh khó khăn",
    "agencyType": "COMMUNE_UBND",
    "title": "GIẤY XÁC NHẬN HOÀN CẢNH KHÓ KHĂN VỀ KINH TẾ CỦA HỘ GIA ĐÌNH",
    "legalNote": "(Theo quy định chính sách tín dụng HSSV Quyết định 157/2007/QĐ-TTg & chính sách an sinh)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN HỘ GIA ĐÌNH",
        "fields": [
          {
            "label": "1. Họ và tên chủ hộ",
            "placeholder": "NGUYỄN VĂN THANH",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD",
            "placeholder": "089060003456",
            "type": "grid2",
            "secondLabel": "3. Số thành viên trong hộ",
            "secondPlaceholder": "04 người"
          },
          {
            "label": "4. Nơi thường trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "5. Tình trạng kinh tế hộ",
            "placeholder": "Hộ nghèo (Mã số: .......) / Hộ cận nghèo / Hộ có hoàn cảnh khó khăn đột xuất do thiên tai, dịch bệnh",
            "type": "text"
          },
          {
            "label": "6. Mục đích đề nghị xác nhận",
            "placeholder": "Vay vốn học tập theo chương trình HSSV / Xin miễn giảm học phí / Hỗ trợ xã hội",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Gia đình tôi cam đoan những lời khai trên là hoàn toàn đúng thực tế hoàn cảnh kinh tế gia đình.",
    "signatures": [
      {
        "role": "XÁC NHẬN CỦA UBND CẤP XÃ",
        "note": "(Chủ tịch / Phó Chủ tịch ký, đóng dấu)"
      },
      {
        "role": "CHỦ HỘ GIA ĐÌNH",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-CR-10": {
    "procedureCode": "TTHC-CR-10",
    "formCode": "Mẫu Tờ khai - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI XÁC NHẬN THÔNG TIN HỘ TỊCH",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP ngày 28/05/2020 của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI YÊU CẦU XÁC NHẬN",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên",
            "placeholder": "PHAN VĂN ĐỨC",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "15/07/1987",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nam"
          },
          {
            "label": "4. Số CCCD",
            "placeholder": "089087002345",
            "type": "grid2",
            "secondLabel": "5. Nơi thường trú",
            "secondPlaceholder": "{WARD_NAME}, Tỉnh An Giang"
          },
          {
            "label": "6. Sự kiện hộ tịch cần xác nhận",
            "placeholder": "Xác nhận thông tin đã đăng ký khai sinh / kết hôn / khai tử trong Sổ hộ tịch năm ......",
            "type": "text"
          },
          {
            "label": "7. Lý do yêu cầu",
            "placeholder": "Phục vụ tra lục, đối chiếu hồ sơ cấp đổi giấy tờ do sổ giấy gốc bị hư hỏng",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi cam đoan các thông tin khai báo trên là chính xác và hoàn toàn chịu trách nhiệm trước pháp luật.",
    "signatures": [
      {
        "role": "CÔNG CHỨC TƯ PHÁP - HỘ TỊCH",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI LÀM TỜ KHAI",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-CT-01": {
    "procedureCode": "TTHC-CT-01",
    "formCode": "Mẫu Lời chứng - NĐ 23/2015/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "MẪU LỜI CHỨNG CHỨNG THỰC BẢN SAO TỪ BẢN CHÍNH",
    "legalNote": "(Ban hành kèm theo Nghị định số 23/2015/NĐ-CP ngày 16 tháng 02 năm 2015 của Chính phủ)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "NỘI DUNG LỜI CHỨNG CỦA CƠ QUAN CÓ THẨM QUYỀN CHỨNG THỰC",
        "fields": [
          {
            "label": "1. Ngày, tháng, năm thực hiện",
            "placeholder": "Ngày ..... tháng ..... năm .........",
            "type": "text"
          },
          {
            "label": "2. Địa điểm chứng thực",
            "placeholder": "Tại Bộ phận Tiếp nhận và Trả kết quả (Một cửa) UBND {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "3. Người thực hiện chứng thực",
            "placeholder": "Tôi: ....................................... - Chức vụ: .................................................",
            "type": "text"
          },
          {
            "label": "4. Chứng nhận",
            "placeholder": "Chứng thực bản sao này đúng với bản chính văn bản, giấy tờ do cơ quan có thẩm quyền cấp.",
            "type": "text"
          },
          {
            "label": "5. Số chứng thực",
            "placeholder": "Số: ............. quyển số: .......-SCT/BS",
            "type": "grid2",
            "secondLabel": "6. Lệ phí chứng thực",
            "secondPlaceholder": "2.000 đồng/trang (từ trang 3: 1.000 đ)"
          }
        ]
      }
    ],
    "commitText": "Người yêu cầu chứng thực xuất trình bản chính hợp lệ, không bị tẩy xóa, sửa chữa, chắp vá khống chỉ.",
    "signatures": [
      {
        "role": "NGƯỜI THỰC HIỆN CHỨNG THỰC",
        "note": "(Ký, ghi rõ họ tên, chức vụ và đóng dấu UBND)"
      },
      {
        "role": "NGƯỜI TIẾP NHẬN BẢN CHÍNH",
        "note": "(Kiểm tra đối chiếu bản gốc)"
      }
    ]
  },
  "TTHC-CT-02": {
    "procedureCode": "TTHC-CT-02",
    "formCode": "Mẫu Lời chứng - NĐ 23/2015/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "MẪU LỜI CHỨNG CHỨNG THỰC CHỮ KÝ TRONG GIẤY TỜ, VĂN BẢN",
    "legalNote": "(Ban hành kèm theo Nghị định số 23/2015/NĐ-CP ngày 16/02/2015 của Chính phủ)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "NỘI DUNG LỜI CHỨNG CHỨNG THỰC CHỮ KÝ",
        "fields": [
          {
            "label": "1. Thời gian, địa điểm chứng thực",
            "placeholder": "Ngày ..... tháng ..... năm ......... tại UBND {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "2. Người chứng thực",
            "placeholder": "Tôi: ....................................... - Chức vụ: .................................................",
            "type": "text"
          },
          {
            "label": "3. CHỨNG NHẬN Ông/Bà",
            "placeholder": "Họ tên: ..................................................... - CCCD số: ................................",
            "type": "text",
            "isBold": true
          },
          {
            "label": "4. Cam kết minh mẫn & tự nguyện",
            "placeholder": "Đã ký trước mặt tôi vào văn bản này; cam đoan nhận thức rõ quyền, nghĩa vụ và tự chịu trách nhiệm về nội dung của văn bản.",
            "type": "text"
          },
          {
            "label": "5. Số chứng thực",
            "placeholder": "Số: ............. quyển số: .......-SCT/CK",
            "type": "grid2",
            "secondLabel": "6. Lệ phí chứng thực",
            "secondPlaceholder": "10.000 đồng/trường hợp"
          }
        ]
      }
    ],
    "commitText": "LƯU Ý ĐẶC BIỆT: Người yêu cầu tuyệt đối KHÔNG được ký tên trước ở nhà. Phải ký trực tiếp trước mặt người thực hiện chứng thực tại UBND cấp xã.",
    "signatures": [
      {
        "role": "NGƯỜI THỰC HIỆN CHỨNG THỰC",
        "note": "(Ký, ghi rõ họ tên, chức vụ và đóng dấu UBND)"
      },
      {
        "role": "NGƯỜI YÊU CẦU CHỨNG THỰC CHỮ KÝ",
        "note": "(KÝ TRỰC TIẾP TRƯỚC MẶT CÔNG CHỨC)"
      }
    ]
  },
  "TTHC-CT-04": {
    "procedureCode": "TTHC-CT-04",
    "formCode": "Mẫu Văn bản phân chia di sản - NĐ 23/2015/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "VĂN BẢN THỎA THUẬN PHÂN CHIA DI SẢN THỪA KẾ",
    "legalNote": "(Theo Bộ luật Dân sự 2015 & Nghị định số 23/2015/NĐ-CP của Chính phủ)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. CÁC ĐỒNG THỪA KẾ (BÊN THỎA THUẬN)",
        "fields": [
          {
            "label": "1. Người thừa kế thứ nhất",
            "placeholder": "Họ tên: ........................................ - CCCD: ............................ - Quan hệ: Vợ/Con",
            "type": "text"
          },
          {
            "label": "2. Người thừa kế thứ hai",
            "placeholder": "Họ tên: ........................................ - CCCD: ............................ - Quan hệ: Con đẻ",
            "type": "text"
          },
          {
            "label": "3. Người thừa kế thứ ba (nếu có)",
            "placeholder": "Họ tên: ........................................ - CCCD: ............................ - Quan hệ: Con đẻ",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. DI SẢN THỪA KẾ VÀ THỎA THUẬN PHÂN CHIA",
        "fields": [
          {
            "label": "1. Người để lại di sản",
            "placeholder": "Họ tên người mất: .................................... - Ngày mất: ...../...../.........",
            "type": "text"
          },
          {
            "label": "2. Giấy tờ chứng minh di sản",
            "placeholder": "Giấy chứng nhận QSDĐ số: ................. do UBND cấp huyện cấp ngày ...../...../.........",
            "type": "text"
          },
          {
            "label": "3. Nội dung thỏa thuận phân chia",
            "placeholder": "Các đồng thừa kế nhất trí phân chia toàn bộ tài sản cho: Ông/Bà ..................................... đại diện đứng tên trên Giấy chứng nhận",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Chúng tôi cam đoan việc phân chia di sản này là hoàn toàn tự nguyện, không bị lừa dối, ép buộc và chịu trách nhiệm trước pháp luật.",
    "signatures": [
      {
        "role": "LỜI CHỨNG CỦA CHỦ TỊCH / PHÓ CHỦ TỊCH UBND",
        "note": "(Ký, ghi rõ họ tên và đóng dấu UBND)"
      },
      {
        "role": "CÁC ĐỒNG THỪA KẾ CÙNG KÝ TÊN",
        "note": "(KÝ TRỰC TIẾP TẠI BỘ PHẬN MỘT CỬA)"
      }
    ]
  },
  "TTHC-CT-05": {
    "procedureCode": "TTHC-CT-05",
    "formCode": "Mẫu Tờ khai ghi chú ly hôn - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI GHI CHÚ VIỆC LY HÔN / HỦY VIỆC KẾT HÔN ĐÃ GIẢI QUYẾT Ở NƯỚC NGOÀI",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP ngày 28/05/2020 của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI YÊU CẦU GHI CHÚ",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên",
            "placeholder": "NGUYỄN THỊ HỒNG",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "18/03/1991",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nữ"
          },
          {
            "label": "4. Số CCCD/Hộ chiếu",
            "placeholder": "089191004321 / Hộ chiếu số: ..................",
            "type": "text"
          },
          {
            "label": "5. Nơi cư trú tại Việt Nam",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. NỘI DUNG BẢN ÁN / QUYẾT ĐỊNH LY HÔN NƯỚC NGOÀI",
        "fields": [
          {
            "label": "1. Cơ quan giải quyết ly hôn",
            "placeholder": "Tòa án gia đình thành phố .........................., Quốc gia: ...................................",
            "type": "text"
          },
          {
            "label": "2. Bản án/Quyết định ly hôn số",
            "placeholder": "Số: .................... ngày có hiệu lực pháp luật: ...../...../.........",
            "type": "text"
          },
          {
            "label": "3. Họ tên người vợ / người chồng trước",
            "placeholder": "Họ tên người phối ngẫu: ..........................................................................",
            "type": "text"
          },
          {
            "label": "4. Đã thực hiện hợp pháp hóa lãnh sự",
            "placeholder": "Giấy chứng nhận HPHLS số: ....................... ngày ...../...../.........",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi cam đoan bản án ly hôn nêu trên đã có hiệu lực pháp luật và không có tranh chấp tại Việt Nam.",
    "signatures": [
      {
        "role": "CÔNG CHỨC TƯ PHÁP - HỘ TỊCH",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI YÊU CẦU GHI CHÚ",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-CT-06": {
    "procedureCode": "TTHC-CT-06",
    "formCode": "Mẫu Tờ khai ghi chú hộ tịch - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI GHI CHÚ SỰ KIỆN HỘ TỊCH ĐÃ GIẢI QUYẾT TẠI CƠ QUAN NƯỚC NGOÀI",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP ngày 28/05/2020 của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI YÊU CẦU",
        "fields": [
          {
            "label": "1. Họ và tên người yêu cầu",
            "placeholder": "TRẦN VĂN MINH",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD/Hộ chiếu",
            "placeholder": "089085006789",
            "type": "grid2",
            "secondLabel": "3. Số điện thoại",
            "secondPlaceholder": "0913456789"
          },
          {
            "label": "4. Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. NỘI DUNG SỰ KIỆN HỘ TỊCH ĐỀ NGHỊ GHI VÀO SỔ",
        "fields": [
          {
            "label": "1. Loại sự kiện hộ tịch",
            "placeholder": "Khai sinh / Giám hộ / Nhận cha mẹ con / Nuôi con nuôi / Khai tử ở nước ngoài",
            "type": "text"
          },
          {
            "label": "2. Giấy tờ hộ tịch nước ngoài",
            "placeholder": "Giấy chứng nhận số: ......... do Cơ quan hộ tịch ................. cấp ngày ...../...../.........",
            "type": "text"
          },
          {
            "label": "3. Bản dịch công chứng tiếng Việt",
            "placeholder": "Số công chứng: ......... Phòng Công chứng .................................................",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan các giấy tờ nộp kèm theo là hợp pháp và chịu trách nhiệm trước pháp luật.",
    "signatures": [
      {
        "role": "CÔNG CHỨC TƯ PHÁP - HỘ TỊCH",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI YÊU CẦU",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-CT-07": {
    "procedureCode": "TTHC-CT-07",
    "formCode": "Mẫu Văn bản từ chối nhận di sản - NĐ 23/2015/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "VĂN BẢN TỪ CHỐI NHẬN DI SẢN THỪA KẾ",
    "legalNote": "(Theo Điều 620 Bộ luật Dân sự 2015 & Nghị định số 23/2015/NĐ-CP của Chính phủ)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI TỪ CHỐI NHẬN DI SẢN",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên",
            "placeholder": "LÊ THỊ THẢO",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "22/07/1986",
            "type": "grid2",
            "secondLabel": "3. Số CCCD",
            "secondPlaceholder": "089186005544"
          },
          {
            "label": "4. Nơi thường trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "5. Quan hệ với người để lại di sản",
            "placeholder": "Con đẻ của người để lại di sản thừa kế",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. NỘI DUNG TỪ CHỐI NHẬN DI SẢN",
        "fields": [
          {
            "label": "1. Người để lại di sản",
            "placeholder": "Ông/Bà: ....................................... - Đã mất ngày: ...../...../.........",
            "type": "text"
          },
          {
            "label": "2. Di sản được thừa kế theo luật",
            "placeholder": "Quyền sử dụng đất và tài sản gắn liền với đất tại Thửa đất số: ....., Tờ bản đồ: ....., {WARD_NAME}",
            "type": "text"
          },
          {
            "label": "3. Tuyên bố từ chối",
            "placeholder": "Bằng văn bản này, tôi tự nguyện từ chối toàn bộ phần di sản thừa kế mà tôi được hưởng và không có bất kỳ khiếu nại, tranh chấp nào về sau.",
            "type": "text"
          },
          {
            "label": "4. Thời điểm từ chối",
            "placeholder": "Văn bản được lập trước thời điểm phân chia di sản theo luật định.",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Việc từ chối không nhằm trốn tránh nghĩa vụ tài sản đối với người khác. Ký trực tiếp trước mặt công chức chứng thực.",
    "signatures": [
      {
        "role": "LỜI CHỨNG CỦA UBND CẤP XÃ",
        "note": "(Chủ tịch / Phó Chủ tịch ký, đóng dấu)"
      },
      {
        "role": "NGƯỜI TỪ CHỐI NHẬN DI SẢN",
        "note": "(KÝ TRỰC TIẾP TRƯỚC MẶT CÔNG CHỨC)"
      }
    ]
  },
  "TTHC-CT-08": {
    "procedureCode": "TTHC-CT-08",
    "formCode": "Mẫu Lời chứng Di chúc - NĐ 23/2015/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "BẢN DI CHÚC VÀ LỜI CHỨNG CHỨNG THỰC CỦA UBND CẤP XÃ",
    "legalNote": "(Theo Bộ luật Dân sự 2015 & Nghị định số 23/2015/NĐ-CP của Chính phủ)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI LẬP DI CHÚC",
        "fields": [
          {
            "label": "1. Họ và tên người lập di chúc",
            "placeholder": "NGUYỄN VĂN TOÀN",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Sinh năm",
            "placeholder": "1948",
            "type": "grid2",
            "secondLabel": "3. Số CCCD",
            "secondPlaceholder": "089048003322"
          },
          {
            "label": "4. Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "5. Tình trạng tinh thần khi lập di chúc",
            "placeholder": "Hoàn toàn minh mẫn, tỉnh táo, không bị ép buộc hay lừa dối",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. NỘI DUNG ĐỊNH ĐOẠT TÀI SẢN",
        "fields": [
          {
            "label": "1. Tài sản định đoạt",
            "placeholder": "Quyền sử dụng thửa đất số: ....., Tờ bản đồ: ..... diện tích: ....... m2 tại {WARD_NAME}",
            "type": "text"
          },
          {
            "label": "2. Người được chỉ định hưởng di chúc",
            "placeholder": "Để lại toàn bộ quyền sử dụng đất cho con là: ....................................... CCCD số: ............................",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Người lập di chúc đã tự đọc lại toàn bộ nội dung di chúc, công nhận đúng ý chí và ký tên / điểm chỉ trước mặt người chứng thực.",
    "signatures": [
      {
        "role": "LỜI CHỨNG CỦA CHỦ TỊCH UBND CẤP XÃ",
        "note": "(Ký, ghi rõ họ tên và đóng dấu UBND)"
      },
      {
        "role": "NGƯỜI LẬP DI CHÚC",
        "note": "(Ký hoặc điểm chỉ trực tiếp)"
      }
    ]
  },
  "TTHC-DC-01": {
    "procedureCode": "TTHC-DC-01",
    "formCode": "Mẫu số 09/ĐK - TT 24/2014 & NĐ 101/2024/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "ĐƠN ĐĂNG KÝ BIẾN ĐỘNG ĐẤT ĐAI, TÀI SẢN GẮN LIỀN VỚI ĐẤT",
    "legalNote": "(Ban hành kèm theo Thông tư số 24/2014/TT-BTNMT & Nghị định 101/2024/NĐ-CP)",
    "recipient": "Ủy ban nhân dân {WARD_NAME} / Chi nhánh VP Đăng ký đất đai",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI SỬ DỤNG ĐẤT / CHỦ SỞ HỮU TÀI SẢN",
        "fields": [
          {
            "label": "1. Tên người sử dụng đất / chủ sở hữu",
            "placeholder": "HỘ ÔNG/BÀ NGUYỄN VĂN TÂM",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD/Định danh cá nhân",
            "placeholder": "089075001122",
            "type": "grid2",
            "secondLabel": "3. Số điện thoại",
            "secondPlaceholder": "0918765432"
          },
          {
            "label": "4. Địa chỉ thường trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. THÔNG TIN THỬA ĐẤT BIẾN ĐỘNG",
        "fields": [
          {
            "label": "1. Thửa đất số",
            "placeholder": "125",
            "type": "grid2",
            "secondLabel": "2. Tờ bản đồ số",
            "secondPlaceholder": "14"
          },
          {
            "label": "3. Địa chỉ thửa đất",
            "placeholder": "Ấp Vĩnh Chánh, {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "4. Giấy chứng nhận đã cấp số phát hành",
            "placeholder": "Số phát hành (Seri): CS ............., Số vào sổ cấp GCN: CH ......... do UBND cấp huyện cấp ngày ...../...../.........",
            "type": "text"
          },
          {
            "label": "5. Nội dung biến động đề nghị đăng ký",
            "placeholder": "Chuyển nhượng quyền sử dụng đất / Tặng cho quyền sử dụng đất / Thừa kế đất đai theo hợp đồng số: ....................",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan thửa đất không có tranh chấp, chấp hành nghiêm quy định pháp luật đất đai và chịu trách nhiệm trước pháp luật về lời khai của mình.",
    "signatures": [
      {
        "role": "XÁC NHẬN CỦA UBND CẤP XÃ (VỀ TÌNH TRẠNG TRANH CHẤP)",
        "note": "(Chủ tịch UBND ký, đóng dấu)"
      },
      {
        "role": "NGƯỜI KÊ KHAI ĐĂNG KÝ BIẾN ĐỘNG",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-DC-02": {
    "procedureCode": "TTHC-DC-02",
    "formCode": "Mẫu số 04a/ĐK - NĐ 101/2024/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "ĐƠN ĐĂNG KÝ, CẤP GIẤY CHỨNG NHẬN QUYỀN SỬ DỤNG ĐẤT LẦN ĐẦU",
    "legalNote": "(Ban hành kèm theo Nghị định số 101/2024/NĐ-CP & Luật Đất đai 2024)",
    "recipient": "Ủy ban nhân dân {WARD_NAME} / Phòng Tài nguyên và Môi trường",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI ĐĂNG KÝ CẤP GIẤY CHỨNG NHẬN",
        "fields": [
          {
            "label": "1. Tên người sử dụng đất",
            "placeholder": "NGUYỄN VĂN ĐỨC",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD",
            "placeholder": "089082006789",
            "type": "grid2",
            "secondLabel": "3. Giới tính/Ngày sinh",
            "secondPlaceholder": "Nam - 15/08/1982"
          },
          {
            "label": "4. Địa chỉ nơi thường trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. THÔNG TIN THỬA ĐẤT XIN CẤP GIẤY LẦN ĐẦU",
        "fields": [
          {
            "label": "1. Thửa đất số",
            "placeholder": "48",
            "type": "grid2",
            "secondLabel": "2. Tờ bản đồ số",
            "secondPlaceholder": "06"
          },
          {
            "label": "3. Diện tích xin cấp",
            "placeholder": "250.5 m2 (Trong đó đất ở: 150 m2, đất vườn: 100.5 m2)",
            "type": "text"
          },
          {
            "label": "4. Nguồn gốc sử dụng đất",
            "placeholder": "Đất do cha ông khai hoang để lại từ trước năm 1993, sử dụng ổn định lâu dài, không tranh chấp",
            "type": "text"
          },
          {
            "label": "5. Tình trạng nhà ở, công trình xây dựng",
            "placeholder": "Nhà cấp 4 kiên cố, diện tích xây dựng 110 m2",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan các nội dung kê khai là đúng sự thật, ranh giới thửa đất rõ ràng và chịu trách nhiệm trước pháp luật.",
    "signatures": [
      {
        "role": "Ý KIẾN XÁC NHẬN CỦA UBND CẤP XÃ (NGUỒN GỐC, KHÔNG TRANH CHẤP)",
        "note": "(Chủ tịch UBND xã ký, đóng dấu)"
      },
      {
        "role": "NGƯỜI KÊ KHAI LÀM ĐƠN",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-HT-01": {
    "procedureCode": "TTHC-HT-01",
    "formCode": "Mẫu Tờ khai Khai sinh - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ KHAI SINH",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP ngày 28/05/2020 của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI YÊU CẦU ĐĂNG KÝ KHAI SINH",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên người yêu cầu",
            "placeholder": "NGUYỄN VĂN CHA",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD/Định danh cá nhân",
            "placeholder": "089090001234",
            "type": "grid2",
            "secondLabel": "3. Quan hệ với trẻ",
            "secondPlaceholder": "Cha đẻ / Mẹ đẻ"
          },
          {
            "label": "4. Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. THÔNG TIN NGƯỜI ĐƯỢC ĐĂNG KÝ KHAI SINH",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên trẻ",
            "placeholder": "NGUYỄN AN NHIÊN",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Giới tính",
            "placeholder": "Nữ",
            "type": "grid2",
            "secondLabel": "3. Ngày, tháng, năm sinh",
            "secondPlaceholder": "10/05/2026"
          },
          {
            "label": "4. Dân tộc",
            "placeholder": "Kinh",
            "type": "grid2",
            "secondLabel": "5. Quốc tịch",
            "secondPlaceholder": "Việt Nam"
          },
          {
            "label": "6. Nơi sinh (cơ sở y tế)",
            "placeholder": "Bệnh viện Đa khoa Trung tâm An Giang / Trạm Y tế {WARD_NAME}",
            "type": "text"
          },
          {
            "label": "7. Quê quán",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "8. Giấy chứng sinh số",
            "placeholder": "Số: ......../GCS ngày ...../...../.........",
            "type": "text"
          }
        ]
      },
      {
        "title": "III. THÔNG TIN CHA VÀ MẸ CỦA TRẺ",
        "fields": [
          {
            "label": "1. Họ tên cha",
            "placeholder": "NGUYỄN VĂN CHA - Năm sinh: 1990 - CCCD: 089090001234 - Dân tộc: Kinh",
            "type": "text"
          },
          {
            "label": "2. Họ tên mẹ",
            "placeholder": "TRẦN THỊ MẸ - Năm sinh: 1993 - CCCD: 089193005678 - Dân tộc: Kinh",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi cam đoan nội dung khai trên là đúng sự thật và chịu hoàn toàn trách nhiệm trước pháp luật về việc khai sinh của con.",
    "signatures": [
      {
        "role": "CÔNG CHỨC TƯ PHÁP - HỘ TỊCH",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI ĐI KHAI SINH",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-HT-02": {
    "procedureCode": "TTHC-HT-02",
    "formCode": "Mẫu Tờ khai Kết hôn - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ KẾT HÔN",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP ngày 28/05/2020 của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN BÊN NAM",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên nam",
            "placeholder": "NGUYỄN VĂN HÙNG",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "15/03/1998 (Đủ 20 tuổi trở lên)",
            "type": "grid2",
            "secondLabel": "3. Dân tộc",
            "secondPlaceholder": "Kinh"
          },
          {
            "label": "4. Số CCCD",
            "placeholder": "089098001122",
            "type": "grid2",
            "secondLabel": "5. Quốc tịch",
            "secondPlaceholder": "Việt Nam"
          },
          {
            "label": "6. Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "7. Tình trạng hôn nhân",
            "placeholder": "Chưa đăng ký kết hôn lần nào",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. THÔNG TIN BÊN NỮ",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên nữ",
            "placeholder": "LÊ THỊ MAI",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "20/10/2002 (Đủ 18 tuổi trở lên)",
            "type": "grid2",
            "secondLabel": "3. Dân tộc",
            "secondPlaceholder": "Kinh"
          },
          {
            "label": "4. Số CCCD",
            "placeholder": "089102003344",
            "type": "grid2",
            "secondLabel": "5. Quốc tịch",
            "secondPlaceholder": "Việt Nam"
          },
          {
            "label": "6. Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "7. Tình trạng hôn nhân",
            "placeholder": "Chưa đăng ký kết hôn lần nào",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Hai bên chúng tôi tự nguyện kết hôn, không bị ai ép buộc hay lừa dối, không vi phạm các điều cấm kết hôn của Luật Hôn nhân và Gia đình.",
    "signatures": [
      {
        "role": "CHỮ KÝ CỦA BÊN NAM",
        "note": "(Ký và ghi rõ họ tên)"
      },
      {
        "role": "CHỮ KÝ CỦA BÊN NỮ",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-HT-03": {
    "procedureCode": "TTHC-HT-03",
    "formCode": "Mẫu Tờ khai Khai tử - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ KHAI TỬ CÓ YẾU TỐ NƯỚC NGOÀI KHU VỰC BIÊN GIỚI",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP ngày 28/05/2020 của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI ĐI KHAI TỬ",
        "fields": [
          {
            "label": "1. Họ và tên người yêu cầu",
            "placeholder": "NGUYỄN VĂN GIÀU",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD/Hộ chiếu",
            "placeholder": "089077002233",
            "type": "grid2",
            "secondLabel": "3. Quan hệ với người chết",
            "secondPlaceholder": "Thân nhân / Chủ nhà"
          },
          {
            "label": "4. Nơi cư trú",
            "placeholder": "Khu vực biên giới xã/phường {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. THÔNG TIN NGƯỜI CHẾT",
        "fields": [
          {
            "label": "1. Họ và tên người chết",
            "placeholder": "SOK PHALLA (Công dân Campuchia cư trú biên giới)",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh / Giới tính",
            "placeholder": "03/02/1970 - Nam",
            "type": "grid2",
            "secondLabel": "3. Quốc tịch",
            "secondPlaceholder": "Campuchia"
          },
          {
            "label": "4. Chết vào ngày",
            "placeholder": "...../...../......... tại {WARD_NAME}",
            "type": "grid2",
            "secondLabel": "5. Giấy báo tử/Xác nhận số",
            "secondPlaceholder": "Số: ........ do Cơ sở y tế cấp"
          },
          {
            "label": "6. Nguyên nhân chết",
            "placeholder": "Bệnh lý thông thường / Già yếu",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi cam đoan thông tin khai tử trên là chính xác và hoàn toàn chịu trách nhiệm trước pháp luật.",
    "signatures": [
      {
        "role": "CÔNG CHỨC TƯ PHÁP - HỘ TỊCH",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI ĐI KHAI TỬ",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-HT-04": {
    "procedureCode": "TTHC-HT-04",
    "formCode": "Mẫu Tờ khai Trích lục - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI CẤP BẢN SAO TRÍCH LỤC HỘ TỊCH",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP ngày 28/05/2020 của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI YÊU CẦU CẤP BẢN SAO",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên",
            "placeholder": "PHAN VĂN HẢI",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD",
            "placeholder": "089089004567",
            "type": "grid2",
            "secondLabel": "3. Quan hệ với người có tên trong sổ",
            "secondPlaceholder": "Bản thân / Cha mẹ / Con"
          },
          {
            "label": "4. Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. NỘI DUNG ĐỀ NGHỊ CẤP BẢN SAO TRÍCH LỤC",
        "fields": [
          {
            "label": "1. Loại trích lục hộ tịch yêu cầu",
            "placeholder": "Trích lục Khai sinh / Trích lục Kết hôn / Trích lục Khai tử",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Họ tên người có tên trong trích lục",
            "placeholder": "PHAN VĂN HẢI - Sinh ngày: 10/05/1989",
            "type": "text"
          },
          {
            "label": "3. Đã đăng ký tại UBND",
            "placeholder": "UBND {WARD_NAME}, Số sổ: ....... Quyển số: ...... Năm đăng ký: ........",
            "type": "text"
          },
          {
            "label": "4. Số lượng bản sao đề nghị cấp",
            "placeholder": "03 bản sao",
            "type": "grid2",
            "secondLabel": "5. Lệ phí",
            "secondPlaceholder": "8.000 đồng/bản"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan mục đích xin trích lục là chính đáng và chịu trách nhiệm trước pháp luật.",
    "signatures": [
      {
        "role": "CÔNG CHỨC TIẾP NHẬN",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI YÊU CẦU CẤP BẢN SAO",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-HT-05": {
    "procedureCode": "TTHC-HT-05",
    "formCode": "Mẫu Tờ khai Nhận cha mẹ con - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ NHẬN CHA, MẸ, CON CÓ YẾU TỐ NƯỚC NGOÀI",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI NHẬN",
        "fields": [
          {
            "label": "1. Họ và tên người nhận",
            "placeholder": "NGUYỄN VĂN TIẾN",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh / Quốc tịch",
            "placeholder": "12/04/1984 - Quốc tịch: Việt Nam",
            "type": "grid2",
            "secondLabel": "3. Số CCCD/Hộ chiếu",
            "secondPlaceholder": "089084001234"
          },
          {
            "label": "4. Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. THÔNG TIN NGƯỜI ĐƯỢC NHẬN VÀ CHỨNG CỨ",
        "fields": [
          {
            "label": "1. Họ và tên người được nhận",
            "placeholder": "NGUYỄN MINH ANH",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh / Quốc tịch",
            "placeholder": "01/06/2020 - Quốc tịch: Việt Nam",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nam"
          },
          {
            "label": "4. Chứng cứ chứng minh quan hệ cha con",
            "placeholder": "Kết quả giám định ADN số: ................. của Trung tâm giám định y khoa / Văn bản thỏa thuận",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Việc nhận cha mẹ con là tự nguyện, hoàn toàn không có tranh chấp và đúng quan hệ huyết thống.",
    "signatures": [
      {
        "role": "NGƯỜI NHẬN CHA / MẸ",
        "note": "(Ký và ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI MẸ HOẶC NGƯỜI ĐẠI DIỆN HỢP PHÁP",
        "note": "(Đồng ý, ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-HT-06": {
    "procedureCode": "TTHC-HT-06",
    "formCode": "Mẫu Tờ khai Giám hộ - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ GIÁM HỘ",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI ĐĂNG KÝ LÀM GIÁM HỘ",
        "fields": [
          {
            "label": "1. Họ và tên người giám hộ",
            "placeholder": "VÕ VĂN CHÚ",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "05/09/1979",
            "type": "grid2",
            "secondLabel": "3. Số CCCD",
            "secondPlaceholder": "089079008899"
          },
          {
            "label": "4. Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "5. Quan hệ với người được giám hộ",
            "placeholder": "Chú ruột / Bác ruột / Người giám hộ cử",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. THÔNG TIN NGƯỜI ĐƯỢC GIÁM HỘ",
        "fields": [
          {
            "label": "1. Họ và tên người được giám hộ",
            "placeholder": "VÕ THỊ BÉ",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "10/10/2015",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nữ"
          },
          {
            "label": "4. Lý do cần người giám hộ",
            "placeholder": "Trẻ em mồ côi cả cha và mẹ / Người mất năng lực hành vi dân sự",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi cam đoan có đủ điều kiện làm người giám hộ theo quy định của Bộ luật Dân sự và cam kết bảo vệ quyền lợi tốt nhất cho người được giám hộ.",
    "signatures": [
      {
        "role": "CÔNG CHỨC TƯ PHÁP - HỘ TỊCH",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI ĐĂNG KÝ GIÁM HỘ",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-HT-07": {
    "procedureCode": "TTHC-HT-07",
    "formCode": "Mẫu Tờ khai Chấm dứt giám hộ - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ CHẤM DỨT GIÁM HỘ CÓ YẾU TỐ NƯỚC NGOÀI",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI YÊU CẦU CHẤM DỨT GIÁM HỘ",
        "fields": [
          {
            "label": "1. Họ và tên người yêu cầu",
            "placeholder": "VÕ VĂN CHÚ",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD/Hộ chiếu",
            "placeholder": "089079008899",
            "type": "grid2",
            "secondLabel": "3. Nơi cư trú",
            "secondPlaceholder": "{WARD_NAME}, Tỉnh An Giang"
          },
          {
            "label": "4. Đã đăng ký giám hộ theo Trích lục số",
            "placeholder": "Số: ......../TLGH ngày ...../...../......... do UBND {WARD_NAME} cấp",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. LÝ DO CHẤM DỨT GIÁM HỘ",
        "fields": [
          {
            "label": "1. Họ tên người được giám hộ",
            "placeholder": "VÕ THỊ BÉ - Sinh ngày: 10/10/2008 (Đã đủ 18 tuổi)",
            "type": "text"
          },
          {
            "label": "2. Căn cứ chấm dứt giám hộ",
            "placeholder": "Người được giám hộ đã thành niên và có đầy đủ năng lực hành vi dân sự / Cha mẹ đã có đủ điều kiện nuôi dưỡng",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Các bên đã thanh toán xong tài sản giám hộ và không có tranh chấp.",
    "signatures": [
      {
        "role": "CÔNG CHỨC TƯ PHÁP - HỘ TỊCH",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI YÊU CẦU CHẤM DỨT GIÁM HỘ",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-HT-08": {
    "procedureCode": "TTHC-HT-08",
    "formCode": "Mẫu Đăng ký lại Khai sinh - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ LẠI KHAI SINH CÓ YẾU TỐ NƯỚC NGOÀI",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI YÊU CẦU ĐĂNG KÝ LẠI",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên",
            "placeholder": "NGUYỄN VĂN SƠN",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "02/09/1975",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nam"
          },
          {
            "label": "4. Số CCCD/Hộ chiếu",
            "placeholder": "089075009988",
            "type": "grid2",
            "secondLabel": "5. Quốc tịch",
            "secondPlaceholder": "Việt Nam"
          },
          {
            "label": "6. Nơi thường trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. NỘI DUNG ĐÃ ĐĂNG KÝ KHAI SINH TRƯỚC ĐÂY",
        "fields": [
          {
            "label": "1. Đã đăng ký khai sinh tại",
            "placeholder": "UBND {WARD_NAME} trước năm 2016",
            "type": "text"
          },
          {
            "label": "2. Lý do đăng ký lại",
            "placeholder": "Sổ hộ tịch gốc và bản chính Giấy khai sinh bị mất, thất lạc do thiên tai/chiến tranh",
            "type": "text"
          },
          {
            "label": "3. Giấy tờ tài liệu nộp chứng minh",
            "placeholder": "Học bạ, Lý lịch đảng viên, Sổ hộ khẩu cũ, Bằng tốt nghiệp chứng minh ngày tháng năm sinh",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan các thông tin nhân thân khai trên là chính xác và hoàn toàn chịu trách nhiệm trước pháp luật.",
    "signatures": [
      {
        "role": "CÔNG CHỨC TƯ PHÁP - HỘ TỊCH",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI YÊU CẦU ĐĂNG KÝ LẠI",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-HT-09": {
    "procedureCode": "TTHC-HT-09",
    "formCode": "Mẫu Đăng ký lại Kết hôn - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ LẠI KẾT HÔN CÓ YẾU TỐ NƯỚC NGOÀI",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN BÊN NAM VÀ BÊN NỮ",
        "fields": [
          {
            "label": "1. Họ tên bên Nam",
            "placeholder": "TRẦN VĂN BẮC - Sinh: 1980 - CCCD/Hộ chiếu: ............................",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Họ tên bên Nữ",
            "placeholder": "LÊ THỊ THU - Sinh: 1983 - CCCD/Hộ chiếu: ............................",
            "type": "text",
            "isBold": true
          },
          {
            "label": "3. Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. NỘI DUNG ĐÃ ĐĂNG KÝ KẾT HÔN TRƯỚC ĐÂY",
        "fields": [
          {
            "label": "1. Nơi và năm đăng ký trước đây",
            "placeholder": "Đã đăng ký kết hôn tại UBND {WARD_NAME} vào năm: .........",
            "type": "text"
          },
          {
            "label": "2. Lý do đăng ký lại",
            "placeholder": "Sổ hộ tịch và Giấy chứng nhận kết hôn gốc bị hư hỏng, thất lạc hoàn toàn",
            "type": "text"
          },
          {
            "label": "3. Tình trạng quan hệ hiện tại",
            "placeholder": "Hai bên vẫn duy trì quan hệ hôn nhân gia đình bình thường đến nay",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Hai bên vợ chồng cam đoan vẫn đang chung sống và chưa từng ly hôn tại bất kỳ cơ quan nào.",
    "signatures": [
      {
        "role": "CHỮ KÝ BÊN NAM",
        "note": "(Ký và ghi rõ họ tên)"
      },
      {
        "role": "CHỮ KÝ BÊN NỮ",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-HT-10": {
    "procedureCode": "TTHC-HT-10",
    "formCode": "Mẫu Đăng ký lại Khai tử - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ LẠI KHAI TỬ CÓ YẾU TỐ NƯỚC NGOÀI",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI YÊU CẦU",
        "fields": [
          {
            "label": "1. Họ và tên người yêu cầu",
            "placeholder": "LÝ VĂN BÌNH",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD",
            "placeholder": "089066007788",
            "type": "grid2",
            "secondLabel": "3. Quan hệ với người chết",
            "secondPlaceholder": "Con đẻ / Thân nhân"
          },
          {
            "label": "4. Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. THÔNG TIN NGƯỜI ĐÃ ĐƯỢC KHAI TỬ TRƯỚC ĐÂY",
        "fields": [
          {
            "label": "1. Họ và tên người chết",
            "placeholder": "LÝ VĂN ÔNG - Năm sinh: 1935",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Thời gian và nơi chết",
            "placeholder": "Chết ngày ...../...../......... tại {WARD_NAME}",
            "type": "text"
          },
          {
            "label": "3. Đã đăng ký khai tử trước đây tại",
            "placeholder": "UBND {WARD_NAME} nhưng nay sổ hộ tịch và giấy chứng tử gốc không còn lưu trữ",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Người yêu cầu cam đoan sự việc khai tử là có thật và chịu trách nhiệm trước pháp luật.",
    "signatures": [
      {
        "role": "CÔNG CHỨC TƯ PHÁP - HỘ TỊCH",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI YÊU CẦU ĐĂNG KÝ LẠI",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-HT-11": {
    "procedureCode": "TTHC-HT-11",
    "formCode": "Mẫu Xác nhận TTHN - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI CẤP GIẤY XÁC NHẬN TÌNH TRẠNG HÔN NHÂN",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP ngày 28/05/2020 của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI YÊU CẦU CẤP GIẤY XÁC NHẬN",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên",
            "placeholder": "NGUYỄN VĂN TOÀN",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày, tháng, năm sinh",
            "placeholder": "25/11/1997",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nam"
          },
          {
            "label": "4. Số định danh cá nhân (CCCD)",
            "placeholder": "089097005432",
            "type": "grid2",
            "secondLabel": "5. Dân tộc/Quốc tịch",
            "secondPlaceholder": "Kinh - Việt Nam"
          },
          {
            "label": "6. Nơi thường trú",
            "placeholder": "Ấp Vĩnh Lợi, {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "7. Tình trạng hôn nhân hiện tại",
            "placeholder": "Hiện tại chưa đăng ký kết hôn với ai / Đã ly hôn theo Bản án số ...... hiện chưa kết hôn lại",
            "type": "text",
            "isBold": true
          }
        ]
      },
      {
        "title": "II. MỤC ĐÍCH SỬ DỤNG GIẤY XÁC NHẬN TÌNH TRẠNG HÔN NHÂN",
        "fields": [
          {
            "label": "1. Mục đích xin cấp giấy",
            "placeholder": "Đăng ký kết hôn với Cô Lê Thị Lan (Sinh 2001, CCCD: 089101004321, Trú tại: TP. Long Xuyên) / Làm thủ tục mua bán nhà đất / Vay vốn ngân hàng",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Thời gian xin xác nhận",
            "placeholder": "Từ khi đủ tuổi kết hôn (25/11/2017) cho đến thời điểm hiện tại",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan tình trạng hôn nhân nêu trên là hoàn toàn đúng sự thật. Nếu sai trái, tôi xin chịu hoàn toàn trách nhiệm trước pháp luật và hủy bỏ việc đăng ký kết hôn hoặc giao dịch dân sự phát sinh.",
    "signatures": [
      {
        "role": "CÔNG CHỨC TƯ PHÁP - HỘ TỊCH",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI LÀM TỜ KHAI",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-HT-12": {
    "procedureCode": "TTHC-HT-12",
    "formCode": "Mẫu Cải chính hộ tịch - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ THAY ĐỔI, CẢI CHÍNH, BỔ SUNG HỘ TỊCH, XÁC ĐỊNH LẠI DÂN TỘC",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI YÊU CẦU",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên",
            "placeholder": "TRƯƠNG THỊ DUNG",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày sinh",
            "placeholder": "08/08/1993",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nữ"
          },
          {
            "label": "4. Số CCCD",
            "placeholder": "089193007654",
            "type": "grid2",
            "secondLabel": "5. Nơi cư trú",
            "secondPlaceholder": "{WARD_NAME}, Tỉnh An Giang"
          }
        ]
      },
      {
        "title": "II. NỘI DUNG YÊU CẦU CẢI CHÍNH / BỔ SUNG",
        "fields": [
          {
            "label": "1. Giấy tờ hộ tịch cần cải chính",
            "placeholder": "Giấy khai sinh số: ....... cấp ngày ...../...../......... tại UBND {WARD_NAME}",
            "type": "text"
          },
          {
            "label": "2. Nội dung đã ghi trước đây",
            "placeholder": "Họ tên mẹ ghi là: Trương Thị Duyên",
            "type": "text"
          },
          {
            "label": "3. Đề nghị cải chính / bổ sung lại là",
            "placeholder": "Họ tên mẹ chính xác là: Trương Thị Dung theo đúng CCCD và Sổ hộ khẩu",
            "type": "text",
            "isBold": true
          },
          {
            "label": "4. Lý do cải chính",
            "placeholder": "Do sai sót đánh máy khi lập sổ hộ tịch trước đây",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan các tài liệu chứng minh kèm theo là xác thực và chịu trách nhiệm trước pháp luật.",
    "signatures": [
      {
        "role": "CÔNG CHỨC TƯ PHÁP - HỘ TỊCH",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI LÀM TỜ KHAI",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-HT-13": {
    "procedureCode": "TTHC-HT-13",
    "formCode": "Mẫu Tờ khai Khai tử - TT 04/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ KHAI TỬ (TRONG NƯỚC)",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2020/TT-BTP ngày 28/05/2020 của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI ĐI KHAI TỬ",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên người yêu cầu",
            "placeholder": "NGUYỄN VĂN CON",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD/Định danh cá nhân",
            "placeholder": "089088005678",
            "type": "grid2",
            "secondLabel": "3. Quan hệ với người chết",
            "secondPlaceholder": "Con đẻ / Vợ / Chồng / Người thân"
          },
          {
            "label": "4. Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. THÔNG TIN NGƯỜI ĐƯỢC ĐĂNG KÝ KHAI TỬ",
        "fields": [
          {
            "label": "1. Họ, chữ đệm và tên người chết",
            "placeholder": "NGUYỄN VĂN CHA",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Ngày, tháng, năm sinh",
            "placeholder": "01/01/1945",
            "type": "grid2",
            "secondLabel": "3. Giới tính",
            "secondPlaceholder": "Nam"
          },
          {
            "label": "4. Số CCCD người chết",
            "placeholder": "089045001234",
            "type": "grid2",
            "secondLabel": "5. Dân tộc/Quốc tịch",
            "secondPlaceholder": "Kinh - Việt Nam"
          },
          {
            "label": "6. Nơi thường trú cuối cùng",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "7. Đã chết vào lúc",
            "placeholder": "..... giờ ..... phút, ngày ...../...../.........",
            "type": "grid2",
            "secondLabel": "8. Nơi chết",
            "secondPlaceholder": "Tại nhà riêng"
          },
          {
            "label": "9. Nguyên nhân chết",
            "placeholder": "Tuổi cao sức yếu / Bệnh lý",
            "type": "text"
          },
          {
            "label": "10. Căn cứ Giấy báo tử số",
            "placeholder": "Số: ......../GBT do Trạm Y tế xã {WARD_NAME} cấp ngày ...../...../.........",
            "type": "text",
            "isBold": true
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan các thông tin kê khai là chính xác và nộp hồ sơ trong thời hạn luật định (15 ngày kể từ ngày người chết qua đời).",
    "signatures": [
      {
        "role": "CÔNG CHỨC TƯ PHÁP - HỘ TỊCH",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "NGƯỜI ĐI KHAI TỬ",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-MT-01": {
    "procedureCode": "TTHC-MT-01",
    "formCode": "Mẫu Đăng ký môi trường - NĐ 08/2022/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "BẢN ĐĂNG KÝ MÔI TRƯỜNG CỦA CƠ SỞ SẢN XUẤT, KINH DOANH, DỊCH VỤ CẤP XÃ",
    "legalNote": "(Theo Điều 49 Luật Bảo vệ môi trường 2020 & Nghị định số 08/2022/NĐ-CP)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN CHỦ DỰ ÁN / CƠ SỞ",
        "fields": [
          {
            "label": "1. Tên chủ cơ sở / Doanh nghiệp / Hộ kinh doanh",
            "placeholder": "HỘ KINH DOANH XƯỞNG MỘC NGUYỄN VĂN A",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Đại diện theo pháp luật",
            "placeholder": "Ông: NGUYỄN VĂN A - Chức vụ: Chủ hộ kinh doanh",
            "type": "text"
          },
          {
            "label": "3. Mã số thuế / Đăng ký hộ kinh doanh số",
            "placeholder": "Số: 51A8001234 do UBND cấp huyện cấp",
            "type": "grid2",
            "secondLabel": "4. Số điện thoại",
            "secondPlaceholder": "0918123789"
          },
          {
            "label": "5. Địa điểm thực hiện cơ sở",
            "placeholder": "Ấp An Hòa, {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. QUY MÔ VÀ BIỆN PHÁP BẢO VỆ MÔI TRƯỜNG",
        "fields": [
          {
            "label": "1. Loại hình hoạt động sản xuất",
            "placeholder": "Gia công đồ gỗ dân dụng, công suất 20 bộ bàn ghế/tháng",
            "type": "text"
          },
          {
            "label": "2. Phát sinh chất thải rắn & nước thải",
            "placeholder": "Mạt cưa 50kg/tuần thu gom làm phân hữu cơ; Nước thải sinh hoạt qua bể tự hoại 3 ngăn",
            "type": "text"
          },
          {
            "label": "3. Biện pháp giảm thiểu bụi và tiếng ồn",
            "placeholder": "Lắp đặt hệ thống lọc hút bụi túi vải, che chắn kín xưởng gia công theo quy chuẩn",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Chủ cơ sở cam kết thực hiện đúng các biện pháp bảo vệ môi trường đã đăng ký và chịu sự kiểm tra, giám sát của UBND cấp xã.",
    "signatures": [
      {
        "role": "TIẾP NHẬN CỦA UBND CẤP XÃ",
        "note": "(Chủ tịch / Phó Chủ tịch ký, đóng dấu vào sổ theo dõi)"
      },
      {
        "role": "CHỦ DỰ ÁN / CHỦ CƠ SỞ SẢN XUẤT",
        "note": "(Ký, đóng dấu nếu có)"
      }
    ]
  },
  "TTHC-NCC-01": {
    "procedureCode": "TTHC-NCC-01",
    "formCode": "Mẫu số 01 - NĐ 131/2021/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "ĐƠN ĐỀ NGHỊ GIẢI QUYẾT CHẾ ĐỘ ƯU ĐÃI NGƯỜI CÓ CÔNG VỚI CÁCH MẠNG",
    "legalNote": "(Ban hành kèm theo Nghị định số 131/2021/NĐ-CP ngày 30/12/2021 của Chính phủ)",
    "recipient": "Ủy ban nhân dân {WARD_NAME} / Phòng Lao động - Thương binh và Xã hội",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI CÓ CÔNG / THÂN NHÂN",
        "fields": [
          {
            "label": "1. Họ và tên người làm đơn",
            "placeholder": "TRẦN VĂN CHIẾN",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Sinh năm / Giới tính",
            "placeholder": "1952 - Nam",
            "type": "grid2",
            "secondLabel": "3. Số CCCD",
            "secondPlaceholder": "089052003456"
          },
          {
            "label": "4. Nơi thường trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "5. Thuộc diện người có công",
            "placeholder": "Thương binh hạng 3/4 / Bệnh binh / Thân nhân liệt sĩ / Người hoạt động kháng chiến giải phóng dân tộc",
            "type": "text",
            "isBold": true
          }
        ]
      },
      {
        "title": "II. NỘI DUNG ĐỀ NGHỊ HƯỞNG CHẾ ĐỘ ƯU ĐÃI",
        "fields": [
          {
            "label": "1. Chế độ ưu đãi đề nghị",
            "placeholder": "Trợ cấp hàng tháng / Cấp phương tiện trợ giúp / Chế độ điều dưỡng phục hồi sức khỏe / Hỗ trợ nhà ở",
            "type": "text"
          },
          {
            "label": "2. Giấy tờ hồ sơ nộp kèm",
            "placeholder": "Bản sao Huân chương / Huy chương kháng chiến / Bằng Tổ quốc ghi công / Biên bản giám định thương tật",
            "type": "text"
          },
          {
            "label": "3. Tài khoản nhận trợ cấp ưu đãi",
            "placeholder": "STK: ................................. tại Ngân hàng Chính sách xã hội / Vietcombank",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan các thông tin kê khai là đúng sự thật và chưa hưởng trùng chế độ ở địa phương khác.",
    "signatures": [
      {
        "role": "CÁN BỘ CHÍNH SÁCH - XÃ HỘI UBND CẤP XÃ",
        "note": "(Kiểm tra, ký xác nhận hồ sơ)"
      },
      {
        "role": "NGƯỜI CÓ CÔNG / THÂN NHÂN LÀM ĐƠN",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-XD-01": {
    "procedureCode": "TTHC-XD-01",
    "formCode": "Mẫu số 01 Phụ lục II - NĐ 15/2021/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "ĐƠN ĐỀ NGHỊ CẤP GIẤY PHÉP XÂY DỰNG NHÀ Ở RIÊNG LẺ",
    "legalNote": "(Ban hành kèm theo Nghị định số 15/2021/NĐ-CP ngày 03/03/2021 của Chính phủ)",
    "recipient": "Ủy ban nhân dân {WARD_NAME} / Phòng Quản lý Đô thị",
    "sections": [
      {
        "title": "I. THÔNG TIN CHỦ ĐẦU TƯ / CHỦ HỘ",
        "fields": [
          {
            "label": "1. Tên chủ hộ / Chủ đầu tư",
            "placeholder": "ÔNG NGUYỄN VĂN ANH & BÀ LÊ THỊ BÍCH",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD",
            "placeholder": "089080004567",
            "type": "grid2",
            "secondLabel": "3. Số điện thoại",
            "secondPlaceholder": "0919123456"
          },
          {
            "label": "4. Địa chỉ liên hệ",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. THÔNG TIN CÔNG TRÌNH XÂY DỰNG",
        "fields": [
          {
            "label": "1. Địa điểm xây dựng",
            "placeholder": "Thửa đất số: 68, Tờ bản đồ: 09, {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "2. Diện tích lô đất",
            "placeholder": "120 m2 (Chiều rộng mặt tiền: 6m, Chiều sâu: 20m)",
            "type": "grid2",
            "secondLabel": "3. Diện tích xây dựng tầng 1",
            "secondPlaceholder": "90 m2"
          },
          {
            "label": "4. Tổng diện tích sàn xây dựng",
            "placeholder": "240 m2",
            "type": "grid2",
            "secondLabel": "5. Chiều cao công trình / Số tầng",
            "secondPlaceholder": "10.5m / 02 tầng + 1 tum"
          },
          {
            "label": "6. Kết cấu công trình",
            "placeholder": "Khung bê tông cốt thép chịu lực, tường gạch, mái bê tông dán ngói",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi cam đoan thi công đúng ranh giới đất ở hợp pháp, đúng chỉ giới xây dựng, đảm bảo an toàn cho các công trình liền kề và tuân thủ quy chuẩn xây dựng.",
    "signatures": [
      {
        "role": "CÁN BỘ ĐỊA CHÍNH - XÂY DỰNG CẤP XÃ",
        "note": "(Kiểm tra hiện trạng và quy hoạch)"
      },
      {
        "role": "CHỦ ĐẦU TƯ / CHỦ NHÀ",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-XD-02": {
    "procedureCode": "TTHC-XD-02",
    "formCode": "Mẫu số 02 Phụ lục II - NĐ 15/2021/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "ĐƠN ĐỀ NGHỊ ĐIỀU CHỈNH / GIA HẠN GIẤY PHÉP XÂY DỰNG",
    "legalNote": "(Ban hành kèm theo Nghị định số 15/2021/NĐ-CP ngày 03/03/2021 của Chính phủ)",
    "recipient": "Ủy ban nhân dân {WARD_NAME} / Phòng Quản lý Đô thị",
    "sections": [
      {
        "title": "I. THÔNG TIN CHỦ ĐẦU TƯ",
        "fields": [
          {
            "label": "1. Tên chủ đầu tư",
            "placeholder": "NGUYỄN VĂN ANH",
            "type": "text",
            "isBold": true
          },
          {
            "label": "2. Số CCCD",
            "placeholder": "089080004567",
            "type": "grid2",
            "secondLabel": "3. Số điện thoại",
            "secondPlaceholder": "0919123456"
          },
          {
            "label": "4. Giấy phép xây dựng đã được cấp số",
            "placeholder": "GPXD số: ....../GPXD do UBND cấp ngày ...../...../.........",
            "type": "text",
            "isBold": true
          }
        ]
      },
      {
        "title": "II. NỘI DUNG ĐỀ NGHỊ ĐIỀU CHỈNH / GIA HẠN",
        "fields": [
          {
            "label": "1. Yêu cầu giải quyết",
            "placeholder": "Gia hạn Giấy phép xây dựng thêm 12 tháng / Điều chỉnh thiết kế công năng tầng lửng",
            "type": "text"
          },
          {
            "label": "2. Lý do xin gia hạn / điều chỉnh",
            "placeholder": "Do điều kiện thời tiết mùa mưa kéo dài và nguồn vật tư chậm trễ, công trình chưa thể hoàn thành đúng hạn",
            "type": "text"
          },
          {
            "label": "3. Thời gian gia hạn đề nghị",
            "placeholder": "Kể từ ngày ...../...../......... đến ngày ...../...../.........",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan tiếp tục thực hiện xây dựng nghiêm túc theo nội dung gia hạn được phê duyệt và chịu trách nhiệm trước pháp luật.",
    "signatures": [
      {
        "role": "CÁN BỘ THẨM ĐỊNH MỘT CỬA",
        "note": "(Ký, ghi rõ họ tên)"
      },
      {
        "role": "CHỦ ĐẦU TƯ ĐỀ NGHỊ GIA HẠN",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  }
};

export const getA4TemplateByCode = (code: string): A4FormTemplate | undefined => {
  return A4_FORM_TEMPLATES[code];
};
