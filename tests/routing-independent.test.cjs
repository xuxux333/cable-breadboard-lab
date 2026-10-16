'use strict';

// This audit intentionally does not use Routing.inspect, partBounds or
// wireVertices for its geometric assertions. Dimensions come from app.shape;
// segments are clipped in each component's own coordinate system.
const test=require('node:test');
const assert=require('node:assert/strict');
const B=require('../dist/model.js');
const R=require('../dist/routing.js');
const GAP=6,EPS=1e-5;

function body(part){
 const d=B.library[part.type];
 if(d.kind==='dip')return [-15,-9,15,(d.count/2-1)*14+9];
 if(d.kind==='fpga')return [-42,-9,42,275];
 if(d.kind==='display')return [-22,-10,22,66];
 if(d.kind==='switch')return [-17,-9,17,109];
 if(d.kind==='resistor')return part.bridge?[-13,-5.7,13,5.7]:[-6,9,6,33];
 if(d.kind==='capacitor')return [-10,6,10,22];
 if(d.kind==='electrolytic')return [-10,1,10,25];
 if(d.kind==='led')return [-10,2,10,24];
 throw Error('Missing independent body geometry '+part.type);
}
function toLocal(point,part){
 const radians=(part.rotation||0)*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians);
 const x=point.x-part.x,y=point.y-part.y;
 return {x:x*c+y*s,y:-x*s+y*c};
}
function toWorld(point,part){
 const radians=(part.rotation||0)*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians);
 return {x:part.x+point.x*c-point.y*s,y:part.y+point.x*s+point.y*c};
}
function points(wire,state){
 const a=B.epPoint(wire.a,state),b=B.epPoint(wire.b,state);
 assert(a&&b,'Both wire endpoints must resolve');
 if(wire.bends.length)return [a,...wire.bends,b];
 if(Math.abs(a.x-b.x)<EPS||Math.abs(a.y-b.y)<EPS)return [a,b];
 const middle=(a.x+b.x)/2;
 return [a,{x:middle,y:a.y},{x:middle,y:b.y},b];
}
function intersects(a,b,part,gap=GAP){
 a=toLocal(a,part);b=toLocal(b,part);
 const box=body(part),min=[box[0]-gap+EPS,box[1]-gap+EPS],max=[box[2]+gap-EPS,box[3]+gap-EPS];
 let low=0,high=1;
 for(let axis=0;axis<2;axis++){
  const key=axis?'y':'x',delta=b[key]-a[key];
  if(Math.abs(delta)<EPS){if(a[key]<min[axis]||a[key]>max[axis])return false;}
  else{
   const first=(min[axis]-a[key])/delta,last=(max[axis]-a[key])/delta;
   low=Math.max(low,Math.min(first,last));high=Math.min(high,Math.max(first,last));
   if(low>high)return false;
  }
 }
 return low<=high;
}
function distanceToSegment(p,a,b){
 const x=b.x-a.x,y=b.y-a.y,length=x*x+y*y;
 const t=length?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/length)):0;
 return Math.hypot(p.x-a.x-t*x,p.y-a.y-t*y);
}
function physicalFaults(state){
 const result=[];
 for(const wire of state.wires){
  const path=points(wire,state);
  for(const p of path)if(p.x<22-EPS||p.x>1298+EPS||p.y<48-EPS||p.y>1198+EPS)result.push(`${wire.id}: outside board at ${p.x},${p.y}`);
  for(let index=1;index<path.length;index++)for(const part of state.parts){
   if(intersects(path[index-1],path[index],part))result.push(`${wire.id} segment ${index-1}: under or within ${GAP} of ${part.id}`);
   for(const pin of B.pins(part))if(distanceToSegment(pin,path[index-1],path[index])<3-EPS)result.push(`${wire.id} segment ${index-1}: touches ${part.id}.${pin.n}`);
  }
 }
 return result;
}
const nodes=state=>state.wires.map(w=>[w.id,B.endpointNode(w.a,state),B.endpointNode(w.b,state)]);

test('independent geometry audit: every default jumper clears all rendered bodies, lead holes and board edges',()=>{
 const input=B.createStarter();
 assert(physicalFaults(input).length>0,'Fixture must contain genuine physical collisions');
 const routed=R.routeAll(input);
 assert.equal(routed.failures.length,0,JSON.stringify(routed.failures));
 assert.deepEqual(physicalFaults(routed.state),[]);
 assert(routed.relocated>=8,'The eight FPGA insertion points covered by its body must move');
});

test('routing preserves electrical endpoints, component values, four distinct common-pin resistors and the 555 clock',()=>{
 const input=B.createStarter(),before=B.clone(input),routed=R.routeAll(input).state,graph=B.analyze(routed);
 assert.deepEqual(input,before,'Routing must not mutate the source project');
 assert.deepEqual(routed.parts,before.parts,'Routing must not silently move or change components');
 assert.deepEqual(nodes(routed),nodes(before),'Only moves within the same conductive hole group are allowed');
 assert.equal(graph.shorts.length,0,JSON.stringify(graph.shorts));
 assert.equal(graph.opens.length,0,JSON.stringify(graph.opens));
 assert.equal(graph.clock,true);
 assert(!graph.issues.some(issue=>issue.hole),'No wire endpoint may share another wire or component pin hole');
 const connected=(part,pin)=>graph.uf.find(B.endpointNode({part,pin:String(pin)},routed));
 const ground=graph.uf.find('post:gnd');
 for(const [display,prefix]of [['DS1','T'],['DS2','U']]){
  assert.notEqual(connected(display,3),connected(display,8),'The two common pins keep separate input-side wiring');
  for(const common of [3,8]){
   const resistor=routed.parts.find(p=>p.id===`R${prefix}C${common}`);
   assert.equal(resistor.type,'resistor');assert.equal(resistor.value,'1kΩ');
   assert.equal(connected(display,common),connected(resistor.id,1));
   assert.notEqual(connected(display,common),ground);
   assert.equal(connected(resistor.id,2),ground);
  }
 }
 const dec={a:13,b:12,c:11,d:10,e:9,f:15,g:14},seg={a:1,b:2,c:4,d:5,e:6,f:7,g:9};
 for(const [decoder,display]of [['U4','DS1'],['U5','DS2']])for(const letter of 'abcdefg')assert.equal(connected(decoder,dec[letter]),connected(display,seg[letter]));
});

test('independent geometry handles all four rotations of every body shape, including horizontal bridge resistors',()=>{
 const variants=['mux','adc','timer','decoder','fpga','display','dip8','resistor','ceramic','electrolytic','led'];
 for(const type of variants)for(const bridge of type==='resistor'?[false,true]:[false])for(const rotation of [0,90,180,270]){
  const part={id:'P1',ref:'P1',type,rotation,bridge,x:660,y:650,value:'',nets:{},switches:Array(8).fill(false)};
  const box=body(part),center=toWorld({x:(box[0]+box[2])/2,y:(box[1]+box[3])/2},part);
  const input={schema:'cable-breadboard/v1',version:1,parts:[part],wires:[{id:'W1',a:{hole:'b0-30-0'},b:{hole:'b3-30-9'},net:'signal',color:'#224466',bends:[center]}]};
  const label=`${type}${bridge?' bridge':''} ${rotation}°`;
  assert(physicalFaults(input).length>0,label+' must intersect the obstacle before routing');
  const routed=R.routeAll(input);
  assert.equal(routed.failures.length,0,label+': '+JSON.stringify(routed.failures));
  assert.deepEqual(physicalFaults(routed.state),[],label);
  assert.deepEqual(nodes(routed.state),nodes(input),label+' endpoints changed conductor');
 }
});

test('moving a component over a wire reveals a collision and rerouting restores physical clearance without rewiring',()=>{
 const part={id:'U1',ref:'U1',type:'decoder',rotation:0,x:660,y:850,value:'',nets:{}};
 const input={schema:'cable-breadboard/v1',version:1,parts:[part],wires:[{id:'W1',a:{hole:'b0-30-0'},b:{hole:'b3-30-9'},net:'signal',color:'#224466',bends:[]}]};
 assert.deepEqual(physicalFaults(input),[]);
 input.parts[0].y=660;
 assert(physicalFaults(input).length>0);
 const repaired=R.routeAll(input);
 assert.equal(repaired.failures.length,0);
 assert.deepEqual(physicalFaults(repaired.state),[]);
 assert.deepEqual(nodes(repaired.state),nodes(input));
});
