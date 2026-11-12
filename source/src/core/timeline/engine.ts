import { clamp, type Easing, type Keyframe, type Track, type Scene, type SceneState, type EvaluatedLayer, type Layer, type Camera, type EvaluatedCamera } from '../types';
import { evaluateCamera } from '../camera/camera';
import { particlePosition } from '../environment3d/particles';

/** Cubic bezier with an inverse-time solve; never depends on wall-clock time. */
export function cubicBezier(x: number, points: [number, number, number, number]): number {
  const [x1, y1, x2, y2] = points;
  const curve = (u: number, a: number, b: number) => 3 * (1-u) ** 2 * u * a + 3 * (1-u) * u*u * b + u*u*u;
  let lo = 0, hi = 1, u = x;
  for (let i = 0; i < 22; i++) { u = (lo + hi) / 2; if (curve(u, x1, x2) < x) lo = u; else hi = u; }
  return curve(u, y1, y2);
}
export function ease(t: number, kind: Easing, bezier: [number, number, number, number] = [.42, 0, .58, 1]) {
  t = clamp(t, 0, 1);
  if (kind === 'easeIn') return t*t*t;
  if (kind === 'easeOut') return 1-(1-t)**3;
  if (kind === 'easeInOut') return t < .5 ? 4*t*t*t : 1-(-2*t+2)**3/2;
  if (kind === 'bezier') return cubicBezier(t, bezier);
  return t;
}
export function sampleTrack(track: Track | undefined, t: number, fallback: number): number {
  if (!track?.keys.length) return fallback;
  const keys = [...track.keys].sort((a,b) => a.time-b.time);
  if (t <= keys[0].time) return keys[0].value;
  const last = keys[keys.length-1];
  if (t >= last.time) return last.value;
  const i = keys.findIndex((k, j) => j < keys.length-1 && t >= k.time && t < keys[j+1].time);
  const a = keys[i], b = keys[i+1];
  if (a.easing === 'step') return a.value;
  return a.value + (b.value-a.value) * ease((t-a.time)/(b.time-a.time || 1), a.easing, a.bezier);
}
export function getPath(obj: unknown, path: string): number {
  return path.split('.').reduce<unknown>((o,k) => (o as Record<string, unknown>)?.[k], obj) as number;
}
export function setPath<T>(obj: T, path: string, value: number): T {
  const clone = structuredClone(obj); const parts = path.split('.');
  let o = clone as Record<string, unknown>;
  for (const p of parts.slice(0,-1)) o = o[p] as Record<string, unknown>;
  o[parts[parts.length-1]] = value; return clone;
}
export function evaluateLayer(layer: Layer, time: number, cameraZ = 6): EvaluatedLayer {
  const t = layer.posterize ? Math.floor(time * layer.posterize) / layer.posterize : time;
  const value = (p: string, base: number) => sampleTrack(layer.tracks[p], t, base);
  const z = value('position.z', layer.position[2]);
  const compensation = layer.compensate ? Math.max(.1, (cameraZ-z)/(cameraZ-layer.position[2] || 1)) : 1;
  return { id: layer.id, visible: layer.visible,
    position: [value('position.x',layer.position[0]),value('position.y',layer.position[1]),z],
    rotation: [value('rotation.x',layer.rotation[0]),value('rotation.y',layer.rotation[1]),value('rotation.z',layer.rotation[2])],
    scale: [value('scale.x',layer.scale[0])*compensation,value('scale.y',layer.scale[1])*compensation],
    opacity: clamp(value('opacity',layer.opacity),0,1) };
}
/** Pure scene snapshot. All animation, camera noise and particle seeds derive from t. */
export function seek(scene: Scene, time: number): SceneState {
  const t = clamp(Number.isFinite(time) ? time : 0, 0, scene.duration);
  const camera = evaluateCamera(scene, t);
  const layers = scene.layers.map(l => {
    const ev = evaluateLayer(l,t,camera.position[2]);
    if (l.compensate && camera.type === 'orthographic') ev.scale = [sampleTrack(l.tracks['scale.x'],t,l.scale[0]),sampleTrack(l.tracks['scale.y'],t,l.scale[1])];
    return ev;
  });
  const shader = {...scene.shader};
  if (scene.shader.tracks) for (const p of ['dotSize','angle','threshold','ink','vignette','blur','focus','flash'] as const) {
    const tr=scene.shader.tracks[p]; if(tr) (shader as any)[p]=sampleTrack(tr,t,scene.shader[p]);
  }
  return { time: t, layers, camera, environment: {...scene.environment}, shader };
}
export function sceneSnapshot(scene: Scene, t: number) {
  const state = seek(scene,t);
  return {...state, particles: Array.from({length: Math.min(12,state.environment.count)}, (_,i) => particlePosition(state.environment,i,t))};
}
export function snapTime(t: number, fps: number, markers: number[] = [], enabled = true) {
  if (!enabled) return t;
  const nearest = markers.reduce((a,m) => Math.abs(m-t) < Math.abs(a-t) ? m : a, Math.round(t*fps)/fps);
  return Math.abs(nearest-t) < .5/fps ? nearest : Math.round(t*fps)/fps;
}
export function moveKeyframe(keys: Keyframe[], id: string, time: number): Keyframe[] {
  return keys.map(k => k.id === id ? {...k,time: Math.max(0,time)} : k).sort((a,b) => a.time-b.time);
}
