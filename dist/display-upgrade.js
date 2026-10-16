/* Upgrade only the old display wiring. Keep the user's other edits intact. */
(function (root) {
 'use strict';
 const B=root.BB;
 if(!B)throw Error('显示接线升级需要先加载面包板模型');
 const legacyPattern=/^R([TU])([1-7])$/;
 const segmentPattern=/^[TU]_[a-g](?:_LED)?$/;
 const decoderPins={a:13,b:12,c:11,d:10,e:9,f:15,g:14};
 const displayPins={a:1,b:2,c:4,d:5,e:6,f:7,g:9};
 function migrateDisplayWiring(input){
  const state=B.validateFile(input);
  const oldResistors=state.parts.filter(p=>legacyPattern.test(p.id));
  if(!oldResistors.length)return {state,migrated:false,reason:'显示接线无需升级'};
  const fail=message=>{throw Error('无法自动升级显示接线：'+message+'。原方案已保留，请先导出备份后检查显示区');};
  const oldById=new Map(oldResistors.map(p=>[p.id,p]));
  for(const part of oldResistors){
   const [,prefix,index]=part.id.match(legacyPattern),segment='abcdefg'[Number(index)-1];
   if(part.type!=='resistor'||part.nets?.['1']!==`${prefix}_${segment}`||part.nets?.['2']!==`${prefix}_${segment}_LED`)fail(`${part.id} 已改作其他用途`);
  }
  const modules=[{prefix:'T',display:'DS1',decoder:'U4',bank:2},{prefix:'U',display:'DS2',decoder:'U5',bank:3}];
  const commonNodes=new Set();
  for(const module of modules){
   const display=state.parts.find(p=>p.id===module.display),decoder=state.parts.find(p=>p.id===module.decoder);
   if(display?.type!=='display'||decoder?.type!=='decoder')fail(`${module.display} 或 ${module.decoder} 缺失或型号已更改`);
   if(!B.mounted(display)||!B.mounted(decoder))fail(`${module.display} 或 ${module.decoder} 尚未插入有效孔位`);
   module.displayPart=display;module.decoderPart=decoder;
   for(const pin of [3,8])commonNodes.add(B.endpointNode({part:display.id,pin:String(pin)},state));
   for(const pin of [3,8])if(state.parts.some(p=>p.id===`R${module.prefix}C${pin}`))fail(`器件编号 R${module.prefix}C${pin} 已被占用`);
  }
  // Only the tagged old segment jumpers and old common-to-ground leads belong
  // to this replacement. Unrelated wires retain their IDs, bends and endpoints.
  state.wires=state.wires.filter(w=>{
   if(segmentPattern.test(w.net||''))return false;
   if([w.a,w.b].some(ep=>oldById.has(ep.part)))fail(`跳线 ${w.id} 使用了旧段电阻的自定义连接`);
   return !(w.net==='GND'&&[w.a,w.b].some(ep=>commonNodes.has(B.endpointNode(ep,state))));
  });
  state.parts=state.parts.filter(p=>!oldById.has(p.id));
  for(const module of modules){
   const {prefix,displayPart,decoderPart}=module;
   for(const segment of 'abcdefg'){
    displayPart.nets[String(displayPins[segment])]=`${prefix}_${segment}`;
    decoderPart.nets[String(decoderPins[segment])]=`${prefix}_${segment}`;
   }
   displayPart.nets['3']=`${prefix}_COM3`;
   displayPart.nets['8']=`${prefix}_COM8`;
  }
  const graph=B.analyze(state).uf,busy=new Set();
  const physicalHole=ep=>{
   if(ep.hole)return ep.hole;
   const p=ep.part&&B.epPoint(ep,state);
   return p&&B.nearest(p.x,p.y,1)?.id;
  };
  for(const part of state.parts)for(const pin of B.pins(part)){const h=B.nearest(pin.x,pin.y,1);if(h)busy.add(h.id);}
  for(const wire of state.wires)for(const ep of [wire.a,wire.b]){const h=physicalHole(ep);if(h)busy.add(h);}
  let records=[];
  const refreshRecords=()=>{
   records=state.parts.flatMap(part=>B.pins(part).filter(p=>p.net&&!p.net.startsWith('NC')).map(p=>({node:B.nearest(p.x,p.y,1)?.group||`pin:${part.id}:${p.n}`,net:p.net})));
   for(const post of B.posts)if(post.id!=='aux')records.push({node:'post:'+post.id,net:post.id==='gnd'?'GND':post.id==='v5'?'+5V':'DISPLAY_VDD'});
  };
  refreshRecords();
  const netsAt=node=>new Set(records.filter(r=>graph.find(r.node)===graph.find(node)).map(r=>r.net));
  const compatible=(node,net)=>[...netsAt(node)].every(n=>n===net);
  const groupFree=node=>(B.groupMap.get(node)||[]).filter(h=>!busy.has(h.id));
  const fitResistor=part=>{
   if(!B.mounted(part))return false;
   const pins=B.pins(part),holes=pins.map(p=>B.nearest(p.x,p.y,1));
   if(holes.some(h=>busy.has(h.id))||graph.find(holes[0].group)===graph.find(holes[1].group))return false;
   return holes.every((h,i)=>groupFree(h.group).length>=2&&compatible(h.group,pins[i].net));
  };
  for(const module of modules)for(const [index,pin]of [3,8].entries()){
   const id=`R${module.prefix}C${pin}`,part={id,ref:id,type:'resistor',value:'1kΩ',rotation:0,bridge:true,nets:{'1':`${module.prefix}_COM${pin}`,'2':'GND'}};
   const previous=oldById.get(`R${module.prefix}${index+1}`),candidates=[];
   if(previous)candidates.push({...part,x:previous.x,y:previous.y,rotation:previous.rotation||0});
   for(const row of [25+index,...Array.from({length:B.ROWS},(_,i)=>i)])candidates.push({...part,x:197+module.bank*286,y:B.Y+row*B.P});
   const placed=candidates.find(fitResistor);
   if(!placed)fail(`${id} 周围没有可用且电气隔离的孔位`);
   state.parts.push(placed);
   for(const p of B.pins(placed))busy.add(B.nearest(p.x,p.y,1).id);
   refreshRecords();
  }
  const usedIds=new Set(state.wires.map(w=>w.id));
  let wireNo=0;
  const newId=()=>{let id;do{id='WD'+(++wireNo);}while(usedIds.has(id));usedIds.add(id);return id;};
  const pointOf=(part,pin)=>B.pins(state.parts.find(p=>p.id===part)).find(p=>p.n===String(pin));
  const holeOf=p=>B.nearest(p.x,p.y,1);
  const tap=(node,prefer)=>{
   const h=groupFree(node).sort((a,b)=>Math.hypot(a.x-prefer.x,a.y-prefer.y)-Math.hypot(b.x-prefer.x,b.y-prefer.y))[0];
   if(!h)fail(`${node} 没有空闲插孔`);
   busy.add(h.id);return {hole:h.id};
  };
  const connect=(a,b,net)=>{
   const an=holeOf(a).group,bn=holeOf(b).group;
   if(!compatible(an,net)||!compatible(bn,net))fail(`${net} 的孔排已有其他电气连接`);
   if(graph.find(an)===graph.find(bn))return;
   const wire={id:newId(),a:tap(an,b),b:tap(bn,a),net,color:B.colorFor(net),bends:[]};
   state.wires.push(wire);graph.join(an,bn);
  };
  for(const module of modules){
   for(const segment of 'abcdefg')connect(pointOf(module.decoder,decoderPins[segment]),pointOf(module.display,displayPins[segment]),`${module.prefix}_${segment}`);
   for(const pin of [3,8]){
    const id=`R${module.prefix}C${pin}`;
    connect(pointOf(module.display,pin),pointOf(id,1),`${module.prefix}_COM${pin}`);
    const p=pointOf(id,2),groundNode=graph.find('post:gnd');
    const rail=[...B.groupMap.entries()].filter(([node])=>/^r\d+:0:/.test(node)&&graph.find(node)===groundNode).flatMap(([,holes])=>holes).filter(h=>!busy.has(h.id)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
    if(!rail)fail(`${id} 找不到已接地的空闲电源轨插孔`);
    connect(p,rail,'GND');
   }
  }
  state.layoutRevision=Math.max(2,Number(state.layoutRevision)||0);
  state.displayLimit='per-common-pin';
  return {state,migrated:true};
 }
 B.migrateDisplayWiring=migrateDisplayWiring;
 if(typeof module!=='undefined')module.exports=migrateDisplayWiring;
})(typeof window!=='undefined'?window:globalThis);
