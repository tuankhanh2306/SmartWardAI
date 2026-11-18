import type { A4FormTemplate } from './types';

export const CERTIFICATION_AND_LAND_TEMPLATES: Record<string, A4FormTemplate> = {
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
    "formCode": "Mẫu số 11/ĐK - Nghị định số 101/2024/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "ĐƠN ĐĂNG KÝ BIẾN ĐỘNG ĐẤT ĐAI, TÀI SẢN GẮN LIỀN VỚI ĐẤT",
    "legalNote": "(Mẫu số 11/ĐK ban hành kèm theo Nghị định số 101/2024/NĐ-CP ngày 29/07/2024 của Chính phủ & Nghị định 151/2025/NĐ-CP)",
    "recipient": "Ủy ban nhân dân {WARD_NAME} - Chi nhánh Văn phòng Đăng ký đất đai",
    "sections": [
      {
        "title": "1. NGƯỜI SỬ DỤNG ĐẤT, CHỦ SỞ HỮU TÀI SẢN GẮN LIỀN VỚI ĐẤT",
        "fields": [
          {
            "label": "1.1. Tên người sử dụng đất / chủ sở hữu",
            "placeholder": "LÊ HOÀNG PHƯỚC",
            "type": "text",
            "isBold": true
          },
          {
            "label": "1.2. Số định danh cá nhân / CCCD",
            "placeholder": "089079009876",
            "type": "grid2",
            "secondLabel": "Điện thoại liên hệ",
            "secondPlaceholder": "0918234567"
          },
          {
            "label": "1.3. Địa chỉ thường trú / liên hệ",
            "placeholder": "Số 102 Thoại Ngọc Hầu, {WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          }
        ]
      },
      {
        "title": "2. THÔNG TIN THỬA ĐẤT & GIẤY CHỨNG NHẬN ĐÃ CẤP",
        "fields": [
          {
            "label": "Thửa đất số",
            "placeholder": "125",
            "type": "grid2",
            "secondLabel": "Tờ bản đồ số",
            "secondPlaceholder": "14"
          },
          {
            "label": "Diện tích thửa đất",
            "placeholder": "150.5 m²",
            "type": "grid2",
            "secondLabel": "Mục đích sử dụng",
            "secondPlaceholder": "Đất ở tại đô thị / nông thôn"
          },
          {
            "label": "2.1. Số phát hành GCN (Số seri) & Số vào sổ cấp GCN",
            "placeholder": "Số phát hành: AA 123456 - Số vào sổ: CH01234 cấp ngày 15/06/2020",
            "type": "text"
          },
          {
            "label": "3. Nội dung biến động đề nghị đăng ký",
            "placeholder": "Đăng ký chuyển nhượng / tặng cho / thừa kế / đính chính thông tin thửa đất",
            "type": "text"
          },
          {
            "label": "4. Giấy tờ liên quan đến nội dung biến động nộp kèm theo",
            "placeholder": "(1) Bản gốc Giấy chứng nhận đã cấp; (2) Hợp đồng/văn bản chuyển quyền đã công chứng/chứng thực",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Tôi xin cam đoan nội dung kê khai trên đơn là đúng sự thật và chịu trách nhiệm trước pháp luật.",
    "signatures": [
      {
        "role": "Ý KIẾN KIỂM TRA ĐỊA CHÍNH XÃ",
        "note": "(Ký, ghi rõ họ tên và đóng dấu)"
      },
      {
        "role": "NGƯỜI VIẾT ĐƠN",
        "note": "(Ký và ghi rõ họ tên)"
      }
    ]
  },
  "TTHC-DC-02": {
    "procedureCode": "TTHC-DC-02",
    "formCode": "Mẫu số 04/ĐK - Nghị định số 101/2024/NĐ-CP",
    "agencyType": "COMMUNE_UBND",
    "title": "ĐƠN ĐĂNG KÝ ĐẤT ĐAI, TÀI SẢN GẮN LIỀN VỚI ĐẤT (CẤP GIẤY CHỨNG NHẬN LẦN ĐẦU)",
    "legalNote": "(Mẫu số 04/ĐK ban hành kèm theo Nghị định số 101/2024/NĐ-CP ngày 29/07/2024 của Chính phủ thi hành Luật Đất đai 2024)",
    "recipient": "Ủy ban nhân dân {WARD_NAME} / Chi nhánh Văn phòng Đăng ký đất đai",
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
    "formCode": "Phụ lục 5 - TT 04/2024/TT-BTP (sửa đổi TT 04/2020/TT-BTP)",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ KHAI SINH",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2024/TT-BTP ngày 06/06/2024 sửa đổi, bổ sung Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
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
    "formCode": "Phụ lục 5 - TT 04/2024/TT-BTP (sửa đổi TT 04/2020/TT-BTP)",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ KẾT HÔN",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2024/TT-BTP ngày 06/06/2024 sửa đổi, bổ sung Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
    "recipient": "Ủy ban nhân dân {WARD_NAME}",
    "sections": [
      {
        "title": "I. THÔNG TIN BÊN NỮ",
        "fields": [
          {
            "label": "Họ, chữ đệm, tên",
            "placeholder": "NGUYỄN THỊ H.",
            "type": "text",
            "isBold": true
          },
          {
            "label": "Ngày, tháng, năm sinh",
            "placeholder": "26/05/1991",
            "type": "grid2",
            "secondLabel": "Dân tộc",
            "secondPlaceholder": "Kinh"
          },
          {
            "label": "Quốc tịch",
            "placeholder": "Việt Nam",
            "type": "text"
          },
          {
            "label": "Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "Giấy tờ tùy thân",
            "placeholder": "Căn cước công dân số: 089191003344 do Cục CSQLHC về TTXH cấp ngày 15/08/2022",
            "type": "text"
          },
          {
            "label": "Kết hôn lần thứ mấy",
            "placeholder": "1",
            "type": "text"
          }
        ]
      },
      {
        "title": "II. THÔNG TIN BÊN NAM",
        "fields": [
          {
            "label": "Họ, chữ đệm, tên",
            "placeholder": "TRẦN HẢI N.",
            "type": "text",
            "isBold": true
          },
          {
            "label": "Ngày, tháng, năm sinh",
            "placeholder": "23/08/1987",
            "type": "grid2",
            "secondLabel": "Dân tộc",
            "secondPlaceholder": "Kinh"
          },
          {
            "label": "Quốc tịch",
            "placeholder": "Việt Nam",
            "type": "text"
          },
          {
            "label": "Nơi cư trú",
            "placeholder": "{WARD_NAME}, Tỉnh An Giang",
            "type": "text"
          },
          {
            "label": "Giấy tờ tùy thân",
            "placeholder": "Căn cước công dân số: 089087001122 do Cục CSQLHC về TTXH cấp ngày 10/07/2021",
            "type": "text"
          },
          {
            "label": "Kết hôn lần thứ mấy",
            "placeholder": "1",
            "type": "text"
          }
        ]
      }
    ],
    "commitText": "Chúng tôi cam đoan những lời khai trên đây là đúng sự thật, việc kết hôn của chúng tôi là tự nguyện, không vi phạm quy định của Luật hôn nhân và gia đình Việt Nam.\nChúng tôi chịu hoàn toàn trách nhiệm trước pháp luật về cam đoan của mình.\nĐề nghị Quý cơ quan đăng ký.",
    "signatures": [
      {
        "role": "Bên nữ",
        "note": "(Ký, ghi rõ họ, chữ đệm, tên)"
      },
      {
        "role": "Bên nam",
        "note": "(Ký, ghi rõ họ, chữ đệm, tên)"
      }
    ]
  },
  "TTHC-HT-03": {
    "procedureCode": "TTHC-HT-03",
    "formCode": "Phụ lục 5 - TT 04/2024/TT-BTP (sửa đổi TT 04/2020/TT-BTP)",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ KHAI TỬ CÓ YẾU TỐ NƯỚC NGOÀI KHU VỰC BIÊN GIỚI",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2024/TT-BTP ngày 06/06/2024 sửa đổi, bổ sung Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
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
    "formCode": "Phụ lục 5 - TT 04/2024/TT-BTP (sửa đổi TT 04/2020/TT-BTP)",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI CẤP BẢN SAO TRÍCH LỤC HỘ TỊCH",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2024/TT-BTP ngày 06/06/2024 sửa đổi, bổ sung Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
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
    "formCode": "Phụ lục 5 - TT 04/2024/TT-BTP (sửa đổi TT 04/2020/TT-BTP)",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ NHẬN CHA, MẸ, CON CÓ YẾU TỐ NƯỚC NGOÀI",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2024/TT-BTP ngày 06/06/2024 sửa đổi, bổ sung Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
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
    "formCode": "Phụ lục 5 - TT 04/2024/TT-BTP (sửa đổi TT 04/2020/TT-BTP)",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ GIÁM HỘ",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2024/TT-BTP ngày 06/06/2024 sửa đổi, bổ sung Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
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
    "formCode": "Phụ lục 5 - TT 04/2024/TT-BTP (sửa đổi TT 04/2020/TT-BTP)",
    "agencyType": "COMMUNE_UBND",
    "title": "TỜ KHAI ĐĂNG KÝ CHẤM DỨT GIÁM HỘ CÓ YẾU TỐ NƯỚC NGOÀI",
    "legalNote": "(Ban hành kèm theo Thông tư số 04/2024/TT-BTP ngày 06/06/2024 sửa đổi, bổ sung Thông tư số 04/2020/TT-BTP của Bộ Tư pháp)",
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
  }
};
