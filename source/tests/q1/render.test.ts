import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { seek, evaluateLayerForCamera } from '../../src/core/timeline/engine';
import { particleSeeds, particleAt } from '../../src/core/environment3d/particles';
import { createDemoProject, layerDefaults } from '../../src/core/presets/demo';

const proj = createDemoProject();
describe('Q1 renderer math', () => {
  it('evaluateLayerForCamera === seek layers (mọi scene/t)', () => {
    for (const s of proj.scenes) for (const t of [0, .7, 1.25, 2.5, 4, Math.min(6, s.duration), s.duration]) {
      const st = seek(s, t);
      s.layers.forEach((l, i) => expect(evaluateLayerForCamera(l, t, st.camera)).toEqual(st.layers[i]));
    }
  });
  it('compensate đổi scale theo camera Z (perspective)', () => {
    const l = { ...layerDefaults, compensate: true, position: [0,0,-8] as [number,number,number],
      tracks: { 'position.z': { property:'position.z', keys:[
        { id:'k', time:0, value:-8, easing:'linear' as const, bezier:[0,0,1,1] as [number,number,number,number] },
        { id:'k2', time:4, value:-2, easing:'linear' as const, bezier:[0,0,1,1] as [number,number,number,number] }] } } };
    const a = evaluateLayerForCamera(l, 2, { type:'perspective', position:[0,0,6] } as any);
    const b = evaluateLayerForCamera(l, 2, { type:'perspective', position:[0,0,12] } as any);
    expect(a.scale).not.toEqual(b.scale);
  });
  it('ortho compensate dùng scale thô (không bù)', () => {
    const l = { ...layerDefaults, compensate: true };
    expect(evaluateLayerForCamera(l, 0, { type:'orthographic', position:[0,0,10] } as any).scale).toEqual(l.scale);
  });
  it('particle đổi vị trí theo t + seeds deterministic', () => {
    const env = proj.scenes[0].environment; const s = particleSeeds(env);
    expect(particleSeeds(env)).toEqual(s); expect(s.length).toBe(env.count);
    expect(particleAt(s, env, 3, 1)).not.toEqual(particleAt(s, env, 3, 2));
  });
  it('seek deterministic cùng t', () => expect(seek(proj.scenes[0], 2.5)).toEqual(seek(proj.scenes[0], 2.5)));
});
describe('Q1 source regression guards', () => {
  const rs = readFileSync(new URL('../../src/core/render/RenderScene.tsx', import.meta.url), 'utf8');
  const me = readFileSync(new URL('../../src/core/shaders/MangaEffect.tsx', import.meta.url), 'utf8');
  it('Particles phải set instanceMatrix.needsUpdate', () => expect(rs).toMatch(/instanceMatrix\.needsUpdate\s*=\s*true/));
  it('Card không dùng biến state undefined', () => expect(rs).not.toMatch(/camZ=state\.camera/));
  it('MangaEffect giữ vá getState, chỉ 1 import seek', () => {
    expect(me).toMatch(/useStudio\.getState/);
    expect(me.match(/import\s*\{\s*seek\s*\}/g)?.length).toBe(1);
    expect(me).not.toMatch(/useStudio\s+as\s+get/);
  });
});
