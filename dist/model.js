/* Physical breadboard model. No component is treated as an ideal wire. */
(function (root) {
 'use strict';
 const P=14, W=1320, H=1220, Y=278, ROWS=63;
 const holes=[], holeMap=new Map(), groupMap=new Map();
 const add=(id,x,y,group,label)=>{const h={id,x,y,group,label};holes.push(h);holeMap.set(id,h);if(!groupMap.has(group))groupMap.set(group,[]);groupMap.get(group).push(h);};
 for(let b=0;b<4;b++)for(let r=0;r<ROWS;r++)for(let c=0;c<10;c++){
  const x=120+b*286+(c<5?c*P:98+(c-5)*P);
  add(`b${b}-${r}-${c}`,x,Y+r*P,`b${b}:${r}:${c<5?'L':'R'}`,`${b+1}${String.fromCharCode(65+c)}${r+1}`);
 }
 for(let b=0;b<5;b++)for(let s=0;s<2;s++)for(let k=0;k<50;k++){
  const r=k+Math.floor(k/5),x=76+b*286+s*14;
  add(`r${b}-${s}-${k}`,x,Y+r*P,`r${b}:${s}:${Math.floor(k/25)}`,`电源轨${b+1}${s?'+':'−'} ${k<25?'上':'下'}段 ${k+1}`);
 }
 for(let rail=0;rail<4;rail++)for(let k=0;k<50;k++){
  add(`t${rail}-${k}`,120+k*14+Math.floor(k/5)*28,177+rail*24,`t${rail}:${Math.floor(k/25)}`,`顶轨${rail+1} ${k<25?'左':'右'}段 ${k+1}`);
 }
 const posts=[{id:'gnd',x:120,y:82,name:'GND',color:'#242a35'},{id:'v5',x:230,y:82,name:'+5V',color:'#c64542'},{id:'aux',x:340,y:82,name:'备用',color:'#368d76'},{id:'vdisp',x:450,y:82,name:'显示电源',color:'#bc9636'}];
 const library={
  mux:{name:'CD4051BE',desc:'8 选 1 模拟开关 · PDIP-16',kind:'dip',count:16,names:['Y4','Y6','COM','Y7','Y5','INH','VEE','VSS','C','B','A','Y3','Y0','Y1','Y2','VDD'],source:'https://www.ti.com/lit/ds/symlink/cd4051b.pdf'},
  adc:{name:'ADC0804',desc:'8 位模数转换器 · PDIP-20',kind:'dip',count:20,names:['/CS','/RD','/WR','CLK IN','/INTR','VIN+','VIN−','AGND','VREF/2','DGND','DB7','DB6','DB5','DB4','DB3','DB2','DB1','DB0','CLK R','VCC'],source:'https://www.ti.com/lit/ds/symlink/adc0804-n.pdf'},
  timer:{name:'NE555',desc:'系统时钟 · PDIP-8',kind:'dip',count:8,names:['GND','TRIG','OUT','RESET','CONT','THRES','DISCH','VCC'],source:'https://www.ti.com/lit/ds/symlink/ne555.pdf'},
  decoder:{name:'CD4511BE',desc:'BCD 译码驱动 · PDIP-16',kind:'dip',count:16,names:['B','C','/LT','/BI','LE','D','A','VSS','e','d','c','b','a','g','f','VDD'],source:'https://www.ti.com/lit/ds/symlink/cd4511b.pdf'},
  fpga:{name:'XC3S50AN',desc:'40 脚接口示意 · 非芯片封装',kind:'fpga',count:40},
  display:{name:'C392 共阴数码管',desc:'3、8 脚各经 1kΩ 接地 · 段脚示意',kind:'display',count:10,names:['a','b','COM3','c','d','e','f','COM8','g','dp']},
  dip8:{name:'8 位拨码开关',desc:'SPST × 8 · 使用前三位',kind:'switch',count:16},
  resistor:{name:'轴向电阻',desc:'色环电阻 · 可修改阻值',kind:'resistor',count:2},
  ceramic:{name:'瓷片电容',desc:'径向引脚 · 可修改容量',kind:'capacitor',count:2},
  electrolytic:{name:'电解电容',desc:'极性电容 · 标注正负极',kind:'electrolytic',count:2},
  led:{name:'发光二极管',desc:'5 mm LED · 标注 A / K',kind:'led',count:2}
 };
 function localPins(part){
  const d=library[part.type],out=[];
  if(['dip','fpga','switch','display'].includes(d.kind)){
   const n=d.count/2,span=d.kind==='fpga'?98:42;
   for(let i=0;i<n;i++){out.push({n:String(i+1),x:-span/2,y:i*P});out.push({n:String(d.count-i),x:span/2,y:i*P});}
  }else if(part.type==='resistor'&&part.bridge){out.push({n:'1',x:-21,y:0},{n:'2',x:21,y:0});}
  else {out.push({n:'1',x:0,y:0},{n:'2',x:0,y:part.type==='resistor'?42:28});}
  return out;
 }
 function pins(part){const a=(part.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return localPins(part).map(p=>({...p,part:part.id,x:Math.round((part.x+p.x*c-p.y*s)*100)/100,y:Math.round((part.y+p.x*s+p.y*c)*100)/100,name:part.pinNames?.[p.n]||library[part.type].names?.[Number(p.n)-1]||`S${p.n}`,net:part.nets?.[p.n]||null}));}
 function nearest(x,y,max=11){let best=null,dist=max;for(const h of holes){const d=Math.hypot(h.x-x,h.y-y);if(d<dist){best=h;dist=d;}}return best;}
 function mounted(part){return pins(part).every(p=>!!nearest(p.x,p.y,1));}
 function snapPart(part,x,y){const p0=pins({...part,x,y})[0],h=nearest(p0.x,p0.y,1000);if(!h)return {...part,x,y};return {...part,x:x+h.x-p0.x,y:y+h.y-p0.y};}
 function epPoint(ep,state){if(ep.hole)return holeMap.get(ep.hole)||null;if(ep.post)return posts.find(p=>p.id===ep.post)||null;if(ep.part){const c=state.parts.find(c=>c.id===ep.part);return c?pins(c).find(p=>p.n===String(ep.pin))||null:null;}return null;}
 function endpointNode(ep,state){if(ep.hole)return holeMap.get(ep.hole)?.group||null;if(ep.post)return posts.some(p=>p.id===ep.post)?'post:'+ep.post:null;if(ep.part){const p=epPoint(ep,state),h=p&&nearest(p.x,p.y,1);return h?.group||`pin:${ep.part}:${ep.pin}`;}return null;}
 class Union{constructor(){this.map=new Map();}find(a){if(!this.map.has(a))this.map.set(a,a);if(this.map.get(a)!==a)this.map.set(a,this.find(this.map.get(a)));return this.map.get(a);}join(a,b){if(a&&b)this.map.set(this.find(a),this.find(b));}}
 function analyze(state){
  const uf=new Union(),issues=[],occupied=new Map(),pinRecords=[];
  for(const g of groupMap.keys())uf.find(g);
  for(const part of state.parts){if(!mounted(part))issues.push({level:'error',text:`${part.ref} 引脚未全部插入有效孔位`,part:part.id});for(const pin of pins(part)){
   const h=nearest(pin.x,pin.y,1),node=h?.group||`pin:${part.id}:${pin.n}`;
   pinRecords.push({...pin,hole:h?.id,node,ref:part.ref,type:part.type});
   if(h){if(!occupied.has(h.id))occupied.set(h.id,[]);occupied.get(h.id).push(`${part.ref}.${pin.n}`);}
  }}
  for(const w of state.wires){const a=endpointNode(w.a,state),b=endpointNode(w.b,state);if(!a||!b)issues.push({level:'error',text:`${w.id} 有无效端点`,wire:w.id});else uf.join(a,b);for(const ep of [w.a,w.b]){const p=ep.part&&epPoint(ep,state),hole=ep.hole||(p&&nearest(p.x,p.y,1)?.id);if(hole){if(!occupied.has(hole))occupied.set(hole,[]);occupied.get(hole).push(w.id);}}}
  // A closed SPST joins only its two contacts. Open contacts have no implicit bias.
  const intentional=new Union();
  for(const part of state.parts.filter(p=>p.type==='dip8'))for(let i=1;i<=8;i++)if(part.switches?.[i-1]){uf.join(endpointNode({part:part.id,pin:String(i)},state),endpointNode({part:part.id,pin:String(17-i)},state));const a=part.nets?.[i],b=part.nets?.[17-i];if(typeof a==='string'&&typeof b==='string'&&((a.startsWith('SEL_')&&b==='+5V')||(b.startsWith('SEL_')&&a==='+5V')))intentional.join(a,b);}
  for(const [hole,items]of occupied)if(items.length>1)issues.push({level:'error',text:`${holeMap.get(hole).label} 重复插入：${items.join('、')}`,hole});
  const expected=new Map(),actual=new Map();
  const record=(net,node,label)=>{if(!net||net.startsWith('NC'))return;if(!expected.has(net))expected.set(net,[]);expected.get(net).push({node,label});const r=uf.find(node);if(!actual.has(r))actual.set(r,{nets:new Set(),pins:[]});actual.get(r).nets.add(net);actual.get(r).pins.push(label);};
  for(const p of pinRecords)record(p.net,p.node,`${p.ref}.${p.n} ${p.name}`);
  for(const p of posts)if(p.id!=='aux')record(p.id==='v5'?'+5V':p.id==='gnd'?'GND':'DISPLAY_VDD','post:'+p.id,p.name);
  // Switch contacts intentionally share +5V with a select signal when ON.
  const compatible=nets=>new Set([...nets].map(n=>intentional.find(n))).size===1;
  for(const [node,v]of actual)if(v.nets.size>1&&!compatible(v.nets))issues.push({level:'error',text:`误连 / 短接：${[...v.nets].join(' ↔ ')}`,node});
  const nets=[];
  for(const [name,records]of expected){const groups=new Set(records.map(r=>uf.find(r.node)));const ok=groups.size===1;nets.push({name,ok,groups:groups.size,records});if(!ok)issues.push({level:'open',text:`${name} 分成 ${groups.size} 个未导通的部分`,net:name});}
  const timer=state.parts.find(p=>p.ref==='U3'),fpga=state.parts.find(p=>p.type==='fpga');
  const clock=!!(timer&&fpga&&uf.find(endpointNode({part:timer.id,pin:'3'},state))===uf.find(endpointNode({part:fpga.id,pin:'17'},state)));
  return {uf,issues,occupied,pinRecords,nets,clock,shorts:issues.filter(i=>i.level==='error'),opens:issues.filter(i=>i.level==='open')};
 }
 const clone=x=>JSON.parse(JSON.stringify(x));
 const colorFor=n=>n==='GND'?'#303b4b':n==='+5V'?'#d7554d':n==='DISPLAY_VDD'?'#b99337':n==='clk'?'#d18d26':n==='VX'?'#299b82':n.startsWith('CH')?'#5c9e8e':n.startsWith('bcd')?'#8e72c4':n.startsWith('adc')||n==='intr_n'?'#5790bd':n.startsWith('SEL')?'#bd7595':'#7b93a3';
 function createStarter(){
  const s={schema:'cable-breadboard/v1',version:1,layoutRevision:2,displayLimit:'per-common-pin',title:'八路数字电缆对线器',railBreaks:true,parts:[],wires:[]};
  const add=(id,type,b,row,col=null,value='',nets={},extra={})=>{const x=col===null?197+b*286:holeMap.get(`b${b}-${row}-${col}`).x;const part={id,ref:id,type,x,y:Y+row*P,rotation:0,value,nets,...extra};s.parts.push(part);return part;};
  add('U1','mux',0,29,null,'',{'1':'CH4','2':'CH6','3':'VX','4':'CH7','5':'CH5','6':'GND','7':'GND','8':'GND','9':'SEL_C','10':'SEL_B','11':'SEL_A','12':'CH3','13':'CH0','14':'CH1','15':'CH2','16':'+5V'});
  add('U2','adc',1,10,null,'',{'1':'adc_cs_n','2':'adc_rd_n','3':'adc_wr_n','4':'ADC_CLK','5':'intr_n','6':'VX','7':'GND','8':'GND','9':'NC_VREF','10':'GND','11':'adc_code[4]','12':'adc_code[3]','13':'adc_code[2]','14':'adc_code[1]','15':'adc_code[0]','16':'NC_DB2','17':'NC_DB1','18':'NC_DB0','19':'ADC_RCLK','20':'+5V'});
  add('U3','timer',1,39,null,'',{'1':'GND','2':'TIME','3':'clk','4':'+5V','5':'CV','6':'TIME','7':'DIS','8':'+5V'});
  const fn=['adc_code[0]','adc_code[1]','adc_code[2]','adc_code[3]','adc_code[4]','intr_n','adc_cs_n','adc_rd_n','adc_wr_n','bcd_units[0]','bcd_units[1]','bcd_units[2]','bcd_units[3]','bcd_tens[0]','bcd_tens[1]','blank_n','clk'];
  const fpn=Object.fromEntries(fn.map((n,i)=>[String(i+1),n]));fpn['21']='led_short';fpn['22']='led_open';fpn['23']='rst_n';fpn['40']='GND';
  add('U6','fpga',2,37,null,'40 脚示意',fpn,{pinNames:Object.fromEntries(Object.entries(fpn).map(([p,n])=>[p,n==='clk'?'CLK · 接口17候选':n]))});
  for(let b=2;b<=3;b++){
   const pre=b===2?'T':'U',ref=b===2?'U4':'U5';
   add(ref,'decoder',b,12,null,'',{'1':b===2?'bcd_tens[1]':'bcd_units[1]','2':b===2?'GND':'bcd_units[2]','3':'DISPLAY_VDD','4':'blank_n','5':'GND','6':b===2?'GND':'bcd_units[3]','7':b===2?'bcd_tens[0]':'bcd_units[0]','8':'GND','9':pre+'_e','10':pre+'_d','11':pre+'_c','12':pre+'_b','13':pre+'_a','14':pre+'_g','15':pre+'_f','16':'DISPLAY_VDD'});
   const dp={'1':pre+'_a','2':pre+'_b','3':pre+'_COM3','4':pre+'_c','5':pre+'_d','6':pre+'_e','7':pre+'_f','8':pre+'_COM8','9':pre+'_g','10':'NC_DP'};
   add(b===2?'DS1':'DS2','display',b,2,null,'C392',dp);
   for(const [i,pin]of [3,8].entries())add(`R${pre}C${pin}`,'resistor',b,25+i,null,'1kΩ',{'1':`${pre}_COM${pin}`,'2':'GND'},{bridge:true});
  }
  add('SW1','dip8',0,46,null,'前三位选线',{'1':'SEL_A','2':'SEL_B','3':'SEL_C','16':'+5V','15':'+5V','14':'+5V'},{switches:Array(8).fill(false)});
  const rx=['4.769kΩ','8.325kΩ','12.131kΩ','16.214kΩ','20.605kΩ','25.341kΩ','30.463kΩ','36.021kΩ'];
  for(let i=0;i<8;i++)add(`RX${i+1}`,'resistor',0,2+(i%4)*6,i<4?1:8,rx[i],{'1':`CH${i}`,'2':'GND'});
  add('R0','resistor',1,24,0,'100kΩ',{'1':'+5V','2':'VX'});
  add('RA','resistor',1,32,1,'1.8kΩ',{'1':'+5V','2':'DIS'});
  add('RB','resistor',1,46,1,'3.9kΩ',{'1':'DIS','2':'TIME'});
  add('RCLK','resistor',1,3,8,'10kΩ',{'1':'ADC_CLK','2':'ADC_RCLK'});
  add('CT','ceramic',1,46,8,'10nF',{'1':'TIME','2':'GND'});
  add('CCV','ceramic',1,53,8,'10nF',{'1':'CV','2':'GND'});
  add('CCLK','ceramic',1,21,8,'150pF',{'1':'ADC_CLK','2':'GND'});
  add('CDEC','ceramic',1,26,8,'100nF',{'1':'+5V','2':'GND'});
  add('RS','resistor',3,38,1,'1kΩ',{'1':'led_short','2':'LED_S_A'});
  add('RO','resistor',3,45,1,'1kΩ',{'1':'led_open','2':'LED_O_A'});
  add('LED1','led',3,38,8,'短路',{'1':'LED_S_A','2':'GND'});
  add('LED2','led',3,45,8,'开路',{'1':'LED_O_A','2':'GND'});
  // Allocate separate physical insertion holes for wire ends; no wire shares a pin hole.
  const busy=new Set(s.parts.flatMap(c=>pins(c).map(p=>nearest(p.x,p.y,1)?.id).filter(Boolean)));
  const tap=(node,prefer)=>{const hs=groupMap.get(node)||[];const h=[...hs].sort((a,b)=>Math.hypot(a.x-prefer.x,a.y-prefer.y)-Math.hypot(b.x-prefer.x,b.y-prefer.y)).find(h=>!busy.has(h.id));if(!h)throw Error('No free insertion hole '+node);busy.add(h.id);return {hole:h.id};};
  let wireNo=0;
  const wire=(a,b,net,bends=[])=>s.wires.push({id:'W'+(++wireNo),a,b,net,color:colorFor(net),bends});
  // Each rail has a real midpoint break. Four explicit bridges join upper/lower segments.
  for(let b=0;b<4;b++)for(let side=0;side<2;side++){
   const net=side?'+5V':'GND';
   const h1=holeMap.get(`r${b}-${side}-24`),h2=holeMap.get(`r${b}-${side}-25`);
   busy.add(h1.id);busy.add(h2.id);wire({hole:h1.id},{hole:h2.id},net);
   const h=holeMap.get(`r${b}-${side}-0`),post=posts.find(p=>p.id===(side?'v5':'gnd'));busy.add(h.id);wire({post:post.id},{hole:h.id},net,[{x:post.x,y:side?141:157},{x:h.x,y:side?141:157}]);
  }
  const nets=new Map();
  for(const part of s.parts)for(const pin of pins(part))if(pin.net&&!pin.net.startsWith('NC')){if(!nets.has(pin.net))nets.set(pin.net,[]);nets.get(pin.net).push({...pin,node:nearest(pin.x,pin.y,1).group});}
  for(const [name,records]of nets){
   if(name==='+5V'||name==='GND'){
    for(const p of records){const bank=Math.max(0,Math.min(3,Math.round((p.x-197)/286))),side=name==='+5V'?1:0;const index=Math.max(1,Math.min(49,Math.round((p.y-Y)/P/1.18)));const segment=index<25?0:1;const target=tap(`r${bank}:${side}:${segment}`,p);wire(tap(p.node,p),target,name);}
   }else{
    const unique=[...new Map(records.map(p=>[p.node,p])).values()];
    if(name==='DISPLAY_VDD')unique.unshift({post:'vdisp',x:450,y:82});
    for(let i=1;i<unique.length;i++){
     const a=unique[i-1],b=unique[i];wire(a.post?{post:a.post}:tap(a.node,b),tap(b.node,a),name);
    }
   }
  }
  return s;
 }
 function validateFile(data){
  if(!data||data.schema!=='cable-breadboard/v1'||!Array.isArray(data.parts)||!Array.isArray(data.wires))throw Error('文件格式不是接线工作台方案');
  if(data.parts.length>200||data.wires.length>800)throw Error('方案超过 200 个器件或 800 根跳线');
  const ids=new Set();for(const p of data.parts){if(!p||!Object.hasOwn(library,p.type)||typeof p.id!=='string'||!p.id||p.id.length>80||ids.has(p.id)||typeof p.ref!=='string'||typeof p.value!=='string'||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>5000||Math.abs(p.y)>5000||![0,90,180,270].includes(p.rotation||0))throw Error('器件数据无效');if(p.nets&&(typeof p.nets!=='object'||Array.isArray(p.nets)||Object.values(p.nets).some(n=>typeof n!=='string'||n.length>100)))throw Error('网络名称无效');if(p.pinNames&&(typeof p.pinNames!=='object'||Array.isArray(p.pinNames)||Object.values(p.pinNames).some(n=>typeof n!=='string')))throw Error('引脚名称无效');if(p.switches&&(!Array.isArray(p.switches)||p.switches.length!==8||p.switches.some(v=>typeof v!=='boolean')))throw Error('拨码数据无效');ids.add(p.id);}
  const validEp=ep=>ep&&['hole','post','part'].filter(k=>Object.hasOwn(ep,k)).length===1&&((ep.hole&&holeMap.has(ep.hole))||(ep.post&&posts.some(p=>p.id===ep.post))||(ep.part&&ids.has(ep.part)&&Number.isInteger(Number(ep.pin))&&Number(ep.pin)>0&&Number(ep.pin)<=library[data.parts.find(p=>p.id===ep.part).type].count));
  const wids=new Set();for(const w of data.wires){if(!w||typeof w.id!=='string'||wids.has(w.id)||!validEp(w.a)||!validEp(w.b)||!Array.isArray(w.bends)||w.bends.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>10000||Math.abs(p.y)>10000)||(w.net!==undefined&&typeof w.net!=='string')||!/^#[0-9a-f]{6}$/i.test(w.color))throw Error('跳线数据无效');wids.add(w.id);}
  return clone(data);
 }
 root.BB={P,W,H,Y,ROWS,holes,holeMap,groupMap,posts,library,pins,localPins,nearest,mounted,snapPart,epPoint,endpointNode,analyze,createStarter,validateFile,clone,colorFor};
 if(typeof module!=='undefined')module.exports=root.BB;
})(typeof window!=='undefined'?window:globalThis);
