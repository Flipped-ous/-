export interface ProjectSlot { id: string; top: number; height: number }
/** Snapshot geometry keeps animated peers from moving the hit-test thresholds. */
export function projectDragLayout(slots: ProjectSlot[], id: string, dy: number) {
 const from=slots.findIndex(slot=>slot.id===id), shifts:Record<string,number>={};
 if(from<0) return {shifts,top:0,target:null as {id:string;after:boolean}|null};
 const source=slots[from],center=source.top+source.height/2+dy;
 const to=slots.filter(slot=>slot.id!==id && center>slot.top+slot.height/2).length;
 const gap=slots.length>1 ? Math.max(0,slots[1].top-slots[0].top-slots[0].height) : 0;
 for(let i=0;i<slots.length;i++) {
  if(i>from && i<=to) shifts[slots[i].id]=-(source.height+gap);
  if(i<from && i>=to) shifts[slots[i].id]=source.height+gap;
 }
 const target=to===from?null:{id:slots[to].id,after:to>from};
 const top=to===from ? 0 : to<from ? slots[to].top-source.top : slots[to].top+slots[to].height-source.height-source.top;
 return {shifts,top,target};
}
