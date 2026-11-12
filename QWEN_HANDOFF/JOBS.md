# Chia việc để nhiều phiên làm không đè nhau
Trạng thái ban đầu mọi job: CHƯA GIAO. Tên dưới đây là vai trò công việc, không phải agent đã được tạo hoặc kết nối.

## Vòng A — có thể chạy song song trên BA BẢN SAO cùng base
### Q1 — Renderer và hình preview
Được sửa: src/core/render/RenderScene.tsx; src/core/shaders/MangaEffect.tsx; src/modes/multiplane25d/Viewport.tsx; test riêng tests/q1/.
Làm: giữ vá getState; cập nhật instanceMatrix GPU khi hạt đổi; sửa che khuất card/particle; renderer dùng cùng evaluated state với core; camera stage tách camera quay; camera perspective/ortho; readiness capture theo asset; kiểm dispose. Chưa viết depth pass.
Nghiệm thu: mở cả ba scene, camera/stage/split không pageerror; tua tới–lùi cùng t cho cùng trạng thái và ảnh trong sai số có ghi; mưa trước/sau bị che đúng; đổi Z/FOV/ortho bù scale khớp. Ảnh/video chứng minh ngắn, không chỉ JSON selftest. Không viết lại engine/store; gửi yêu cầu cho INTEGRATOR nếu cần.

### Q2 — Project và nhập tài nguyên
Được sửa: src/core/store/persistence.ts; src/core/assets/import.ts; test riêng tests/q2/.
Làm: kiểm schema sâu, tham chiếu asset/camera/layer, finite/range/count, dữ liệu malformed, quota/transaction lỗi; import ảnh đúng và round-trip data URI. Định dạng chưa render được phải báo rõ, không giả đã hỗ trợ GLB/audio/video đầy đủ. Giữ tương thích project schemaVersion=1 hiện có; không đổi kiểu dữ liệu công khai tùy ý.
Nghiệm thu: demo JSON cũ mở lại được; ảnh Unicode đi qua save/import không mất; dữ liệu hỏng trả lỗi dễ hiểu; lỗi lưu không báo saved. Test fixture riêng, không sửa demo gốc.

### Q3 — QA/browser regression độc lập
Được thêm: tests/q3/; tài liệu bằng chứng riêng. Không sửa app hay test của người khác.
Làm: browser regression React #321, smoke UI/console, seek/camera, đổi scene, save/reload, xuất một PNG và kiểm kích thước. Test phải FAIL khi lỗi còn thật; không xóa assertion để xanh. Không đoán kết quả từ labels UI. Có thể bắt đầu ngay với baseline, chạy lại sau merge Q1/Q2.
Nghiệm thu: lệnh tái tạo được, expected/actual, exit status, ảnh; thiếu browser thì báo thiếu và giữ kết quả UNTESTED. Không dùng kết quả test đời trước giả làm lần này.

## INTEGRATOR — một người giữ file dùng chung
Sở hữu: package.json/package-lock.json, tsconfig*, vite.config.ts, src/core/types.ts, src/core/store/useStudio.ts, src/core/timeline/*, src/core/camera/*, src/core/environment3d/*, App.tsx, UI dùng chung.
Việc: duyệt yêu cầu interface; sửa scatter có nguy cơ giữ group + thêm child trùng; khóa input range trên mọi API; sửa cấu hình host khi triển khai; review CodeLab (không nối shell/secret/provider, timeout phải thực sự hủy khi triển khai); merge lần lượt Q1→Q2→Q3 rồi chạy toàn bộ test/build/browser. Job khác chỉ đề xuất patch ngoài quyền, không lén sửa.
Nếu Owner chỉ dùng một Qwen: phiên đó làm INTEGRATOR và xử lý từng job tuần tự, vẫn giữ checkpoint.

## Vòng B — chỉ sau base tích hợp mới
### Q4 — Export/pass + một vòng AI thủ công
Được sửa sau khi giao: src/core/render/export.ts, registry.ts; thêm src/core/comfyBridge/ và tests/q4/.
Phụ thuộc: Q1 capture ổn định, INTEGRATOR chốt interface (RenderScene vẫn Q1 sở hữu). Làm beauty/depth/mask với camera/near/far/frame/revision/hash đồng bộ; candidate AI là dữ liệu mới, không ghi đè. Trước hết export/import gói thủ công; endpoint sống chỉ khi Owner cấp runtime và giao kiểm. API/queue thành công không đồng nghĩa AI xong. Không biến localhost desktop thành Colab bằng lời nói.
Nghiệm thu: fixture round-trip offline; reject kết quả sai camera/revision; preview/export đúng kích thước, chữ không biến mất; ghi giới hạn alpha/depth. Chưa gọi paid AI.

### Q5 — Adapter một cảnh thật
Chưa giao tới khi Owner gửi source scene (đề xuất R08). Được thêm src/core/sceneAdapters/r08/ và tests/q5/; mọi hook vào renderer/types qua INTEGRATOR.
Làm: tách builder khỏi vòng lặp/Date.now của scene; units/axes/camera/anchor/dispose rõ; một proxy/ảnh nhân vật do đội 3D bàn giao. Không sửa bộ rig/motion của Claude. Nghiệm thu cảnh có che khuất, seek đúng, không nhân vòng render. Không nhập 21 app cùng lúc.

## File dùng chung là điểm khóa
Mọi đổi public schema/API cần ghi CHANGE_REQUEST.md: lý do, caller bị ảnh hưởng, chữ ký trước/sau, migration/test. INTEGRATOR phát BASE mới rồi các job mới tiếp tục. Không hai phiên sửa cùng file; không merge nguyên ZIP node_modules/dist vào app.
