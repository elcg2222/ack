import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectAssetType, importAssetFile, unsupportedFormatReason, RENDERABLE_ASSET_TYPES } from '../../src/core/assets/import';

// --- Mocks: môi trường browser tối giản cho vitest (node) ---
class FakeFileReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | null = null;
  readAsDataURL(file: File) {
    const buf = Buffer.from(new Uint8Array((file as any)._bytes ?? new ArrayBuffer(0)));
    this.result = `data:${file.type || 'application/octet-stream'};base64,${buf.toString('base64')}`;
    setTimeout(() => this.onload?.(), 0);
  }
}
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0; naturalHeight = 0; width = 0; height = 0;
  private _src = '';
  set src(v: string) {
    this._src = v;
    setTimeout(() => {
      // Ảnh "hợp lệ" = data:image/png với marker WxH nhúng trong base64 do helper tạo ra
      if (v.startsWith('data:image/')) {
        try {
          const meta = Buffer.from(v.split(',')[1] ?? '', 'base64').toString('utf8');
          const m = /^(\d+)x(\d+)$/.exec(meta);
          if (m) { this.naturalWidth = +m[1]; this.naturalHeight = +m[2]; this.onload?.(); return; }
        } catch { /* fallthrough */ }
      }
      this.onerror?.();
    }, 0);
  }
  get src() { return this._src; }
}
beforeEach(() => {
  vi.stubGlobal('FileReader', FakeFileReader);
  vi.stubGlobal('Image', FakeImage);
  vi.stubGlobal('window', globalThis);
});

const mkFile = (name: string, type: string, bytes: number[] | string = 'x'): File => {
  const content = typeof bytes === 'string' ? [...Buffer.from(bytes, 'utf8')] : bytes;
  const f = new File([new Uint8Array(content)], name, { type });
  (f as any)._bytes = new Uint8Array(content);
  return f;
};
// Ảnh giả: nội dung base64 là "WxH" để FakeImage giải mã kích thước
const imgFile = (name: string, w = 800, h = 600, mime = 'image/png') => mkFile(name, mime, `${w}x${h}`);

describe('detectAssetType', () => {
  it('phân loại theo MIME + phần mở rộng', () => {
    expect(detectAssetType(mkFile('a.png', 'image/png'))).toBe('image');
    expect(detectAssetType(mkFile('a.svg', 'image/svg+xml'))).toBe('svg');
    expect(detectAssetType(mkFile('a.SVG', ''))).toBe('svg');
    expect(detectAssetType(mkFile('a.mp3', 'audio/mpeg'))).toBe('audio');
    expect(detectAssetType(mkFile('a.mp4', 'video/mp4'))).toBe('video');
    expect(detectAssetType(mkFile('a.glb', ''))).toBe('glb');
    expect(detectAssetType(mkFile('a.vrm', ''))).toBe('vrm');
    expect(detectAssetType(mkFile('a.json', 'application/json'))).toBe('lottie');
    expect(detectAssetType(mkFile('a.exe', 'application/x-msdownload'))).toBeNull();
  });
});

describe('importAssetFile — ảnh/SVG', () => {
  it('ảnh hợp lệ → trả về asset kèm width/height', async () => {
    const a = await importAssetFile(imgFile('hero.png', 1024, 512));
    expect(a.type).toBe('image');
    expect(a.width).toBe(1024); expect(a.height).toBe(512);
    expect(a.url.startsWith('data:image/png;base64,')).toBe(true);
    expect(a.thumbnail).toBe(a.url);
    expect(a.id).toBeTruthy();
  });
  it('ảnh hỏng → reject', async () => {
    await expect(importAssetFile(mkFile('broken.png', 'image/png', 'khong phai anh'))).rejects.toThrow(/bị hỏng/);
  });
  it('ảnh kích thước 0 → reject', async () => {
    await expect(importAssetFile(imgFile('zero.png', 0, 0))).rejects.toThrow(/kích thước bằng 0/);
  });
  it('tên Unicode giữ nguyên', async () => {
    const a = await importAssetFile(imgFile('𝐻ồ-i 𝑡𝑟ộ🌙.png'));
    expect(a.name).toContain('🌙');
  });
});

describe('importAssetFile — chính sách nhận + cảnh báo (KHÔNG từ chối)', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  it('GLB được nhận vào thư viện + console.warn', async () => {
    const warn = vi.mocked(console.warn);
    const a = await importAssetFile(mkFile('model.glb', '', 'binary'));
    expect(a.type).toBe('glb');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('GLB'));
  });
  it('audio/video được nhận + cảnh báo', async () => {
    await expect(importAssetFile(mkFile('nhac.mp3', 'audio/mpeg'))).resolves.toMatchObject({ type: 'audio' });
    await expect(importAssetFile(mkFile('clip.mp4', 'video/mp4'))).resolves.toMatchObject({ type: 'video' });
    expect(vi.mocked(console.warn)).toHaveBeenCalled();
  });
  it('lottie JSON hợp lệ được nhận; JSON rác bị từ chối', async () => {
    await expect(importAssetFile(mkFile('anim.json', 'application/json', JSON.stringify({ layers: [] }))))
      .resolves.toMatchObject({ type: 'lottie' });
    await expect(importAssetFile(mkFile('bad.json', 'application/json', '{"nope":1}')))
      .rejects.toThrow(/Lottie/);
  });
  it('unsupportedFormatReason: null cho ảnh, chuỗi cho các định dạng khác', () => {
    for (const t of RENDERABLE_ASSET_TYPES) expect(unsupportedFormatReason(t)).toBeNull();
    for (const t of ['glb', 'vrm', 'audio', 'video', 'lottie'] as const)
      expect(unsupportedFormatReason(t)).toMatch(/chưa được hỗ trợ/i);
  });
});

describe('importAssetFile — giới hạn an toàn', () => {
  it('file > 30MB → reject', async () => {
    const big = mkFile('big.png', 'image/png');
    Object.defineProperty(big, 'size', { value: 31 * 1024 * 1024 });
    await expect(importAssetFile(big)).rejects.toThrow(/30 MB/);
  });
  it('định dạng lạ hoàn toàn → reject', async () => {
    await expect(importAssetFile(mkFile('virus.exe', 'application/x-msdownload'))).rejects.toThrow(/chưa được hỗ trợ/);
  });
});
