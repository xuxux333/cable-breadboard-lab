const {test}=require('node:test');
const assert=require('node:assert/strict');
const {LayoutStore,esc,unmodifiedShortcut,insertBend,LIMITS}=require('../dist/app.js');
const B=require('../dist/model.js');

function memoryStorage(){
 const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}

test('damaged local data stays recoverable and cannot be silently overwritten',()=>{
 const s=memoryStorage(),raw='{"parts":broken';s.setItem('layout',raw);const store=new LayoutStore(()=>s,'layout');
 assert.equal(store.load(JSON.parse),null);assert.equal(store.protected,true);assert.match(store.error,/原始内容已备份/);
 assert.equal(store.backups().length,1);assert.equal(store.backups()[0].raw,raw);
 assert.throws(()=>store.save({parts:[]}),/原存档受保护/);assert.equal(s.getItem('layout'),raw);
 store.accept();store.save({parts:[]});assert.equal(s.getItem('layout'),'{"parts":[]}');assert.equal(store.backups()[0].raw,raw);
});

test('quota failure preserves the damaged original and keeps writes protected',()=>{
 const s=memoryStorage();s.setItem('layout','invalid');s.setItem=()=>{throw Error('quota');};const store=new LayoutStore(()=>s,'layout');
 assert.equal(store.load(JSON.parse),null);assert.match(store.error,/备份失败/);assert.equal(s.getItem('layout'),'invalid');
 assert.throws(()=>store.save({}),/原存档受保护/);
});

test('disabled storage produces a visible reason without throwing during startup',()=>{
 const store=new LayoutStore(()=>{throw Error('blocked');},'layout');assert.equal(store.load(JSON.parse),null);
 assert.equal(store.protected,true);assert.match(store.error,/无法读取浏览器存档.*blocked/);
});

test('an empty stored string is damaged data rather than an absent layout',()=>{
 const s=memoryStorage();s.setItem('layout','');const store=new LayoutStore(()=>s,'layout');assert.equal(store.load(JSON.parse),null);
 assert.equal(store.protected,true);assert.equal(store.backups()[0].raw,'');assert.throws(()=>store.save({}),/受保护/);
});

test('backup retention is bounded while retaining newest data and the current saved text',()=>{
 const s=memoryStorage(),store=new LayoutStore(()=>s,'layout');store.save({revision:1});
 for(let i=0;i<12;i++)store.backup('snapshot-'+i,'import');
 assert.equal(store.backups().length,5);assert.ok(store.backups().some(item=>item.raw==='snapshot-11'));
 assert.equal(s.getItem('layout'),'{"revision":1}');assert.equal(store.raw,'{"revision":1}');
});

test('legacy backup keys cannot prune a newly saved damaged-data backup',()=>{
 const s=memoryStorage();for(let i=0;i<5;i++)s.setItem('layout-before-display-v2-'+(1700000000000+i),'old-'+i);
 s.setItem('layout','broken');const store=new LayoutStore(()=>s,'layout');store.load(JSON.parse);
 assert.equal(store.backups().length,5);assert.equal(store.backups()[0].raw,'broken');assert.equal(s.getItem('layout'),'broken');
});

test('attribute escaping contains imported quotes and markup',()=>{
 assert.equal(esc('U1" onmouseover="x<>&\''),'U1&quot; onmouseover=&quot;x&lt;&gt;&amp;&#39;');
});

test('browser and operating-system modifier chords are not plain editor shortcuts',()=>{
 assert.equal(unmodifiedShortcut({}),true);
 for(const key of ['ctrlKey','metaKey','altKey'])assert.equal(unmodifiedShortcut({[key]:true}),false);
 assert.equal(unmodifiedShortcut({shiftKey:true}),true);
});

test('the 256th editable bend survives validation and a 257th is rejected without mutation',()=>{
 const state=B.createStarter(),wire=state.wires[0],a=B.epPoint(wire.a,state),b=B.epPoint(wire.b,state);
 const points=[a,...Array.from({length:255},(_,i)=>({x:350+i%17*7,y:400+Math.floor(i/17)*7})),b];
 const bends=insertBend(points,{x:450,y:500});assert.equal(bends.length,LIMITS.bends);wire.bends=bends;
 assert.doesNotThrow(()=>B.validateFile(JSON.parse(JSON.stringify(state))));
 const before=JSON.stringify(wire.bends);assert.equal(insertBend([a,...wire.bends,b],{x:460,y:500}),null);
 assert.equal(JSON.stringify(wire.bends),before);assert.equal(points.length,257);
});

test('automatic path vertices are counted before materializing manual bends',()=>{
 const points=Array.from({length:258},(_,i)=>({x:100+i*7,y:i%2?300:314}));
 assert.equal(insertBend(points,{x:200,y:300}),null);assert.equal(points.length,258);
});

test('editor part and wire limits match the model file format boundaries',()=>{
 const state=B.createStarter(),part=state.parts[0],wire=state.wires[0];
 state.parts=Array.from({length:LIMITS.parts},(_,i)=>({...part,id:'P'+i,ref:'P'+i}));
 state.wires=Array.from({length:LIMITS.wires},(_,i)=>({...wire,id:'W'+i}));
 assert.doesNotThrow(()=>B.validateFile(state));
 assert.throws(()=>B.validateFile({...state,parts:[...state.parts,{...part,id:'overflow',ref:'overflow'}]}),/200/);
 assert.throws(()=>B.validateFile({...state,wires:[...state.wires,{...wire,id:'overflow'}]}),/800/);
});
