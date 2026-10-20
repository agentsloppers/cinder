// 2D (XZ) static colliders in a spatial hash. Circles and oriented boxes with a y-range.
const CS=16;
export const Colliders={grid:new Map(),all:[],
 key(i,j){return i*4096+j},
 _add(c,minx,maxx,minz,maxz){ this.all.push(c); for(let i=Math.floor(minx/CS);i<=Math.floor(maxx/CS);i++)for(let j=Math.floor(minz/CS);j<=Math.floor(maxz/CS);j++){const k=this.key(i,j);let a=this.grid.get(k);if(!a){a=[];this.grid.set(k,a)}a.push(c)} },
 circle(x,z,r,y0=-99,y1=99){ const c={t:0,x,z,r,y0,y1}; this._add(c,x-r,x+r,z-r,z+r); return c },
 box(cx,cz,hx,hz,rot,y0=-99,y1=99){ const co=Math.cos(rot),si=Math.sin(rot); const c={t:1,x:cx,z:cz,hx,hz,co,si,y0,y1}; const R=Math.hypot(hx,hz); this._add(c,cx-R,cx+R,cz-R,cz+R); return c },
 // push circle (x,z,r) at height y out of all colliders. returns {x,z,hit}
 resolve(p,r,y=0){ let hit=false; const i0=Math.floor((p.x-r)/CS),i1=Math.floor((p.x+r)/CS),j0=Math.floor((p.z-r)/CS),j1=Math.floor((p.z+r)/CS);
  for(let it=0;it<2;it++)for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){ const a=this.grid.get(this.key(i,j)); if(!a)continue;
   for(const c of a){ if(y>c.y1||y+1.6<c.y0)continue;
    if(c.t===0){ const dx=p.x-c.x,dz=p.z-c.z,rr=r+c.r,d2=dx*dx+dz*dz; if(d2<rr*rr){ const d=Math.sqrt(d2)||0.0001; const k=(rr-d)/d; p.x+=dx*k;p.z+=dz*k;hit=true } }
    else { // box: transform into box space
     const dx=p.x-c.x,dz=p.z-c.z; const lx=dx*c.co+dz*c.si,lz=-dx*c.si+dz*c.co; const qx=Math.max(-c.hx,Math.min(c.hx,lx)),qz=Math.max(-c.hz,Math.min(c.hz,lz)); let ex=lx-qx,ez=lz-qz; const d2=ex*ex+ez*ez;
     if(d2<r*r){ let nx,nz,pen; if(d2>1e-8){const d=Math.sqrt(d2);nx=ex/d;nz=ez/d;pen=r-d} else { const px=c.hx-Math.abs(lx),pz=c.hz-Math.abs(lz); if(px<pz){nx=Math.sign(lx)||1;nz=0;pen=px+r}else{nx=0;nz=Math.sign(lz)||1;pen=pz+r} }
      const wx=nx*c.co-nz*c.si,wz=nx*c.si+nz*c.co; p.x+=wx*pen;p.z+=wz*pen;hit=true } } } }
  return hit },
 // segment blocked? (for line of sight / projectiles) – coarse sampling
 blocked(x0,z0,x1,z1,y=1){ const d=Math.hypot(x1-x0,z1-z0),n=Math.ceil(d/0.7); const t={x:0,z:0}; for(let i=1;i<n;i++){ t.x=x0+(x1-x0)*i/n; t.z=z0+(z1-z0)*i/n; const ox=t.x,oz=t.z; if(this.resolve(t,0.05,y)&&(Math.abs(t.x-ox)>0.01||Math.abs(t.z-oz)>0.01))return true } return false },
};
