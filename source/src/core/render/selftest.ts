import type { Scene } from '../types';
import { sceneSnapshot } from '../timeline/engine';
export function runSelfTest(scene:Scene){
 const times=[1.25,3.8,.4,1.25].map(t=>Math.min(t,scene.duration));
 const snapshots=times.map(t=>sceneSnapshot(scene,t));
 const a=JSON.stringify(snapshots[0]),b=JSON.stringify(snapshots[3]);
 const pass=a===b;
 const detail={times,pass,drift:pass?0:1,camera:snapshots[0].camera,layers:snapshots[0].layers.length,particles:Math.min(12,scene.environment.count)};
 window.dispatchEvent(new CustomEvent('mangamotion:selftest',{detail}));
 return detail;
}
