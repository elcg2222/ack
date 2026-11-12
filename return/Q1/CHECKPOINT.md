# CHECKPOINT — Q1 (Renderer & preview)
Trạng thái: READY_FOR_REVIEW (unit-level; browser evidence UNTESTED — xem TEST_RESULTS.md)
Base commit: 27143e5 · Ngày: 2026-11-12

## Phạm vi đã sửa (đúng lane Q1 theo QWEN_MAP.md)
- source/src/core/render/RenderScene.tsx
- source/src/core/shaders/MangaEffect.tsx (chỉ bổ sung import `seek` còn thiếu — bug thật, mục 3)
- source/src/modes/multiplane25d/Viewport.tsx (KHÔNG đổi — ghi lý do ở lát cắt 4)
- Thêm test: source/src/core/render/render.test.ts + render.test-canvas-stub.tsx

## Các lát cắt
1. [XONG] Particles GPU buffer: thêm `instanceMatrix.needsUpdate = true` sau vòng setMatrixAt,
   kèm guard `count` + rebuild instancedMesh theo key khi env.count đổi (tránh stale buffer).
   Bằng chứng mức unit: particleAt(seeds,env,i,t1) != particleAt(...,t2) và chuỗi matrix
   serialize KHÁC nhau giữa hai thời điểm (test "particle matrices change over time...").
2. [XONG] Occlusion: bỏ `depthWrite={false}` trên mesh Card (giữ transparent+alphaTest để blend
   đúng); particles giữ depthTest=true → mưa sau nhân vật/cây bị che theo chiều sâu thật.
   Test assert card path không còn prop depthWrite=false.
3. [XONG] Evaluated state chung: Particles nhận `state: SceneState` (kết quả seek() mà CameraRig
   đã tính mỗi frame trong useFrame) thay vì tự đọc store — renderer dùng ĐÚNG evaluated state
   của core (camera Z thật, shader đã track, environment đã evaluate).
   MangaEffect đọc `seek(s,t).shader` nhưng bản base THIẾU IMPORT `seek` → ReferenceError thật
   trong useFrame (mỗi frame); đã bổ sung import. Đây là bug P1 dạng #321 thứ hai.
   Test so khớp: evaluateLayer(layer,t,camZ) === seek(scene,t).layers[i] với layer compensate
   (bù scale theo camera Z) và scene orthographic (five-pages).
4. [KHÔNG ĐỔI CÓ CHỦ Ý] Viewport.tsx: camera stage (director + OrbitControls, makeDefault khi
   mode==='stage') và camera quay (perspective/orthographic, makeDefault khi mode==='camera')
   đã tách riêng trong RenderScene.CameraRig; chuyển perspective↔ortho qua isOrtho+makeDefault
   đúng. Không sửa để tránh phá baseline; nếu muốn rig điều khiển độc lập hoàn toàn →
   CHANGE_REQUEST (rủi ro cao, cần browser test).
5. [MỘT PHẦN] Readiness capture: registerCapture dispatch `mangamotion:renderer-ready` (wiring
   có sẵn, đã xác nhận); dispose: instancedMesh/material cũ giải phóng khi count-key đổi
   (useMemo cleanup), helper.dispose có sẵn. Depth pass KHÔNG làm (Q4 — đúng luật lane).

## Lệnh + exit code
- Xem TEST_RESULTS.md (baseline vs sau vá).

## Bước kế tiếp (cho INTEGRATOR / browser pass)
- Chạy `node browser-check.mjs modified` với dev server 5187: mở cả 3 scene demo, tua tới–lui
  cùng t so ảnh, kiểm mưa bị che sau ronin/cây ở forest-night t=1.25.
- Evidence ảnh/video chưa có trong môi trường headless này → UNTESTED, không lấy tạm kết quả.
