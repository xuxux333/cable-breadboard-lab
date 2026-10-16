(function(){
 'use strict';
 const B=window.BB,$=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const STORAGE='cable-breadboard-v1',svg=$('boardSvg'),stage=$('stage');
 let state,analysis,physicalReport={conflicts:[],blockedEndpoints:[]},mode='select',selection=null,pinFocus=null,probe=null,activeNet=null,pending=null,drag=null,space=false,currentTab='inspector',lastPoint=null;
 let past=[],future=[],cam={x:0,y:0,k:.5},toastTimer,saveTimer,lastWireDown=null,lastHandleDown=null,hoverWire=null;
 let upgradeMessage='',routingMessage='';
 function prepareLayout(input,saveCurrent=false){
  try{const upgraded=B.migrateDisplayWiring(input);if(!upgraded.migrated)return upgraded.state;
   const key=STORAGE+'-before-display-v2-'+Date.now();localStorage.setItem(key,JSON.stringify(input));
   if(saveCurrent)localStorage.setItem(STORAGE,JSON.stringify(upgraded.state));
   upgradeMessage='旧方案显示区已升级：3、8脚各经1kΩ接地；升级前方案已在本地备份';
   return upgraded.state;
  }catch(error){upgradeMessage=error.message+'；当前方案保留，可先导出，再恢复参考布线';return input;}
 }
 function prepareRouting(input,backup=false){
  try{const routed=B.Routing.routeAll(B.clone(input));
   if(routed.changed){
    if(backup)localStorage.setItem(STORAGE+'-before-routing-v3-'+Date.now(),JSON.stringify(input));
    routingMessage=`已调整 ${routed.changed} 根跳线绕开器件${backup?'；原方案已在本地备份':''}`;
   }
   if(routed.failures.length)routingMessage+=(routingMessage?'；':'')+`${routed.failures.length} 根线仍需手动调整，请查看检查连接`;
   return routed.state;
  }catch(error){routingMessage='器件避让未完成：'+error.message+'；已保留原布线，请导出备份后检查';return input;}
 }
 try{const saved=localStorage.getItem(STORAGE);state=saved?prepareRouting(prepareLayout(B.validateFile(JSON.parse(saved)),true),true):prepareRouting(B.createStarter());if(saved)try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{routingMessage+='；当前浏览器无法保存，请导出方案';}}catch{state=prepareRouting(B.createStarter());}
 function notice(msg){$('toast').textContent=msg;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3600);}
 function physicalWireIds(){return new Set([...physicalReport.conflicts,...physicalReport.blockedEndpoints].map(c=>c.wire));}
 function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(state));const n=physicalWireIds().size;$('statusText').textContent=n?`已自动保存 · ${n} 根跳线需避让器件，点击“自动避让”`:'已自动保存 · 走线已避开器件本体，移动后请重新检查';}catch{$('statusText').textContent='当前浏览器无法保存，请导出 JSON 备份';}}
 function changed(before){past.push(before);if(past.length>60)past.shift();future=[];refresh();clearTimeout(saveTimer);saveTimer=setTimeout(persist,180);}
 function edit(fn){const before=B.clone(state);fn();changed(before);}
 function point(e){const r=svg.getBoundingClientRect();return{x:(e.clientX-r.left-cam.x)/cam.k,y:(e.clientY-r.top-cam.y)/cam.k};}
 function epNear(p){for(const post of B.posts)if(Math.hypot(post.x-p.x,post.y-p.y)<18)return {post:post.id};const h=B.nearest(p.x,p.y,12);return h?{hole:h.id}:null;}
 function epLabel(ep){if(ep.hole)return B.holeMap.get(ep.hole)?.label||'无效孔';if(ep.post)return B.posts.find(p=>p.id===ep.post)?.name||'无效端子';return `${ep.part}.${ep.pin}`;}
 function epInfo(ep){const p=B.epPoint(ep,state),h=ep.hole?B.holeMap.get(ep.hole):ep.part&&p?B.nearest(p.x,p.y,1):null;return{label:h?.label||epLabel(ep),id:h?.id||ep.post||`${ep.part}.${ep.pin}`};}
 function wireFocus(){return mode==='select'?(selection?.kind==='wire'?selection.id:hoverWire):null;}
 function fit(){const r=stage.getBoundingClientRect();cam.k=Math.min((r.width-50)/B.W,(r.height-66)/B.H);cam.k=Math.max(.12,cam.k);cam.x=(r.width-B.W*cam.k)/2;cam.y=(r.height-B.H*cam.k)/2-8;camera();}
 function camera(){svg.querySelector('#viewport').setAttribute('transform',`translate(${cam.x} ${cam.y}) scale(${cam.k})`);$('zoomText').textContent=Math.round(cam.k*100)+'%';renderWireFocus();}
 function zoom(f,center){const r=svg.getBoundingClientRect(),cx=center?.x??r.width/2,cy=center?.y??r.height/2,k=Math.min(2.8,Math.max(.12,cam.k*f));cam.x=cx-(cx-cam.x)*k/cam.k;cam.y=cy-(cy-cam.y)*k/cam.k;cam.k=k;camera();}
 function buildBoard(){
  let out=`<defs><linearGradient id="boardBlue" x2="1" y2="1"><stop stop-color="#344a85"/><stop offset="1" stop-color="#223569"/></linearGradient><linearGradient id="plastic" x2="1" y2="1"><stop stop-color="#fbfaf3"/><stop offset=".5" stop-color="#eeede5"/><stop offset="1" stop-color="#e2e1d8"/></linearGradient><linearGradient id="chipBlack" x2="1" y2="0"><stop stop-color="#252b30"/><stop offset=".5" stop-color="#383e42"/><stop offset="1" stop-color="#20272b"/></linearGradient><linearGradient id="metal" x2="0" y2="1"><stop stop-color="#dce0de"/><stop offset=".45" stop-color="#999f9d"/><stop offset="1" stop-color="#c9ceca"/></linearGradient><linearGradient id="resBlue" x2="1" y2="0"><stop stop-color="#568eac"/><stop offset=".5" stop-color="#9ac4d3"/><stop offset="1" stop-color="#5384a1"/></linearGradient><radialGradient id="ledRed" cx=".35" cy=".2"><stop stop-color="#fb8b80"/><stop offset=".5" stop-color="#ca443f"/><stop offset="1" stop-color="#8d2f2d"/></radialGradient><filter id="shadow" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-opacity=".19"/></filter><filter id="smallshadow" x="-70%" y="-25%" width="240%" height="180%"><feDropShadow dx="1" dy="2" stdDeviation="1.4" flood-opacity=".25"/></filter></defs><g id="viewport"><g id="boardBase">`;
  out+=`<rect x="18" y="18" width="1284" height="1185" rx="17" fill="url(#boardBlue)" filter="url(#shadow)"/><path d="M35 133h1250" stroke="#53669b" opacity=".5"/><text x="1195" y="65" text-anchor="end" font-size="23" font-weight="750" fill="#f4d574" letter-spacing="2">PROJECT BOARD</text><text x="1195" y="92" text-anchor="end" font-size="13" fill="#a8b6d8" letter-spacing="3">GL-48  /  4 × 63</text><text x="120" y="118" font-size="10" fill="#ccd4e7" letter-spacing="1">GND</text><text x="220" y="118" font-size="10" fill="#e9c9c7">+5 V</text><text x="330" y="118" font-size="10" fill="#b9d8c7">备用</text><text x="427" y="118" font-size="10" fill="#e5d6ab">显示电源*</text>`;
  for(const p of B.posts)out+=`<g data-post="${p.id}" class="post"><circle cx="${p.x}" cy="${p.y}" r="23" fill="#1b2a50"/><circle cx="${p.x}" cy="${p.y-3}" r="20" fill="${p.color}" stroke="#a2a7a0" stroke-width="3"/><circle cx="${p.x}" cy="${p.y-3}" r="10" fill="#151c23" stroke="#81888a" stroke-width="3"/><title>${p.name} 接线柱</title></g>`;
  out+=`<rect x="101" y="153" width="1085" height="113" rx="5" fill="url(#plastic)" stroke="#d0d0c8"/><path d="M102 207h1083" stroke="#cfcec6" stroke-width="2"/>`;
  for(let b=0;b<4;b++){
   const x=106+b*286;
   out+=`<rect x="${x}" y="264" width="183" height="900" rx="4" fill="url(#plastic)" stroke="#d1d2c8"/><rect x="${x+80}" y="269" width="23" height="889" fill="#deded5"/><path d="M${x+82} 270v886" stroke="#c8c9bf"/><text x="${x+91}" y="1190" text-anchor="middle" font-size="12" fill="#bac8e0" letter-spacing="2">${['01 选线 / 编码','02 采样 / 时基','03 主控 / 十位','04 个位 / 告警'][b]}</text>`;
   for(let c=0;c<10;c++){const h=B.holeMap.get(`b${b}-0-${c}`);out+=`<text x="${h.x}" y="258" text-anchor="middle" font-size="9" fill="#a5a89b">${String.fromCharCode(65+c)}</text>`;}
   for(let r=0;r<63;r++)if(r===0||(r+1)%5===0||r===62)out+=`<text x="${x+92}" y="${B.Y+r*14+3}" font-size="8" text-anchor="middle" fill="#aaa99d">${r+1}</text>`;
  }
  for(let b=0;b<5;b++){
   const x=63+b*286;out+=`<rect x="${x}" y="264" width="42" height="900" rx="3" fill="url(#plastic)" stroke="#d2d3c9"/>`;
   for(let side=0;side<2;side++){const xx=76+b*286+side*14;out+=`<text x="${xx}" y="258" fill="${side?'#ba6f65':'#79869e'}" font-size="12" text-anchor="middle">${side?'+':'−'}</text>`;for(let half=0;half<2;half++){const a=B.holeMap.get(`r${b}-${side}-${half*25}`),z=B.holeMap.get(`r${b}-${side}-${half*25+24}`);out+=`<path d="M${xx+(side?6:-6)} ${a.y-5}v${z.y-a.y+10}" stroke="${side?'#c68579':'#8d9eb6'}" stroke-width="1.3" opacity=".7"/>`;}}
   out+=`<path d="M${x+4} ${B.Y+29.5*14}h34" stroke="#cfb273" stroke-width="2" stroke-dasharray="3 3"/><text transform="translate(${x+21} ${B.Y+29.5*14+9})" text-anchor="middle" font-size="5.5" fill="#a49066">断点</text>`;
  }
  for(const h of B.holes)out+=`<rect data-hole="${h.id}" x="${h.x-3.2}" y="${h.y-3.2}" width="6.4" height="6.4" rx=".8" fill="#92958f"/><rect x="${h.x-2.1}" y="${h.y-1.6}" width="4.2" height="3.8" rx=".5" fill="#555f5b" pointer-events="none"/>`;
  out+=`<text x="1270" y="1190" text-anchor="end" font-size="9" fill="#9cafd2">* 显示供电与电平待核对</text></g><g id="topologyLayer" pointer-events="none"></g><g id="wireLayer"></g><g id="partLayer"></g><g id="highlightLayer" pointer-events="none"></g><g id="wireFocusLayer" pointer-events="none"></g><g id="physicalLayer" pointer-events="none"></g><g id="handleLayer"></g><g id="draftLayer" pointer-events="none"></g></g>`;
  svg.innerHTML=out;
 }
 function shape(part,thumbnail=false){
  const d=B.library[part.type],pins=B.localPins(part),n=d.count/2,height=(n-1)*14+18,wide=d.kind==='fpga'?84:30;
  let s='';
  for(const p of pins){const x=p.x<0?p.x:-1; if(['dip','fpga','switch','display'].includes(d.kind))s+=`<rect x="${p.x<0?p.x:wide/2}" y="${p.y-3}" width="${Math.abs(p.x)-wide/2+2}" height="6" rx="1" fill="url(#metal)"/>`;}
  if(d.kind==='dip'||d.kind==='fpga'){
   s+=`<rect x="${-wide/2}" y="-9" width="${wide}" height="${height}" rx="3" fill="url(#chipBlack)" stroke="#171f22" filter="url(#smallshadow)"/><path d="M-6 -9a6 6 0 0 0 12 0" fill="#172025"/><circle cx="${-wide/2+6}" cy="1" r="2" fill="#929a91"/>`;
   s+=`<text transform="translate(2 ${height/2-8}) rotate(-90)" text-anchor="middle" fill="${d.kind==='fpga'?'#dfcb83':'#afb6a9'}" font-family="Consolas,monospace" font-size="${d.kind==='fpga'?11:9}" letter-spacing=".7">${esc(d.name)}</text>`;
   if(d.kind==='fpga')s+=`<text x="0" y="${height-21}" text-anchor="middle" fill="#9eac9c" font-size="7">40 脚示意</text><text x="0" y="${height-10}" text-anchor="middle" fill="#8a978a" font-size="5.7">非封装管脚表</text>`;
  }else if(d.kind==='display'){
   s+=`<rect x="-22" y="-10" width="44" height="76" rx="3" fill="#262d2e" stroke="#151b1b" filter="url(#smallshadow)"/><rect x="-19" y="-7" width="38" height="69" rx="2" fill="#32383b"/>`;
   const segments=['-10,-1 10,-1 13,2 9,5 -9,5 -13,2','12,4 15,7 12,25 8,27 7,23 10,7','8,32 12,30 11,51 8,54 5,50 6,35','-10,54 7,54 10,57 6,60 -11,60 -14,57','-16,32 -12,30 -10,34 -12,50 -15,54 -18,50','-12,5 -8,7 -11,23 -15,27 -18,24 -15,8','-12,27 7,27 10,30 6,33 -13,33 -16,30'];
   for(const pts of segments)s+=`<polygon points="${pts}" fill="#65716c" opacity=".38"/>`;s+=`<circle cx="15" cy="57" r="2" fill="#65716c" opacity=".4"/>`;
  }else if(d.kind==='switch'){
   s+=`<rect x="-17" y="-9" width="34" height="118" rx="3" fill="#ac3f34" stroke="#78352e" filter="url(#smallshadow)"/>`;
   for(let i=0;i<8;i++)s+=`<g data-switch="${part.id}:${i}" class="switch-toggle"><rect x="-9" y="${i*14-4}" width="18" height="9" rx="1" fill="#762c27"/><rect x="${part.switches?.[i]?'0':'-8'}" y="${i*14-3}" width="8" height="7" rx="1" fill="#f4ece0"/><text x="13" y="${i*14+2}" font-size="5" fill="#f0d7c1">${i+1}</text></g>`;
  }else if(d.kind==='resistor'){
   if(part.bridge){s+=`<path d="M-21 0h42" stroke="#9fa5a1" stroke-width="3"/><rect x="-13" y="-5.7" width="26" height="11.4" rx="4" fill="url(#resBlue)" stroke="#57879b"/>`;for(const [x,c]of [[-8,'#845637'],[-3,'#262934'],[2,'#293a52'],[9,'#bf9b51']])s+=`<path d="M${x} -5.4v10.8" stroke="${c}" stroke-width="2.3"/>`;}
   else{s+=`<path d="M0 0v42" stroke="#a6aaa4" stroke-width="3"/><rect x="-6" y="9" width="12" height="24" rx="4" fill="url(#resBlue)" stroke="#588aa1"/>`;for(const [y,c]of [[13,'#835b3f'],[18,'#272d35'],[22,'#334857'],[29,'#bd9d55']])s+=`<path d="M-5.5 ${y}h11" stroke="${c}" stroke-width="2.3"/>`;}
  }else if(d.kind==='capacitor'){
   s+=`<path d="M0 0v10m0 9v9" stroke="#a6aaa2" stroke-width="2.3"/><ellipse cx="0" cy="14" rx="10" ry="8" fill="#c79659" stroke="#a77d4d" filter="url(#smallshadow)"/><text x="0" y="16" font-size="5.8" text-anchor="middle" fill="#614d36">${esc((part.value||'104').replace('nF','n').replace('pF','p'))}</text>`;
  }else if(d.kind==='electrolytic'){
   s+=`<path d="M0 0v28" stroke="#a6aaa2" stroke-width="2.3"/><rect x="-10" y="5" width="20" height="20" rx="7" fill="#33495c"/><path d="M5 7v15" stroke="#bac8cf" stroke-width="4"/><ellipse cx="0" cy="5" rx="10" ry="4" fill="#b7bdb6"/><path d="M-4 5h8m-4-3v6" stroke="#7d8884"/>`;
  }else if(d.kind==='led'){
   s+=`<path d="M0 0v28" stroke="#a2a7a0" stroke-width="2.2"/><ellipse cx="0" cy="13" rx="10" ry="11" fill="url(#ledRed)" stroke="#a23c36" filter="url(#smallshadow)"/><ellipse cx="-3" cy="9" rx="2.3" ry="4" fill="#ffc2b6" opacity=".65"/><path d="M8 6v14" stroke="#8f3430"/>`;
  }
  if(!thumbnail)for(const p of B.pins(part)){const lp=pins.find(lp=>lp.n===p.n);s+=`<circle class="pin-dot" data-pin="${part.id}:${p.n}" cx="${lp.x}" cy="${lp.y}" r="3.2" fill="#b6beb4" stroke="#77847d" stroke-width=".7"><title>${esc(part.ref+'.'+p.n+' '+p.name+' · '+(p.net||'未分配'))}</title></circle>`;}
  return s;
 }
 function renderParts(){
  let out='';const labels=$('showLabels').checked;
  for(const c of state.parts){const def=B.library[c.type],sel=selection?.kind==='part'&&selection.id===c.id;
   out+=`<g data-part="${esc(c.id)}" transform="translate(${c.x} ${c.y}) rotate(${c.rotation||0})" class="board-part">`;
   if(sel){const ps=B.localPins(c),xx=Math.min(...ps.map(p=>p.x))-10,yy=-19,ww=Math.max(...ps.map(p=>p.x))-xx+10,hh=Math.max(...ps.map(p=>p.y))+38;out+=`<rect x="${xx}" y="${yy}" width="${ww}" height="${hh}" fill="#36b59a12" stroke="#39b69b" stroke-width="2" stroke-dasharray="5 3" rx="5"/>`;}
   out+=shape(c)+`</g>`;
   if(labels){out+=`<text x="${c.x}" y="${c.y-19}" text-anchor="middle" font-size="9.5" font-weight="650" fill="#3d5452" pointer-events="none" class="ref-label">${esc(c.ref)}${c.value?' · '+esc(c.value):''}</text>`;
    if(def.kind==='dip'||def.kind==='fpga'||def.kind==='display')for(const p of B.pins(c))out+=`<text x="${p.x+(p.x<c.x?-7:7)}" y="${p.y+2.5}" font-size="6.5" text-anchor="${p.x<c.x?'end':'start'}" fill="#788177" pointer-events="none">${def.kind==='display'?esc(['3','8'].includes(p.n)?p.n+' COM':p.name):p.n}</text>`;
   }
  }
  svg.querySelector('#partLayer').innerHTML=out;
 }
 function vertices(w){return B.Routing.wireVertices(w,state);}
 const pathOf=pts=>pts.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ');
 function renderWires(){
  let out='';if($('showWires').checked)for(const w of state.wires){const pts=vertices(w);if(!pts.length)continue;
   out+=`<g data-wire="${esc(w.id)}" class="board-wire${physicalWireIds().has(w.id)?' wire-conflict':''}"><path class="wire-insulation" d="${pathOf(pts)}" fill="none" stroke="#fffdf4" stroke-width="5.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/><path class="wire-core" d="${pathOf(pts)}" fill="none" stroke="${esc(w.color)}" stroke-width="2.1" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/><path d="${pathOf(pts)}" fill="none" stroke="transparent" stroke-width="10" vector-effect="non-scaling-stroke" class="wire-hit"/>${[pts[0],pts.at(-1)].map((p,i)=>`<g data-wire-end="${i?'B':'A'}"><circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#fffdf4" stroke="${esc(w.color)}" stroke-width="1.5" vector-effect="non-scaling-stroke"/><circle cx="${p.x}" cy="${p.y}" r="1.6" fill="#283b35"/></g>`).join('')}<title>${esc(w.id+' · '+(w.net||'自定义跳线')+' · A '+epLabel(w.a)+' → B '+epLabel(w.b)+'；仅两端插入，中途经过和交叉均不连接')}</title></g>`;
  }svg.querySelector('#wireLayer').innerHTML=out;renderWireFocus();renderHandles();
 }
 function renderWireFocus(){
  const id=wireFocus(),w=$('showWires').checked&&state.wires.find(w=>w.id===id);
  svg.querySelectorAll('#wireLayer > [data-wire]').forEach(g=>{const item=state.wires.find(w=>w.id===g.dataset.wire),focus=w?g.dataset.wire===id:!activeNet||item.net===activeNet;g.setAttribute('opacity',focus?'1':'.13');});
  let out='';if(w){const pts=vertices(w),k=cam.k,ends=[['A',w.a],['B',w.b]],a=pts[0],b=pts.at(-1);out=`<path d="${pathOf(pts)}" fill="none" stroke="#fffdf4" stroke-width="7" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/><path d="${pathOf(pts)}" fill="none" stroke="${esc(w.color)}" stroke-width="3.1" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`;
   for(const [letter,ep]of ends){const p=B.epPoint(ep,state);if(!p)continue;const info=epInfo(ep),text=`${letter} · ${info.label} [${info.id}]`,width=(Array.from(text).reduce((n,c)=>n+(c.charCodeAt(0)>127?10:6.2),20))/k,height=23/k,dx=p.x<B.W/2?13/k:-width-13/k,dy=letter==='B'&&a&&b&&Math.abs(a.y-b.y)<52/k?12/k:-34/k;out+=`<circle cx="${p.x}" cy="${p.y}" r="7" fill="#fffdf4" stroke="${esc(w.color)}" stroke-width="2.4" vector-effect="non-scaling-stroke"/><circle cx="${p.x}" cy="${p.y}" r="2" fill="#233d33"/><g class="wire-end-label" data-end-label="${letter}" transform="translate(${p.x+dx} ${p.y+dy})"><rect width="${width}" height="${height}" rx="${4/k}" fill="#fffef8" stroke="${esc(w.color)}" stroke-width="1" vector-effect="non-scaling-stroke"/><text x="${10/k}" y="${15.5/k}" fill="#24483b" font-family="Consolas,monospace" font-weight="600" font-size="${10/k}">${esc(text)}</text></g>`;}
  }svg.querySelector('#wireFocusLayer').innerHTML=out;
 }
 function hoverWireTo(id){if(hoverWire===id)return;hoverWire=id;renderWireFocus();if(!selection&&!probe)renderInspector();updateStatus();}
 function inspectPhysical(){physicalReport=B.Routing.inspect(state);}
 function renderPhysical(){
  let out='';const issues=[...physicalReport.conflicts,...physicalReport.blockedEndpoints],ids=physicalWireIds();
  if($('showWires').checked)for(const w of state.wires)if(ids.has(w.id)){const pts=vertices(w);out+=`<path data-physical-wire="${esc(w.id)}" d="${pathOf(pts)}" fill="none" stroke="#c5483c" stroke-width="2.7" stroke-dasharray="6 4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;}
  for(const id of new Set(issues.map(c=>c.part))){const p=state.parts.find(p=>p.id===id);if(!p)continue;const b=B.Routing.partBounds(p,0);out+=`<rect data-physical-part="${esc(id)}" x="${b.minX-2}" y="${b.minY-2}" width="${b.maxX-b.minX+4}" height="${b.maxY-b.minY+4}" rx="3" fill="#d34b3e0b" stroke="#c5483c" stroke-width="1.8" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>`;}
  svg.querySelector('#physicalLayer').innerHTML=out;
 }
 function renderHandles(){let out='';if(mode==='select'&&selection?.kind==='wire'&&$('showWires').checked){const w=state.wires.find(w=>w.id===selection.id);if(w){for(const [end,ep]of [['a',w.a],['b',w.b]]){const p=B.epPoint(ep,state);if(p)out+=`<circle data-handle="${w.id}:${end}" cx="${p.x}" cy="${p.y}" r="10" fill="transparent" stroke="#1c9c80" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;}w.bends.forEach((p,i)=>out+=`<rect data-handle="${w.id}:${i}" x="${p.x-5}" y="${p.y-5}" width="10" height="10" rx="2" fill="#fff" stroke="#15977b" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`);}}svg.querySelector('#handleLayer').innerHTML=out;}
 function renderTopology(){let out='';if($('showTopology').checked)for(const hs of B.groupMap.values()){const a=hs[0],b=hs.at(-1);out+=`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke="#22a889" opacity=".3" stroke-width="5" stroke-linecap="round"/>`;}svg.querySelector('#topologyLayer').innerHTML=out;}
 function renderProbe(){
  let out='';if(probe){const node=B.endpointNode(probe,state);if(node){const root=analysis.uf.find(node);for(const h of B.holes)if(analysis.uf.find(h.group)===root)out+=`<circle cx="${h.x}" cy="${h.y}" r="5" fill="#46d3ab" stroke="#087c64" stroke-width=".7"/>`;const p=B.epPoint(probe,state);if(p)out+=`<circle cx="${p.x}" cy="${p.y}" r="11" fill="none" stroke="#e8bb45" stroke-width="3"/>`;}}
  svg.querySelector('#highlightLayer').innerHTML=out;
 }
 function updateStatus(){
  $('countParts').textContent=state.parts.length;$('countWires').textContent=state.wires.length;
  const p=selection?.kind==='part'?state.parts.find(p=>p.id===selection.id):null,w=state.wires.find(w=>w.id===wireFocus());
  $('selectionText').textContent=p?`${p.ref} · ${B.mounted(p)?'引脚已入孔':'有引脚未入孔'}`:w?`${w.id} · 仅 A/B 两端插入` :probe?epLabel(probe):'悬停或点选跳线，查看 A/B 插孔';
  document.querySelectorAll('[data-action="undo"]').forEach(e=>e.disabled=!past.length);document.querySelectorAll('[data-action="redo"]').forEach(e=>e.disabled=!future.length);
  const count=$('routingStatus');if(count){const n=physicalWireIds().size;count.textContent=n?`需避让 ${n} 根线`:'已避开器件';count.classList.toggle('bad',n>0);}
 }
 function refresh(){analysis=B.analyze(state);inspectPhysical();renderParts();renderWires();renderPhysical();renderTopology();renderProbe();updateStatus();renderInspector();renderNets();}
 function setTab(name){currentTab=name;document.querySelectorAll('[data-tab]').forEach(t=>{t.classList.toggle('active',t.dataset.tab===name);t.setAttribute('aria-selected',String(t.dataset.tab===name));});$('inspector').hidden=name==='nets';$('netList').hidden=name!=='nets';renderInspector();}
 function pane(){document.querySelector('.inspector-panel').classList.add('mobile-open');}
 function physicalContent(wireId=null,partId=null){
  const issues=[...physicalReport.conflicts,...physicalReport.blockedEndpoints].filter(c=>(!wireId||c.wire===wireId)&&(!partId||c.part===partId)),pairs=[...new Map(issues.map(c=>[c.wire+'|'+c.part,c])).values()],bodyCount=issues.filter(c=>c.kind==='body-crossing').length,pinCount=issues.filter(c=>c.kind==='pin-crossing').length,blockedCount=physicalReport.blockedEndpoints.filter(c=>(!wireId||c.wire===wireId)&&(!partId||c.part===partId)).length;
  return `<section class="inspector-section physical-inspection"><h3>器件本体避让</h3><div class="field-row"><span>穿过 / 贴近器件本体</span><strong class="${bodyCount?'bad':'good'}">${bodyCount} 处</strong></div>${pinCount?`<div class="field-row"><span>穿过已占用引脚孔</span><strong class="bad">${pinCount} 处</strong></div>`:''}${blockedCount?`<div class="field-row"><span>端点被本体 / 引脚遮挡</span><strong class="bad">${blockedCount} 处</strong></div>`:''}${pairs.length?`<p class="muted">红色虚线表示不可照此安装的路线，红框标出挡住走线的器件；点击下方定位，再重排此线或自动避让。</p><div class="physical-issues">${pairs.map(c=>`<button class="physical-issue" data-locatewire="${esc(c.wire)}" data-locatepart="${esc(c.part)}"><b>${esc(c.wire)} × ${esc(c.part)}</b><span>定位 ↗</span><small>${esc(c.text||'跳线穿过或贴近器件本体')}</small></button>`).join('')}</div>`:'<p class="muted">当前路线避开器件本体、已占用的引脚孔及边缘余量。移动器件或调整折点后会重新检查。</p>'}</section>`;
 }
 function locateConflict(wireId,partId){
  $('overlay').hidden=true;select('wire',wireId);const p=state.parts.find(p=>p.id===partId);if(p){const box=B.Routing.partBounds(p,0),r=stage.getBoundingClientRect();cam.k=Math.max(.7,cam.k);cam.x=r.width/2-(box.minX+box.maxX)/2*cam.k;cam.y=r.height/2-(box.minY+box.maxY)/2*cam.k;camera();}
 }
 function renderInspector(){
  const el=$('inspector');if(currentTab==='help'){el.innerHTML=helpContent(false);return;}
  let html=`<button class="mobile-close text-button" data-action="closeInspector">关闭属性 ×</button>`;
  if(probe){const node=B.endpointNode(probe,state),root=analysis.uf.find(node),pins=analysis.pinRecords.filter(p=>analysis.uf.find(p.node)===root),hs=B.holes.filter(h=>analysis.uf.find(h.group)===root);html+=`<section class="inspector-section"><h3>通断探针</h3><p class="probe-label">${esc(epLabel(probe))}</p><div class="field-row"><span>内部五孔组</span><strong>${esc(B.holeMap.get(probe.hole)?.group||'接线柱')}</strong></div><div class="field-row"><span>实际连通孔</span><strong>${hs.length} 孔</strong></div><p class="muted">绿色孔位均与探针电气导通。交叉跳线不自动连接，电阻 / 电容两端不视为短接。</p></section><section class="inspector-section"><h3>这个网络上的器件</h3>${pins.map(p=>`<button class="pin-row" data-focuspart="${esc(p.part)}"><b>${esc(p.ref+'.'+p.n)}</b><span>${esc(p.name)}</span></button>`).join('')||'<p class="muted">这组孔位还没有器件引脚</p>'}</section>`;
  }else if(selection?.kind==='part'){
   const p=state.parts.find(p=>p.id===selection.id),d=p&&B.library[p.type];if(!p)return;
   html+=`<section class="inspector-section"><span class="eyebrow">SELECTED COMPONENT</span><h3 class="selected-name">${esc(p.ref)} · ${esc(d.name)}</h3><p class="muted">${esc(d.desc)}</p><div class="field-row"><span>标号</span><input id="editRef" aria-label="器件标号" maxlength="24" value="${esc(p.ref)}"></div><div class="field-row"><span>数值 / 备注</span><input id="editValue" aria-label="数值或备注" maxlength="40" value="${esc(p.value)}"></div><div class="field-row"><span>旋转</span><select id="editRotation" aria-label="器件旋转">${[0,90,180,270].map(v=>`<option ${v===(p.rotation||0)?'selected':''} value="${v}">${v}°</option>`).join('')}</select></div><div class="field-row"><span>引脚入孔</span><strong class="${B.mounted(p)?'good':'bad'}">${B.mounted(p)?'全部已吸附':'有悬空引脚'}</strong></div><div class="field-row"><span>锁定位置</span><input id="editLocked" type="checkbox" ${p.locked?'checked':''} aria-label="锁定器件位置"></div>${d.source?`<a class="source-link" href="${d.source}" target="_blank" rel="noopener">TI 原厂数据手册 ↗</a>`:''}</section>`;
   if(p.type==='fpga')html+=`<div class="notice"><p>40 脚仅作接口示意。17 标注 CLK 候选；其余 S 编号是绘图位置，需映射真实开发板接口后再接线。</p></div>`;
   if(p.type==='display')html+=`<div class="notice"><p>按老师确认：3 脚、8 脚各自串联一只 1kΩ 电阻接地；CD4511 的 a–g 直接连数码管，不串段电阻。其余段脚映射与封装尺寸仍待核对。“8”轮廓仅表示封装。</p></div>`;
   if(p.type==='dip8')html+=`<div class="notice"><p>点击红色拨码的白色拨片切换状态。OFF 时地址输入没有默认下拉；实物偏置方案待核对。</p></div>`;
   html+=`<section class="inspector-section"><h3>引脚 / 实际插孔</h3><p class="muted">点击一行可探测所在网络</p>${B.pins(p).map(pin=>{const h=B.nearest(pin.x,pin.y,1),name=p.type==='display'&&['3','8'].includes(pin.n)?'COM':pin.name;return `<button class="pin-row ${pin.n===pinFocus?'focused':''}" data-probepin="${esc(p.id+':'+pin.n)}"><b>${esc(pin.n)} · ${esc(name)}</b><span>${h?esc(h.label):'未入孔'}</span><small>${esc(pin.net||'未分配参考网络')}</small></button>`;}).join('')}</section>`;
  }else if(wireFocus()){
   const w=state.wires.find(w=>w.id===wireFocus());if(!w){selection=null;hoverWire=null;renderInspector();return;}const selected=selection?.kind==='wire',a=epInfo(w.a),b=epInfo(w.b);
   html+=`<section class="inspector-section"><span class="eyebrow">${selected?'SELECTED WIRE':'WIRE PREVIEW'}</span><h3 class="selected-name">${esc(w.id)} · ${esc(w.net||'自定义跳线')}</h3><div class="wire-rule"><b>只有 A、B 两端插入</b><p>中间整条是绝缘跳线。经过的孔、交叉处和折弯处均不接入；A/B 所在的内部五孔组仍正常导通。</p></div><div class="wire-endpoint"><span>A</span><div><b>${esc(a.label)}</b><small>${esc(a.id)}</small></div></div><div class="wire-endpoint"><span>B</span><div><b>${esc(b.label)}</b><small>${esc(b.id)}</small></div></div>${selected?`<div class="field-row"><span>颜色</span><input id="editColor" type="color" value="${esc(w.color)}" aria-label="导线颜色"></div><p class="muted">拖动端点外圈更换插孔。方形框只用于调整走线，均为绝缘折点；双击导线添加，双击方形框删除。</p><button class="button button-outline full-width" data-action="autoRoute">绕开器件重排此线</button>`:'<p class="muted">点击这条跳线，可拖动两端或编辑折点。按 P 使用探针，查看真正导通的孔。</p>'}</section>`;
  }else{
   html+=`<section class="inspector-section overview"><span class="eyebrow">REFERENCE LAYOUT</span><h3 class="selected-name">参考安装已就位</h3><p class="muted">按照片布局及之前的八路手动仿真。点击器件或跳线开始编辑。</p><div class="field-row"><span>核心器件</span><strong>CD4051 · ADC0804</strong></div><div class="field-row"><span>译码与显示</span><strong>CD4511BE × 2</strong></div><div class="field-row"><span>实际孔位检查</span><strong class="${analysis.shorts.length||analysis.opens.length?'bad':'good'}">${analysis.shorts.length} 误连 / ${analysis.opens.length} 断网</strong></div></section>`;
   html+=`<section class="inspector-section"><h3><span class="clock-light"></span>555 → FPGA 时钟</h3><div class="clock-path"><span>NE555</span><i>3 · OUT</i><b>↓</b><span>XC3S50AN</span><i>17 · CLK 候选</i></div><div class="field-row"><span>孔位连通</span><strong class="${analysis.clock?'good':'bad'}">${analysis.clock?'已连接':'未连接'}</strong></div><p class="muted">RA 1.8kΩ / RB 3.9kΩ / CT 10nF<br>参考时基约 15 kHz，FPGA 内部 ÷30000。修改数值需另行计算。</p><button class="button button-outline full-width" data-action="clock">定位时钟走线</button></section>`;
   html+=`<section class="inspector-section"><h3>面包板导通逻辑</h3><div class="five-holes"><i></i><i></i><i></i><i></i><i></i><span>同排五孔相通</span></div><div class="wire-rule"><b>跳线仅两端插入</b><p>空心圆标出插孔；线身经过的孔和交叉处均不连接。悬停或点选跳线，可单独查看 A/B 两端。</p></div><p class="muted">中槽两侧、上下相邻排均隔离。电源轨中点断开，参考方案用跳线跨接。接线柱不会自动连到电源轨。</p><button class="text-button" data-action="probe">开启通断探针 ↗</button></section><div class="notice"><p>数码管：3、8 脚各经 1kΩ 接地，每只数码管 2 只电阻；4511 段输出直连。实物待核对：FPGA 电平接口、其余段脚、拨码 OFF 偏置。<button class="inline-link" data-action="constraints">查看 5 项核对说明 ↗</button></p></div>`;
  }
  html+=physicalContent(selection?.kind==='wire'?selection.id:wireFocus(),selection?.kind==='part'?selection.id:null);
  el.innerHTML=html;
  const p=selection?.kind==='part'?state.parts.find(p=>p.id===selection.id):null;
  if(p){for(const [id,key]of [['editRef','ref'],['editValue','value']])if($(id))$(id).onchange=e=>edit(()=>p[key]=e.target.value);if($('editRotation'))$('editRotation').onchange=e=>edit(()=>{Object.assign(p,B.snapPart({...p,rotation:Number(e.target.value)},p.x,p.y));});if($('editLocked'))$('editLocked').onchange=e=>edit(()=>p.locked=e.target.checked);}
  if($('editColor'))$('editColor').onchange=e=>edit(()=>state.wires.find(w=>w.id===selection.id).color=e.target.value);
 }
 function renderNets(){let html=`<section class="inspector-section"><h3>${analysis.nets.length} 个参考网络</h3><p class="muted">按插孔、内部金属片及跳线检查。点击网络高亮走线。</p><button class="text-button" data-action="clearFocus">显示全部网络</button></section>`;for(const n of analysis.nets.sort((a,b)=>Number(a.ok)-Number(b.ok)||a.name.localeCompare(b.name)))html+=`<button class="net-item ${n.name===activeNet?'focused':''}" data-net="${esc(n.name)}"><strong><i class="net-dot" style="background:${B.colorFor(n.name)}"></i>${esc(n.name)} <span class="${n.ok?'good':'bad'}">${n.ok?'●':'○'}</span></strong><small>${n.records.length} 端点 · ${n.ok?'已导通':n.groups+' 处分离'}</small></button>`;$('netList').innerHTML=html;}
 function library(){const q=$('searchLibrary').value.toLowerCase();$('library').innerHTML=Object.entries(B.library).filter(([key,d])=>(d.name+d.desc+key).toLowerCase().includes(q)).map(([key,d])=>{const p={id:'thumb',type:key,x:0,y:0,value:'',switches:Array(8).fill(false)};const h=['dip','fpga','switch','display'].includes(d.kind)?(d.count/2-1)*14+34:58;return `<button class="part-card" data-add="${key}"><span class="part-thumb"><svg viewBox="-60 -20 120 ${h+10}"><defs></defs>${shape(p,true)}</svg></span><span><strong class="part-name">${esc(d.name)}</strong><small class="part-meta">${esc(d.desc)}</small></span><span class="part-add">+</span></button>`;}).join('')||'<p class="muted">没有匹配的器件</p>';}
 function addPart(type){
  const prefix={resistor:'R',ceramic:'C',electrolytic:'C',led:'LED',display:'DS',dip8:'SW'}[type]||'U';let num=1;while(state.parts.some(p=>p.id===prefix+num))num++;let p={id:prefix+num,ref:prefix+num,type,x:0,y:0,rotation:0,value:type==='resistor'?'1kΩ':type==='ceramic'?'10nF':'',nets:{},switches:Array(8).fill(false)};
  // Find a place with no body or pin overlap, instead of dropping onto an installed IC.
  const busy=new Set(state.parts.flatMap(c=>B.pins(c).map(p=>B.nearest(p.x,p.y,1)?.id))),wireHoles=new Set(state.wires.flatMap(w=>[w.a.hole,w.b.hole]));let found=false;
  for(const b of [3,0,1,2]){for(let row=0;row<63;row++){const x=['resistor','ceramic','electrolytic','led'].includes(type)?120+b*286:197+b*286;const c={...p,x,y:B.Y+row*14},ps=B.pins(c);if(B.mounted(c)&&ps.every(q=>{const h=B.nearest(q.x,q.y,1);return !busy.has(h.id)&&!wireHoles.has(h.id);})&&state.parts.every(old=>Math.abs(old.x-c.x)>80||Math.abs(old.y-c.y)>Math.max(50,(B.library[old.type].count/2)*14))){p=c;found=true;break;}}if(found)break;}
  if(!found){p={...p,x:197+3*286,y:B.Y+54*14};p=B.snapPart(p,p.x,p.y);}
  edit(()=>state.parts.push(p));selection={kind:'part',id:p.id};probe=null;setTab('inspector');refresh();pane();notice('已添加 '+B.library[type].name+'，可拖动调整孔位');
 }
 function modeTo(m){mode=m;pending=null;hoverWire=null;document.querySelectorAll('.mode-group [data-action]').forEach(b=>{const yes=b.dataset.action===m;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});stage.dataset.mode=m;svg.querySelector('#draftLayer').innerHTML='';renderWires();renderInspector();$('statusText').textContent=m==='wire'?'布线：点击 A 起点孔，再点击 B 终点孔；中途点击只设置绝缘折点；Esc 取消':m==='probe'?'探针：点击任意插孔，查看真实电气连通范围':'选择：悬停跳线查看 A/B 两端；拖动器件 / 导线折点；空格拖动画布';}
 function select(kind,id){selection={kind,id};hoverWire=null;probe=null;pinFocus=null;activeNet=null;setTab('inspector');refresh();pane();}
 function download(name,content,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
 function modal(title,body,actions=''){const overlay=$('overlay');overlay.innerHTML=`<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialogTitle"><div class="dialog-header"><h2 id="dialogTitle">${title}</h2><button class="icon-button" data-action="closeModal" aria-label="关闭对话框">✕</button></div>${body}<div class="dialog-actions">${actions}<button class="button button-primary" data-action="closeModal">知道了</button></div></section>`;overlay.hidden=false;overlay.querySelector('[data-action="closeModal"]').focus();}
 function reroute(wireId=null){
  const before=B.clone(state);$('overlay').hidden=true;
  try{const result=B.Routing.routeAll(B.clone(state),wireId?{forceAll:true,wireIds:[wireId]}:{});state=result.state;
   if(result.changed)changed(before);else refresh();
   if(result.failures.length)notice(`已调整 ${result.changed} 根线；${result.failures.length} 根仍无法避让，保留原路径，请查看检查连接`);
   else notice(result.changed?`已调整 ${result.changed} 根线，避开器件本体；电气网络保持不变`:'当前跳线已避开器件本体，无需调整');
  }catch(error){state=before;refresh();notice('避让失败，已保留原布线：'+error.message);}
 }
 function constraints(){return `<ol><li><b>FPGA 接口与电平</b>：40 脚图是示意。PPT 第22页允许时钟接17/18/19，当前选择17；其余接口位置须按真实板卡映射。5V 的 ADC / NE555 与 FPGA 的3.3V接口尚未确认兼容。</li><li><b>CD4511BE</b>：已按你的实际型号绘制。TI 给出的5V供电高电平门限最小3.5V；3.3V FPGA输出的接口方案与 DISPLAY_VDD 仍待确认，当前未新增电平转换器。</li><li><b>数码管接法</b>：按老师确认，每只数码管的3脚、8脚分别各串一只1kΩ电阻接地，两只数码管共4只公共阴极电阻；CD4511 的 a–g 直接连数码管，不串段电阻。其余段脚映射与封装尺寸待核对。</li><li><b>拨码 OFF 状态</b>：SPST 断开不会自动产生低电平。参考图保留待核对的实际偏置安排；闭合触点会真实参与通断检查。</li><li><b>库存与导通</b>：10nF共2只，另有100nF；8个Rx是仿真等效值，需核对现有库存。电源轨按课件背面图的中点断开建模；实物每段须用万用表核验。照片孔数与尺寸采用63行归一化。</li></ol>`;}
 function helpContent(full){return `<section class="inspector-section"><h3>按真实插孔布线</h3><p class="muted">V 选择 / W 布线 / P 探针。拖动器件按孔距吸附；R 旋转，Delete 删除，Ctrl+Z 撤销，Ctrl+Shift+Z 重做。F 适合画布。</p><p class="muted">跳线端点固定在插孔。移动器件会改变实际连接，完成后点击“检查连接”。直角路线避开器件本体；移动后若出现红色虚线，可点击“自动避让”或选中跳线重排。</p></section><section class="inspector-section"><h3>跳线只有两端插入</h3><p class="muted">空心圆是实际插入点；整条线身都有绝缘外皮。中途经过的孔、交叉处、方形折点都不连接。悬停或点选一条跳线，其余跳线淡化，A/B 标记显示两端的完整孔号。</p><p class="muted">依次点击 A 起点孔、可选绝缘折点、B 终点孔。选中跳线后拖动端点外圈，双击线段加折点，双击方形折点删除。端点所在的同排五孔组仍按面包板规则导通。</p></section><section class="inspector-section"><h3>面包板内部金属片</h3><p class="muted">每个横排 A–E 为一组，F–J 为另一组；上下行和中槽均隔离。每条正 / 负电源轨独立，且中间断开。五孔之间的外观空隙不会额外切断同半段电源轨。接线柱需要实际跳线接入。</p></section>${full?constraints():`<button class="text-button" data-action="constraints">查看实物核对说明 ↗</button>`}<section class="inspector-section"><h3>资料与封装依据</h3><p class="muted">依据手动八路课程实验需求整理，器件封装与引脚参考 TI 原厂资料；课程原文件和实物照片不随开源项目分发。</p><div class="source-links">${[['NE555','ne555'],['ADC0804','adc0804-n'],['CD4051B','cd4051b'],['CD4511B','cd4511b']].map(([name,url])=>`<a href="https://www.ti.com/lit/ds/symlink/${url}.pdf" target="_blank" rel="noopener">${name} ↗</a>`).join('')}</div></section>`;}
 function check(){
  const errs=analysis.shorts,opens=analysis.opens,n=physicalWireIds().size;
  modal('孔位与实物走线检查',`<div class="check-summary"><div><b class="${errs.length?'bad':'good'}">${errs.length}</b><span>电气误连 / 占孔冲突</span></div><div><b class="${opens.length?'bad':'good'}">${opens.length}</b><span>参考网络未导通</span></div><div><b class="${analysis.clock?'good':'bad'}">${analysis.clock?'✓':'×'}</b><span>555 → FPGA 时钟</span></div><div><b class="${n?'bad':'good'}">${n}</b><span>跳线需避让器件</span></div></div><h3>电气连接</h3><p>按面包板内部金属片、跳线两端、器件占孔和闭合拨码触点计算导通；线身经过和交叉处不导通。器件的电阻、电容、芯片内部逻辑不作为理想导线。</p>${errs.length||opens.length?`<ul class="issue-list">${[...errs,...opens].slice(0,35).map(i=>`<li class="${i.level==='error'?'bad':''}">${esc(i.text)}</li>`).join('')}</ul>`:'<div class="notice"><p>当前 '+analysis.nets.length+' 个参考网络的孔位连接已导通。</p></div>'}${physicalContent()}<p class="muted">避让按俯视器件本体和边缘余量检查；导线可以绝缘交叉。实物引脚、接线空间与线长仍以现场安装为准。</p>${n?'<button class="button button-outline full-width" data-action="autoAvoid">自动避让冲突跳线</button>':''}<h3>接线前待核对</h3>${constraints()}`);
 }

 const actions={
  select:()=>modeTo('select'),wire:()=>modeTo('wire'),probe:()=>{modeTo('probe');notice('点击插孔，绿色高亮将显示真实连通范围');},fit,
  zoomIn:()=>zoom(1.2),zoomOut:()=>zoom(1/1.2),
  undo:()=>{if(!past.length)return;future.push(B.clone(state));state=past.pop();selection=null;probe=null;refresh();persist();},redo:()=>{if(!future.length)return;past.push(B.clone(state));state=future.pop();selection=null;probe=null;refresh();persist();},
  rotate:()=>{if(selection?.kind!=='part'){notice('先选择一个器件');return;}const p=state.parts.find(p=>p.id===selection.id);if(p.locked){notice('请先解除位置锁定');return;}edit(()=>Object.assign(p,B.snapPart({...p,rotation:((p.rotation||0)+90)%360},p.x,p.y)));},
  delete:()=>{if(!selection){notice('先选择一个器件或导线');return;}const sel=selection;edit(()=>{if(sel.kind==='part'){const p=state.parts.find(p=>p.id===sel.id);if(p?.locked){notice('请先解除位置锁定');return;}state.parts=state.parts.filter(p=>p.id!==sel.id);state.wires=state.wires.filter(w=>w.a.part!==sel.id&&w.b.part!==sel.id);}else state.wires=state.wires.filter(w=>w.id!==sel.id);selection=null;probe=null;});},
  export:()=>{download('数字电缆对线器_面包板方案.json',JSON.stringify(state,null,2),'application/json');notice('已导出可继续编辑的 JSON 方案');},import:()=>$('fileInput').click(),
  reset:()=>modal('恢复参考布线',`<p>恢复${B.createStarter().parts.length}个器件及参考跳线，包括两只数码管的四只公共阴极1kΩ电阻。此操作可以撤销；建议先导出当前方案。</p>`,`<button class="button button-outline" data-action="doReset">恢复参考方案</button>`),
  doReset:()=>{edit(()=>{state=prepareRouting(B.createStarter());selection=null;probe=null;activeNet=null;});$('overlay').hidden=true;fit();notice('已恢复八路手动参考布局，可 Ctrl+Z 撤销');},
  check,help:()=>modal('接线工作台使用说明',helpContent(true)),constraints:()=>modal('实物接线前的 5 项核对',constraints()),
  layers:()=>{$('layersPanel').hidden=!$('layersPanel').hidden;},closeModal:()=>$('overlay').hidden=true,closeInspector:()=>document.querySelector('.inspector-panel').classList.remove('mobile-open'),
  clock:()=>{activeNet='clk';selection=null;hoverWire=null;probe=null;refresh();notice('琥珀色：NE555 第3脚 OUT → FPGA 示意接口17 CLK');},clearFocus:()=>{activeNet=null;hoverWire=null;selection=null;probe=null;refresh();},
  autoRoute:()=>reroute(selection?.kind==='wire'?selection.id:null),autoAvoid:()=>reroute(),
  saveSvg:()=>{const c=svg.cloneNode(true);c.setAttribute('viewBox',`0 0 ${B.W} ${B.H}`);c.setAttribute('width',B.W);c.setAttribute('height',B.H);c.querySelector('#viewport').removeAttribute('transform');for(const id of ['handleLayer','draftLayer'])c.querySelector('#'+id).innerHTML='';download('数字电缆对线器_布线图.svg',new XMLSerializer().serializeToString(c),'image/svg+xml');notice('已导出当前显示图层的 SVG 布线图');},
  openLibrary:()=>{modal('添加器件',`<div class="mobile-library">${$('library').innerHTML}</div>`);}
 };
 document.addEventListener('click',e=>{const action=e.target.closest('[data-action]');if(action){actions[action.dataset.action]?.();return;}const tab=e.target.closest('[data-tab]');if(tab){setTab(tab.dataset.tab);return;}const physical=e.target.closest('[data-locatewire]');if(physical){locateConflict(physical.dataset.locatewire,physical.dataset.locatepart);return;}const add=e.target.closest('[data-add]');if(add){$('overlay').hidden=true;addPart(add.dataset.add);return;}const net=e.target.closest('[data-net]');if(net){activeNet=net.dataset.net;selection=null;hoverWire=null;renderWires();renderNets();renderInspector();return;}const part=e.target.closest('[data-focuspart]');if(part){select('part',part.dataset.focuspart);return;}const pin=e.target.closest('[data-probepin]');if(pin){const [part,p]=pin.dataset.probepin.split(':');probe={part,pin:p};renderProbe();renderInspector();updateStatus();}});
 $('searchLibrary').oninput=library;
 ['showWires','showLabels','showTopology'].forEach(id=>$(id).onchange=()=>{renderParts();renderWires();renderPhysical();renderTopology();});
 $('fileInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>3000000)throw Error('方案文件大于3MB');upgradeMessage='';routingMessage='';const next=prepareRouting(prepareLayout(B.validateFile(JSON.parse(await file.text()))),true);edit(()=>{state=next;selection=null;probe=null;activeNet=null;hoverWire=null;});notice([upgradeMessage,routingMessage].filter(Boolean).join('；')||'已导入方案');}catch(err){notice('导入失败：'+err.message);}e.target.value='';};
 $('overlay').addEventListener('click',e=>{if(e.target===$('overlay'))$('overlay').hidden=true;});
 svg.addEventListener('pointerdown',e=>{
  if(e.button!==0&&e.button!==1)return;const p=point(e);lastPoint=p;
  if(space||e.button===1){e.preventDefault();drag={kind:'pan',x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y};svg.setPointerCapture(e.pointerId);return;}
  if(mode==='wire'){const ep=epNear(p);if(!pending){if(!ep){notice('请选择一个插孔或接线柱作为起点');return;}pending={a:ep,bends:[]};}else if(ep){if(JSON.stringify(ep)===JSON.stringify(pending.a)){pending=null;renderDraft(p);return;}let n=1;while(state.wires.some(w=>w.id==='W'+n))n++;const wire={id:'W'+n,a:pending.a,b:ep,bends:pending.bends,color:'#299b82',net:''};edit(()=>state.wires.push(wire));pending=null;selection={kind:'wire',id:wire.id};probe=null;refresh();pane();}else pending.bends.push({x:Math.round(p.x/7)*7,y:Math.round(p.y/7)*7});renderDraft(p);return;}
  if(mode==='probe'){const ep=epNear(p);if(ep){probe=ep;selection=null;activeNet=null;setTab('inspector');refresh();pane();}return;}
  const sw=e.target.closest('[data-switch]');if(sw){const [id,index]=sw.dataset.switch.split(':'),part=state.parts.find(p=>p.id===id);edit(()=>{part.switches??=Array(8).fill(false);part.switches[+index]=!part.switches[+index];});notice(`拨码 ${+index+1} ${part.switches[+index]?'闭合':'断开'}，通断关系已更新`);return;}
  const handle=e.target.closest('[data-handle]');if(handle){const name=handle.dataset.handle,[id,key]=name.split(':'),now=performance.now();if(key!=='a'&&key!=='b'&&lastHandleDown?.name===name&&now-lastHandleDown.time<430&&Math.hypot(e.clientX-lastHandleDown.x,e.clientY-lastHandleDown.y)<8){lastHandleDown=null;edit(()=>state.wires.find(w=>w.id===id).bends.splice(+key,1));return;}lastHandleDown={name,time:now,x:e.clientX,y:e.clientY};drag={kind:'handle',id,key,before:B.clone(state)};svg.setPointerCapture(e.pointerId);return;}
  const partEl=e.target.closest('[data-part]');if(partEl){const id=partEl.dataset.part,c=state.parts.find(p=>p.id===id);select('part',id);const pin=e.target.closest('[data-pin]');if(pin){pinFocus=pin.dataset.pin.split(':')[1];renderInspector();}if(!c.locked){drag={kind:'part',id,x:p.x,y:p.y,px:c.x,py:c.y,before:B.clone(state)};svg.setPointerCapture(e.pointerId);}return;}
  const wire=e.target.closest('[data-wire]');if(wire){const id=wire.dataset.wire,now=performance.now();if(lastWireDown&&lastWireDown.id===id&&now-lastWireDown.time<430&&Math.hypot(e.clientX-lastWireDown.x,e.clientY-lastWireDown.y)<8){lastWireDown=null;addBendAt(state.wires.find(w=>w.id===id),p);}else{lastWireDown={id,time:now,x:e.clientX,y:e.clientY};select('wire',id);}return;}
  selection=null;hoverWire=null;probe=null;activeNet=null;refresh();
 });
 function renderDraft(p){let out='';if(pending){const a=B.epPoint(pending.a,state);out=`<path d="${pathOf([a,...pending.bends,p])}" fill="none" stroke="#169c7d" stroke-width="3" stroke-dasharray="6 4"/>`;}const ep=epNear(p);if(ep&&(mode==='wire'||mode==='probe')){const q=B.epPoint(ep,state);out+=`<circle cx="${q.x}" cy="${q.y}" r="7" fill="#39c99e55" stroke="#138d70" stroke-width="1.5"/>`;}svg.querySelector('#draftLayer').innerHTML=out;}
 svg.addEventListener('pointermove',e=>{
  const p=point(e);lastPoint=p;
  if(drag?.kind==='pan'){cam.x=drag.cx+e.clientX-drag.x;cam.y=drag.cy+e.clientY-drag.y;camera();return;}
  if(drag?.kind==='part'){const c=state.parts.find(c=>c.id===drag.id),next=B.snapPart(c,drag.px+p.x-drag.x,drag.py+p.y-drag.y);c.x=Math.max(10,Math.min(B.W-10,next.x));c.y=Math.max(10,Math.min(B.H-10,next.y));inspectPhysical();renderParts();renderWires();renderPhysical();updateStatus();return;}
  if(drag?.kind==='handle'){const w=state.wires.find(w=>w.id===drag.id);if(drag.key==='a'||drag.key==='b'){const ep=epNear(p);if(ep)w[drag.key]=ep;}else w.bends[+drag.key]={x:Math.round(p.x/7)*7,y:Math.round(p.y/7)*7};inspectPhysical();renderWires();renderPhysical();updateStatus();return;}
  renderDraft(p);hoverWireTo(mode==='select'?e.target.closest('[data-wire]')?.dataset.wire||null:null);const ep=epNear(p);if(ep&&!wireFocus())$('selectionText').textContent=epLabel(ep);
 });
 svg.addEventListener('pointerleave',()=>{if(!drag)hoverWireTo(null);});
 function endDrag(){if(!drag)return;const d=drag;drag=null;if(d.kind!=='pan'&&JSON.stringify(d.before)!==JSON.stringify(state))changed(d.before);else updateStatus();}
 svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',()=>{if(drag?.before)state=drag.before;drag=null;refresh();});
 function addBendAt(w,p){const pts=vertices(w);let min=Infinity,idx=0;for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);if(d<min){min=d;idx=i;}}edit(()=>{w.bends=pts.slice(1,-1).map(p=>({x:p.x,y:p.y}));w.bends.splice(idx,0,{x:Math.round(p.x/7)*7,y:Math.round(p.y/7)*7});});}
 svg.addEventListener('wheel',e=>{e.preventDefault();const r=svg.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0015),{x:e.clientX-r.left,y:e.clientY-r.top});},{passive:false});
 document.addEventListener('keydown',e=>{if($('overlay').hidden===false){if(e.key==='Escape')$('overlay').hidden=true;if(e.key==='Tab'){const fs=[...$('overlay').querySelectorAll('button,a,input,select,textarea')].filter(x=>!x.disabled);if(e.shiftKey&&document.activeElement===fs[0]){e.preventDefault();fs.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===fs.at(-1)){e.preventDefault();fs[0]?.focus();}}return;}if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.code==='Space'){space=true;e.preventDefault();stage.classList.add('panning');return;}const key=e.key.toLowerCase();if((e.ctrlKey||e.metaKey)&&key==='z'){e.preventDefault();actions[e.shiftKey?'redo':'undo']();return;}if((e.ctrlKey||e.metaKey)&&key==='y'){e.preventDefault();actions.redo();return;}const map={v:'select',w:'wire',p:'probe',f:'fit',r:'rotate',delete:'delete',backspace:'delete'};if(map[key]){e.preventDefault();actions[map[key]]();}if(e.key==='Escape'){pending=null;probe=null;activeNet=null;selection=null;modeTo('select');refresh();$('layersPanel').hidden=true;document.querySelector('.inspector-panel').classList.remove('mobile-open');}});
 document.addEventListener('keyup',e=>{if(e.code==='Space'){space=false;stage.classList.remove('panning');}});window.addEventListener('blur',()=>{space=false;stage.classList.remove('panning');endDrag();});
 buildBoard();library();refresh();requestAnimationFrame(fit);window.addEventListener('resize',()=>{clearTimeout(window._resizeFit);window._resizeFit=setTimeout(fit,200);});
 const mobileButton=document.createElement('button');mobileButton.className='tool-button mobile-add';mobileButton.dataset.action='openLibrary';mobileButton.textContent='＋器件';document.querySelector('.mode-group').append(mobileButton);
 // Exposes read-only snapshots for reproducible UI validation; no network or runtime services required.
 window.breadboard={get state(){return B.clone(state);},get report(){return{clock:analysis.clock,shorts:analysis.shorts,opens:analysis.opens,nets:analysis.nets.length};},get routing(){return B.clone(physicalReport);},get camera(){return {...cam};}};
 if(upgradeMessage||routingMessage)setTimeout(()=>notice([upgradeMessage,routingMessage].filter(Boolean).join('；')),350);
})();

