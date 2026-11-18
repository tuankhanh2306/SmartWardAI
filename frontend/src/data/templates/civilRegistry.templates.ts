import type { A4FormTemplate } from './types';

export const CIVIL_REGISTRY_TEMPLATES: Record<string, A4FormTemplate> = {
  "TTHC-CR-07": {
    "procedureCode": "TTHC-CR-07",
    "formCode": "Mẫu CT03 - TT 66/2023/TT-BCA & TT 53/2025/TT-BCA",
    "agencyType": "POLICE",
    "title": "PHIẾU KHAI BÁO TẠM VẮNG",
    "legalNote": "(Ban hành kèm theo Thông tư số 66/2023/TT-BCA, sửa đổi bổ sung tại Thông tư số 53/2025/TT-BCA của Bộ Công an)",
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
    "formCode": "Mẫu CT01 & Mẫu CT07 - TT 66/2023/TT-BCA & TT 53/2025/TT-BCA",
    "agencyType": "POLICE",
    "title": "GIẤY XÁC NHẬN THÔNG TIN VỀ CƯ TRÚ",
    "legalNote": "(Ban hành kèm theo Thông tư số 66/2023/TT-BCA, sửa đổi bổ sung tại Thông tư số 53/2025/TT-BCA của Bộ Công an)",
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
    "formCode": "Phụ lục 5 - TT 04/2024/TT-BTP (sửa đổi TT 04/2020/TT-BTP)",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI XÁC NHẬN THÔNG TIN HỘ TỊCH",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2024/TT-BTP ngày 06/06/2024 sửa đổi, bổ sung Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
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
    "formCode": "Mẫu Lời chứng - NĐ 23/2015/NĐ-CP & TT 01/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "VĂN BẢN YÊU CẦU CHỨNG THỰC CHỮ KÝ / HỢP ĐỒNG GIAO DỊCH",
    "legalNote": "(Theo quy định tại Nghị định số 23/2015/NĐ-CP & Thông tư số 01/2020/TT-BTP của Bộ Tư pháp)",
    "recipient": "Bộ phận Một cửa - Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI YÊU CẦU CHỨNG THỰC",
        "fields": [
          {
            "label": "1. Người yêu cầu chứng thực",
            "placeholder": "TRẦN VĂN ĐỨC",
            "type": "text",
            "isBold": true
          },
          {
            "label": "Ngày sinh",
            "placeholder": "25/11/1988",
            "type": "grid2",
            "secondLabel": "CCCD số",
            "secondPlaceholder": "089088005678"
          },
          {
            "label": "Nơi cư trú",
            "placeholder": "Số 78 Lý Tự Trọng, {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "2. Nội dung yêu cầu chứng thực",
            "placeholder": "Chứng thực bản sao từ bản chính / Chứng thực chữ ký trên văn bản giấy tờ theo quy định pháp luật",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. LỜI CHỨNG THỰC CHỮ KÝ (Mẫu chuẩn Nghị định 23/2015/NĐ-CP)",
        "fields": [
          {
            "label": "Người thực hiện chứng thực",
            "placeholder": "Chủ tịch / Phó Chủ tịch UBND {WARD_NAME}",
            "type": "text"
          },
          {
            "label": "CHỨNG THỰC Ông/Bà",
            "placeholder": "TRẦN VĂN ĐỨC - Số CCCD: 089088005678 đã ký/điểm chỉ trước mặt tôi",
            "type": "text"
          },
          {
            "label": "Số chứng thực",
            "placeholder": "........",
            "type": "grid2",
            "secondLabel": "Quyển số",
            "secondPlaceholder": "........-SCT/CK,CĐ"
          }
        ]
      }
    ],
    "commitText": "LƯU Ý QUAN TRỌNG: Người yêu cầu chứng thực phải ký trực tiếp trước mặt người thực hiện chứng thực tại Bộ phận Một cửa UBND (Không ký trước ở nhà).",
    "signatures": [
      {
        "role": "NGƯỜI YÊU CẦU CHỨNG THỰC",
        "note": "(Ký trực tiếp trước mặt người chứng thực)"
      },
      {
        "role": "CHỦ TỊCH / PHÓ CHỦ TỊCH",
        "note": "(Ký, ghi rõ họ tên và đóng dấu)"
      }
    ]
  },
  "TTHC-CT-02": {
    "procedureCode": "TTHC-CT-02",
    "formCode": "Mẫu Lời chứng - NĐ 23/2015/NĐ-CP & TT 01/2020/TT-BTP",
    "agencyType": "COMMUNE_UBND",
    "title": "BẢN DỊCH VÀ LỜI CHỨNG THỰC CHỮ KÝ NGƯỜI DỊCH",
    "legalNote": "(Theo quy định tại Nghị định số 23/2015/NĐ-CP & Thông tư số 01/2020/TT-BTP của Bộ Tư pháp)",
    "recipient": "Bộ phận Một cửa - Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN NGƯỜI YÊU CẦU / NGƯỜI DỊCH",
        "fields": [
          {
            "label": "1. Người yêu cầu chứng thực",
            "placeholder": "LÊ HOÀNG KIM",
            "type": "text",
            "isBold": true
          },
          {
            "label": "Ngày sinh",
            "placeholder": "25/11/1988",
            "type": "grid2",
            "secondLabel": "CCCD số",
            "secondPlaceholder": "089088005678"
          },
          {
            "label": "Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "2. Nội dung yêu cầu chứng thực",
            "placeholder": "Chứng thực chữ ký người dịch văn bản, giấy tờ từ tiếng nước ngoài sang tiếng Việt (hoặc ngược lại)",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. LỜI CHỨNG THỰC CHỮ KÝ (Mẫu chuẩn Nghị định 23/2015/NĐ-CP)",
        "fields": [
          {
            "label": "Người thực hiện chứng thực",
            "placeholder": "Chủ tịch / Phó Chủ tịch UBND {WARD_NAME}",
            "type": "text"
          },
          {
            "label": "CHỨNG THỰC Ông/Bà",
            "placeholder": "LÊ HOÀNG KIM - Số CCCD: 089088005678 đã ký trước mặt tôi",
            "type": "text"
          },
          {
            "label": "Số chứng thực",
            "placeholder": "........",
            "type": "grid2",
            "secondLabel": "Quyển số",
            "secondPlaceholder": "........-SCT/CKND"
          }
        ]
      }
    ],
    "commitText": "Lời cam đoan của người dịch: \"Tôi cam đoan đã dịch chính xác nội dung từ tiếng nước ngoài sang tiếng Việt (hoặc ngược lại) và hoàn toàn chịu trách nhiệm trước pháp luật về tính chính xác của bản dịch.\"",
    "signatures": [
      {
        "role": "NGƯỜI DỊCH / NGƯỜI YÊU CẦU",
        "note": "(Ký trực tiếp trước mặt người chứng thực)"
      },
      {
        "role": "CHỦ TỊCH / PHÓ CHỦ TỊCH",
        "note": "(Ký, ghi rõ họ tên và đóng dấu)"
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
    "formCode": "Phụ lục 5 - TT 04/2024/TT-BTP (sửa đổi TT 04/2020/TT-BTP)",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI GHI CHÚ VIỆC LY HÔN / HỦY VIỆC KẾT HÔN ĐÃ GIẢI QUYẾT Ở NƯỚC NGOÀI",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2024/TT-BTP ngày 06/06/2024 sửa đổi, bổ sung Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
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
    "formCode": "Phụ lục 5 - TT 04/2024/TT-BTP (sửa đổi TT 04/2020/TT-BTP)",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI GHI CHÚ SỰ KIỆN HỘ TỊCH ĐÃ GIẢI QUYẾT TẠI CƠ QUAN NƯỚC NGOÀI",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2024/TT-BTP ngày 06/06/2024 sửa đổi, bổ sung Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
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
  }
};
