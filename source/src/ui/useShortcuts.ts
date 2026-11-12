import { useEffect } from 'react';
import { useStudio } from '../core/store/useStudio';
export function useShortcuts(){
 useEffect(()=>{const h=(e:KeyboardEvent)=>{const s=useStudio.getState();const target=e.target as HTMLElement;const typing=['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||target.isContentEditable||target.closest('.monaco-editor');
  if(e.key==='Escape'){if(s.modal)s.set({modal:null});else s.set({mobilePanel:null});return;}
  if(typing)return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?s.redo():s.undo();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();s.redo();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){e.preventDefault();s.copyKey();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='v'){e.preventDefault();s.pasteKey();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();s.duplicateLayer();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){e.preventDefault();s.set({leftTab:'layers'});document.querySelector<HTMLInputElement>('.panel-search input')?.focus();return;}
  if(s.modal)return;
  if(e.code==='Space'){e.preventDefault();s.togglePlay();}
  else if(e.key.toLowerCase()==='k'){e.preventDefault();s.keyframe();}
  else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();s.deleteSelected();}
  else if(e.key.toLowerCase()==='d'){e.preventDefault();s.duplicateLayer();}
  else if(e.key.toLowerCase()==='f'){e.preventDefault();s.set({view:'stage',focusVersion:s.focusVersion+1});}
  else if(e.key==='Tab'){e.preventDefault();s.set({view:s.view==='camera'?'stage':'camera'});}
  else if(e.key==='1')s.set({view:'camera'});else if(e.key==='2')s.set({view:'stage'});else if(e.key==='3')s.set({view:'split'});
 };window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);},[]);
}
