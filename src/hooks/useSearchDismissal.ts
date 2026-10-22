import { useEffect, useRef } from 'react';
import { navigationVisibility } from '../services/navigationVisibility.ts';
/** IME can close with its input still focused, so blur alone is insufficient. */
export function useSearchDismissal(open: boolean, collapse: () => void) {
 const latest=useRef(collapse); latest.current=collapse;
 useEffect(()=>{
  if(!open) return;
  let seen=navigationVisibility.isKeyboardVisible();
  return navigationVisibility.subscribeKeyboard(()=>{
    const visible=navigationVisibility.isKeyboardVisible();
    if(visible) seen=true;
    else if(seen) {seen=false;latest.current();}
  });
 },[open]);
}
