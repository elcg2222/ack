# Chống mất công khi hết quota

## Bắt đầu mỗi phiên
Ghi JOB_ID, BASE_MANIFEST_SHA256 (hash MANIFEST_SHA256.json của ZIP nhận), phạm vi file và tiêu chí xong vào CHECKPOINT.md. Đọc checkpoint hiện có trước khi viết. Không reset lại dự án hoặc thay version framework.

## Lát cắt ngắn
Sau mỗi việc nhỏ chạy được (một lỗi/một test), lưu file thật và cập nhật checkpoint. Đừng đợi sắp hết quota mới viết. Không giả định session mới nhớ lịch sử. Nếu bị ngắt, trạng thái cuối vẫn là IN_PROGRESS, không tự ghi DONE.

Mẫu CHECKPOINT.md:
- JOB_ID / BASE_MANIFEST_SHA256:
- Trạng thái: IN_PROGRESS | BLOCKED_INPUT | READY_FOR_REVIEW
- Đã sửa file nào, hash trước/sau:
- Lệnh đã chạy, input, stdout/error quan trọng, exit code:
- Kết quả đã xem thật; việc chưa kiểm:
- Quyết định và interface giữ nguyên/thay đổi đề xuất:
- Bước kế tiếp cụ thể (file, hàm, test):
- Tệp/nhân sự/runtime còn thiếu:

## Gói trả về của từng Qwen
return/JOB_ID/{CHECKPOINT.md, CHANGES.diff, CHANGED_FILES.json, TEST_RESULTS.md, evidence/, files/}.
CHANGED_FILES.json liệt kê đường dẫn tương đối, hash base, hash mới, thêm/sửa. files/ chỉ chứa file thay đổi; không chứa tài khoản/.env/core/cache/node_modules. Không tự sửa file ngoài lane hoặc chỉ gửi lời “xong”. Giữ base để diff và phục hồi.

## Quy trình ghép
1. INTEGRATOR kiểm đúng BASE, file ownership và hash trước; khác hash thì dừng ghép file đó, yêu cầu rebase, không chép đè.
2. Review diff, snapshot file bị thay, apply một job lên bản tích hợp thử.
3. Chạy test gốc + test job, build, browser/QC ảnh; sai thì giữ riêng job, trả lỗi.
4. Phát base manifest mới cho vòng tiếp. Không tiếp tục nhánh cũ sau đổi schema mà không đọc bản mới.
5. Owner xem bản tích hợp đúng revision. “READY_FOR_REVIEW” không phải Owner đã duyệt.

Hết quota: tải gói return ngay cả khi chưa xong, cho phiên Qwen mới đọc cùng base + patch + checkpoint. Chia việc giảm phụ thuộc một phiên; không bảo đảm vượt giới hạn quota của nhà cung cấp. Không tự động tạo tài khoản/session để lách giới hạn.
