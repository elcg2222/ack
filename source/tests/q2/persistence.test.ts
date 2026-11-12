import { describe, it, expect } from 'vitest';
import { validateProject, unsupportedRenderTypes, RENDERABLE_ASSET_TYPES } from '../../src/core/store/persistence';
import { createDemoProject } from '../../src/core/presets/demo';
import type { Project } from '../../src/core/types';

const clone = (): Project => structuredClone(createDemoProject());
const ok = (p: unknown) => { validateProject(p); };
const bad = (p: unknown, msg?: RegExp) => {
  let e: Error | null = null;
  try { validateProject(p); } catch (err) { e = err as Error; }
  expect(e, `expected reject: ${msg}`).not.toBeNull();
  if (msg) expect(e!.message).toMatch(msg);
};

describe('validateProject — nhận project hợp lệ', () => {
  it('demo project thật pass', () => ok(clone()));
  it('round-trip JSON giữ nguyên hợp lệ', () => ok(JSON.parse(JSON.stringify(clone()))));
});

describe('validateProject — từ chối project hỏng', () => {
  it('null / không phải object', () => { bad(null); bad(42); bad('x'); });
  it('sai schemaVersion', () => { const p = clone(); (p as any).schemaVersion = 2; bad(p, /schemaVersion/); });
  it('thiếu name/scenes/assets', () => {
    let p = clone(); (p as any).name = 5; bad(p, /thiếu tên/);
    p = clone(); (p as any).scenes = []; bad(p, /thiếu tên/);
    p = clone(); (p as any).assets = 'nope'; bad(p, /thiếu tên/);
  });
  it('revision âm / NaN', () => { const p = clone(); p.revision = -1; bad(p, /revision/); });
  it('updatedAt không phải ISO', () => { const p = clone(); p.updatedAt = 'hom qua'; bad(p, /updatedAt/); });
  it('asset URL không phải data URI đúng MIME theo type', () => {
    let p = clone(); p.assets[0] = { ...p.assets[0], url: 'https://evil.example/x.png' }; bad(p, /data URI/);
    p = clone(); p.assets.find(a => a.type === 'svg')!.url = 'data:text/html,<script>alert(1)</script>'; bad(p, /data URI/);
    p = clone(); p.assets.find(a => a.type === 'audio')!.url = 'data:image/png;base64,AA=='; bad(p, /data URI/);
  });
  it('ID asset trùng nhau', () => { const p = clone(); p.assets.push({ ...p.assets[0] }); bad(p, /trùng/); });
  it('scene id trùng / mode sai / duration hỏng', () => {
    let p = clone(); p.scenes.push({ ...p.scenes[0] }); bad(p, /scene/);
    p = clone(); p.scenes[0].mode = 'blockout3d' as any; bad(p, /scene/);
    p = clone(); p.scenes[0].duration = Infinity; bad(p, /scene/);
    p = clone(); p.scenes[0].fps = 0; bad(p, /scene/);
  });
  it('layer position chứa NaN, scale sai độ dài', () => {
    let p = clone(); p.scenes[0].layers[0].position = [NaN, 0, 0]; bad(p, /layer/i);
    p = clone(); (p.scenes[0].layers[0] as any).scale = [1, 2, 3]; bad(p, /layer/i);
  });
  it('keyframe easing lạ / time NaN', () => {
    const p = clone();
    const l = p.scenes[0].layers.find(x => Object.keys(x.tracks).length)!;
    const tr = Object.values(l.tracks)[0];
    tr.keys[0] = { ...tr.keys[0], easing: 'explode' as any };
    bad(p, /keyframe/);
  });
  it('camera thiếu id / track keys không phải array', () => {
    let p = clone(); delete (p.scenes[0].cameras[0] as any).id; bad(p, /camera/);
    p = clone(); (p.scenes[0].cameras[0].tracks as any)['fov'] = { property: 'fov', keys: 'oops' }; bad(p, /camera/);
  });
  it('shot/marker hỏng', () => {
    let p = clone(); (p.scenes[0].shots[0] as any).duration = -5; bad(p, /scene/);
    p = clone(); (p.scenes[0].markers[0] as any).time = 'soon'; bad(p, /scene/);
  });
  it('environment count quá giới hạn / seed NaN', () => {
    let p = clone(); p.scenes[0].environment.count = 99999; bad(p, /hạt/);
    p = clone(); p.scenes[0].environment.seed = NaN; bad(p, /hạt/);
  });
  it('activeSceneId trỏ scene không tồn tại', () => { const p = clone(); p.activeSceneId = 'khong-co'; bad(p, /scene đang chọn/); });
  it('Unicode trong tên vẫn pass', () => { const p = clone(); p.name = 'Dạ tiệc 🌙 — 日本 · Ω'; ok(p); });
});

describe('unsupportedRenderTypes', () => {
  it('demo project chỉ dùng ảnh/SVG → không cảnh báo', () => {
    expect(unsupportedRenderTypes(createDemoProject())).toEqual([]);
  });
  it('phát hiện audio bị layer tham chiếu', () => {
    const p = createDemoProject();
    p.assets.push({ id: 'aud1', name: 'nhac.mp3', type: 'audio', url: 'data:audio/mpeg;base64,AA==' });
    p.scenes[0].layers[0].assetId = 'aud1';
    expect(unsupportedRenderTypes(p)).toEqual(['audio']);
  });
  it('asset không dùng đến → không cảnh báo', () => {
    const p = createDemoProject();
    p.assets.push({ id: 'glb1', name: 'x.glb', type: 'glb', url: 'data:model/gltf-binary;base64,AA==' });
    expect(unsupportedRenderTypes(p)).toEqual([]);
  });
  it('RENDERABLE_ASSET_TYPES chỉ gồm image/svg', () => {
    expect(RENDERABLE_ASSET_TYPES).toEqual(['image', 'svg']);
  });
});
