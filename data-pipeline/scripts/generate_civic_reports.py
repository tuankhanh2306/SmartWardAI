#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI - Semi-Automated Data Pipeline
Pipeline 3: Civic Reports & Spatial Triage Benchmark Generator (150 Reports)
Generates:
 - 30 Original Public Infrastructure/Civic Incidents (Ward 25, Binh Thanh, HCMC - UTH Vicinity)
 - 150 Citizen Reports (30 incidents x 5 natural variants + Gaussian GPS noise 5m-35m)
 - Hard Evaluation Cases (Colocated-Different-Category, Same-Category-Distant, Lexical-Diversity)
 - Ground Truth Cluster mapping for 2-Stage Spatial-Semantic Triage (Redis GEO + pgvector)
"""

import os
import sys
import csv
import math
import random
import datetime

sys.stdout.reconfigure(encoding='utf-8')

# Ensure deterministic generation for reproducibility
random.seed(42)

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../civic-reports"))

# Anchor area: Ward 25, Binh Thanh District, TP.HCM (Around UTH Campus)
# Lat: ~10.801 - 10.807, Lng: ~106.710 - 106.719
BASE_EVENTS = [
    # --- Category 1: ROAD_DAMAGE (8 events) ---
    {
        "eventId": "EVT-001",
        "category": "ROAD_DAMAGE",
        "title": "Ổ gà sâu trên đường Võ Oanh (D3 cũ)",
        "address": "Số 15 Võ Oanh, Phường 25, Bình Thạnh",
        "baseLat": 10.803520,
        "baseLng": 106.714210,
        "variants": [
            "Đoạn trước số 15 Võ Oanh có ổ gà khá sâu, trời mưa đọng nước rất dễ té ngã xe máy.",
            "Mặt đường Võ Oanh bị sụt lún thành một hố lớn, đề nghị phường cho giặm vá gấp.",
            "Có ổ gà to nguy hiểm gần cổng trường đại học trên đường Võ Oanh, đã có sinh viên bị trượt bánh.",
            "Mặt đường trước nhà số 15 D3 cũ bị hư hỏng, lồi lõm xuất hiện vũng nước sâu.",
            "Đoạn đường Võ Oanh này xuống cấp nặng, cần cơ quan chức năng kiểm tra và dặm vá lại mặt đường."
        ]
    },
    {
        "eventId": "EVT-002",
        "category": "ROAD_DAMAGE",
        "title": "Nắp cống thoát nước bị kênh vênh nguy hiểm",
        "address": "Ngã tư Nguyễn Gia Trí - D5, Phường 25, Bình Thạnh",
        "baseLat": 10.804810,
        "baseLng": 106.715830,
        "variants": [
            "Nắp cống ngay ngã tư Nguyễn Gia Trí giao D5 bị bung một bên, xe chạy qua kêu ầm ầm và rất bấp bênh.",
            "Nắp cống thoát nước bị sụt lún thấp hơn mặt đường cả gang tay, rất nguy hiểm cho người đi ban đêm.",
            "Miệng cống tại góc đường D5 bị lệch nắp, bánh xe lọt xuống là ngã ngay.",
            "Nắp gang cống thoát nước ngã tư Nguyễn Gia Trí bị xê dịch lộ khe hở lớn.",
            "Cần xử lý gấp nắp cống bị vênh ở ngã tư D5 - Nguyễn Gia Trí để tránh tai nạn giao thông."
        ]
    },
    {
        "eventId": "EVT-003",
        "category": "ROAD_DAMAGE",
        "title": "Vỉa hè bị sụt lún gãy gạch lót",
        "address": "Đoạn vỉa hè trước số 82 Ung Văn Khiêm, Phường 25, Bình Thạnh",
        "baseLat": 10.806120,
        "baseLng": 106.717140,
        "variants": [
            "Vỉa hè đường Ung Văn Khiêm trước số 82 bị sụp lún tạo thành hố cát lởm chởm gạch.",
            "Gạch lát vỉa hè bị vỡ nát nhiều mảng, người đi bộ phải bước xuống lòng đường rất nguy hiểm.",
            "Đoạn hè phố Ung Văn Khiêm bị bong tróc gạch và sụt lún nghiêm trọng sau đợt mưa lớn.",
            "Lối đi bộ cho người tàn tật và người dân bị hỏng nặng đoạn trước số 82 Ung Văn Khiêm.",
            "Đề nghị đơn vị quản lý đô thị chỉnh trang lại vỉa hè bị vỡ lún ở đường Ung Văn Khiêm."
        ]
    },
    {
        "eventId": "EVT-004",
        "category": "ROAD_DAMAGE",
        "title": "Gờ giảm tốc trước cổng trường bị mòn bật ốc vít",
        "address": "Trước cổng Cơ sở 1 UTH, Số 2 Võ Oanh, Phường 25",
        "baseLat": 10.802890,
        "baseLng": 106.713560,
        "variants": [
            "Gờ giảm tốc cao su trước cổng trường ĐH GTVT bị tróc đinh ốc nhọn nhô lên gây thủng lốp xe.",
            "Đinh vít giữ gờ giảm tốc bị bật bung khỏi mặt đường, rất sắc nhọn nguy hiểm cho người qua lại.",
            "Gờ giảm tốc bị rách nát, các ốc sắt nhô cao khoảng 3cm ngay trước số 2 Võ Oanh.",
            "Thanh giảm tốc cao su cổng trường bị mòn vẹt và lỏng lẻo kêu lạch cạch mỗi khi xe cán qua.",
            "Cần tháo dỡ hoặc thay mới gờ giảm tốc hư hỏng trước trường UTH đường Võ Oanh."
        ]
    },
    {
        "eventId": "EVT-005",
        "category": "ROAD_DAMAGE",
        "title": "Biển báo giao thông bị nghiêng gãy do va chạm",
        "address": "Góc giao lộ Điện Biên Phủ - Nguyễn Văn Thương, Phường 25",
        "baseLat": 10.800950,
        "baseLng": 106.712680,
        "variants": [
            "Biển báo cấm rẽ ngay ngã ba Nguyễn Văn Thương ra Điện Biên Phủ bị xe tải quẹt nghiêng gần đổ.",
            "Cột biển báo giao thông bị cong gập sát lòng đường, che khuất tầm nhìn người tham gia giao thông.",
            "Trụ biển báo đường một chiều bị xiêu vẹo có nguy cơ ngã đổ khi có gió lốc.",
            "Biển báo đường bộ bị hư hại đổ nghiêng ở góc đường Điện Biên Phủ.",
            "Đề nghị cơ quan chức năng nắn thẳng lại cột biển chỉ dẫn giao thông bị móp méo."
        ]
    },
    {
        "eventId": "EVT-006",
        "category": "ROAD_DAMAGE",
        "title": "Mặt đường bị cày xới sau khi thi công đường ống",
        "address": "Hẻm 48 Ung Văn Khiêm, Phường 25, Bình Thạnh",
        "baseLat": 10.805540,
        "baseLng": 106.716420,
        "variants": [
            "Đơn vị đào đường lắp ống nước xong hoàn trả mặt bằng cẩu thả, đất đá lởm chởm trong hẻm 48.",
            "Đoạn hẻm 48 Ung Văn Khiêm bị xới tung lên rồi chỉ lấp cát tạm, xe cộ đi qua bị trơn trượt.",
            "Mặt hẻm bị băm nát sau khi thi công cấp thoát nước, gồ ghề đầy sỏi đá.",
            "Công trình đào đường ống hoàn trả không bằng phẳng, tạo thành rãnh sâu dọc theo con hẻm.",
            "Yêu cầu đơn vị thi công trải lại nhựa đường bằng phẳng cho bà con hẻm 48 Ung Văn Khiêm đi lại."
        ]
    },
    {
        "eventId": "EVT-007",
        "category": "ROAD_DAMAGE",
        "title": "Gương cầu lồi góc cua bị vỡ nát",
        "address": "Khúc cua góc Hẻm 120 Điện Biên Phủ, Phường 25",
        "baseLat": 10.801530,
        "baseLng": 106.713890,
        "variants": [
            "Gương cầu lồi tại góc cua chữ L trong hẻm 120 bị vỡ mặt kính hoàn toàn, không quan sát được xe ngược chiều.",
            "Khúc cua khuất tầm nhìn ở hẻm 120 mà gương cầu an toàn bị kẻ xấu đập bể nát.",
            "Gương phản quang quan sát góc cua bị hỏng, rất dễ xảy ra tông xe đối đầu.",
            "Mặt gương cầu lồi tại cua hẻm Điện Biên Phủ nứt toác, không còn tác dụng soi đường.",
            "Đề nghị gắn lại gương cầu mới tại góc cua hẹp hẻm 120 để đảm bảo an toàn giao thông."
        ]
    },
    {
        "eventId": "EVT-008",
        "category": "ROAD_DAMAGE",
        "title": "Bê tông dải phân cách bị xô lệch lấn làn",
        "address": "Đoạn dạ cầu Sài Gòn hướng về Ung Văn Khiêm, Phường 25",
        "baseLat": 10.802110,
        "baseLng": 106.718220,
        "variants": [
            "Khối bê tông dải phân cách dưới chân cầu Sài Gòn bị đâm xô lệch nhô ra giữa làn đường xe máy.",
            "Dải phân cách cứng bị xê dịch lấn làn đường xe chạy, buổi tối rất dễ tông trúng.",
            "Các cục bê tông ngăn làn bị húc văng lung tung dưới chân cầu, gây hẹp lối lưu thông.",
            "Dải phân cách bị lệch vị trí tạo thành chướng ngại vật nguy hiểm hướng Ung Văn Khiêm.",
            "Cần xe chuyên dụng đến kéo ngay dải phân cách bê tông về đúng vị trí tim đường."
        ]
    },

    # --- Category 2: ENVIRONMENT (8 events) ---
    {
        "eventId": "EVT-009",
        "category": "ENVIRONMENT",
        "title": "Bãi rác tự phát bốc mùi hôi thối chân cầu",
        "address": "Khu đất trống chân cầu Đỏ, Phường 25, Bình Thạnh",
        "baseLat": 10.806950,
        "baseLng": 106.713120,
        "variants": [
            "Chân cầu Đỏ xuất hiện bãi rác sinh hoạt tự phát ngập ngụa, bốc mùi hôi thối nồng nặc cả khu phố.",
            "Người dân thiếu ý thức vứt nhiều bao rác, nệm cũ và xác động vật ở bãi đất chân cầu gây ô nhiễm nặng.",
            "Rác thải ứ đọng nhiều ngày không ai thu dọn ở dạ cầu Đỏ, ruồi muỗi bu đầy.",
            "Đống rác tự phát to đùng bốc mùi xú uế ảnh hưởng nghiêm trọng đời sống các hộ dân lân cận.",
            "Đề nghị phường đặt biển cấm đổ rác và gắn camera phạt nguội bãi rác chân cầu Đỏ."
        ]
    },
    {
        "eventId": "EVT-010",
        "category": "ENVIRONMENT",
        "title": "Cống thoát nước bị nghẹt trào nước đen ngòm",
        "address": "Trước số 104 Nguyễn Gia Trí, Phường 25, Bình Thạnh",
        "baseLat": 10.804150,
        "baseLng": 106.715100,
        "variants": [
            "Hố ga trước số 104 Nguyễn Gia Trí bị nghẹt rác, nước cống đen ngòm tràn lênh láng ra mặt đường.",
            "Nước cống bốc mùi hôi tanh nồng nặc chảy tràn ra đường mỗi khi các quán ăn xả nước thải.",
            "Miệng cống thoát nước bị tắc nghẽn hoàn toàn, nước thải sinh hoạt dềnh lên láng vỉa hè.",
            "Cống rãnh khu vực 104 D2 cũ bị tắc dầu mỡ đóng tảng, nước không thoát được tràn ra lộ.",
            "Cần đội nạo vét cống rãnh đô thị xuống thông hút hố ga bị nghẹt trên đường Nguyễn Gia Trí."
        ]
    },
    {
        "eventId": "EVT-011",
        "category": "ENVIRONMENT",
        "title": "Cành cây gãy sau mưa đè chắn lối đi",
        "address": "Công viên bờ sông Thanh Đa gần Phường 25",
        "baseLat": 10.807420,
        "baseLng": 106.718850,
        "variants": [
            "Trận mưa chiều qua làm gãy một cành cây phượng lớn nằm chắn ngang lối đi bộ công viên bờ sông.",
            "Cành cây to bị gãy tét nhánh treo lơ lửng trên đầu người đi dạo, rất dễ rơi trúng người.",
            "Nhánh cây xanh bật gốc gãy đổ ngổn ngang chiếm hết đường đi dạo ven sông.",
            "Cành cây mục gãy chắn lối đi bộ công viên Thanh Đa, người già và trẻ em không thể qua lại.",
            "Đề nghị công ty cây xanh cử nhân viên tới cưa tỉa thu dọn nhánh cây gãy nguy hiểm này."
        ]
    },
    {
        "eventId": "EVT-012",
        "category": "ENVIRONMENT",
        "title": "Xà bần gạch đá đổ trộm bừa bãi",
        "address": "Khu vực ven đường D1 nối dài, Phường 25, Bình Thạnh",
        "baseLat": 10.802450,
        "baseLng": 106.715650,
        "variants": [
            "Có xe ba gác lén đổ trộm cả đống xà bần, vữa xi măng ngay mép vỉa hè đường D1 nối dài vào ban đêm.",
            "Đống đất đá phế thải xây dựng tràn ra gần nửa làn đường, bụi mù mịt khi xe chạy qua.",
            "Xà bần gạch vỡ bị vứt bừa bãi không người dọn dẹp gây mất mỹ quan đô thị nghiêm trọng.",
            "Khu vực đất công bị chiếm dụng làm nơi đổ trộm rác xây dựng và bê tông vụn.",
            "Đề nghị lực lượng đô thị phường kiểm tra trích xuất camera xử phạt hành vi đổ trộm xà bần."
        ]
    },
    {
        "eventId": "EVT-013",
        "category": "ENVIRONMENT",
        "title": "Nước thải từ quán ăn xả thẳng ra rãnh thoát nước mưa",
        "address": "Dãy hàng quán ăn vặt Hẻm 69 Nguyễn Gia Trí, Phường 25",
        "baseLat": 10.804650,
        "baseLng": 106.714780,
        "variants": [
            "Các quán ăn vặt trong hẻm 69 thường xuyên đổ nước rửa chén và dầu mỡ thẳng ra miệng cống ven đường.",
            "Mùi dầu mỡ thức ăn thừa lên men hôi tanh bốc lên từ rãnh nước hẻm 69 gây ngột ngạt khó thở.",
            "Quán xá xả nước thải bẩn chưa qua xử lý ra lòng hẻm, trơn trượt cho bà con đi bộ.",
            "Tình trạng xả thải chất béo thức ăn làm nghẹt cống rãnh chung của khu dân cư hẻm 69.",
            "UBND Phường cần kiểm tra vệ sinh môi trường các hộ kinh doanh ăn uống tại hẻm này."
        ]
    },
    {
        "eventId": "EVT-014",
        "category": "ENVIRONMENT",
        "title": "Bao nilông rác thải tồn ứ quanh gốc cây xanh",
        "address": "Trước cổng trường THPT Gia Định, đường D5, Phường 25",
        "baseLat": 10.805210,
        "baseLng": 106.716120,
        "variants": [
            "Các gốc cây xanh trước cổng trường học bị biến thành bãi tập kết rác với hàng chục túi nilông rách rưới.",
            "Hộp xốp, ly nhựa vứt bừa bãi quanh bồn hoa cây xanh đường D5 trông rất nhếch nhác.",
            "Rác thải nhựa tồn đọng dưới gốc cây nhiều ngày bốc mùi hôi trước mắt học sinh.",
            "Gốc cây cổ thụ bị chất đống rác sinh hoạt và lá cây mục không được thu gom đúng giờ.",
            "Đề nghị công nhân vệ sinh quét dọn và trường học nhắc nhở học sinh giữ vệ sinh chung."
        ]
    },
    {
        "eventId": "EVT-015",
        "category": "ENVIRONMENT",
        "title": "Mương nước thải lộ thiên ô nhiễm sủi bọt",
        "address": "Cuối Hẻm 153 Quốc lộ 13 (giáp ranh P.25)",
        "baseLat": 10.807850,
        "baseLng": 106.711890,
        "variants": [
            "Đoạn mương hở cuối hẻm 153 nước đen kịt, sủi bọt trắng xóa và bốc mùi tanh tưởi khi trời nắng gắt.",
            "Con mương nước thải không nắp đậy sinh sôi ruồi muỗi, nguy cơ bùng phát dịch sốt xuất huyết.",
            "Dòng nước ô nhiễm tù đọng không lưu thông được do rác chặn kín miệng cống thoát.",
            "Mương thoát nước hở bị ô nhiễm nặng nề, rác nổi lềnh bềnh cả khúc mương.",
            "Cần nạo vét dòng chảy và có phương án cống hóa đoạn mương hở này để bảo vệ môi trường sống."
        ]
    },
    {
        "eventId": "EVT-016",
        "category": "ENVIRONMENT",
        "title": "Bụi cát rơi vãi từ xe chở vật liệu xây dựng",
        "address": "Đoạn đường Ung Văn Khiêm gần ngã ba Đài Liệt Sĩ",
        "baseLat": 10.806650,
        "baseLng": 106.714550,
        "variants": [
            "Xe tải chở cát không phủ bạt làm rơi vãi cát sỏi đầy đường Ung Văn Khiêm, bụi mù mịt khi có gió.",
            "Lớp cát dày rơi trên mặt đường nhựa khiến xe máy thắng gấp rất dễ bị trượt ngã nguy hiểm.",
            "Đường đầy cát bụi do công trình xây dựng gần đó không quét rửa bánh xe khi ra vào.",
            "Mặt đường Ung Văn Khiêm bụi bặm ô nhiễm không khí nặng vì đất cát rơi vương vãi kéo dài cả trăm mét.",
            "Cảnh sát trật tự cần xử lý xe ben chở đất cát làm vương vãi trên tuyến đường này."
        ]
    },

    # --- Category 3: LIGHTING_ELECTRICAL (7 events) ---
    {
        "eventId": "EVT-017",
        "category": "LIGHTING_ELECTRICAL",
        "title": "Đèn đường cao áp không sáng ban đêm",
        "address": "Trước số 35 Võ Oanh, Phường 25, Bình Thạnh",
        "baseLat": 10.803850,
        "baseLng": 106.714450,
        "variants": [
            "Bóng đèn cao áp chiếu sáng trước số 35 Võ Oanh bị cháy tắt tối om suốt 3 ngày nay.",
            "Đoạn đường trước số 35 D3 cũ tối đen như mực do đèn đường bị hỏng, tiềm ẩn nguy cơ cướp giật.",
            "Đèn đường chiếu sáng công cộng không hoạt động, ban đêm xe cộ đi lại rất khó quan sát.",
            "Cột đèn chiếu sáng đô thị số hiệu VT-12 bị mất điện tắt ngúm nhiều đêm liền.",
            "Đề nghị công ty chiếu sáng đô thị thay bóng đèn đường bị đứt tóc trước số 35 Võ Oanh."
        ]
    },
    {
        "eventId": "EVT-018",
        "category": "LIGHTING_ELECTRICAL",
        "title": "Dây cáp viễn thông chùng võng sát đầu người",
        "address": "Đầu Hẻm 27 Điện Biên Phủ, Phường 25, Bình Thạnh",
        "baseLat": 10.801120,
        "baseLng": 106.713100,
        "variants": [
            "Búi dây cáp điện thoại và internet bị đứt thòng lòng xuống cách mặt đường chỉ hơn 1 mét ở đầu hẻm 27.",
            "Dây mạng chùng võng ngang đường quẹt trúng đầu người đi xe máy rất nguy hiểm.",
            "Bó dây cáp lòng thòng như mạng nhện rớt xuống đường, có nguy cơ vướng vào thùng xe tải.",
            "Dây viễn thông bị chùng sát nóc xe ô tô ngay lối ra vào hẻm 27 Điện Biên Phủ.",
            "Đề nghị các nhà mạng bó gọn và kéo căng lại bó dây cáp đang rơi thõng nguy hiểm này."
        ]
    },
    {
        "eventId": "EVT-019",
        "category": "LIGHTING_ELECTRICAL",
        "title": "Trụ điện bị hở nắp hộp đấu nối rò điện",
        "address": "Góc ngã ba D5 - Ung Văn Khiêm, Phường 25",
        "baseLat": 10.805890,
        "baseLng": 106.716890,
        "variants": [
            "Hộp điện sắt dưới chân cột đèn ngã ba D5 bị bật nắp lộ ruột dây điện trần, sợ bị giật khi trời mưa.",
            "Cửa hộp đấu dây điện trụ thép bị mất nắp che, dây điện chằng chịt lòi ra ngoài sát tầm với trẻ em.",
            "Hộp điện chiếu sáng công cộng bị bung nắp rỉ sét, có dấu hiệu đánh lửa xẹt điện khi mưa ẩm.",
            "Trụ điện góc D5 hở mối nối dây cáp điện sống, rất nguy hiểm cho người đi bộ mùa ngập úng.",
            "Báo khẩn cấp điện lực Bình Thạnh kiểm tra đóng nắp an toàn hộp kỹ thuật trụ điện góc D5."
        ]
    },
    {
        "eventId": "EVT-020",
        "category": "LIGHTING_ELECTRICAL",
        "title": "Đèn đường chập chờn nhấp nháy liên tục",
        "address": "Đoạn đường Nguyễn Gia Trí trước Trường Tiểu học Đống Đa",
        "baseLat": 10.804420,
        "baseLng": 106.715420,
        "variants": [
            "Bóng đèn cao áp trước cổng trường tiểu học cứ chớp nháy liên hồi như đèn vũ trường gây chói mắt người đi đường.",
            "Đèn đường bị chập rơ-le nhảy tanh tách nhấp nháy suốt đêm không đủ độ sáng.",
            "Đèn đường chiếu sáng trước trường Đống Đa bị hư hỏng bóng chập chờn lúc sáng lúc tắt.",
            "Hệ thống chiếu sáng công cộng khu vực này chập chờn gây mất an toàn giao thông lúc tan tầm.",
            "Đề nghị sửa chữa bóng đèn đường đang bị hư chập chờn trên đường Nguyễn Gia Trí."
        ]
    },
    {
        "eventId": "EVT-021",
        "category": "LIGHTING_ELECTRICAL",
        "title": "Trụ điện nghiêng có nguy cơ ngã đổ",
        "address": "Trước hẻm số 8 Võ Oanh, Phường 25, Bình Thạnh",
        "baseLat": 10.803150,
        "baseLng": 106.713820,
        "variants": [
            "Cột điện bê tông trước hẻm số 8 Võ Oanh bị rạn nứt gốc và nghiêng hẳn về phía nhà dân.",
            "Trụ điện chịu tải quá nhiều dây cáp nên bị kéo nghiêng khoảng 15 độ, nhìn rất ghê.",
            "Chân cột điện bị nứt toác bê tông lòi sắt sau vụ va quẹt, trụ có xu hướng đổ ngã khi mưa bão.",
            "Cột điện xiêu vẹo đe dọa an toàn tính mạng người dân sinh sống gần hẻm số 8.",
            "Đề nghị cơ quan điện lực gia cố hoặc dựng cột điện mới thay thế cột đang nghiêng nguy hiểm."
        ]
    },
    {
        "eventId": "EVT-022",
        "category": "LIGHTING_ELECTRICAL",
        "title": "Tủ điện công cộng bị cháy xém bốc khói khét",
        "address": "Gần trạm xe buýt ngã tư Hàng Xanh hướng về P.25",
        "baseLat": 10.801850,
        "baseLng": 106.711550,
        "variants": [
            "Tủ điện phân phối gần trạm dừng xe buýt phát ra tiếng nổ lẹt đẹt và bốc khói khét lẹt.",
            "Hộp công tơ điện bị chập cháy xém vỏ nhựa đen sì, có mùi khét lẹt bốc ra nồng nặc.",
            "Tủ trạm điện hạ thế có hiện tượng chập điện bốc khói, nguy cơ bùng phát cháy nổ cao.",
            "Phát hiện tủ điện ven đường xẹt tia lửa điện và khói đen ngùn ngụt lúc trời chuyển mưa.",
            "Cần lực lượng PCCC và điện lực ngắt điện xử lý sự cố chập cháy tủ điện khẩn cấp."
        ]
    },
    {
        "eventId": "EVT-023",
        "category": "LIGHTING_ELECTRICAL",
        "title": "Đèn trang trí treo ngang đường bị đứt lủng lẳng",
        "address": "Cổng chào khu phố đường D5, Phường 25",
        "baseLat": 10.805120,
        "baseLng": 106.716550,
        "variants": [
            "Dây đèn led trang trí giăng ngang đường D5 bị đứt một đầu rớt thõng xuống quẹt vào nóc xe buýt.",
            "Dây điện đèn lồng trang trí đung đưa sát nóc xe tải, người dân phải lấy cây gác tạm lên.",
            "Dải đèn led giăng cổng chào bị đứt lòng thòng giữa đường có thể giật điện người đi mưa.",
            "Đèn trang trí lễ hội đứt dây treo lơ lửng giữa tim đường cản trở lưu thông xe cộ.",
            "Ban điều hành khu phố cần cho người hạ giải hoặc căng lại dây đèn trang trí bị đứt."
        ]
    },

    # --- Category 4: ORDER_SECURITY (7 events) ---
    {
        "eventId": "EVT-024",
        "category": "ORDER_SECURITY",
        "title": "Lấn chiếm lòng lề đường buôn bán rau củ",
        "address": "Khu vực chợ tạm đầu Hẻm 15 Võ Oanh, Phường 25",
        "baseLat": 10.803450,
        "baseLng": 106.714150,
        "variants": [
            "Các hộ tiểu thương kê sạp rau củ, dù bạt lấn chiếm ra tận tim đường hẻm 15 gây ùn tắc giao thông giờ cao điểm.",
            "Hàng quán buôn bán tràn xuống lòng đường Võ Oanh, xe máy không còn lối đi lọt.",
            "Chợ tự phát tụ tập buôn bán cá thịt lấn hết vỉa hè và xả nước tanh hôi ra đường.",
            "Tình trạng họp chợ lấn chiếm hành lang an toàn giao thông nghiêm trọng tại đầu hẻm 15 D3.",
            "Đội trật tự đô thị phường 25 cần ra quân chấn chỉnh giải tỏa các sạp hàng lấn chiếm này."
        ]
    },
    {
        "eventId": "EVT-025",
        "category": "ORDER_SECURITY",
        "title": "Bãi giữ xe tự phát chiếm trọn vỉa hè trường học",
        "address": "Trước số 44 Nguyễn Gia Trí, Phường 25, Bình Thạnh",
        "baseLat": 10.804550,
        "baseLng": 106.715350,
        "variants": [
            "Quán cà phê tự ý căng dây giữ hàng trăm chiếc xe máy chiếm trọn vỉa hè người đi bộ trước số 44.",
            "Bãi giữ xe trái phép đẩy người đi bộ và sinh viên phải đi bộ dưới lòng đường xe chạy rầm rập.",
            "Vỉa hè bị chiếm dụng 100% để làm bãi đỗ xe máy của các hàng quán kinh doanh.",
            "Hàng xe máy đậu kín mít bậc tam cấp vỉa hè, không còn một khoảng trống nào cho người đi bộ.",
            "Yêu cầu xử lý dứt điểm hành vi lấn chiếm vỉa hè công cộng làm nơi kinh doanh giữ xe có thu tiền."
        ]
    },
    {
        "eventId": "EVT-026",
        "category": "ORDER_SECURITY",
        "title": "Tập kết vật liệu xây dựng cát đá bít lối đi",
        "address": "Trước công trình xây dựng số 71 Ung Văn Khiêm, Phường 25",
        "baseLat": 10.806350,
        "baseLng": 106.717450,
        "variants": [
            "Nhà đang xây dựng đổ đống cát đá và sắt thép chiếm hết vỉa hè và lấn luôn nửa làn đường Ung Văn Khiêm.",
            "Vật liệu xây dựng gạch ngói tập kết ngổn ngang không che chắn, bít kín lối ra vào của người dân.",
            "Công trình xây dựng lấn chiếm lòng lề đường làm bãi tập kết vật tư gây cản trở giao thông nghiêm trọng.",
            "Cát đá xây dựng tràn xuống đường khiến người đi xe máy thường xuyên bị trượt té ngã.",
            "Đề nghị thanh tra xây dựng phường kiểm tra và yêu cầu chủ hộ dọn dẹp vật liệu vào trong khuôn viên đất."
        ]
    },
    {
        "eventId": "EVT-027",
        "category": "ORDER_SECURITY",
        "title": "Biển quảng cáo đặt trái phép che khuất tầm nhìn góc cua",
        "address": "Góc cua đường D5 rẽ vào Nguyễn Gia Trí, Phường 25",
        "baseLat": 10.804920,
        "baseLng": 106.715950,
        "variants": [
            "Biển quảng cáo hộp đèn của cửa hàng tiện lợi đặt ngay mũi tàu góc cua che khuất toàn bộ tầm nhìn của xe cộ.",
            "Bảng hiệu đứng dựng chình ình dưới lòng đường góc cua rất dễ gây va chạm giao thông đối đầu.",
            "Biển hiệu pano quảng cáo đặt sai quy định lấn ra sát mép đường xe chạy.",
            "Tầm nhìn tại khúc cua nguy hiểm bị chặn đứng bởi hàng loạt biển hiệu quảng cáo di động.",
            "Tổ trật tự đô thị cần tịch thu các biển quảng cáo đặt sai quy định che tầm nhìn ở góc cua D5."
        ]
    },
    {
        "eventId": "EVT-028",
        "category": "ORDER_SECURITY",
        "title": "Xe tải dừng đỗ bốc dỡ hàng hóa chiếm lòng đường giờ cao điểm",
        "address": "Trước kho hàng số 95 Ung Văn Khiêm, Phường 25",
        "baseLat": 10.806550,
        "baseLng": 106.716950,
        "variants": [
            "Xe tải trọng lớn thường xuyên đậu chiếm trọn làn đường Ung Văn Khiêm vào giờ tan tầm để bốc dỡ hàng.",
            "Xe tải dừng đỗ trái phép giữa ban ngày gây kẹt xe kéo dài từ cầu Sài Gòn tới ngã năm.",
            "Hoạt động giao nhận hàng hóa chiếm dụng lòng đường hẹp làm tê liệt giao thông cục bộ.",
            "Tài xế xe tải ngang nhiên đậu xe ngược chiều bốc hàng bất chấp biển cấm dừng đỗ.",
            "Cảnh sát giao thông và trật tự phường cần xử phạt xe tải đỗ chiếm đường gây ùn tắc tại số 95."
        ]
    },
    {
        "eventId": "EVT-029",
        "category": "ORDER_SECURITY",
        "title": "Dựng rạp đám tiệc lấn kín con hẻm dân sinh",
        "address": "Hẻm 36 Nguyễn Gia Trí, Phường 25, Bình Thạnh",
        "baseLat": 10.804250,
        "baseLng": 106.714850,
        "variants": [
            "Một hộ dân dựng rạp liên hoan đám tiệc chiếm hết toàn bộ chiều rộng con hẻm 36, xe cộ không thể qua lại.",
            "Khung sắt rạp tiệc dựng bít bùng lối thoát hiểm của cả khu phố, nếu có sự cố cháy nổ xe cứu hỏa không vào được.",
            "Rạp đám chiếm trọn lòng hẻm đi lại của bà con từ sáng đến đêm kèm loa đài ồn ào.",
            "Tình trạng dựng rạp sinh hoạt cá nhân cản trở lưu thông chung của cả trăm hộ dân trong hẻm.",
            "Tổ dân phố và công an phường cần can thiệp yêu cầu gia đình thu hẹp rạp chừa lối đi cho cư dân."
        ]
    },
    {
        "eventId": "EVT-030",
        "category": "ORDER_SECURITY",
        "title": "Bàn ghế quán nhậu vỉa hè chiếm dụng lối đi bộ ban đêm",
        "address": "Dãy quán nhậu vỉa hè đường Võ Oanh (gần bờ sông), Phường 25",
        "baseLat": 10.803950,
        "baseLng": 106.714750,
        "variants": [
            "Từ 18h tối các quán nhậu bày bàn ghế nhựa tràn ngập toàn bộ vỉa hè, khách nhậu ngồi lấn xuống lòng đường Võ Oanh.",
            "Quán nhậu chiếm dụng hè phố làm nơi kinh doanh ăn uống, người đi bộ bị xua đuổi xuống lòng đường.",
            "Bàn ghế, lò nướng khói nghi ngút bày la liệt chiếm hết không gian công cộng ven đường.",
            "Vỉa hè bị tư nhân hóa thành quán nhậu bia bọt ồn ào, xe khách đậu kín lòng đường.",
            "Đề nghị UBND Phường kiểm tra lập lại trật tự đô thị, trả lại vỉa hè thông thoáng cho người dân đi bộ."
        ]
    }
]


def add_gps_noise(lat: float, lng: float, noise_meters: float = 15.0) -> tuple:
    """
    Applies Gaussian noise to GPS coordinates within a target radius (in meters).
    1 degree of latitude ~= 111,320 meters.
    1 degree of longitude ~= 111,320 * cos(latitude) meters.
    """
    # Random angle and distance using Box-Muller / normal distribution
    angle = random.uniform(0, 2 * math.pi)
    dist = random.gauss(noise_meters * 0.6, noise_meters * 0.3)
    dist = max(2.0, min(dist, 40.0))  # Clamp between 2m and 40m

    delta_lat = (dist * math.cos(angle)) / 111320.0
    delta_lng = (dist * math.sin(angle)) / (111320.0 * math.cos(math.radians(lat)))

    return round(lat + delta_lat, 6), round(lng + delta_lng, 6), round(dist, 1)


def generate_pipeline_3_datasets():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"[*] Starting Pipeline 3: Generating Civic Reports Dataset...")

    # 1. Export original-events.csv
    original_events_path = os.path.join(OUTPUT_DIR, "original-events.csv")
    with open(original_events_path, "w", encoding="utf-8", newline="") as f:
        fieldnames = ["eventId", "expectedClusterId", "category", "title", "address", "baseLatitude", "baseLongitude", "totalReportsExpected"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for idx, evt in enumerate(BASE_EVENTS, 1):
            writer.writerow({
                "eventId": evt["eventId"],
                "expectedClusterId": f"CLUST-{idx:03d}",
                "category": evt["category"],
                "title": evt["title"],
                "address": evt["address"],
                "baseLatitude": evt["baseLat"],
                "baseLongitude": evt["baseLng"],
                "totalReportsExpected": len(evt["variants"])
            })

    print(f" [+] Saved 30 original events: {original_events_path}")

    # 2. Generate 150 reports with GPS noise & metadata
    generated_reports_path = os.path.join(OUTPUT_DIR, "generated-reports.csv")
    ground_truth_path = os.path.join(OUTPUT_DIR, "ground-truth.csv")

    reports = []
    ground_truth_rows = []
    report_counter = 0

    base_time = datetime.datetime(2026, 11, 1, 8, 0, 0)

    # Specific hard cases identification:
    # Hard Case 1: Colocated Different Category: EVT-001 (ROAD_DAMAGE) & EVT-024 (ORDER_SECURITY) both on Vo Oanh (~15m apart)
    # Hard Case 2: Same Category Distant: EVT-001 (ROAD_DAMAGE) vs EVT-003 (ROAD_DAMAGE) separated by ~450m
    # Hard Case 3: High Lexical Diversity: EVT-017 (LIGHTING) variants

    for idx, evt in enumerate(BASE_EVENTS, 1):
        cluster_id = f"CLUST-{idx:03d}"
        cluster_report_ids = []

        for v_idx, variant_text in enumerate(evt["variants"], 1):
            report_counter += 1
            report_id = f"RPT-{report_counter:03d}"
            cluster_report_ids.append(report_id)

            # Apply realistic GPS smartphone jitter
            noise_target = random.choice([8.0, 15.0, 22.0, 30.0])
            noisy_lat, noisy_lng, actual_dist = add_gps_noise(evt["baseLat"], evt["baseLng"], noise_target)

            # Time distribution: reports for same event occur within 24-48 hours
            time_offset_hours = random.uniform(1.0, 36.0)
            report_time = (base_time + datetime.timedelta(hours=time_offset_hours)).strftime("%Y-%m-%dT%H:%M:%S")

            # Determine hard case tag
            is_hard_case = False
            hard_case_type = "STANDARD"

            if evt["eventId"] in ["EVT-001", "EVT-024"]:
                is_hard_case = True
                hard_case_type = "COLOCATED_DIFFERENT_CATEGORY"
            elif evt["eventId"] in ["EVT-001", "EVT-003"]:
                is_hard_case = True
                hard_case_type = "SAME_CATEGORY_DISTANT_LOCATION"
            elif evt["eventId"] in ["EVT-017", "EVT-022"]:
                is_hard_case = True
                hard_case_type = "HIGH_LEXICAL_DIVERSITY"

            reports.append({
                "reportId": report_id,
                "expectedClusterId": cluster_id,
                "originEventId": evt["eventId"],
                "category": evt["category"],
                "description": variant_text,
                "latitude": noisy_lat,
                "longitude": noisy_lng,
                "noiseMeters": actual_dist,
                "submittedAt": report_time,
                "isHardCase": is_hard_case,
                "hardCaseType": hard_case_type
            })

        ground_truth_rows.append({
            "clusterId": cluster_id,
            "originEventId": evt["eventId"],
            "category": evt["category"],
            "clusterCenterLat": evt["baseLat"],
            "clusterCenterLng": evt["baseLng"],
            "memberCount": len(cluster_report_ids),
            "memberReportIds": ";".join(cluster_report_ids)
        })

    with open(generated_reports_path, "w", encoding="utf-8", newline="") as f:
        fieldnames = ["reportId", "expectedClusterId", "originEventId", "category", "description", "latitude", "longitude", "noiseMeters", "submittedAt", "isHardCase", "hardCaseType"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(reports)

    print(f" [+] Saved 150 simulated citizen reports: {generated_reports_path}")

    with open(ground_truth_path, "w", encoding="utf-8", newline="") as f:
        fieldnames = ["clusterId", "originEventId", "category", "clusterCenterLat", "clusterCenterLng", "memberCount", "memberReportIds"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(ground_truth_rows)

    print(f" [+] Saved ground-truth clusters: {ground_truth_path}")

    # Summary statistics
    cats = {}
    for r in reports:
        c = r["category"]
        cats[c] = cats.get(c, 0) + 1

    print("\n" + "=" * 60)
    print("PIPELINE 3 - CIVIC REPORTS BENCHMARK GENERATED:")
    print(f" - Total Incidents: {len(BASE_EVENTS)}")
    print(f" - Total Generated Reports: {len(reports)}")
    print(" - Category Breakdown:")
    for k, v in cats.items():
        print(f"    * {k}: {v} reports ({v // 5} clusters)")
    print(f" - Hard Cases: {sum(1 for r in reports if r['isHardCase'])} reports tagged for grid-search evaluation")
    print("=" * 60)


if __name__ == "__main__":
    generate_pipeline_3_datasets()
