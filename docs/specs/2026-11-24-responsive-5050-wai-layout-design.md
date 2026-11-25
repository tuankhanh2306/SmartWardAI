# Thiết Kế Bố Cục Đa Màn Hình Tự Động, Sticky Header, Cổng 50:50 & Không Gian Trợ Lý AI Kiểu Wai

> **Ngày:** 2026-11-24
> **Nhánh triển khai:** `feature/ui-wai-5050-responsive-layout` (tách từ `develop`)

## 1. Mục tiêu & Lý do (Intent & Why)
Người dùng yêu cầu nâng cấp toàn diện bố cục giao diện Web Frontend của **SmartWard AI** theo 2 mẫu tham chiếu hiện đại (phong cách **Wai AI Assistant**):
1. **Tự động tối ưu trên mọi kích thước màn hình (`320px`, `375px`, `768px`, `1280px`, `1440px+`) và mọi mức phóng chữ (`A / A+ / A++`):** Không tràn ngang (`0px` horizontal overflow), không bị bó hẹp hoặc vỡ dòng.
2. **Cuộn trang lên/xuống mượt tự nhiên & Thanh Header luôn dính ở đỉnh (`sticky top-0 z-50`):**
   - Loại bỏ cảm giác bị kẹt scroll giữa khung trang và khung con.
   - `<Header />` dùng `sticky top-0 z-50` và bổ sung thanh điều hướng ngang cho cả Mobile/Tablet (`< 1024px`) thay vì bị `hidden lg:block`.
3. **Bố cục Cổng Chọn Role & Đăng Nhập 50:50 (`RoleGateway.tsx` tại `/`):**
   - **50% Bên trái:** Khu vực Hero thương hiệu `SmartWard AI`, tiêu đề lớn 2 dòng, 3 cam kết nghiệp vụ (icon dấu tick tròn) và 2 thẻ preview nổi minh họa *Hỏi đáp Pháp lý AI* & *Tóm tắt Kiểm định Tờ khai A4*.
   - **50% Bên phải:** Thẻ tương tác chính (`Xin chào, Welcome back`) với pill chọn nhanh đơn vị Xã/Phường ở góc phải trên và **Thanh chuyển vai trò 50:50 (`Người dân` | `Cán bộ / Quản trị`)** cho phép vào thẳng Cổng Dân hoặc đăng nhập Mã thẻ + PIN ngay trên thẻ.
4. **Bố cục Trang Trợ Lý AI Công Dân Tối Giản Trung Tâm (`CitizenPortal.tsx` tại `/citizen`):**
   - Loại bỏ cột sidebar trái chật chội, chuyển sang bố cục **Centered AI Workspace** giống Wai:
     - Logo + Lời chào lớn ở trung tâm (`Xin chào, tôi là SmartWard AI`).
     - **Hộp nhập liệu đa năng (Omnibox Card)** ở chính giữa với vùng nhập câu hỏi, hàng nút thao tác dưới (`+ Cuộc trò chuyện mới`, `Kiểm tra tờ khai`, `Nguồn thông tin (40 Thủ tục)`, pill trạng thái RAG, nút Micro giọng nói và nút Gửi `→`).
     - Mục **`GỢI Ý CÂU HỎI`** với **4 thẻ ngang** (`Đăng ký khai sinh`, `Cư trú & Mẫu CT01`, `Đăng ký kết hôn`, `Trợ cấp bảo trợ xã hội`).
     - Khi đã có hội thoại, luồng tin nhắn hiển thị căn giữa (`max-w-4xl`), cuộn trang lên/xuống tự nhiên với Header dính ở trên và thanh Omnibox dính gọn ở đáy (`sticky bottom-0`).
5. **Chỉnh hộp sổ xuống (Custom Downward Dropdown) tại mục `Tình trạng lệ phí` (`ProceduresCatalogPage.tsx`):**
   - Nâng cấp bộ lọc `Tình trạng lệ phí` (và đồng bộ các ô lọc trong `ProceduresCatalogPage.tsx`) thành menu sổ thẳng xuống dưới (`top-full mt-1.5 z-30`), có mũi tên xoay mượt, dấu tick mục đang chọn và số lượng thủ tục tương ứng, hỗ trợ đầy đủ bàn phím (`Escape`, `ArrowDown`, `ArrowUp`, `Enter`) và trình đọc màn hình.

## 2. Ràng buộc & Tương thích Kiểm thử (Constraints)
- Bảo toàn 100% logic phân quyền RBAC (`CitizenGuard`, `OfficerGuard`, `AdminGuard`, `SEC-09`), các nhãn nút kiểm thử Playwright (`Đăng nhập với tư cách Người dân`, `Đăng nhập Cán bộ`, `Đăng nhập Hệ thống`, `Đăng ký khai sinh`), và đạt `0` lỗi Axe WCAG 2.1 AA.
- Không thêm thư viện bên ngoài làm phình bundle size.
