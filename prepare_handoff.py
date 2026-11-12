from pathlib import Path
import json, hashlib, zipfile, re
W=Path(__file__).resolve().parent
H=W/'QWEN_HANDOFF'; H.mkdir(exist_ok=True)
def put(name,text): (H/name).write_text(text.strip()+'\n',encoding='utf-8')
put('00_DOC_TRUOC.md', '''# Bàn giao Qwen — MangaMotion hybrid 2.5D
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
''')
put('JOBS.md', '''# Chia việc để nhiều phiên làm không đè nhau
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
''')
put('CHECKPOINT_VA_GHEP.md', '''# Chống mất công khi hết quota

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
''')
put('THIEU_VA_CHUA_KIEM.md', '''# Còn thiếu — tách input thiếu với việc chưa code

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
''')
put('PROMPT_GIAO_QWEN.txt', '''Bạn tiếp tục code MangaMotion từ gói này, không tạo lại dự án.
Owner giao JOB_ID = [Cường điền Q1 / Q2 / Q3 / Q4 / Q5 / INTEGRATOR].
Đọc handoff/00_DOC_TRUOC.md, JOBS.md, CHECKPOINT_VA_GHEP.md, THIEU_VA_CHUA_KIEM.md và evidence/REVIEW.md.
Nếu chưa có JOB_ID, chỉ kiểm đầu vào và đề nghị một job; không sửa toàn bộ app.
Ghi base hash và checkpoint trước. Chỉ sửa file trong lane, public API/schema hoặc dependency phải gửi CHANGE_REQUEST cho INTEGRATOR. Dùng bản vá getState đã có, không phục hồi alias hook sai.
Làm một lát cắt nhỏ, chạy test/build và browser nếu phù hợp, tự xem ảnh. Cập nhật checkpoint sau mỗi mốc để phiên khác tiếp tục được khi quota hết.
Giữ archive/base, không secret, không shell bridge, không paid AI/GPU/cron/publish; render nặng Colab-first. Đội 3D giữ nhân vật/motion; chúng ta làm serie hybrid 2.5D.
Trả gói return/JOB_ID đúng mẫu, kèm hash/diff/test/ảnh và bước còn lại. Chỉ nhận đã chạy việc có bằng chứng; giữ nguyên lỗi còn tồn tại trong báo cáo.
''')
manifest=json.loads((W/'SOURCE_MANIFEST.json').read_text(encoding='utf-8'))
entries={}
for row in manifest['files']:
    rel=row['path']
    if rel.startswith('uploads/') or rel=='tsconfig.tsbuildinfo': continue
    p=W/'source'/rel
    assert p.is_file()
    entries['app/'+rel]=p
for p in H.iterdir(): entries['handoff/'+p.name]=p
for n in ['REVIEW.md','baseline-ui.png','modified-ui.png','BROWSER_BASELINE.json','BROWSER_MODIFIED.json','PATCH_HASHES.json','DIFF_FILE.diff','VERIFICATION.txt']:
    entries['evidence/'+n]=W/n
hashes={n:hashlib.sha256(p.read_bytes()).hexdigest() for n,p in entries.items()}
put('PACKAGE_NOTE.md','Gói có source đã vá chẩn đoán, không có runtime đang chạy. Đường D:/... trong evidence là bằng chứng máy gốc; dùng app/ và evidence/ trong ZIP. Không chạy rollback cũ trên máy khác. Source snapshot này không tự cập nhật khi job trả về.')
entries['handoff/PACKAGE_NOTE.md']=H/'PACKAGE_NOTE.md'; hashes['handoff/PACKAGE_NOTE.md']=hashlib.sha256((H/'PACKAGE_NOTE.md').read_bytes()).hexdigest()
zpath=W/'QWEN_CONTINUE_25D_20261112.zip'
if zpath.exists():
    prior=W/'QWEN_CONTINUE_25D_20261112.incomplete.zip'
    assert not prior.exists()
    zpath.rename(prior)
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED) as z:
    for n,p in entries.items():
        assert n != 'app/core' and not any(x in n.split('/') for x in ['node_modules','dist','.env','.env.local'])
        if p.suffix in ['.ts','.tsx','.js','.mjs','.json','.md','.txt']:
            content=p.read_text(encoding='utf-8')
            assert not re.search(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9]{32,}',content), 'Potential secret: '+n
        z.write(p,n)
    z.writestr('MANIFEST_SHA256.json',json.dumps(hashes,indent=2))
with zipfile.ZipFile(zpath) as z:
    assert z.testzip() is None
    for n,h in hashes.items(): assert hashlib.sha256(z.read(n)).hexdigest()==h
put('PACKAGE_VERIFICATION.txt',f'ZIP={zpath}\nSHA256={hashlib.sha256(zpath.read_bytes()).hexdigest()}\nPAYLOADS={len(hashes)}\nRESULT=CRC_PASS; ALL_PAYLOAD_SHA256_MATCH; forbidden_paths_absent\nSecret scan=limited pattern scan, not a universal guarantee.\nApp tests/build not rerun: source unchanged by packaging; prior evidence included.\n')
print('PACKAGE PASS:',len(hashes),'payloads; CRC and SHA256 match;',zpath.stat().st_size,'bytes')
