'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const BB=require('../dist/model.js');
require('../dist/display-upgrade.js');
const fixture=require('./fixtures/layout-v1.json');
const legacy=()=>BB.clone(fixture);
const node=(state,id,pin)=>BB.endpointNode({part:id,pin:String(pin)},state);

test('legacy saved wiring upgrades to four separate common-pin resistors with a clean physical graph',()=>{
 const {state,migrated}=BB.migrateDisplayWiring(legacy());
 const result=BB.analyze(state);
 assert.equal(migrated,true);
 assert.equal(state.parts.length,33);
 assert.equal(result.nets.length,60);
 assert.equal(result.shorts.length,0,JSON.stringify(result.shorts));
 assert.equal(result.opens.length,0,JSON.stringify(result.opens));
 assert.equal(result.clock,true);
 assert(!state.parts.some(p=>/^R[TU][1-7]$/.test(p.id)));
 for(const [display,prefix]of [['DS1','T'],['DS2','U']])for(const pin of [3,8]){
  const resistor=state.parts.find(p=>p.id===`R${prefix}C${pin}`);
  assert.equal(resistor.value,'1kΩ');
  assert.equal(result.uf.find(node(state,display,pin)),result.uf.find(node(state,resistor.id,1)));
  assert.notEqual(result.uf.find(node(state,display,pin)),result.uf.find('post:gnd'));
  assert.equal(result.uf.find(node(state,resistor.id,2)),result.uf.find('post:gnd'));
 }
 const decoderPins={a:13,b:12,c:11,d:10,e:9,f:15,g:14},displayPins={a:1,b:2,c:4,d:5,e:6,f:7,g:9};
 for(const [decoder,display]of [['U4','DS1'],['U5','DS2']])for(const segment of 'abcdefg')assert.equal(result.uf.find(node(state,decoder,decoderPins[segment])),result.uf.find(node(state,display,displayPins[segment])));
});

test('upgrade retains unrelated component edits, custom wires and project metadata exactly',()=>{
 const state=legacy(),resistor=state.parts.find(p=>p.id==='R0');
 resistor.value='91kΩ';resistor.x+=14;resistor.note='我的修改';
 state.title='课堂接线修订';state.customCamera={x:20,y:40,k:.8};
 const wire={id:'WD1',a:{hole:'b0-60-0'},b:{hole:'b0-61-0'},net:'用户跳线',color:'#123456',bends:[{x:135,y:1111}]};
 state.wires.push(wire);
 const unrelatedParts=state.parts.filter(p=>!/^R[TU][1-7]$/.test(p.id)&&!['DS1','DS2','U4','U5'].includes(p.id));
 const {state:upgraded}=BB.migrateDisplayWiring(state);
 assert.deepEqual(upgraded.parts.filter(p=>unrelatedParts.some(q=>q.id===p.id)),unrelatedParts);
 assert.deepEqual(upgraded.wires.find(w=>w.id==='WD1'),wire);
 assert.equal(new Set(upgraded.wires.map(w=>w.id)).size,upgraded.wires.length);
 assert.equal(upgraded.title,state.title);
 assert.deepEqual(upgraded.customCamera,state.customCamera);
});

test('migration never mutates its input and applying it twice is idempotent',()=>{
 const input=legacy(),snapshot=BB.clone(input),first=BB.migrateDisplayWiring(input);
 assert.deepEqual(input,snapshot);
 const second=BB.migrateDisplayWiring(first.state);
 assert.equal(second.migrated,false);
 assert.deepEqual(second.state,first.state);
 assert.notEqual(second.state,first.state);
 assert.notEqual(second.state.parts,first.state.parts);
});

test('an already current starter is cloned without any rewiring',()=>{
 const input=BB.createStarter(),result=BB.migrateDisplayWiring(input);
 assert.equal(result.migrated,false);
 assert.deepEqual(result.state,input);
 assert.notEqual(result.state,input);
});

test('new leads never share an existing physical wire or component insertion hole',()=>{
 const state=legacy();
 state.wires.push({id:'custom-spare',a:{hole:'b2-25-3'},b:{hole:'b2-26-3'},net:'spare',color:'#123456',bends:[]});
 // This was formerly a segment wire hole, so the migration must either choose
 // another free tap or safely relocate its new resistors without deleting it.
 const {state:upgraded}=BB.migrateDisplayWiring(state),result=BB.analyze(upgraded);
 assert.deepEqual(upgraded.wires.find(w=>w.id==='custom-spare'),state.wires.at(-1));
 assert(!result.issues.some(i=>i.hole),'upgrade must not add duplicate insertions');
 assert.equal(result.shorts.length,0);
 assert.equal(result.opens.length,0);
});

test('unsafe custom use of an old display resistor reports an error without erasing edits',()=>{
 const state=legacy();
 state.wires.push({id:'custom-old-resistor',a:{part:'RT1',pin:'1'},b:{hole:'b0-60-0'},net:'custom',color:'#123456',bends:[]});
 const snapshot=BB.clone(state);
 assert.throws(()=>BB.migrateDisplayWiring(state),/无法自动升级显示接线.*custom-old-resistor/);
 assert.deepEqual(state,snapshot);
});
