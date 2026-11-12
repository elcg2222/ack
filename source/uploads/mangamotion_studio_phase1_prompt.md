# PROMPT TÀI LIỆU GỐC — MANGAMOTION STUDIO (GIAI ĐOẠN 1: CORE & 2.5D MULTIPLANE)

> **Hướng dẫn sử dụng:** Bạn có thể copy toàn bộ nội dung bên dưới và đưa trực tiếp cho AI Coding Agent (Cursor, Windsurf, Claude Code...) hoặc dùng làm tài liệu đặc tả kỹ thuật (PRD/Spec) cho dự án.

## BỐI CẢNH & MỤC TIÊU DỰ ÁN
Hãy xây dựng ứng dụng web tên **"MangaMotion Studio"**: bộ công cụ làm video chuyển động 2D / 2.5D / 3D phong cách Manga-Anime (Motion Manga, Comic PV, 2.5D Parallax Animation).

Ứng dụng được thiết kế theo kiến trúc **Multi-Workspace (Nhiều chế độ làm việc)** tách biệt, mỗi chế độ có giao diện, bảng công cụ và chức năng riêng nhưng **dùng chung một lõi (Core Engine)**.

Ở **Giai đoạn 1 (Phase 1)** này, mục tiêu là xây dựng **Khung ứng dụng + Lõi dùng chung + Chế độ cốt lõi `Multiplane 2.5D` (gộp 2D phẳng và 2.5D không gian chiều sâu Z)** kèm **Hiệu ứng môi trường 3D Deterministic (Mưa 3D, Sương mù, Rừng cây nhiều lớp)** và **Manga Post-Processing Shader**, đảm bảo chạy hoàn chỉnh và mượt mà ở 60fps trên trình duyệt trước khi mở rộng sang các chế độ khác.

---

## 1. CÔNG NGHỆ CỐT LÕI (TECH STACK)
- **Framework & State:** React 18+ + Vite + TypeScript, Zustand (quản lý state + middleware `temporal` hoặc lịch sử Undo/Redo), TailwindCSS + Lucide Icons cho UI.
- **3D/2.5D Render Engine:** Dùng **MỘT engine duy nhất là Three.js** thông qua `@react-three/fiber` (R3F), `@react-three/drei` và `@react-three/postprocessing`.
  - Mọi lớp 2D (nhân vật, khung tranh, thoại, SFX) và 2.5D (cây cối, tiền cảnh, hậu cảnh) đều là các mặt phẳng (`PlaneGeometry` / `Sprite` / `Mesh`) đặt trong không gian 3D `(X, Y, Z)`.
  - Chế độ thuần 2D chỉ là trường hợp đặc biệt khi khóa `Z = 0` hoặc chuyển Camera sang **Orthographic (Trực giao)**.
- **Deterministic Timeline Engine (`seek(t)`):**
  - Tự viết bộ nội suy (interpolator) kết hợp Easing/Cubic-Bezier hoàn toàn độc lập với tốc độ khung hình thực tế.
  - **Yêu cầu bắt buộc:** Hàm `seek(t)` (với `t` tính bằng giây hoặc frame) phải là **hàm thuần túy (pure/deterministic function)**. Tại bất kỳ thời điểm `t` nào, toàn bộ vị trí Layer, góc Camera, hạt mưa 3D, hiệu ứng rung lắc (camera shake) và thông số Shader đều phải tính toán trực tiếp từ `t` (tuyệt đối không dùng biến cộng dồn `delta` kiểu `pos += speed * dt`), đảm bảo tua tới đâu hiển thị chính xác tuyệt đối tới đó và phục vụ xuất video (frame-by-frame) không bị lệch hay giật hình.
- **Lưu trữ & Dự án:** Lưu tự động (Autosave) vào `IndexedDB` và hỗ trợ Xuất/Nhập file `.json` (đóng gói cấu trúc Scene, Keyframes, Camera, Shader settings và Base64/Blob URI của tài nguyên). Chạy 100% trên trình duyệt, không cần backend.

---

## 2. KIẾN TRÚC THƯ MỤC & LÕI DÙNG CHUNG (CORE ARCHITECTURE)

Cấu trúc phân cấp dữ liệu: `Project > Scene > Shot`. Mỗi Scene gắn với một chế độ làm việc. Thanh chuyển chế độ lớn nằm ở Topbar; khi đổi chế độ thì đổi các panel công cụ đặc thù nhưng giữ nguyên state của Project.

```text
src/
├── core/
│   ├── store/          # Zustand store (Project, Scene, Timeline, Selection, Undo/Redo)
│   ├── assets/         # Quản lý tài nguyên (Ảnh PNG/JPG, SVG, Audio), kéo thả, tạo thumbnail
│   ├── timeline/       # Bộ nội suy seek(t), Track, Keyframe, Easing, Bezier, Marker, Snap
│   ├── camera/         # Dual Camera (Perspective/Orthographic), Camera Spline, Shake, Cut
│   ├── environment3d/  # Hạt 3D Deterministic (Mưa, Tuyết, Hoa rơi, Bụi), Fog chiều sâu, Speedlines
│   ├── shaders/        # Manga Post-processing (Halftone Screentone, Sobel Outline, Contrast, Vignette)
│   ├── render/         # Vòng lặp render preview 60fps & chế độ chụp từng frame deterministic
│   └── presets/        # Thư viện hiệu ứng mẫu & Project mẫu (Demo Scenes)
├── modes/
│   ├── multiplane25d/  # [LÀM HOÀN CHỈNH Ở GIAI ĐOẠN 1] Gộp 2D Motion & 2.5D Parallax Layers
│   ├── blockout3d/     # [Khung chờ Giai đoạn 2] Dựng khối 3D cơ bản (Box, Cylinder, GLB)
│   ├── character/      # [Khung chờ Giai đoạn 2] Nhân vật 2D Puppet / VRM
│   ├── composer/       # [Khung chờ Giai đoạn 3] Ghép nhiều Scene/Shot trên Master Timeline
│   └── export/         # [Khung chờ Giai đoạn 3] Xuất chuỗi ảnh / WebCodecs MP4 / WebM
└── ui/                 # Layout chuẩn phần mềm dựng, Dark mode, Đa ngôn ngữ (VI/EN), Phím tắt
```

**Nguyên tắc cô lập:** Các thư mục trong `modes/*` chỉ được import từ `core/*` và `ui/*`, tuyệt đối không phụ thuộc chéo lẫn nhau (trừ `composer` sau này).

---

## 3. CHI TIẾT CÁC MODULE BẮT BUỘC Ở GIAI ĐOẠN 1

### 3.1. Chế độ `multiplane25d` (Gộp 2D Motion & 2.5D Parallax Space)
Thay vì tách rời 2D và 2.5D gây trùng lặp công cụ, chế độ này cung cấp không gian làm việc thống nhất cho các lớp truyện tranh trong không gian 3D:
1. **Hai góc nhìn Viewport chuyển đổi tức thì (Dual Viewport Mode):**
   - **Camera View (Góc nhìn máy quay):** Hiển thị đúng khung hình xuất bản (16:9, 9:16, 4:3) nhìn từ Active Camera kèm khung an toàn (Safe Frame) và hiệu ứng Manga Shader.
   - **3D Stage View (Góc nhìn đạo diễn kiểu Blender):** Dùng `OrbitControls` cho phép xoay nghiêng không gian 3D để nhìn rõ các tấm thẻ 2D (2D Cards) đang xếp lớp ở các độ sâu trục `Z` khác nhau, hiển thị hình chóp góc nhìn của Camera (Camera Frustum Helper) và đường quỹ đạo di chuyển của Camera.
2. **Các loại Node/Layer hỗ trợ trong Scene:**
   - **Manga Card Layer (2D/2.5D Plane):** Tấm ảnh (nhân vật tách nền, thân cây, đám mây, khung tranh manga, bóng thoại, chữ SFX). Có thuộc tính:
     - Transform 3D: `Position (X, Y, Z)`, `Rotation (X, Y, Z)`, `Scale (X, Y)`.
     - Tính năng **Auto-Scale Compensation (Bù tỉ lệ theo độ sâu Z):** Tuỳ chọn khi đẩy một layer ra xa camera (tăng âm trục Z), tự động phóng to scale tương ứng để kích thước hiển thị trên khung hình không đổi nhưng vẫn tạo hiệu ứng thị sai (Parallax) khi camera di chuyển.
     - Tính năng **Billboard (Luôn hướng về Camera):** Tuỳ chọn khoá góc xoay để tấm ảnh 2D (như cây cối, nhân vật, chữ SFX) luôn quay mặt thẳng về phía ống kính dù camera đi vòng qua.
     - Thuộc tính hiển thị: `Opacity`, `Blend Mode` (Normal, Multiply, Screen, Add), `Crop/Panel Mask` (cắt khung tranh chữ nhật hoặc đa giác chéo kiểu manga), `Drop Shadow` hoặc `Manga Rim Light`.
   - **Z-Scatter Group (Tạo rừng cây / đám đông / hành lang 2.5D nhanh):**
     - Công cụ cho phép chọn 1–3 mẫu ảnh (ví dụ: thân cây manga, cột đèn, tảng đá) và tự động rải (`instancing/cloning`) thành `N` lớp dọc theo một khoảng chiều sâu `[Z_min, Z_max]` với hành lang trống ở giữa để Camera đi xuyên qua. Toàn bộ quá trình rải dùng **Seed cố định (Deterministic PRNG - Mulberry32)** để kết quả luôn giống hệt nhau.
   - **3D Environment Layer (Hiệu ứng môi trường 3D Deterministic):**
     - **Mưa 3D / Tuyết / Hoa anh đào / Bụi sáng (`InstancedMesh` hoặc `Points`):** Các hạt phân bố thật trong thể tích 3D `(width, height, depth)` bao quanh các lớp 2D (có hạt rơi phía trước mặt nhân vật, có hạt rơi phía sau lưng nhân vật và bị nhân vật che khuất).
     - **Công thức vị trí hạt theo `t`:** Với mỗi hạt thứ `i` (khởi tạo bằng `seed`), vị trí tại thời điểm `t` được tính trực tiếp:
       `y(t) = wrap(initialY_i - fallSpeed * t, -boxHeight/2, boxHeight/2)`
       `x(t) = wrap(initialX_i + windSpeed * t + sin(t * freq + phase_i) * swayAmp, -boxWidth/2, boxWidth/2)`
       `z(t) = initialZ_i`
     - **Depth Fog (Sương mù theo chiều sâu Z):** Tích hợp `THREE.FogExp2` hoặc `THREE.Fog` đồng bộ màu nền để các lớp cây ở xa mờ dần, tạo chiều sâu không gian 3D chân thực cho tranh đen trắng.
     - **Speedlines / Action Lines Overlay:** Lớp đường tốc độ tập trung vào tâm (Radial Speedlines) hoặc chạy ngang bằng procedural shader, điều khiển mật độ và bán kính tâm theo keyframe.

### 3.2. Hệ thống Camera (`core/camera`)
- Chuyển đổi mượt hoặc tức thì giữa **Perspective Camera** (có chiều sâu Z, thay đổi tiêu cự FOV 18mm–120mm để tạo góc rộng kịch tính kiểu anime) và **Orthographic Camera** (phẳng hoàn toàn như 2D truyền thống).
- Keyframe đầy đủ cho `Camera Position (X, Y, Z)`, `Target/LookAt (X, Y, Z)`, `Roll (Z-tilt)` và `FOV/Zoom`.
- Tích hợp **Procedural Camera Shake (Rung máy hành động)** tính theo hàm nhiễu lượng hóa `noise(t * frequency, seed) * amplitude` để tạo hiệu ứng va chạm/nổ trong manga mà vẫn đảm bảo `seek(t)` chính xác 100%.
- Có các **Camera Presets** 1 chạm: *Dolly In xuyên qua các lớp*, *Pan ngang khung tranh*, *Dutch Angle Zoom (nghiêng máy phóng cận mặt)*, *Handheld Breathing (máy cầm tay thở nhẹ)*.

### 3.3. Manga Post-Processing Shader (`core/shaders`)
Sử dụng `@react-three/postprocessing` hoặc Custom Fullscreen Shader Pass với các hiệu ứng bật/tắt và keyframe được:
1. **Halftone / Screentone Pass:** Chuyển các vùng chuyển sắc xám thành họa tiết chấm bi truyện tranh (có chỉnh kích thước chấm `dotSize`, góc xoay lưới `angle`, ngưỡng đen trắng).
2. **Manga Ink & Contrast Pass:** Tăng độ tương phản nét mực, chỉnh ngưỡng trắng/đen (Threshold) hoặc chuyển ảnh màu sang chế độ Manga B&W.
3. **Depth-of-Field (Làm mờ tiêu cự giả lập) & Vignette:** Làm tối 4 góc và làm mờ nhẹ tiền cảnh/hậu cảnh xa.

### 3.4. Lõi Timeline & Keyframe Editor (`core/timeline`)
- Hỗ trợ nhiều Track (mỗi Layer và Camera có các track thuộc tính riêng: `posX, posY, posZ, rotZ, scale, opacity, fov, shakeAmp...`).
- Các kiểu nội suy Keyframe: `Linear`, `EaseIn`, `EaseOut`, `EaseInOut`, `Step (Hold - giữ nguyên giá trị rồi nhảy bậc kiểu anime limited-fps)`, và `Cubic-Bezier`.
- Chế độ **Anime Stepped FPS (Posterize Time):** Tuỳ chọn làm tròn thời gian `t` của các layer nhân vật về 8fps, 12fps hoặc 15fps (chuẩn hoạt hình Nhật Bản) trong khi Camera và hạt mưa 3D vẫn di chuyển mượt ở 60fps.
- Thao tác trên Timeline: Kéo thanh scrub thời gian `t` mượt mà, thêm/xoá keyframe (`K` / `Delete`), kéo di chuyển keyframe, Snap vào lưới frame hoặc Marker, Copy/Paste keyframe, Undo/Redo (`Ctrl+Z` / `Ctrl+Y`).

---

## 4. GIAO DIỆN NGƯỜI DÙNG & PHÍM TẮT (`ui/`)
- **Bố cục chuẩn phần mềm dựng chuyên nghiệp (Dark Mode):**
  - **Topbar:** Logo MangaMotion Studio, chọn Project mẫu, nút chuyển chế độ làm việc (`Multiplane 2.5D` đang active; các tab `3D Blockout`, `Character`, `Composer`, `Export` hiển thị trạng thái xem trước lộ trình), chuyển đổi ngôn ngữ (Tiếng Việt / English), nút Xuất/Nhập `.json`, chọn chất lượng Viewport (Preview Nhanh / Chất lượng Cao).
  - **Left Panel (Thư viện & Danh sách Lớp):** Tab *Layers* (cây phân cấp các lớp trong Scene kèm độ sâu Z, ẩn/hiện, khoá, nhân bản) và Tab *Assets & Presets* (upload ảnh PNG/SVG, tạo nhanh lớp Mưa 3D, Rừng cây Z-Scatter, Khung tranh Manga, Chữ SFX, Camera Preset).
  - **Center Viewport:** Khung nhìn Three.js 60fps kèm thanh công cụ nổi để chuyển nhanh giữa `Camera View` (nhìn qua ống kính), `3D Stage View` (xoay không gian 3D xem các lớp xếp chồng), hoặc `Split View` (chia đôi màn hình vừa kéo trục Z bên 3D vừa xem kết quả bên ống kính Camera).
  - **Right Panel (Inspector / Thuộc tính):** Chỉnh thông số Transform 3D `(X, Y, Z)`, nút gắn Keyframe cạnh từng thuộc tính, cấu hình hạt mưa 3D / Z-Scatter, cấu hình Camera và Manga Post-processing Shader.
  - **Bottom Panel (Timeline):** Thanh điều khiển Play/Pause, chọn FPS (24/30/60 + Anime Step 12fps), thời gian hiện tại `t`, thanh scrub và danh sách các dải Keyframe của từng Layer.
- **Phím tắt bắt buộc:**
  - `Space`: Play / Pause
  - `K`: Đặt hoặc cập nhật Keyframe tại thời điểm hiện tại cho Layer/Camera đang chọn
  - `Ctrl+Z` / `Ctrl+Y`: Undo / Redo
  - `Delete` / `Backspace`: Xoá Keyframe hoặc Layer đang chọn
  - `D` (hoặc `Ctrl+D`): Nhân bản Layer
  - `F`: Focus góc nhìn vào Layer đang chọn
  - `Tab`: Chuyển nhanh giữa `Camera View` và `3D Stage View`
  - `1 / 2 / 3`: Chuyển nhanh các góc nhìn hoặc chế độ hiển thị

---

## 5. PROJECT MẪU TÍCH HỢP SẴN (BUILT-IN DEMO SCENES)
Để kiểm chứng ngay sức mạnh của kiến trúc 2.5D + 3D Environment mà không cần người dùng tải ảnh lên từ đầu, hãy tạo sẵn bằng SVG/Canvas Procedural 2 Scene mẫu cực ấn tượng có thể bấm chạy ngay khi mở app:
1. **Scene mẫu 1 — "Đi Xuyên Rừng Mưa Đêm (3D Rain & Forest Dolly)":**
   - Sử dụng `Z-Scatter` rải 16 lớp thân cây & tán cây vẽ nét mực manga dọc theo trục `Z` từ `-2` đến `-35`, kết hợp sương mù chiều sâu (`Depth Fog`).
   - Một nhân vật kiếm sĩ manga 2D đứng ở `Z = -8`, tiền cảnh có cành cây mờ ở `Z = 2` và chữ tượng thanh SFX *"ZAÀ..."* nổi ở `Z = -5`.
   - Hệ thống **Mưa 3D Deterministic** rơi dày đặc xuyên qua toàn bộ không gian `Z`.
   - Camera Perspective đi xuyên qua hàng cây từ `Z = 6` tiến sát về phía nhân vật kèm hiệu ứng rung máy nhẹ và chớp sáng tại giây thứ `2.5s`.
2. **Scene mẫu 2 — "Khung Tranh Vỡ & Đòn Tấn Công (Manga Panel Break)":**
   - Kết hợp 3 khung tranh (Manga Panels) xếp lệch độ sâu `Z`, nhân vật lao vọt ra khỏi khung tranh tiến sát về phía ống kính kèm lớp **Radial Speedlines** và hiệu ứng **Halftone Screentone** đậm chất truyện tranh hành động.

---

## 6. KIỂM THỬ & XỬ LÝ LỖI
- Cung cấp công cụ/nút **"Kiểm tra tính tất định `seek(t)` (Determinism Self-Test)"** ngay trên giao diện hoặc trong bộ test: tự động gọi `seek(1.25)` -> `seek(3.80)` -> `seek(0.40)` -> quay lại `seek(1.25)` và so sánh snapshot trạng thái toàn bộ Scene (Camera, Layer Transform, vị trí hạt mưa thứ `i`) để chứng minh sai số bằng `0`.
- Xử lý lỗi rõ ràng bằng thông báo thân thiện (Toast/Error Boundary) khi file `.json` nhập vào không đúng định dạng, ảnh tải lên bị lỗi hoặc trình duyệt mất ngữ cảnh WebGL.
- Đính kèm `README.md` giải thích rõ cấu trúc kiến trúc, cách hoạt động của hàm `seek(t)` và hướng dẫn mở rộng các chế độ tiếp theo.
