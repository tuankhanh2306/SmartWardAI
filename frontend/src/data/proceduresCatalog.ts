export interface ProcedureCatalogItem {
  code: string;
  name: string;
  category: string;
  portalCode: string;
  chunksCount: number;
}

export const PROCEDURES_CATALOG: ProcedureCatalogItem[] = [
  // ==========================================
  // 1. NHÓM BẢO TRỢ XÃ HỘI (6 THỦ TỤC CẤP XÃ)
  // ==========================================
  {
    "code": "TTHC-BT-01",
    "name": "Trợ cấp xã hội hằng tháng cho đối tượng bảo trợ xã hội ở cộng đồng (Nghị định 20/2021/NĐ-CP & Luật BHXH 2024)",
    "category": "Bảo trợ xã hội",
    "portalCode": "1.001222",
    "chunksCount": 4
  },
  {
    "code": "TTHC-BT-02",
    "name": "Hỗ trợ chi phí mai táng cho đối tượng bảo trợ xã hội",
    "category": "Bảo trợ xã hội",
    "portalCode": "1.116910",
    "chunksCount": 5
  },
  {
    "code": "TTHC-BT-03",
    "name": "Tiếp nhận đối tượng bảo trợ xã hội có hoàn cảnh đặc biệt khó khăn vào cơ sở trợ giúp xã hội",
    "category": "Bảo trợ xã hội",
    "portalCode": "1.116907",
    "chunksCount": 4
  },
  {
    "code": "TTHC-BT-04",
    "name": "Hỗ trợ chi phí mai táng đối với đối tượng hưởng trợ cấp hưu trí xã hội",
    "category": "Bảo trợ xã hội",
    "portalCode": "1.014028",
    "chunksCount": 5
  },
  {
    "code": "TTHC-BT-05",
    "name": "Trợ giúp xã hội khẩn cấp cho đối tượng bị thiệt hại do thiên tai, hỏa hoạn, tai nạn giao thông",
    "category": "Bảo trợ xã hội",
    "portalCode": "1.001225",
    "chunksCount": 4
  },
  {
    "code": "TTHC-BT-06",
    "name": "Xác định mức độ khuyết tật và cấp Giấy xác nhận mức độ khuyết tật tại UBND cấp xã",
    "category": "Bảo trợ xã hội",
    "portalCode": "1.001228",
    "chunksCount": 4
  },

  // ==========================================
  // 2. NHÓM CƯ TRÚ (10 THỦ TỤC CẤP XÃ / CÔNG AN XÃ)
  // ==========================================
  {
    "code": "TTHC-CR-01",
    "name": "Đăng ký thường trú (Mẫu CT01 - Thông tư 66/2023/TT-BCA)",
    "category": "Cư trú",
    "portalCode": "1.116788",
    "chunksCount": 6
  },
  {
    "code": "TTHC-CR-02",
    "name": "Liên thông điện tử: Đăng ký khai tử, xóa đăng ký thường trú, giải quyết mai táng phí, tử tuất",
    "category": "Cư trú",
    "portalCode": "2.002913",
    "chunksCount": 7
  },
  {
    "code": "TTHC-CR-03",
    "name": "Đăng ký tạm trú",
    "category": "Cư trú",
    "portalCode": "1.116789",
    "chunksCount": 6
  },
  {
    "code": "TTHC-CR-04",
    "name": "Khai báo tạm vắng và thông báo lưu trú tại Công an cấp xã",
    "category": "Cư trú",
    "portalCode": "1.003677",
    "chunksCount": 4
  },
  {
    "code": "TTHC-CR-05",
    "name": "Liên thông điện tử: Đăng ký khai sinh, đăng ký thường trú, cấp thẻ bảo hiểm y tế cho trẻ em dưới 6 tuổi",
    "category": "Cư trú",
    "portalCode": "2.002914",
    "chunksCount": 6
  },
  {
    "code": "TTHC-CR-06",
    "name": "Thông báo lưu trú qua ứng dụng VNeID / Cổng Dịch vụ công",
    "category": "Cư trú",
    "portalCode": "2.001159",
    "chunksCount": 4
  },
  {
    "code": "TTHC-CR-07",
    "name": "Gia hạn tạm trú",
    "category": "Cư trú",
    "portalCode": "1.003678",
    "chunksCount": 4
  },
  {
    "code": "TTHC-CR-08",
    "name": "Xác nhận thông tin về cư trú (Mẫu CT07)",
    "category": "Cư trú",
    "portalCode": "1.010041",
    "chunksCount": 4
  },
  {
    "code": "TTHC-CR-09",
    "name": "Xác nhận của Ủy ban nhân dân cấp xã nơi hộ gia đình cư trú về việc hộ gia đình đang gặp khó khăn về kinh tế",
    "category": "Cư trú",
    "portalCode": "1.117007",
    "chunksCount": 5
  },
  {
    "code": "TTHC-CR-10",
    "name": "Xóa đăng ký thường trú",
    "category": "Cư trú",
    "portalCode": "1.000845",
    "chunksCount": 4
  },

  // ==========================================
  // 3. NHÓM CHỨNG THỰC (8 THỦ TỤC CẤP XÃ)
  // ==========================================
  {
    "code": "TTHC-CT-01",
    "name": "Chứng thực bản sao từ bản chính các giấy tờ, văn bản (Sao y bản chính)",
    "category": "Chứng thực",
    "portalCode": "1.001606",
    "chunksCount": 5
  },
  {
    "code": "TTHC-CT-02",
    "name": "Chứng thực chữ ký trong các giấy tờ, văn bản (Ký trực tiếp tại Một cửa)",
    "category": "Chứng thực",
    "portalCode": "1.001590",
    "chunksCount": 4
  },
  {
    "code": "TTHC-CT-03",
    "name": "Chứng thực hợp đồng, giao dịch liên quan đến tài sản, quyền sử dụng đất",
    "category": "Chứng thực",
    "portalCode": "2.001405",
    "chunksCount": 4
  },
  {
    "code": "TTHC-CT-04",
    "name": "Chứng thực văn bản phân chia di sản mà di sản là động sản, quyền sử dụng đất, nhà ở",
    "category": "Chứng thực",
    "portalCode": "2.001406",
    "chunksCount": 4
  },
  {
    "code": "TTHC-CT-05",
    "name": "Chứng thực văn bản từ chối nhận di sản thừa kế",
    "category": "Chứng thực",
    "portalCode": "2.001016",
    "chunksCount": 4
  },
  {
    "code": "TTHC-CT-06",
    "name": "Cấp bản sao có chứng thực từ Sổ chứng thực",
    "category": "Chứng thực",
    "portalCode": "2.001018",
    "chunksCount": 4
  },
  {
    "code": "TTHC-CT-07",
    "name": "Sửa lỗi sai sót trong hợp đồng, giao dịch đã được chứng thực",
    "category": "Chứng thực",
    "portalCode": "2.001017",
    "chunksCount": 4
  },
  {
    "code": "TTHC-CT-08",
    "name": "Chứng thực di chúc",
    "category": "Chứng thực",
    "portalCode": "2.001019",
    "chunksCount": 4
  },

  // ==========================================
  // 4. NHÓM ĐỊA CHÍNH - ĐẤT ĐAI (4 THỦ TỤC CẤP XÃ)
  // ==========================================
  {
    "code": "TTHC-DC-01",
    "name": "Đăng ký biến động quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất (tiếp nhận luân chuyển tại cấp xã)",
    "category": "Địa chính",
    "portalCode": "1.000758",
    "chunksCount": 4
  },
  {
    "code": "TTHC-DC-02",
    "name": "Đăng ký đất đai, tài sản gắn liền với đất, cấp Giấy chứng nhận quyền sử dụng đất lần đầu (Luật Đất đai 2024)",
    "category": "Địa chính",
    "portalCode": "1.000780",
    "chunksCount": 4
  },
  {
    "code": "TTHC-XD-01",
    "name": "Hòa giải tranh chấp đất đai tại UBND cấp xã (Điều 235 Luật Đất đai 2024)",
    "category": "Địa chính",
    "portalCode": "1.001456",
    "chunksCount": 4
  },
  {
    "code": "TTHC-XD-02",
    "name": "Xác nhận hiện trạng sử dụng đất, nhà ở không có tranh chấp phục vụ đăng ký cấp Giấy chứng nhận",
    "category": "Địa chính",
    "portalCode": "1.001458",
    "chunksCount": 4
  },

  // ==========================================
  // 5. NHÓM HỘ TỊCH (12 THỦ TỤC CẤP XÃ)
  // ==========================================
  {
    "code": "TTHC-HT-01",
    "name": "Đăng ký khai sinh",
    "category": "Hộ tịch",
    "portalCode": "1.001193",
    "chunksCount": 4
  },
  {
    "code": "TTHC-HT-02",
    "name": "Đăng ký kết hôn",
    "category": "Hộ tịch",
    "portalCode": "1.000894",
    "chunksCount": 4
  },
  {
    "code": "TTHC-HT-03",
    "name": "Đăng ký khai tử có yếu tố nước ngoài tại khu vực biên giới",
    "category": "Hộ tịch",
    "portalCode": "1.004827",
    "chunksCount": 4
  },
  {
    "code": "TTHC-HT-04",
    "name": "Cấp bản sao Trích lục hộ tịch (khai sinh, kết hôn, khai tử...)",
    "category": "Hộ tịch",
    "portalCode": "2.000635",
    "chunksCount": 4
  },
  {
    "code": "TTHC-HT-05",
    "name": "Đăng ký nhận cha, mẹ, con có yếu tố nước ngoài",
    "category": "Hộ tịch",
    "portalCode": "2.000779",
    "chunksCount": 4
  },
  {
    "code": "TTHC-HT-06",
    "name": "Đăng ký giám hộ",
    "category": "Hộ tịch",
    "portalCode": "1.004837",
    "chunksCount": 4
  },
  {
    "code": "TTHC-HT-07",
    "name": "Đăng ký chấm dứt giám hộ có yếu tố nước ngoài",
    "category": "Hộ tịch",
    "portalCode": "2.000756",
    "chunksCount": 4
  },
  {
    "code": "TTHC-HT-08",
    "name": "Đăng ký lại khai sinh có yếu tố nước ngoài",
    "category": "Hộ tịch",
    "portalCode": "2.000522",
    "chunksCount": 5
  },
  {
    "code": "TTHC-HT-09",
    "name": "Đăng ký lại kết hôn có yếu tố nước ngoài",
    "category": "Hộ tịch",
    "portalCode": "2.000513",
    "chunksCount": 5
  },
  {
    "code": "TTHC-HT-10",
    "name": "Đăng ký lại khai tử có yếu tố nước ngoài",
    "category": "Hộ tịch",
    "portalCode": "2.000497",
    "chunksCount": 5
  },
  {
    "code": "TTHC-HT-11",
    "name": "Cấp Giấy xác nhận tình trạng hôn nhân (Giấy độc thân)",
    "category": "Hộ tịch",
    "portalCode": "1.004873",
    "chunksCount": 4
  },
  {
    "code": "TTHC-HT-12",
    "name": "Thay đổi, cải chính, bổ sung thông tin hộ tịch, xác định lại dân tộc có yếu tố nước ngoài",
    "category": "Hộ tịch",
    "portalCode": "2.000748",
    "chunksCount": 4
  }
];
