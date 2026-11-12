# Còn thiếu — tách input thiếu với việc chưa code

## Chưa cần để làm Q1/Q2/Q3
Không cần tài khoản AI, scene mới hoặc nhân vật hoàn chỉnh: dùng demo có sẵn để ổn định bàn dựng.

## Cần trước vòng B
- Source scene R08 hoặc scene Owner chọn, tài nguyên/nguồn/quyền; 21 ZIP không nằm trong gói này.
- Proxy GLB hoặc ảnh RGBA từ đội 3D: ID/version/hash, units/up/front, pivot chân, camera/pose/clip được phép dùng. Không tự dựng lại rig.
- Owner chọn style tham chiếu, pilot, tỉ lệ/FPS. Giá trị demo không phải mặc định của serie.
- Nếu nối AI thật: worker/endpoint được cấp, auth truyền ngoài source, workflow JSON, node/model version + licence, input/output conventions, ngân sách được giao. Chưa có thì chỉ offline/mock, ghi nhãn rõ.
- Repo/contract MONIZA khi tới tích hợp; ZIP prototype chưa đủ chứng minh tương thích React 19 hay Flow3.

## Chưa code/kiểm đủ
ComfyUI/depth; occlusion/particle; camera state đồng nhất; capture readiness; xuất ảnh thật; load/save lỗi; multi-shot/audio/GLB/VRM; CodeLab isolation và validation. Xem REVIEW.md để biết đâu là lỗi đã tái hiện, đâu mới là phát hiện source. Không mặc định danh sách này đã có người đang làm.

## Khi bàn giao phải báo
Build/test pass không thay xem hình. WebM ghi thời gian thực chưa phải offline frame-exact. Nhãn 60fps/deterministic trên UI không là benchmark. Không nhận quyền asset từ tên ZIP hoặc nguồn AI tạo.
