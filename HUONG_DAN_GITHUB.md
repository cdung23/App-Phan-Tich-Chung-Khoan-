# Hướng Dẫn Đưa Dự Án Lên GitHub từ Máy Tính Cục Bộ (Local)

Tài liệu này hướng dẫn bạn từng bước cách đưa mã nguồn của ứng dụng phân tích chứng khoán từ máy tính lên kho lưu trữ **GitHub**.

---

## BƯỚC 1: CHUẨN BỊ (Chỉ làm lần đầu)

1.  **Cài đặt Git**:
    *   Nếu máy tính của bạn chưa cài đặt Git, hãy truy cập [git-scm.com](https://git-scm.com/downloads) để tải và cài đặt Git cho Windows.
2.  **Đăng ký tài khoản GitHub**:
    *   Truy cập [github.com](https://github.com/) để đăng ký một tài khoản miễn phí (nếu chưa có).

---

## BƯỚC 2: TẠO REPOSITORY MỚI TRÊN GITHUB

1.  Đăng nhập vào tài khoản GitHub của bạn.
2.  Nhấn nút **"New"** (hoặc biểu tượng dấu cộng `+` ở góc trên bên phải -> chọn **"New repository"**).
3.  Thiết lập các thông tin:
    *   **Repository name**: Nhập tên dự án (ví dụ: `App-Phan-Tich-Chung-Khoan`).
    *   **Description** (Không bắt buộc): Mô tả ngắn về ứng dụng.
    *   **Public/Private**: Chọn **Public** (ai cũng xem được) hoặc **Private** (chỉ bạn xem được).
    *   **LƯU Ý QUAN TRỌNG**: **KHÔNG** chọn tích vào bất kỳ ô nào ở phần dưới như *"Add a README file"*, *"Add .gitignore"*, hay *"Choose a license"*. Chúng ta sẽ khởi tạo chúng từ local để tránh xung đột.
4.  Nhấn nút **"Create repository"**.
5.  GitHub sẽ chuyển bạn đến trang hướng dẫn. Hãy **copy (sao chép) đường link của Repository** đó. Link sẽ có dạng:
    `https://github.com/tên-tài-khoản-của-bạn/tên-repository.git`

---

## BƯỚC 3: CHẠY CÁC LỆNH GIT DƯỚI MÁY CỤC BỘ

Mở terminal tại thư mục dự án của bạn (bấm giữ phím `Shift` + click chuột phải vào khoảng trống trong thư mục `app phân tích trade 5 ngày` ngoài Windows Explorer -> Chọn **"Open PowerShell window here"** hoặc **"Open in Terminal"**).

Hãy copy và chạy lần lượt các lệnh sau:

### 1. Khởi tạo Git cho dự án
```bash
git init
```

### 2. Thêm toàn bộ các file trong dự án vào danh sách chuẩn bị đẩy
*(Hệ thống sẽ tự động bỏ qua các file rác nhờ tệp `.gitignore` chúng ta đã tạo sẵn).*
```bash
git add .
```

### 3. Commit (ghi nhận) các thay đổi lần đầu tiên
```bash
git commit -m "Khoi tao du an: Tro ly phan tich ky thuat va xuat anh 4K"
```

### 4. Thiết lập nhánh chính là `main`
```bash
git branch -M main
```

### 5. Liên kết dự án cục bộ với Repository trên GitHub
*(Thay thế link dưới đây bằng link Repository bạn đã copy ở Bước 2).*
```bash
git remote add origin https://github.com/tên-tài-khoản-của-bạn/tên-repository.git
```
*Lưu ý: Nếu bạn nhập sai link, bạn có thể xóa đi và liên kết lại bằng lệnh: `git remote remove origin` rồi chạy lại lệnh trên với link đúng.*

### 6. Đẩy toàn bộ mã nguồn lên GitHub
```bash
git push -u origin main
```
*Lúc này, nếu là lần đầu tiên sử dụng Git trên máy tính, Windows sẽ hiển thị một hộp thoại yêu cầu bạn đăng nhập tài khoản GitHub (Sign in with your browser). Bạn chỉ cần chọn đăng nhập qua trình duyệt và cấp quyền cho Git là hoàn tất.*

---

## CÁC BƯỚC ĐẨY CODE MỚI LÊN GITHUB SAU NÀY
Khi bạn thực hiện sửa đổi code cục bộ và muốn cập nhật bản mới lên GitHub, bạn chỉ cần mở terminal tại thư mục dự án và chạy 3 lệnh đơn giản sau:

```bash
# 1. Thêm các tệp đã chỉnh sửa
git add .

# 2. Tạo commit ghi chú nội dung thay đổi
git commit -m "Mô tả ngắn gọn những gì bạn đã sửa đổi"

# 3. Đẩy code lên nhánh main
git push origin main
```
