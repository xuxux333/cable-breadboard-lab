'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const BB=require('../dist/model.js');
require('../dist/display-upgrade.js');
const empty=()=>({schema:'cable-breadboard/v1',version:1,parts:[],wires:[]});
const part=(type='resistor',extra={})=>({id:'P1',ref:'P1',type,x:197,y:558,rotation:0,value:'',nets:{},...extra});
const wire=(extra={})=>({id:'W1',a:{hole:'b0-0-0'},b:{hole:'b0-10-0'},bends:[],color:'#224466',...extra});
const onePart=()=>({...empty(),parts:[part()]});
const oneWire=()=>({...empty(),wires:[wire()]});

test('legacy and current exported layouts retain every existing field through validation',()=>{
 for(const name of ['layout-v1','layout-v2']){
  const fixture=require(`./fixtures/${name}.json`);
  assert.deepEqual(BB.validateFile(fixture),fixture);
 }
});

test('part and wire ids reject markup, dataset separators, control characters and excessive length',()=>{
 for(const id of ['', 'x" onmouseover="alert(1)', 'bad:id', 'x y', 'x\n', 'x\u0000', 'x'.repeat(81)]){
  for(const make of [onePart,oneWire]){
   const state=make();(state.parts[0]||state.wires[0]).id=id;
   assert.throws(()=>BB.validateFile(state),undefined,JSON.stringify(id));
  }
 }
 for(const id of ['user-wire_01','Z'.repeat(80)]){
  const state=oneWire();state.wires[0].id=id;
  assert.equal(BB.validateFile(state).wires[0].id,id);
 }
});

test('display references are unique, bounded and free of invisible characters',()=>{
 for(const ref of ['', ' ', ' U1', 'U1 ', 'x'.repeat(25), 'U1\n', 'U1\u007f']){
  const state=onePart();state.parts[0].ref=ref;
  assert.throws(()=>BB.validateFile(state));
 }
 const state=onePart();state.parts.push(part('resistor',{id:'P2'}));
 assert.throws(()=>BB.validateFile(state));
 state.parts[1].ref='自定义电阻';
 assert.doesNotThrow(()=>BB.validateFile(state));
});

test('pin endpoints accept integers and canonical decimal strings without phantom connections',()=>{
 const state=onePart();
 state.parts[0].x=120;
 for(const pin of ['1',1,'2',2]){
  state.wires=[wire({a:{part:'P1',pin}})];
  const imported=BB.validateFile(state),expected=BB.pins(state.parts[0]).find(p=>p.n===String(pin));
  assert.equal(BB.epPoint(imported.wires[0].a,imported).n,expected.n);
  assert.equal(BB.endpointNode(imported.wires[0].a,imported),BB.nearest(expected.x,expected.y,1).group);
 }
 for(const pin of ['01','1.0',' 1','+1','1e0','1\n',0,-1,1.5,NaN,Infinity,'3']){
  state.wires=[wire({a:{part:'P1',pin}})];
  assert.throws(()=>BB.validateFile(state),undefined,String(pin));
  assert.equal(BB.epPoint(state.wires[0].a,state),null);
  assert.equal(BB.endpointNode(state.wires[0].a,state),null);
  assert(BB.analyze(state).issues.some(i=>i.wire==='W1'&&i.text.includes('无效端点')));
 }
});

test('pin net and name maps validate canonical in-range keys, types and bounded text',()=>{
 for(const key of ['nets','pinNames']){
  for(const value of [null,[],1,'bad',{'01':'A'},{'0':'A'},{'3':'A'},JSON.parse('{"__proto__":"A"}'),{'1':false},{'1':'x'.repeat(101)},{'1':'A\n'}]){
   const state=onePart();state.parts[0][key]=value;
   assert.throws(()=>BB.validateFile(state),undefined,`${key}: ${JSON.stringify(value)}`);
  }
  const state=onePart();state.parts[0][key]={'1':'x'.repeat(100),'2':'自定义'};
  assert.doesNotThrow(()=>BB.validateFile(state));
 }
});

test('bounded values, wire labels, bend counts and boolean flags reject oversized input',()=>{
 for(const mutate of [
  s=>s.parts[0].value='x'.repeat(101),
  s=>s.parts[0].locked='yes',s=>s.parts[0].bridge=1,
  s=>s.parts[0].rotation=null,s=>s.parts[0].switches=null,
  s=>s.wires[0].net='x'.repeat(101),
  s=>s.wires[0].bends=Array(257).fill({x:100,y:100}),
 ]){
  const state={...onePart(),wires:[wire()]};mutate(state);
  assert.throws(()=>BB.validateFile(state));
 }
 const state={...onePart(),wires:[wire({net:'x'.repeat(100),bends:Array(256).fill({x:100,y:100})})]};
 state.parts[0].value='x'.repeat(100);state.parts[0].locked=true;state.parts[0].bridge=false;
 assert.doesNotThrow(()=>BB.validateFile(state));
});

test('all-pin snapping finds isolated dual-row placements for every nearby terminal column',()=>{
 for(const type of ['mux','adc','timer','decoder','fpga','display','dip8']){
  const original=part(type),span=type==='fpga'?98:42;
  for(let col=0;col<10;col++){
   const target=BB.holeMap.get(`b0-20-${col}`);
   const snapped=BB.trySnapPart(original,target.x+span/2,target.y);
   assert(snapped,`${type}, col ${col} should find a complete placement`);
   const hs=BB.pins(snapped).map(p=>BB.nearest(p.x,p.y,1));
   assert(hs.every(Boolean));
   assert.equal(new Set(hs.map(h=>h.group)).size,BB.library[type].count,'opposite legs must not share a strip');
   assert.equal(BB.mounted(snapped),true);
  }
 }
});

test('a dual-row package with all legs in one side of the trench is not a valid mount',()=>{
 const unsafe=part('decoder',{x:141,y:558});
 assert(BB.pins(unsafe).every(p=>BB.nearest(p.x,p.y,1)),'fixture legs really land in holes');
 assert.equal(BB.mounted(unsafe),false);
 const snapped=BB.trySnapPart(unsafe,unsafe.x,unsafe.y);
 assert.equal(BB.mounted(snapped),true);
 assert.notEqual(snapped.x,unsafe.x);
});

test('snapping failure is explicit and never changes the original placement',()=>{
 const original=part('decoder'),snapshot=BB.clone(original);
 assert.equal(BB.trySnapPart(original,-5000,-5000),null);
 assert.deepEqual(BB.snapPart(original,-5000,-5000),snapshot);
 assert.deepEqual(original,snapshot);
});

test('dual-row rotation uses only 0 and 180 degrees and preserves its mounting center at a board edge',()=>{
 for(const type of ['mux','adc','timer','decoder','fpga','display','dip8']){
  const original=part(type,{y:BB.Y}),snapshot=BB.clone(original);
  assert.deepEqual(BB.allowedRotations(original),[0,180]);
  assert.equal(BB.rotatePart(original,90),null);
  assert.equal(BB.trySnapPart({...original,rotation:270},original.x,original.y),null);
  assert.equal(BB.mounted({...original,rotation:90}),false);
  const rotated=BB.rotatePart(original,180);
  assert(rotated&&BB.mounted(rotated));
  const before=BB.pins(original),after=BB.pins(rotated);
  const center=ps=>({x:ps.reduce((n,p)=>n+p.x,0)/ps.length,y:ps.reduce((n,p)=>n+p.y,0)/ps.length});
  assert.deepEqual(center(after),center(before));
  assert.deepEqual(BB.rotatePart(rotated,0),original);
  assert.deepEqual(original,snapshot);
 }
 assert.deepEqual(BB.allowedRotations(part('resistor')),[0,90,180,270]);
});

test('renaming a timer id and display reference cannot remove clock continuity',()=>{
 const state=BB.createStarter(),timer=state.parts.find(p=>p.type==='timer');
 timer.ref='计时器';timer.id='renamed-timer';
 for(const w of state.wires)for(const ep of [w.a,w.b])if(ep.part==='U3')ep.part=timer.id;
 assert.equal(BB.analyze(state).clock,true);
});

test('closed switch permissions follow contact pairs after signal renaming',()=>{
 const state=BB.createStarter();
 for(const p of state.parts)for(const [pin,net]of Object.entries(p.nets||{}))if(net.startsWith('SEL_'))p.nets[pin]=net.replace('SEL_','CUSTOM_');
 const sw=state.parts.find(p=>p.type==='dip8');sw.switches=Array(8).fill(true);
 assert.equal(BB.analyze(state).shorts.length,0);
 state.wires.push(wire({id:'bad-selector',a:{part:sw.id,pin:1},b:{part:sw.id,pin:2}}));
 assert(BB.analyze(state).shorts.some(i=>i.text.includes('误连')&&i.text.includes('CUSTOM_A')&&i.text.includes('CUSTOM_B')),'closed contacts cannot hide an accidental jumper');
});

test('a closed switch can never exempt a direct supply-to-ground short',()=>{
 const state={...empty(),parts:[part('dip8',{switches:[true,false,false,false,false,false,false,false],nets:{1:'+5V',16:'GND'}})]};
 assert(BB.analyze(state).shorts.some(i=>i.text.includes('+5V')&&i.text.includes('GND')));
});

test('legacy display migration reports missing network metadata without mutating the saved layout',()=>{
 const fixture=require('./fixtures/layout-v1.json');
 for(const id of ['DS1','DS2','U4','U5']){
  const state=BB.clone(fixture);delete state.parts.find(p=>p.id===id).nets;
  const snapshot=BB.clone(state);
  assert.throws(()=>BB.migrateDisplayWiring(state),new RegExp(`无法自动升级显示接线.*${id}.*缺少引脚网络数据`));
  assert.deepEqual(state,snapshot);
 }
});
