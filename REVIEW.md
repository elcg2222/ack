# Kiểm app MangaMotion do Qwen làm — 12/11/2026

## Kết luận

Đây là prototype có code thật và đáng tiếp tục, không chỉ mockup UI. Tuy nhiên build/test pass chưa đồng nghĩa viewport chạy được. Đã tìm và tái hiện lỗi gọi React hook trong shader; bản sao sửa một dòng đã hiện cảnh. Chưa nghiệm thu app hoàn chỉnh hoặc nhập vào MONIZA.

Nguồn: `C:/Users/cuongle/Downloads/workspace (1).tar.gz`, 14.208.618 bytes; SHA256 `26cd17d948a2daff7f28e1f73516c0a42267813964e1833dea734a1adb1ff748`. Gói gốc nguyên vẹn. Giải nén 149 tệp thường vào bản sao riêng, kiểm đường dẫn và link trước ghi. Tệp `core` 78.962.688 bytes có header ELF64 x86_64 ET_CORE; chỉ đọc header, không đọc vùng nhớ hoặc chuyển vào bản sao/release. Crash dump chưa chứng minh nguyên nhân phiên Qwen sập, không đồng nhất với lỗi browser vừa tìm.

## Kết quả chạy thật

| Kiểm | Gốc | Bản sao vá chẩn đoán |
|---|---|---|
| Vitest hiện có | 13/13 pass | 13/13 pass |
| TypeScript + Vite production build | Pass | Pass |
| Mở bằng Edge headless, profile riêng, chặn request ngoài localhost | 262 pageerror, cùng React #321; viewport trống | 0 pageerror, 0 console error trong lượt smoke test; có cảnh rừng/nhân vật |
| QC ảnh | Đã mở baseline-ui.png | Đã mở modified-ui.png |

Chạy build/frontend là kiểm nhẹ; không render video, chạy AI hoặc gửi dữ liệu ra provider. Server kiểm chỉ bind 127.0.0.1:5187, đã dừng khi kiểm xong. Thư viện cài theo lockfile trong bản sao, tắt install scripts. Lần offline thiếu cache Zustand (`ENOTCACHED`); lần tải thư viện có quyền thực đã thành công. Không nâng package toàn máy.

### Lỗi đã tái hiện và khoanh vùng

Trong `source/src/core/shaders/MangaEffect.tsx`, cuối file alias `useStudio` thành `get`, rồi gọi `get()` từ callback `useFrame`. Đây vẫn là React hook nhưng chạy ngoài thân component. Mã lỗi 321 là Invalid hook call theo [React](https://react.dev/errors/321).

Vá chẩn đoán một dòng trên bản sao:
```diff
-import { useStudio as get } from '../store/useStudio';
+const get = useStudio.getState;
```

Không đổi dependency để chữa lỗi; trước/sau cùng lockfile. Test trình duyệt sau thay đổi hết lỗi và hình xuất hiện, là bằng chứng cụ thể cho lỗi này. Chưa gọi đó là đã sửa mọi lỗi của app.

## Những phần đã có trong code

- React 18 + Three.js/R3F; giao diện layer/inspector/timeline; Camera, Stage, Split.
- Nội suy linear/easing/Bezier/hold, camera preset/shake, stepped time cho layer, particle seeded.
- Layer ảnh/SVG, scatter, shader halftone/ink/vignette, project demo rừng/panel/comic.
- Zustand + undo/redo, IndexedDB autosave, JSON nhúng asset bằng data URI. Khác đề xuất chỉ lưu đường dẫn tạm, bản này đã có cơ chế portable cho asset được nhúng hợp lệ.
- Mã chụp PNG, chuỗi PNG ZIP, WebM bằng MediaRecorder; chưa kiểm xuất thực và round-trip trong lượt này.
- CodeLab/Monaco và danh sách command chỉnh project. Không có bằng chứng đã nối Qwen hay một AI worker: đây là API editor + chỗ nhập script, không phải provider đang connected.

## Phần chưa hoàn thiện và ưu tiên sửa

### P1 — Khớp mô hình tính toán với hình thật

1. **Mưa chưa có cập nhật GPU buffer rõ ràng:** vòng lặp Particles gọi `setMatrixAt` nhưng không thấy `instanceMatrix.needsUpdate = true`. Cần test đổi t làm vị trí hạt trên hình thay đổi, không chỉ so hàm tính toán. Đây là phát hiện source, chưa có test hình động để kết luận mức ảnh hưởng từng runtime.
2. **Occlusion chưa đạt lời hứa:** card và particle đều `depthWrite=false`; particle đặt `renderOrder=80`, card thường thấp hơn. Cần kiểm/sửa trường hợp mưa phía sau bị nhân vật/cây che, không chỉ phủ mưa trên mọi lớp. Một ảnh đẹp chưa chứng minh chiều sâu hoạt động đúng.
3. **Core và renderer tính layer khác nhau:** `seek()` truyền camera Z thật và xử lý orthographic, nhưng Card gọi `evaluateLayer(layer, time)` với camera Z mặc định. Bù scale có thể lệch giữa selftest và preview. Gom về cùng evaluated state thay vì hai đường tính.
4. **Selftest hẹp:** chỉ so JSON state ở vài thời điểm và tối đa 12 hạt; không kiểm ảnh GPU, shader, texture readiness, export hay camera chuyển loại. Dòng “exact seek” trên UI chưa phải bằng chứng cho toàn pipeline.

### P1 — Giữ vòng chỉnh sửa ổn định

- Kiểm import/save/reload/undo với ảnh thật, scene mới và camera chuyển perspective/ortho.
- Kiểm capture tại độ phân giải khác preview; capture đang chờ hai requestAnimationFrame, chưa có readiness barrier rõ cho mọi asset.
- Kiểm scatter khi bấm áp dụng: code vừa giữ scatter group vừa thêm các child card, có nguy cơ nhân đôi số cây. Cần test thay vì coi nút đã đúng.
- Giới hạn environment count/scale/texture size trên mọi đường input; Agent API hiện có chỗ cast `any` và Object.assign vượt các kiểm nhập JSON.

### P2 — Những mục mới là nhãn/roadmap

- Không tìm thấy implementation ComfyUI, endpoint 8188, depth pass hoặc depth displacement trong source TS/TSX đã kiểm.
- 3D Blockout, Character, Composer và Advanced Export mới có mode metadata/roadmap, không phải engine đầy đủ.
- Asset picker nhận audio/video/GLB/VRM không chứng minh có playback/rig/audio mix; renderer Card hiện chủ yếu tải ảnh bằng TextureLoader.
- WebM dùng `captureStream` + thời gian thực: không coi là offline deterministic frame export, chưa có audio mixdown. MP4 H.264 nằm trong roadmap.
- Chưa nối 21 gói bối cảnh hoặc bộ nhân vật/chuyển động của đội 3D.

### P1 trước tích hợp — Ranh giới CodeLab và server

- Iframe có `sandbox="allow-scripts"`, host kiểm `event.source` và tên lệnh; đây là lớp bảo vệ thực, không nên gọi nó hoàn toàn không có kiểm soát.
- Tuy vậy CodeLab thực thi `new Function`, timeout chỉ đổi nhãn UI, không thực sự kết thúc code. Chưa thấy CSP chặn network, giới hạn tài nguyên hoặc validation đồng đều. Không nối CodeLab này với quyền shell/file/provider của MONIZA.
- Vite source bind `0.0.0.0`, `allowedHosts:true`. Không mang cấu hình này nguyên trạng vào app chính. Phiên kiểm dùng server static riêng chỉ loopback.

## Kế hoạch cứu bản này

1. Giữ source gốc và bản kiểm riêng. Đưa lỗi shader vừa khoanh vùng thành regression test browser.
2. Sửa/test renderer: particle update, che khuất, thống nhất evaluated state, scatter; test camera và seek bằng ảnh.
3. Kiểm vòng chỉnh–lưu–mở–export ảnh. Sau đó mới chọn một set thật (R08 đề xuất) và proxy nhân vật do đội 3D giao.
4. Làm gói beauty/depth/mask và nhận AI thủ công trước; UI phân biệt draft, candidate AI và bản ráp. Không phải shot nào cũng chạy AI.
5. Map module này vào workspace của `giaodienmoi` thay vì chạy app công ty thứ hai. React 18 của prototype khác app chính; cần adapter/compatibility review, không chép package.json đè lên MONIZA.

Nhánh Cường + Codex giữ serie hybrid 2.5D; Claude/đội 3D giữ serie 3D và source model/motion. Mục tiêu lượt tiếp theo nên là bàn dựng ổn định, không thêm 10 hiệu ứng hoặc viết lại toàn bộ.

## Brief tiếp tục

```text
Tiếp tục từ bản Qwen trong work/qwen-mangamotion-audit-20261112/source khi Owner giao sửa.
Đọc REVIEW.md, giữ nguyên archive gốc. Bản kiểm đã vá một dòng getState trong shader,
không nhận là app hoàn chỉnh. Ưu tiên regression browser + thống nhất evaluated state,
particle buffer/occlusion, camera, save/reload và export một ảnh. Chưa nối CodeLab tới
shell/provider, chưa sửa code đội 3D. Đo và tự xem ảnh kiểm; không suy test JSON pass
thành render pass. Tích hợp vào MONIZA sau khi map editor hiện có, không tạo app thứ hai.
```

## Tệp bằng chứng

Tất cả ở `D:/pipeline/work/qwen-mangamotion-audit-20261112/`: `SOURCE_MANIFEST.json`, `BROWSER_BASELINE.json`, `BROWSER_MODIFIED.json`, `baseline-ui.png`, `modified-ui.png`, `PATCH_HASHES.json`, `DIFF_FILE.diff`, `VERIFICATION.txt`, `ROLLBACK.sh`.

Rollback đã kiểm trên bản sao shader riêng: khôi phục đúng hash gốc; không chạy lại browser trên bản rollback, nên không tuyên bố đã tái kiểm lỗi UI sau rollback. Bản chẩn đoán đang giữ thay đổi, archive và app MONIZA không bị sửa.
