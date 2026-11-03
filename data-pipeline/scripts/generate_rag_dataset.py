#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI - Semi-Automated Data Pipeline
Pipeline 2: RAG Evaluation Benchmark Generator (80 Ground-Truth Questions)
Generates:
 - 40 Direct Questions (1 per procedure, strictly grounded in verified facts)
 - 25 Natural Questions (citizen conversational style)
 - 15 Out-of-Scope Questions (testing Abstention Guardrail theta = 0.78)
"""

import os
import sys
import json
import glob

sys.stdout.reconfigure(encoding='utf-8')

VERIFIED_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../procedure-crawler/verified"))
RAG_DATASET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../rag-dataset"))


def load_verified_procedures():
    files = glob.glob(os.path.join(VERIFIED_DIR, "*.json"))
    procs = []
    for fp in sorted(files):
        with open(fp, "r", encoding="utf-8") as f:
            procs.append(json.load(f))
    return procs


def generate_direct_questions(procedures):
    """40 Direct Questions - strictly 1 per procedure testing exact administrative facts."""
    direct_list = []
    for idx, p in enumerate(procedures, 1):
        code = p.get("procedureCode")
        name = p.get("procedureName")
        proc_time = p.get("processingTime", "Trong ngày làm việc")
        fee = p.get("fee", "Theo quy định")
        docs = p.get("requiredDocuments", [])
        legal = p.get("legalBasis", [])
        
        # Vary question targets across docs, duration, fee, authority
        mod = idx % 4
        if mod == 0:
            question = f"Thời hạn giải quyết {name} tại Ủy ban nhân dân cấp xã là bao lâu?"
            expected_answer = f"Thời hạn giải quyết thủ tục {name} là: {proc_time}."
            expected_chunk = "OVERVIEW"
        elif mod == 1:
            doc_sample = docs[0]['documentName'] if docs else "Tờ khai theo mẫu"
            question = f"Thực hiện {name} cần chuẩn bị những thành phần hồ sơ và giấy tờ gì?"
            expected_answer = f"Người yêu cầu cần chuẩn bị các giấy tờ bao gồm: {doc_sample} và các giấy tờ theo quy định."
            expected_chunk = "REQUIRED_DOCUMENTS"
        elif mod == 2:
            question = f"Lệ phí thực hiện {name} tại Bộ phận Một cửa cấp xã là bao nhiêu?"
            expected_answer = f"Mức thu lệ phí đối với thủ tục {name}: {fee}."
            expected_chunk = "OVERVIEW"
        else:
            ref = legal[0]['documentNumber'] if legal else "Luật Hộ tịch / Cư trú"
            question = f"Căn cứ pháp lý chính quy định việc thực hiện {name} là văn bản nào?"
            expected_answer = f"Căn cứ pháp lý quy định {name} bao gồm: {ref}."
            expected_chunk = "LEGAL_BASIS"

        legal_ref = legal[0]['documentNumber'] if legal else "Văn bản quy phạm pháp luật"

        item = {
            "questionId": f"RAG-DIR-{idx:03d}",
            "question": question,
            "questionType": "DIRECT",
            "procedureCode": code,
            "procedureName": name,
            "expectedChunkType": expected_chunk,
            "expectedAnswer": expected_answer,
            "legalReference": legal_ref,
            "isInScope": True,
            "expectedBehavior": "ANSWER"
        }
        direct_list.append(item)
    return direct_list


def generate_natural_questions(procedures):
    """25 Natural Questions - conversational, everyday citizen phrasing."""
    natural_templates = [
        ("TTHC-HT-01", "Tôi mới sinh em bé, muốn làm giấy khai sinh ở xã thì cần mang giấy chứng sinh và những giấy tờ gì?",
         "Người yêu cầu cần mang Giấy chứng sinh (hoặc bản điện tử liên thông), giấy tờ tùy thân của cha mẹ và Tờ khai đăng ký khai sinh.", "REQUIRED_DOCUMENTS"),
        ("TTHC-HT-02", "Hai vợ chồng tôi muốn đăng ký kết hôn tại UBND phường thì mất bao lâu có kết quả và có mất phí không?",
         "Thủ tục đăng ký kết hôn được giải quyết ngay trong ngày làm việc sau khi nhận đủ hồ sơ hợp lệ và miễn lệ phí đăng ký đúng hạn.", "OVERVIEW"),
        ("TTHC-HT-03", "Người thân trong gia đình không may qua đời, tôi cần làm thủ tục khai tử trong bao nhiêu ngày?",
         "Trong thời hạn quy định, người thân có trách nhiệm đăng ký khai tử tại UBND cấp xã nơi cư trú cuối cùng của người mất.", "OVERVIEW"),
        ("TTHC-HT-04", "Bản gốc giấy khai sinh của tôi bị mờ chữ, tôi có thể đến phường xin trích lục bản sao được không?",
         "Công dân có quyền yêu cầu cấp bản sao Trích lục hộ tịch (khai sinh) tại bất kỳ cơ quan đăng ký hộ tịch nào có quản lý Sổ hộ tịch hoặc Cơ sở dữ liệu hộ tịch.", "OVERVIEW"),
        ("TTHC-HT-11", "Tôi sắp đi làm thủ tục mua bán nhà đất cần Giấy xác nhận độc thân thì cơ quan nào cấp và thời hạn bao lâu?",
         "Ủy ban nhân dân cấp xã nơi công dân thường trú có thẩm quyền cấp Giấy xác nhận tình trạng hôn nhân trong thời hạn quy định.", "OVERVIEW"),
        ("TTHC-CR-01", "Tôi vừa mua nhà chuyển khẩu về địa chỉ mới, cần làm thủ tục đăng ký thường trú như thế nào?",
         "Công dân nộp hồ sơ đăng ký thường trú gồm Tờ khai thay đổi thông tin cư trú và giấy tờ chứng minh chỗ ở hợp pháp tại Công an cấp xã/phường.", "REQUIRED_DOCUMENTS"),
        ("TTHC-CR-03", "Tôi là sinh viên thuê trọ ở đây thì chủ trọ hay tôi phải đi đăng ký tạm trú, hồ sơ gồm những gì?",
         "Người thuê nhà hoặc chủ nhà nộp Tờ khai thay đổi thông tin cư trú và hợp đồng thuê nhà để đăng ký tạm trú tại Công an cấp xã.", "REQUIRED_DOCUMENTS"),
        ("TTHC-CR-06", "Nhà tôi có người bà con dưới quê lên chơi ở lại qua đêm thì phải thông báo lưu trú qua đâu?",
         "Gia đình có thể thực hiện thông báo lưu trú trực tiếp tại Công an xã hoặc trực tuyến qua Cổng dịch vụ công / ứng dụng VNeID.", "PROCESS_STEP"),
        ("TTHC-CR-07", "Tôi đi công tác nước ngoài 6 tháng thì có bắt buộc phải khai báo tạm vắng với công an phường không?",
         "Công dân vắng mặt tại nơi cư trú từ 12 tháng trở lên hoặc thuộc diện quản lý tư pháp phải thực hiện khai báo tạm vắng.", "OVERVIEW"),
        ("TTHC-CR-08", "Cơ quan bảo hiểm yêu cầu giấy xác nhận thông tin về cư trú mẫu CT07 thì xin ở đâu?",
         "Công dân có thể yêu cầu cấp Giấy xác nhận thông tin về cư trú (CT07) trực tiếp tại Công an xã/phường hoặc qua Cổng dịch vụ công.", "OVERVIEW"),
        ("TTHC-CT-01", "Tôi cần công chứng bản sao bằng tốt nghiệp đại học tại UBND phường thì lệ phí tính như thế nào?",
         "Mức phí chứng thực bản sao từ bản chính được thu theo quy định tại Nghị định 23/2015/NĐ-CP (thông thường 2.000 VNĐ/trang đầu).", "OVERVIEW"),
        ("TTHC-CT-02", "Tôi muốn chứng thực chữ ký trên giấy ủy quyền giải quyết công việc thì có cần mang bản gốc CCCD đi không?",
         "Người yêu cầu chứng thực chữ ký bắt buộc phải xuất trình bản chính thẻ Căn cước/CCCD và ký trước mặt người tiếp nhận hồ sơ.", "REQUIRED_DOCUMENTS"),
        ("TTHC-CT-04", "Ba mẹ tôi để lại mảnh đất, anh em trong nhà muốn làm văn bản phân chia di sản tại xã có được không?",
         "UBND cấp xã có thẩm quyền chứng thực văn bản phân chia di sản là quyền sử dụng đất, nhà ở theo quy định pháp luật về chứng thực.", "OVERVIEW"),
        ("TTHC-CT-08", "Người cao tuổi muốn lập di chúc và chứng thực tại UBND xã thì cần những người làm chứng nào?",
         "Người lập di chúc phải có năng lực hành vi dân sự, minh mẫn và văn bản di chúc được chứng thực theo quy định tại Nghị định 23/2015/NĐ-CP.", "PROCESS_STEP"),
        ("TTHC-BT-01", "Gia đình có người già trên 80 tuổi không có lương hưu thì thủ tục nhận trợ cấp xã hội hàng tháng gồm những gì?",
         "Hồ sơ gồm Tờ khai thông tin người cao tuổi, bản sao giấy tờ tùy thân nộp tại UBND cấp xã để xét duyệt chế độ bảo trợ xã hội hàng tháng.", "REQUIRED_DOCUMENTS"),
        ("TTHC-BT-02", "Đối tượng đang nhận trợ cấp xã hội không may qua đời thì gia đình được hỗ trợ tiền mai táng là bao nhiêu?",
         "Người lo mai táng nộp hồ sơ tại UBND cấp xã để nhận hỗ trợ chi phí mai táng theo mức chuẩn trợ giúp xã hội hiện hành.", "OVERVIEW"),
        ("TTHC-BT-03", "Trẻ em mồ côi cả cha lẫn mẹ thì nộp hồ sơ xin trợ cấp vào đâu?",
         "Người giám hộ nộp hồ sơ đề nghị hưởng trợ cấp xã hội cho trẻ mồ côi tại UBND cấp xã nơi trẻ cư trú.", "REQUIRED_DOCUMENTS"),
        ("TTHC-BT-05", "Người gặp hoàn cảnh khó khăn đột xuất do thiên tai thì xã có trợ cấp khẩn cấp một lần không?",
         "UBND cấp xã xem xét chi trả trợ cấp đột xuất một lần cho các hộ gia đình gặp khó khăn theo quy định tại Nghị định 20/2021/NĐ-CP.", "OVERVIEW"),
        ("TTHC-DC-01", "Tôi tặng cho quyền sử dụng đất cho con gái thì nộp hồ sơ biến động đất đai ở xã được không?",
         "Công dân nộp hồ sơ đăng ký biến động quyền sử dụng đất tại Bộ phận Một cửa cấp xã hoặc Văn phòng Đăng ký đất đai.", "PROCESS_STEP"),
        ("TTHC-DC-02", "Tôi cần xin giấy xác nhận đất nhà tôi đang ở không có tranh chấp thì cần làm đơn gì gửi xã?",
         "Công dân nộp đơn đề nghị xác nhận hiện trạng sử dụng đất, không có tranh chấp tại UBND cấp xã nơi có đất.", "REQUIRED_DOCUMENTS"),
        ("TTHC-HT-08", "Tôi bị mất hết giấy khai sinh từ hồi nhỏ, giờ muốn đăng ký lại khai sinh tại quê nhà thì cần chuẩn bị gì?",
         "Công dân nộp Tờ khai đăng ký lại khai sinh và các giấy tờ, tài liệu có liên quan chứng minh thông tin nhân thân trước đây.", "REQUIRED_DOCUMENTS"),
        ("TTHC-HT-05", "Cha mẹ chưa đăng ký kết hôn thì khi làm khai sinh có kết hợp làm thủ tục nhận cha cho con được không?",
         "Pháp luật cho phép kết hợp giải quyết đồng thời thủ tục đăng ký nhận cha, mẹ, con và thủ tục đăng ký khai sinh tại UBND cấp xã.", "PROCESS_STEP"),
        ("TTHC-CR-02", "Khi một người qua đời thì người nhà có cần đến công an để làm thủ tục xóa tên trong sổ thường trú không?",
         "Hiện nay quy trình liên thông cho phép đăng ký khai tử đồng thời xóa đăng ký thường trú tự động trên Cơ sở dữ liệu dân cư.", "PROCESS_STEP"),
        ("TTHC-CT-07", "Tôi muốn từ chối quyền nhận di sản thừa kế của bố mẹ để lại cho em trai thì ký giấy ở đâu?",
         "Công dân có thể thực hiện chứng thực văn bản từ chối nhận di sản tại UBND cấp xã hoặc tổ chức hành nghề công chứng.", "OVERVIEW"),
        ("TTHC-HT-12", "Con tôi muốn đổi lại chữ đệm trong giấy khai sinh thì đến đâu làm và cần điều kiện gì?",
         "Việc thay đổi, cải chính hộ tịch cho người dưới 14 tuổi thuộc thẩm quyền giải quyết của UBND cấp xã nơi đã đăng ký khai sinh trước đây.", "OVERVIEW")
    ]

    nat_list = []
    for idx, (code, q_text, ans_text, chunk_type) in enumerate(natural_templates, 1):
        item = {
            "questionId": f"RAG-NAT-{idx:03d}",
            "question": q_text,
            "questionType": "NATURAL",
            "procedureCode": code,
            "procedureName": f"Thủ tục liên quan ({code})",
            "expectedChunkType": chunk_type,
            "expectedAnswer": ans_text,
            "legalReference": "Quy định pháp luật hiện hành",
            "isInScope": True,
            "expectedBehavior": "ANSWER"
        }
        nat_list.append(item)
    return nat_list


def generate_out_of_scope_questions():
    """15 Out-of-Scope Questions - testing Abstention Guardrail (Abstain mechanism)."""
    oos_templates = [
        ("Thủ tục cấp Hộ chiếu phổ thông (Passport) trực tuyến thực hiện tại cơ quan nào?",
         "Thủ tục cấp Hộ chiếu phổ thông thuộc thẩm quyền của Cục Quản lý xuất nhập cảnh - Bộ Công an hoặc Phòng Quản lý xuất nhập cảnh Công an cấp tỉnh, không thuộc thẩm quyền của UBND cấp xã."),
        ("Tôi muốn đăng ký cấp biển số xe ô tô mới mua thì nộp hồ sơ ở đâu?",
         "Thủ tục đăng ký, cấp biển số xe ô tô thuộc thẩm quyền của Phòng Cảnh sát giao thông Công an cấp tỉnh hoặc Công an cấp huyện."),
        ("Thủ tục đổi Giấy phép lái xe (bằng lái B2) hết hạn cần những giấy tờ gì?",
         "Thủ tục đổi Giấy phép lái xe do Sở Giao thông vận tải hoặc Cục Đường bộ Việt Nam tiếp nhận và giải quyết."),
        ("Thủ tục thành lập Công ty Cổ phần nộp hồ sơ tại cơ quan nào?",
         "Hồ sơ đăng ký thành lập doanh nghiệp nộp tại Phòng Đăng ký kinh doanh thuộc Sở Kế hoạch và Đầu tư tỉnh/thành phố."),
        ("Làm thế nào để đăng ký nhãn hiệu độc quyền và bản quyền tác giả?",
         "Đăng ký sở hữu công nghiệp/nhãn hiệu thuộc thẩm quyền của Cục Sở hữu trí tuệ; bản quyền tác giả thuộc Cục Bản quyền tác giả."),
        ("Thủ tục xin visa du lịch cho người nước ngoài nhập cảnh vào Việt Nam?",
         "Thủ tục cấp thị thực (visa) nhập cảnh thuộc thẩm quyền của Cục Quản lý xuất nhập cảnh - Bộ Công an hoặc cơ quan đại diện ngoại giao Việt Nam ở nước ngoài."),
        ("Làm thế nào để mở chi nhánh văn phòng đại diện của thương nhân nước ngoài?",
         "Thủ tục cấp phép thành lập văn phòng đại diện thương nhân nước ngoài thuộc thẩm quyền của Sở Công Thương tỉnh/thành phố."),
        ("Thủ tục cấp Chứng chỉ hành nghề khám bệnh chữa bệnh cho bác sĩ?",
         "Thủ tục cấp Chứng chỉ hành nghề y dược thuộc thẩm quyền của Sở Y tế cấp tỉnh hoặc Bộ Y tế."),
        ("Làm thẻ Căn cước công dân gắn chip lần đầu cho học sinh cấp 3 ở đâu?",
         "Thủ tục cấp thẻ Căn cước cho công dân từ đủ 14 tuổi trở lên do cơ quan quản lý căn cước Công an cấp huyện hoặc Phòng Cảnh sát QLHC Công an tỉnh thực hiện."),
        ("Thủ tục xin cấp Giấy phép kinh doanh bán lẻ rượu và thuốc lá?",
         "Thủ tục cấp Giấy phép bán lẻ rượu, thuốc lá thuộc thẩm quyền giải quyết của Phòng Kinh tế hoặc Phòng Kinh tế - Hạ tầng UBND cấp huyện."),
        ("Hồ sơ xin hoàn thuế thu nhập cá nhân nộp cho cơ quan nào?",
         "Hồ sơ quyết toán và hoàn thuế TNCN nộp trực tiếp hoặc trực tuyến tại Chi cục Thuế hoặc Cục Thuế quản lý trực tiếp."),
        ("Thủ tục cấp Phiếu lý lịch tư pháp số 1 và số 2 xin ở đâu?",
         "Phiếu lý lịch tư pháp do Sở Tư pháp cấp tỉnh hoặc Trung tâm Lý lịch tư pháp quốc gia cấp."),
        ("Làm thế nào để đăng ký dự thi sát hạch chứng chỉ môi giới bất động sản?",
         "Thủ tục thi sát hạch cấp chứng chỉ môi giới bất động sản do Sở Xây dựng cấp tỉnh tổ chức."),
        ("Thủ tục giải thể hợp tác xã nông nghiệp thực hiện tại đâu?",
         "Thủ tục đăng ký giải thể hợp tác xã thuộc thẩm quyền giải quyết của cơ quan đăng ký kinh doanh cấp huyện."),
        ("Thời tiết ngày mai tại TP.HCM có mưa không?",
         "Câu hỏi không thuộc lĩnh vực thủ tục hành chính công. Hệ thống từ chối trả lời.")
    ]

    oos_list = []
    for idx, (q_text, reason) in enumerate(oos_templates, 1):
        item = {
            "questionId": f"RAG-OOS-{idx:03d}",
            "question": q_text,
            "questionType": "OUT_OF_SCOPE",
            "procedureCode": None,
            "procedureName": None,
            "expectedChunkType": "NONE",
            "expectedAnswer": f"Hệ thống SmartWard AI từ chối trả lời vì câu hỏi nằm ngoài phạm vi 40 TTHC cấp xã: {reason}",
            "legalReference": None,
            "isInScope": False,
            "expectedBehavior": "ABSTAIN"
        }
        oos_list.append(item)
    return oos_list


def run_generate_dataset():
    os.makedirs(RAG_DATASET_DIR, exist_ok=True)
    procedures = load_verified_procedures()
    print(f"[*] Loaded {len(procedures)} verified procedures from {VERIFIED_DIR}")

    if not procedures:
        print("[!] No verified procedures found. Please run procedure pipeline first.")
        return

    direct_q = generate_direct_questions(procedures)
    natural_q = generate_natural_questions(procedures)
    oos_q = generate_out_of_scope_questions()

    total_q = len(direct_q) + len(natural_q) + len(oos_q)

    # Save individual JSON files
    with open(os.path.join(RAG_DATASET_DIR, "direct.json"), "w", encoding="utf-8") as f:
        json.dump(direct_q, f, ensure_ascii=False, indent=2)

    with open(os.path.join(RAG_DATASET_DIR, "natural.json"), "w", encoding="utf-8") as f:
        json.dump(natural_q, f, ensure_ascii=False, indent=2)

    with open(os.path.join(RAG_DATASET_DIR, "out-of-scope.json"), "w", encoding="utf-8") as f:
        json.dump(oos_q, f, ensure_ascii=False, indent=2)

    # Master Ground-Truth JSON
    ground_truth = {
        "datasetName": "SmartWard AI - RAG Evaluation Benchmark (80 Questions)",
        "unit": "Trường Đại học Giao thông vận tải TP.HCM (UTH)",
        "totalQuestions": total_q,
        "distribution": {
            "directQuestionsCount": len(direct_q),
            "naturalQuestionsCount": len(natural_q),
            "outOfScopeQuestionsCount": len(oos_q),
            "inScopeCount": len(direct_q) + len(natural_q),
            "abstentionTargetCount": len(oos_q)
        },
        "evaluationMetricsTarget": {
            "retrievalHitRateTop3Target": ">= 90.0%",
            "abstentionAccuracyTarget": "100.0% for Out-of-Scope",
            "citationPrecisionTarget": ">= 95.0%"
        },
        "questions": direct_q + natural_q + oos_q
    }

    with open(os.path.join(RAG_DATASET_DIR, "ground-truth.json"), "w", encoding="utf-8") as f:
        json.dump(ground_truth, f, ensure_ascii=False, indent=2)

    print(f"\n[V] Successfully generated {total_q} RAG Evaluation Questions:")
    print(f"    - Direct Questions (Direct): {len(direct_q)}")
    print(f"    - Natural Questions (Natural): {len(natural_q)}")
    print(f"    - Out-of-Scope Questions (Abstention): {len(oos_q)}")
    print(f"    - Output: {os.path.join(RAG_DATASET_DIR, 'ground-truth.json')}")


if __name__ == "__main__":
    run_generate_dataset()
