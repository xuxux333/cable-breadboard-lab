'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const B=require('../dist/model.js');
const R=require('../dist/routing.js');
const wire=(id,a,b,bends=[])=>({id,a,b,bends,color:'#224466',net:'signal'});
const board=(parts=[],wires=[])=>({schema:'cable-breadboard/v1',version:1,parts,wires});
const chip=(extra={})=>({id:'U1',ref:'U1',type:'decoder',x:197,y:418,rotation:0,value:'',nets:{},...extra});
const groups=state=>state.wires.map(w=>[w.id,B.endpointNode(w.a,state),B.endpointNode(w.b,state)]);

test('automatic elbows avoid the complete IC body and retain exact electrical endpoints',()=>{
 const input=board([chip()],[wire('W1',{hole:'b0-13-0'},{hole:'b0-13-9'})]);
 const before=B.clone(input),r=R.routeAll(input);
 assert(R.inspect(input).conflicts.some(c=>c.part==='U1'));
 assert.equal(r.failures.length,0);
 assert.equal(r.conflicts.length,0);
 assert.equal(r.changed,1);
 assert.deepEqual(groups(r.state),groups(input));
 assert.deepEqual(input,before);
 assert(r.state.wires[0].bends.length>=2);
 for(const p of R.wireVertices(r.state.wires[0],r.state))assert(p.x>=R.BOARD.minX&&p.x<=R.BOARD.maxX&&p.y>=R.BOARD.minY&&p.y<=R.BOARD.maxY);
});

test('a hidden insertion hole relocates within its own five-hole conductor and avoids occupied pins',()=>{
 const display=chip({type:'display',x:197,y:418,id:'DS1',ref:'DS1'});
 const input=board([display],[wire('W1',{hole:'b0-11-4'},{hole:'b0-20-0'})]);
 assert(R.inspect(input).blockedEndpoints.length>0);
 const result=R.routeAll(input);
 assert.equal(result.failures.length,0);
 assert.equal(result.relocated,1);
 assert.notEqual(result.state.wires[0].a.hole,input.wires[0].a.hole);
 assert.deepEqual(groups(result.state),groups(input));
 assert.equal(R.inspect(result.state).conflicts.length,0);
 assert.equal(B.analyze(result.state).issues.filter(i=>i.text.includes('重复插入')).length,0);
});

test('rotated part bounds match its rendered body and block a manually drawn diagonal',()=>{
 const part=chip({rotation:90}),bounds=R.partBounds(part,0);
 assert.equal(Math.round(bounds.minX),90);
 assert.equal(Math.round(bounds.maxX),206);
 assert.equal(Math.round(bounds.minY),403);
 assert.equal(Math.round(bounds.maxY),433);
 const input=board([part],[wire('W1',{hole:'b0-8-0'},{hole:'b0-14-9'},[{x:135,y:380},{x:200,y:470}])]);
 assert(R.inspect(input).conflicts.some(c=>c.part==='U1'));
 assert.equal(R.routeAll(input).conflicts.length,0);
});

test('a blocked direct-pin endpoint is reported honestly without changing the jumper',()=>{
 const display=chip({type:'display',id:'DS1',ref:'DS1'});
 const input=board([display],[wire('W1',{part:'DS1',pin:'1'},{hole:'b0-20-0'})]);
 const result=R.routeWire(input,input.wires[0]);
 assert.equal(result.ok,false);
 assert.match(result.reason,/固定/);
 assert.deepEqual(result.wire,input.wires[0]);
});

test('a fully occupied bus is not moved to another electrical group',()=>{
 const display=chip({type:'display',id:'DS1',ref:'DS1'}),wires=[wire('W1',{hole:'b0-11-4'},{hole:'b0-20-0'})];
 for(let c=0;c<4;c++)wires.push(wire('WB'+c,{hole:`b0-11-${c}`},{hole:`b0-${30+c}-0`}));
 const input=board([display],wires),result=R.routeWire(input,wires[0]);
 assert.equal(result.ok,false);
 assert.match(result.reason,/没有无遮挡的空孔/);
 assert.deepEqual(groups(input),groups(board([display],wires)));
});

test('relocating a hidden end never takes the same jumper\'s other insertion hole',()=>{
 const display=chip({type:'display',id:'DS1',ref:'DS1'}),wires=[wire('W1',{hole:'b0-11-4'},{hole:'b0-11-3'})];
 for(let c=0;c<3;c++)wires.push(wire('WB'+c,{hole:`b0-11-${c}`},{hole:`b0-${30+c}-0`}));
 const input=board([display],wires),result=R.routeWire(input,wires[0]);
 assert.equal(result.ok,false);
 assert.match(result.reason,/没有无遮挡的空孔/);
 assert.deepEqual(result.wire,wires[0]);
});

test('a route beside the body still avoids occupied component pin holes',()=>{
 const input=board([chip()],[wire('W1',{hole:'b0-7-4'},{hole:'b0-20-4'})]);
 const conflicts=R.inspect(input).conflicts;
 assert(conflicts.some(c=>c.kind==='pin-crossing'));
 assert(!conflicts.some(c=>c.kind==='body-crossing'));
 const result=R.routeAll(input);
 assert.equal(result.conflicts.length,0);
 assert.equal(result.failures.length,0);
 assert.deepEqual(groups(result.state),groups(input));
});

test('a wall across the entire allowed board reports no path and keeps existing edits',()=>{
 const parts=[];
 for(let y=-100;y<1400;y+=250)parts.push(chip({id:'U'+y,ref:'U'+y,type:'fpga',x:650,y}));
 const input=board(parts,[wire('W1',{hole:'b0-20-0'},{hole:'b3-20-9'})]);
 const result=R.routeWire(input,input.wires[0]);
 assert.equal(result.ok,false);
 assert.match(result.reason,/没有可避开/);
 assert.deepEqual(result.wire,input.wires[0]);
});

test('default routing preserves safe manual bends, insulated crossings remain unconnected, and a second pass is idempotent',()=>{
 const input=board([],[wire('W1',{hole:'b0-0-0'},{hole:'b1-0-0'},[{x:120,y:250},{x:406,y:250}]),wire('W2',{hole:'b0-1-1'},{hole:'b0-4-1'})]);
 const first=R.routeAll(input),second=R.routeAll(first.state);
 assert.equal(first.changed,0);
 assert.deepEqual(first.state.wires,input.wires);
 assert.equal(second.changed,0);
 assert.deepEqual(second.state,first.state);
 const result=B.analyze(first.state);
 assert.notEqual(result.uf.find('b0:0:L'),result.uf.find('b0:1:L'));
});

test('the complete 33-part starter routes without physical or electrical faults and retains the 555 clock',()=>{
 const input=B.createStarter(),before=groups(input),result=R.routeAll(input),after=B.analyze(result.state);
 assert.equal(input.parts.length,33);
 assert.equal(input.wires.length,124);
 assert.equal(result.failures.length,0,JSON.stringify(result.failures));
 assert.equal(result.conflicts.length,0,JSON.stringify(result.conflicts));
 assert.deepEqual(groups(result.state),before);
 assert.equal(after.shorts.length,0,JSON.stringify(after.shorts));
 assert.equal(after.opens.length,0,JSON.stringify(after.opens));
 assert.equal(after.clock,true);
 assert.equal(R.routeAll(result.state).changed,0);
});
