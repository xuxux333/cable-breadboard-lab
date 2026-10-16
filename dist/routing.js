/* Physical jumper routing. Only the two insertion holes make electrical contacts. */
(function (root) {
 'use strict';
 const B=root.BB;
 if(!B)throw Error('物理布线需要先加载面包板模型');
 const CLEARANCE=6, EPS=1e-7;
 const BOARD={minX:22,minY:48,maxX:B.W-22,maxY:B.H-22};
 const same=(a,b)=>Math.abs(a-b)<EPS;
 const point=p=>({x:p.x,y:p.y});
 function partBounds(part,clearance=CLEARANCE){
  const d=B.library[part.type];
  if(!d)return null;
  let x1,x2,y1,y2;
  if(d.kind==='dip'||d.kind==='fpga'){
   const half=d.kind==='fpga'?42:15;
   [x1,x2,y1,y2]=[-half,half,-9,(d.count/2-1)*14+9];
  }else if(d.kind==='switch')[x1,x2,y1,y2]=[-17,17,-9,109];
  else if(d.kind==='display')[x1,x2,y1,y2]=[-22,22,-10,66];
  else if(d.kind==='resistor'){
   [x1,x2,y1,y2]=part.bridge?[-13,13,-5.7,5.7]:[-6,6,9,33];
  }else if(d.kind==='capacitor')[x1,x2,y1,y2]=[-10,10,6,22];
  else if(d.kind==='electrolytic')[x1,x2,y1,y2]=[-10,10,1,25];
  else if(d.kind==='led')[x1,x2,y1,y2]=[-10,10,2,24];
  else return null;
  const angle=(part.rotation||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const corners=[[x1,y1],[x1,y2],[x2,y1],[x2,y2]].map(([x,y])=>({x:part.x+x*c-y*s,y:part.y+x*s+y*c}));
  return {minX:Math.min(...corners.map(p=>p.x))-clearance,minY:Math.min(...corners.map(p=>p.y))-clearance,maxX:Math.max(...corners.map(p=>p.x))+clearance,maxY:Math.max(...corners.map(p=>p.y))+clearance,part:part.id};
 }
 function wireVertices(w,state){
  const a=B.epPoint(w.a,state),b=B.epPoint(w.b,state);
  if(!a||!b)return [];
  if(w.bends?.length)return [point(a),...w.bends.map(point),point(b)];
  if(same(a.x,b.x)||same(a.y,b.y))return [point(a),point(b)];
  const mid=(a.x+b.x)/2;
  return [point(a),{x:mid,y:a.y},{x:mid,y:b.y},point(b)];
 }
 const inside=(p,r)=>p.x>r.minX+EPS&&p.x<r.maxX-EPS&&p.y>r.minY+EPS&&p.y<r.maxY-EPS;
 const inBoard=p=>p.x>=BOARD.minX-EPS&&p.x<=BOARD.maxX+EPS&&p.y>=BOARD.minY-EPS&&p.y<=BOARD.maxY+EPS;
 // A segment may touch the clearance boundary; entering its interior is blocked.
 // Liang-Barsky works for diagonal manually drawn segments as well as router elbows.
 function segmentHits(a,b,r){
  const dx=b.x-a.x,dy=b.y-a.y;
  const p=[-dx,dx,-dy,dy],q=[a.x-r.minX-EPS,r.maxX-a.x-EPS,a.y-r.minY-EPS,r.maxY-a.y-EPS];
  let lo=0,hi=1;
  for(let i=0;i<4;i++){
   if(Math.abs(p[i])<EPS){if(q[i]<0)return false;}
   else {const t=q[i]/p[i];if(p[i]<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;}
  }
  return lo<=hi;
 }
 function obstacles(state,wire){
  const boxes=state.parts.map(p=>partBounds(p)).filter(Boolean);
  for(const part of state.parts)for(const pin of B.pins(part)){
   // A direct pin endpoint deliberately touches that pin. Other jumper paths
   // must leave its occupied insertion hole and metal lead unobstructed.
   if(wire&&[wire.a,wire.b].some(ep=>ep.part===part.id&&String(ep.pin)===pin.n))continue;
   boxes.push({minX:pin.x-3,minY:pin.y-3,maxX:pin.x+3,maxY:pin.y+3,part:part.id,pin:pin.n,kind:'pin-crossing'});
  }
  return boxes;
 }
 function inspect(state){
  const conflicts=[],blockedEndpoints=[];
  for(const w of state.wires){
   const boxes=obstacles(state,w),reported=new Set();
   const vertices=wireVertices(w,state);
   if(!vertices.length){conflicts.push({wire:w.id,part:null,kind:'invalid-endpoint',text:`${w.id} 有无效端点`});continue;}
   if(vertices.some(p=>!inBoard(p)))conflicts.push({wire:w.id,part:null,kind:'out-of-bounds',text:`${w.id} 绕线超出面包板边界`});
   for(const box of boxes){
    let endpoint=false;
    for(const end of ['a','b']){
     const p=B.epPoint(w[end],state);
     if(p&&inside(p,box)){
      endpoint=true;
      const record={wire:w.id,end,part:box.part,kind:'blocked-endpoint',text:`${w.id} ${end==='a'?'A':'B'} 端插孔被 ${box.part} 本体或引脚遮挡`};
      if(w[end].hole)record.hole=w[end].hole;
      blockedEndpoints.push(record);
     }
    }
    let segment=-1;
    for(let i=0;i<vertices.length-1;i++)if(segmentHits(vertices[i],vertices[i+1],box)){segment=i;break;}
    const kind=endpoint?'blocked-endpoint':box.kind||'body-crossing',key=box.part+':'+kind;
    if(segment>=0&&!reported.has(key)){
     reported.add(key);
     conflicts.push({wire:w.id,part:box.part,kind,segment,text:endpoint?`${w.id} 端点被 ${box.part} 本体或引脚遮挡`:box.pin?`${w.id} 穿过 ${box.part} 已占用的引脚插孔`:`${w.id} 从 ${box.part} 本体下方穿过`});
    }
   }
  }
  return {conflicts,blockedEndpoints};
 }
 function occupancy(state){
  const used=new Map(),add=id=>{if(id)used.set(id,(used.get(id)||0)+1);};
  for(const part of state.parts)for(const pin of B.pins(part))add(B.nearest(pin.x,pin.y,1)?.id);
  for(const w of state.wires)for(const ep of [w.a,w.b]){
   const p=ep.part&&B.epPoint(ep,state);
   add(ep.hole||(p&&B.nearest(p.x,p.y,1)?.id));
  }
  return used;
 }
 function relocateEndpoints(state,w,boxes){
  const candidate=B.clone(w),used=occupancy(state);
  let relocated=0;
  for(const end of ['a','b']){
   const ep=candidate[end],p=B.epPoint(ep,state);
   if(!p)return {ok:false,reason:'跳线有无效端点'};
   // Release only the endpoint currently being relocated. The other endpoint
   // remains reserved even when it belongs to the very same five-hole group.
   if(ep.hole)used.set(ep.hole,(used.get(ep.hole)||0)-1);
   if(!boxes.some(r=>inside(p,r))){if(ep.hole)used.set(ep.hole,(used.get(ep.hole)||0)+1);continue;}
   if(!ep.hole)return {ok:false,reason:'固定的引脚或接线柱端点被器件本体遮挡，请先调整器件'};
   const group=B.holeMap.get(ep.hole)?.group,other=B.epPoint(candidate[end==='a'?'b':'a'],state)||p;
   const free=(B.groupMap.get(group)||[]).filter(h=>!(used.get(h.id)>0)&&inBoard(h)&&!boxes.some(r=>inside(h,r)));
   // Stay close to the original hole first, then prefer the other jumper end.
   free.sort((a,b)=>(Math.hypot(a.x-p.x,a.y-p.y)+.15*Math.hypot(a.x-other.x,a.y-other.y))-(Math.hypot(b.x-p.x,b.y-p.y)+.15*Math.hypot(b.x-other.x,b.y-other.y))||a.id.localeCompare(b.id));
   if(!free.length)return {ok:false,reason:`${B.holeMap.get(ep.hole)?.label||ep.hole} 所在导通组没有无遮挡的空孔`};
   candidate[end]={hole:free[0].id};used.set(free[0].id,(used.get(free[0].id)||0)+1);relocated++;
  }
  return {ok:true,wire:candidate,relocated};
 }
 class Heap{
  constructor(){this.data=[];this.serial=0;}
  push(id,cost,priority){const value={id,cost,priority,serial:this.serial++},a=this.data;a.push(value);let i=a.length-1;while(i){const p=(i-1)>>1;if(this.less(a[p],value))break;a[i]=a[p];i=p;}a[i]=value;}
  less(a,b){return a.priority<b.priority||(a.priority===b.priority&&a.serial<b.serial);}
  pop(){const a=this.data,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&this.less(a[j+1],a[j]))j++;if(this.less(last,a[j]))break;a[i]=a[j];i=j;}a[i]=last;}return first;}
  get length(){return this.data.length;}
 }
 function simplify(vertices){
  const result=[];
  for(const p of vertices){
   if(result.length&&same(result.at(-1).x,p.x)&&same(result.at(-1).y,p.y))continue;
   while(result.length>1){const a=result.at(-2),b=result.at(-1);if((same(a.x,b.x)&&same(b.x,p.x))||(same(a.y,b.y)&&same(b.y,p.y)))result.pop();else break;}
   result.push(point(p));
  }
  return result;
 }
 // Parallel routes get a soft cost, rather than pretending insulated crossings
 // create a junction. Nearby visibility lanes let long bundles remain readable.
 function congestionIndex(state,excluded){
  const horizontal=new Map(),vertical=new Map(),add=(map,key,value)=>{if(!map.has(key))map.set(key,[]);map.get(key).push(value);};
  for(const w of state.wires)if(w.id!==excluded){
   const pts=wireVertices(w,state);
   for(let i=0;i<pts.length-1;i++){
    const a=pts[i],b=pts[i+1];
    if(same(a.y,b.y))add(horizontal,Math.round(a.y/7),{at:a.y,lo:Math.min(a.x,b.x),hi:Math.max(a.x,b.x)});
    else if(same(a.x,b.x))add(vertical,Math.round(a.x/7),{at:a.x,lo:Math.min(a.y,b.y),hi:Math.max(a.y,b.y)});
   }
  }
  return (a,b)=>{
   const h=same(a.y,b.y),map=h?horizontal:vertical,at=h?a.y:a.x,lo=h?Math.min(a.x,b.x):Math.min(a.y,b.y),hi=h?Math.max(a.x,b.x):Math.max(a.y,b.y),bucket=Math.round(at/7);
   let cost=0;
   for(let i=bucket-2;i<=bucket+2;i++)for(const s of map.get(i)||[]){const distance=Math.abs(at-s.at);if(distance<8)cost+=Math.max(0,Math.min(hi,s.hi)-Math.max(lo,s.lo))*(8-distance)*.45;}
   return cost;
  };
 }
 function findPath(state,w,boxes){
  const a=B.epPoint(w.a,state),b=B.epPoint(w.b,state);
  if(!a||!b||!inBoard(a)||!inBoard(b))return null;
  if(boxes.some(r=>inside(a,r)||inside(b,r)))return null;
  if(same(a.x,b.x)&&same(a.y,b.y))return [point(a),point(b)];
  const xSet=new Set([BOARD.minX,BOARD.maxX,a.x,b.x]),ySet=new Set([BOARD.minY,BOARD.maxY,a.y,b.y]);
  const addX=x=>{if(x>=BOARD.minX&&x<=BOARD.maxX)xSet.add(Math.round(x*10000)/10000);};
  const addY=y=>{if(y>=BOARD.minY&&y<=BOARD.maxY)ySet.add(Math.round(y*10000)/10000);};
  for(const box of boxes){for(const x of [box.minX-10,box.minX,box.maxX,box.maxX+10])addX(x);for(const y of [box.minY-10,box.minY,box.maxY,box.maxY+10])addY(y);}
  for(const wire of state.wires)for(const ep of [wire.a,wire.b]){const p=B.epPoint(ep,state);if(p){addX(p.x);addY(p.y);}}
  // Sparse seven-unit alternatives reduce coincident trunks without a huge raster.
  for(const x of [a.x-7,a.x+7,b.x-7,b.x+7])addX(x);
  for(const y of [a.y-7,a.y+7,b.y-7,b.y+7])addY(y);
  const xs=[...xSet].sort((a,b)=>a-b),ys=[...ySet].sort((a,b)=>a-b),nx=xs.length,ny=ys.length;
  const ax=xs.indexOf(a.x),ay=ys.indexOf(a.y),bx=xs.indexOf(b.x),by=ys.indexOf(b.y);
  if(ax<0||ay<0||bx<0||by<0)return null;
  const start=ay*nx+ax,target=by*nx+bx,size=nx*ny,dist=new Float64Array(size*2),prev=new Int32Array(size*2),hEdges=new Int8Array(size),vEdges=new Int8Array(size);
  dist.fill(Infinity);prev.fill(-1);
  const heap=new Heap(),penalty=congestionIndex(state,w.id);
  const heuristic=node=>Math.abs(xs[node%nx]-b.x)+Math.abs(ys[Math.floor(node/nx)]-b.y);
  for(const dir of [0,1]){dist[start*2+dir]=0;heap.push(start*2+dir,0,heuristic(start));}
  let finish=-1;
  while(heap.length){
   const current=heap.pop(),id=current.id;
   if(current.cost!==dist[id])continue;
   const node=id>>1,dir=id&1,ix=node%nx,iy=Math.floor(node/nx),p={x:xs[ix],y:ys[iy]};
   if(node===target){finish=id;break;}
   for(const [dx,dy,nextDir]of [[-1,0,0],[1,0,0],[0,-1,1],[0,1,1]]){
    const jx=ix+dx,jy=iy+dy;
    if(jx<0||jx>=nx||jy<0||jy>=ny)continue;
    const next=jy*nx+jx,q={x:xs[jx],y:ys[jy]},edge=nextDir===0?hEdges:vEdges,key=Math.min(node,next);
    if(!edge[key])edge[key]=boxes.some(r=>segmentHits(p,q,r))?-1:1;
    if(edge[key]<0)continue;
    const nextId=next*2+nextDir,cost=current.cost+Math.abs(p.x-q.x)+Math.abs(p.y-q.y)+(dir!==nextDir?22:0)+penalty(p,q);
    if(cost+EPS<dist[nextId]){dist[nextId]=cost;prev[nextId]=id;heap.push(nextId,cost,cost+heuristic(next));}
   }
  }
  if(finish<0)return null;
  const path=[];
  for(let id=finish;id>=0;id=prev[id]){const node=id>>1;path.push({x:xs[node%nx],y:ys[Math.floor(node/nx)]});}
  return simplify(path.reverse());
 }
 function routeWire(state,wire,options={}){
  const boxes=obstacles(state,wire),moved=relocateEndpoints(state,wire,boxes);
  if(!moved.ok)return {wire:B.clone(wire),ok:false,reason:moved.reason,relocated:0};
  const path=findPath(state,moved.wire,boxes);
  if(!path)return {wire:B.clone(wire),ok:false,reason:'面包板内没有可避开器件本体的路径，请先移动器件或端点',relocated:0};
  const result={...moved.wire,bends:path.slice(1,-1).map(point)};
  const check=inspect({...state,wires:[result]});
  if(check.conflicts.length)return {wire:B.clone(wire),ok:false,reason:'候选路径未通过器件避让检查，已保留原跳线',relocated:0};
  return {wire:result,ok:true,relocated:moved.relocated};
 }
 function routeAll(input,options={}){
  const state=B.clone(input),initial=inspect(state),bad=new Set(initial.conflicts.map(c=>c.wire)),selected=options.wireIds?new Set(options.wireIds):null;
  const failures=[];
  let changed=0,relocated=0;
  for(let i=0;i<state.wires.length;i++){
   const wire=state.wires[i];
   if(selected?!selected.has(wire.id):!options.forceAll&&!bad.has(wire.id))continue;
   const result=routeWire(state,wire,options);
   if(!result.ok){failures.push({wire:wire.id,reason:result.reason});continue;}
   if(JSON.stringify(wire)!==JSON.stringify(result.wire)){state.wires[i]=result.wire;changed++;relocated+=result.relocated;}
  }
  state.routingRevision=1;
  const checked=inspect(state);
  return {state,changed,relocated,failures,...checked};
 }
 B.Routing={CLEARANCE,BOARD,partBounds,wireVertices,inspect,routeWire,routeAll};
 if(typeof module!=='undefined')module.exports=B.Routing;
})(typeof window!=='undefined'?window:globalThis);
