import { useEffect } from 'react';
import { useStudio, activeScene } from '../store/useStudio';
/** One wall-clock anchored RAF; preview time is never accumulated with delta. */
export function PlaybackDriver(){
 const playing=useStudio(s=>s.playing);const loop=useStudio(s=>s.loop);const sceneId=useStudio(s=>s.project.activeSceneId);
 useEffect(()=>{if(!playing)return;const start=performance.now();const anchor=useStudio.getState().time;const duration=activeScene(useStudio.getState().project).duration;let raf=0;
  const tick=(now:number)=>{let t=anchor+(now-start)/1000;if(t>=duration){if(loop)t=t%duration;else{useStudio.setState({time:duration,playing:false});return;}}useStudio.setState({time:t});raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[playing,loop,sceneId]);return null;
}
