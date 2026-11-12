// Q2 — Save/load + import asset: schema sâu, lỗi quota/transaction, round-trip, Unicode.
// Chạy: npm test (vitest). Không sửa app, chỉ dùng API public của persistence/import.
import { describe, it, expect } from 'vitest';
import { validateProject, unsupportedRenderTypes } from '../../src/core/store/persistence';
import { detectAssetType, unsupportedFormatReason } from '../../src/core/assets/import';
import { createDemoProject } from '../../src/core/presets/demo';

const clone = () => JSON.parse(JSON.stringify(createDemoProject()));
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

describe('Q2 validateProject — demo baseline', () => {
  it('demo project hợp lệ đi qua validator mà không đổi dữ liệu', () => {
    const p = createDemoProject();
    const v = validateProject(JSON.parse(JSON.stringify(p)));
    expect(v).toEqual(p);
  });
  it('chuỗi JSON malformed / kiểu lạ → lỗi dễ hiểu', () => {
    expect(() => validateProject('{not json')).toThrow(/Dự án không hợp lệ/);
    expect(() => validateProject(null)).toThrow();
    expect(() => validateProject(42)).toThrow();
    expect(() => validateProject([])).toThrow();
  });
});

describe('Q2 validateProject — schema sâu', () => {
  it('từ chối schemaVersion khác 1', () => {
    const p = clone(); p.schemaVersion = 2;
    expect(() => validateProject(p)).toThrow(/schemaVersion/);
  });
  it('phát hiện tham chiếu asset không tồn tại (layer + scatter)', () => {
    const p = clone(); p.scenes[0].layers[3].assetId = 'khong-ton-tai';
    expect(() => validateProject(p)).toThrow(/tham chiếu asset/);
    const q = clone(); q.scenes[0].layers.find((l: any) => l.kind === 'scatter').scatter.assetIds = ['ma'];
    expect(() => validateProject(q)).toThrow(/scatter/);
  });
  it('phát hiện activeSceneId trỏ tới scene không tồn tại', () => {
    const p = clone(); p.activeSceneId = 'scene-ma';
    expect(() => validateProject(p)).toThrow(/activeSceneId/);
  });
  it('ID trùng (asset, layer, camera, scene) đều bị chặn', () => {
    const a = clone(); a.assets.push({ ...a.assets[0] });
    expect(() => validateProject(a)).toThrow(/trùng/);
    const b = clone(); b.scenes[0].layers.push({ ...b.scenes[0].layers[0] });
    expect(() => validateProject(b)).toThrow(/trùng/);
    const c = clone(); c.scenes[0].cameras.push({ ...c.scenes[0].cameras[0] });
    expect(() => validateProject(c)).toThrow(/trùng/);
    const d = clone(); d.scenes.push({ ...d.scenes[0] });
    expect(() => validateProject(d)).toThrow(/trùng/);
  });
  it('số NaN/Infinity hoặc ngoài range → lỗi nêu rõ khoảng hợp lệ', () => {
    const p = clone(); p.scenes[0].layers[0].position[1] = Number.NaN;
    expect(() => validateProject(p)).toThrow(/\[x, y, z\]/);
    const q = clone(); q.scenes[0].fps = 9999;
    expect(() => validateProject(q)).toThrow(/\[1, 240\]/);
    const r = clone(); r.scenes[0].environment.count = -5;
    expect(() => validateProject(r)).toThrow(/\[0, 10000\]/);
    const s = clone(); s.scenes[0].layers[0].opacity = Infinity;
    expect(() => validateProject(s)).toThrow(/\[0, 1\]/);
  });
  it('keyframe sai easing / ngược thời gian → báo hỏng', () => {
    const p = clone(); const tr = p.scenes[0].layers[3].tracks['position.y'];
    tr.keys[0].easing = 'bounce';
    expect(() => validateProject(p)).toThrow(/easing/);
    const q = clone(); const qt = q.scenes[0].layers[3].tracks['position.y'];
    qt.keys.reverse();
    expect(() => validateProject(q)).toThrow(/thứ tự thời gian/);
  });
  it('scatter thiếu / zMax<=zMin bị chặn', () => {
    const p = clone(); delete p.scenes[0].layers.find((l: any) => l.kind === 'scatter').scatter;
    expect(() => validateProject(p)).toThrow(/scatter/);
    const q = clone(); const sc = q.scenes[0].layers.find((l: any) => l.kind === 'scatter').scatter;
    sc.zMin = 0; sc.zMax = -10;
    expect(() => validateProject(q)).toThrow(/zMax/);
  });
  it('chặn URL ngoài và data URI độc hại (text/html)', () => {
    const p = clone(); p.assets[0].url = 'https://evil.example/x.png';
    expect(() => validateProject(p)).toThrow(/data URI/);
    const q = clone(); q.assets[0].url = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';
    expect(() => validateProject(q)).toThrow(/data URI/);
  });
  it('màu không phải hex, kind lạ → lỗi liệt kê giá trị hợp lệ', () => {
    const p = clone(); p.scenes[0].layers[0].color = 'red';
    expect(() => validateProject(p)).toThrow(/hex/);
    const q = clone(); q.scenes[0].layers[0].kind = 'volume';
    expect(() => validateProject(q)).toThrow(/card, scatter, environment/);
  });
});

describe('Q2 round-trip save/load (JSON string) + Unicode', () => {
  it('demo → serialize → parse → validate cho ra đúng bản gốc', () => {
    const original = createDemoProject();
    const restored = validateProject(JSON.parse(JSON.stringify(original)));
    expect(restored).toEqual(original);
  });
  it('tên file Unicode (tiếng Việt, CJK, emoji) sống sót qua save/import', () => {
    const names = ['Kiếm sĩ · đêm mưa 剣士 🌙.png', 'à-b-c_100%.svg', '你好世界.png'];
    const p = clone();
    for (const [i, name] of names.entries()) {
      p.assets.push({ id: `unicode-${i}`, name, type: 'image', url: PNG });
      p.scenes[0].layers.push({ ...p.scenes[0].layers[0], id: `layer-u-${i}`, name, assetId: `unicode-${i}` });
    }
    const restored = validateProject(JSON.parse(JSON.stringify(p)));
    expect(restored.assets.slice(-3).map((a: any) => a.name)).toEqual(names);
  });
  it('data URI round-trip nguyên vẹn qua JSON', () => {
    const p = clone();
    p.assets.push({ id: 'rt', name: 'round.png', type: 'image', url: PNG });
    const restored = validateProject(JSON.parse(JSON.stringify(p)));
    expect(restored.assets.find((a: any) => a.id === 'rt')!.url).toBe(PNG);
  });
});

describe('Q2 import — phân loại & định dạng chưa hỗ trợ', () => {
  const f = (name: string, type: string) => new File(['x'], name, { type });
  it('detect đúng theo ext/mime', () => {
    expect(detectAssetType(f('a.png', 'image/png'))).toBe('image');
    expect(detectAssetType(f('a.svg', 'image/svg+xml'))).toBe('svg');
    expect(detectAssetType(f('nhac-nen.mp3', 'audio/mpeg'))).toBe('audio');
    expect(detectAssetType(f('clip.mp4', 'video/mp4'))).toBe('video');
    expect(detectAssetType(f('model.glb', ''))).toBe('glb');
    expect(detectAssetType(f('fig.vrm', ''))).toBe('vrm');
    expect(detectAssetType(f('anim.json', 'application/json'))).toBe('lottie');
    expect(detectAssetType(f('doc.pdf', 'application/pdf'))).toBeNull();
  });
  it('GLB/audio/video/lottie → thông báo "chưa hỗ trợ" rõ ràng, không im lặng', () => {
    for (const t of ['glb', 'vrm', 'audio', 'video', 'lottie'] as const) {
      expect(unsupportedFormatReason(t)).toMatch(/chưa được hỗ trợ/);
    }
    expect(unsupportedFormatReason('image')).toBeNull();
    expect(unsupportedFormatReason('svg')).toBeNull();
  });
  it('unsupportedRenderTypes liệt kê type asset ĐANG dùng trong scene nhưng không render được', () => {
    const p = clone();
    p.assets.push({ id: 'snd', name: 'tieng.mp3', type: 'audio', url: 'data:audio/mpeg;base64,//uQxA=' });
    p.scenes[0].layers[0].assetId = 'snd';
    expect(unsupportedRenderTypes(p)).toEqual(['audio']);
    expect(unsupportedRenderTypes(createDemoProject())).toEqual([]);
  });
});
