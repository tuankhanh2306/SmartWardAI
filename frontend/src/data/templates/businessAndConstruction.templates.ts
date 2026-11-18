import type { A4FormTemplate } from './types';

export const BUSINESS_AND_CONSTRUCTION_TEMPLATES: Record<string, A4FormTemplate> = {
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
