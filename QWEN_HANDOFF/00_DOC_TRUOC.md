# Bàn giao Qwen — MangaMotion hybrid 2.5D
Ngày 12/11/2026. Owner Cường giao hoàn thiện prototype; chưa phải lệnh chạy mọi hạng mục cùng lúc.

## Những gì nhận được
ZIP gồm app/ (source Qwen có bản vá một dòng getState), handoff/ (hướng dẫn), evidence/ (báo cáo, ảnh và biên nhận cũ). Đọc REVIEW.md trước. Không có node_modules, dist, core dump, cache, tài khoản hay 21 gói scene. Không hiểu thiếu các thứ đó là bị mất source.
Baseline đã kiểm: 13 test và production build pass; browser gốc lỗi React #321, sau vá getState shader hiện cảnh, smoke test 0 lỗi. Đây là kết quả phiên trước, phải chạy lại trên máy của bạn. Các test chưa bao phủ export, depth, audio, occlusion hay AI.

## Mục tiêu
Cường + Codex làm serie hybrid 2.5D; Claude/đội 3D giữ serie 3D và model/rig/motion. Bàn dựng hoạt động khi AI tắt: dựng bố cục → xem/duyệt → gửi đúng phần cần AI → nhận candidate → so sánh. Không phải shot nào cũng gen.
Đây là prototype độc lập để sửa/kiểm trong bản sao. Đích tích hợp là workspace trong MONIZA/giaodienmoi hiện có, không phát triển thành app công ty thứ hai. Gói này không chứa repo MONIZA, nên không tuyên bố đã tích hợp.

## Chạy kiểm ban đầu
Trong app/: npm ci --ignore-scripts; npm test; npm run build.
Script postinstall hiện chỉ copy Monaco; public/monaco đã có trong gói. Nếu cần đồng bộ, đọc scripts/copy-monaco.mjs rồi chạy riêng. Không đổi lockfile để chữa lỗi chưa xác định.
Preview riêng: npm exec vite -- --host 127.0.0.1 --port 5187 --strictPort. Đừng dùng cổng đang có người chạy. vite.config.ts còn allowedHosts:true, cần đầu mối tích hợp sửa trước triển khai thật; chưa coi cấu hình đó là chuẩn production.
Tự mở trình duyệt, xem console và ảnh. Build pass không đủ. Không tự cài browser/GPU/provider trả phí hoặc chạy full render local. Render/batch nặng Colab-first. Không bật cron, không gửi mail/publish, không đưa secret vào source/ZIP.

## Chọn job
Owner chỉ định một ID trong JOBS.md. Mỗi phiên Qwen chỉ làm job đó. Người ghép (INTEGRATOR) giữ shared files và quản lý revision. Không cần chạy tất cả job mới tạo được giá trị: ưu tiên Q1 + Q2 + Q3.
