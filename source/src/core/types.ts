export type Vec3 = [number, number, number];
export type Easing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'step' | 'bezier';
export type Workspace = 'multiplane25d' | 'blockout3d' | 'character' | 'composer' | 'export';
export type ViewMode = 'camera' | 'stage' | 'split';
export interface Keyframe { id: string; time: number; value: number; easing: Easing; bezier: [number, number, number, number] }
export interface Track { property: string; keys: Keyframe[] }
export interface Asset { id: string; name: string; type: 'image' | 'svg' | 'audio' | 'video' | 'glb' | 'vrm' | 'lottie'; url: string; thumbnail?: string; width?: number; height?: number; builtIn?: boolean }
export interface Layer {
  id: string; name: string; kind: 'card' | 'scatter' | 'environment'; assetId?: string;
  position: Vec3; rotation: Vec3; scale: [number, number]; opacity: number;
  visible: boolean; locked: boolean; billboard: boolean; compensate: boolean;
  blend: 'normal' | 'multiply' | 'screen' | 'add'; mask: 'none' | 'panel' | 'diagonal';
  shadow: boolean; rim: boolean; posterize: number; color: string;
  tracks: Record<string, Track>;
  scatter?: { count: number; seed: number; zMin: number; zMax: number; width: number; assetIds: string[] };
}
export interface Camera {
  id: string; name: string; type: 'perspective' | 'orthographic'; start: number;
  position: Vec3; target: Vec3; roll: number; fov: number; zoom: number;
  shake: { amplitude: number; frequency: number; seed: number }; tracks: Record<string, Track>;
}
export interface Environment {
  kind: 'rain' | 'snow' | 'sakura' | 'dust'; enabled: boolean; count: number; seed: number;
  width: number; height: number; depth: number; centerZ: number;
  fallSpeed: number; windSpeed: number; swayAmp: number; frequency: number; opacity: number;
  color: string; fog: number; fogColor: string; speedlines: number; speedlineRadius: number;
}
export interface ShaderSettings { enabled: boolean; halftone: boolean; dotSize: number; angle: number; threshold: number; ink: number; bw: boolean; vignette: number; blur: number; focus: number; flash: number; tracks?: Record<string, Track> }
export interface Shot { id: string; name: string; start: number; duration: number; color: string; page?: number }
export interface Scene { id: string; name: string; mode: 'multiplane25d'; duration: number; fps: number; aspect: '16:9' | '9:16' | '4:3'; layers: Layer[]; cameras: Camera[]; environment: Environment; shader: ShaderSettings; shots: Shot[]; markers: { id: string; time: number; label: string }[] }
export interface Project { schemaVersion: 1; id: string; name: string; scenes: Scene[]; assets: Asset[]; activeSceneId: string; revision: number; updatedAt: string }
export interface Selection { type: 'layer' | 'camera'; id: string }
export interface EvaluatedLayer { id: string; position: Vec3; rotation: Vec3; scale: [number, number]; opacity: number; visible: boolean }
export interface EvaluatedCamera { id: string; type: 'perspective' | 'orthographic'; position: Vec3; target: Vec3; roll: number; fov: number; zoom: number; shake: { amplitude: number; frequency: number; seed: number } }
export interface SceneState { time: number; layers: EvaluatedLayer[]; camera: EvaluatedCamera; environment: Environment; shader: ShaderSettings }
export const uid = () => crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
