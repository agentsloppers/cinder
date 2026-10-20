// Unified keyboard / mouse / gamepad input. Actions are polled: held, pressed (edge), released.
const KEYMAP={KeyW:'up',KeyS:'down',KeyA:'left',KeyD:'right',ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',
 Space:'roll',ShiftLeft:'guard',ShiftRight:'guard',KeyE:'interact',KeyF:'interact',KeyQ:'lock',KeyR:'flask',Digit1:'spirit',KeyC:'spirit',Tab:'lockR',Escape:'menu',KeyI:'menu',KeyM:'map',KeyG:'summon',KeyX:'heavy'};
export const Input={held:{},last:{},pressed:{},released:{},mx:0,my:0,wheel:0,axisX:0,axisY:0,lookX:0,lookY:0,locked:false,pad:false,_prevPad:{},gamepadName:'',enabled:true,
 init(el){
  addEventListener('keydown',e=>{ if(e.repeat)return; const a=KEYMAP[e.code]; if(!a)return; if(e.code==='Tab')e.preventDefault(); this.down(a)});
  addEventListener('keyup',e=>{const a=KEYMAP[e.code]; if(a)this.up(a)});
  el.addEventListener('mousedown',e=>{ if(!this.locked && this.wantLock) {el.requestPointerLock?.();} if(e.button===0)this.down('light'); if(e.button===2)this.down('heavy'); if(e.button===1){e.preventDefault();this.down('lock')}});
  addEventListener('mouseup',e=>{ if(e.button===0)this.up('light'); if(e.button===2)this.up('heavy'); if(e.button===1)this.up('lock')});
  addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('mousemove',e=>{ if(this.locked){this.mx+=e.movementX;this.my+=e.movementY} });
  addEventListener('wheel',e=>{this.wheel+=Math.sign(e.deltaY)},{passive:true});
  document.addEventListener('pointerlockchange',()=>{this.locked=document.pointerLockElement===el; if(!this.locked&&this.onUnlock)this.onUnlock()});
  addEventListener('blur',()=>{this.held={}});
  addEventListener('gamepadconnected',e=>{this.gamepadName=e.gamepad.id;this.pad=true});
 },
 down(a){ if(!this.held[a]){this.pressed[a]=performance.now();this.last[a]=performance.now()} this.held[a]=true },
 up(a){ if(this.held[a])this.released[a]=performance.now(); this.held[a]=false },
 poll(){ // call once per frame before game update
  let ax=0,ay=0;
  if(this.held.left)ax-=1; if(this.held.right)ax+=1; if(this.held.up)ay-=1; if(this.held.down)ay+=1;
  this.lookX=this.mx; this.lookY=this.my; this.mx=0; this.my=0;
  const gp=navigator.getGamepads?[...navigator.getGamepads()].find(g=>g&&g.connected):null;
  if(gp){ this.pad=true; const dz=v=>Math.abs(v)<0.18?0:v;
   const lx=dz(gp.axes[0]),ly=dz(gp.axes[1]),rx=dz(gp.axes[2]),ry=dz(gp.axes[3]);
   if(lx||ly){ax=lx;ay=ly}
   this.lookX+=rx*14; this.lookY+=ry*10; this.padLook=Math.hypot(rx,ry);
   const b=i=>gp.buttons[i]&&gp.buttons[i].pressed;
   const map={roll:b(1)||b(0)&&false,light:b(5),heavy:b(7),guard:b(4),spirit:b(6),lock:b(11),flask:b(3),interact:b(0)||b(2),menu:b(9),map:b(8)};
   for(const k in map){const was=this._prevPad[k];if(map[k]&&!was)this.down(k);if(!map[k]&&was)this.up(k);this._prevPad[k]=map[k]}
   if(Math.abs(rx)>0.9&&!this._flick){this._flick=true;this.pressed.switchR=rx>0?1:0;this.pressed.switchL=rx<0?1:0}else if(Math.abs(rx)<0.5)this._flick=false;
  }
  const m=Math.hypot(ax,ay); if(m>1){ax/=m;ay/=m}
  this.axisX=ax;this.axisY=ay;
 },
 endFrame(){ this.pressed={};this.released={};this.wheel=0 },
 // was pressed within the last `ms` (input buffering)
 buffered(a,ms=220){ const t=this.last[a]; return !!t&&performance.now()-t<=ms },
 consume(a){this.last[a]=0},
};
