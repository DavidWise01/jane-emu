/* AV-186 · Three-tool UI: PLAY / LEARN / VERIFY.
 * Existing live controls, IDs, event handlers and emulator iframe remain unchanged.
 * Only move sidebar elements to three tab containers. New instruments auto-route.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV186Tools=api;
 if(typeof document!=='undefined'){
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
   else api.mount();
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const TOOL_IDS=['play','learn','verify'];
 const PLAY=/^(players|av096|av097|trace|assist|game|controller|input|rom|pad|speed|turn|hand|fight|objective|punch|sync|arcade|cubit|plasma|combat|start|recovery)/i;
 const VERIFY=/^(av17[5-9]|av18[0-9]|evidence|test|audit|verify|calibr|holdout|confidence|transfer|shift|screen|event|log|observ|probe|instrument|diagnos|playability)/i;
 function groupFor(key,heading=''){
   const k=String(key||'').toLowerCase(),label=String(heading||'').toLowerCase();
   if(/^av18[1-9]$/.test(k)||/^av17[5-9]$/.test(k))return 'verify';
   if(/rom|live|nes|player|turn|start|input|gamepad|speed|control|life loss|life lost/.test(label)&&!/test|evidence|verification|monitor/.test(label))return 'play';
   if(/evidence|audit|test|proof|verify|calibrat|holdout|measurement|confidence|diagnos/.test(label))return 'verify';
   if(/play|players|controls|assist|sync|fight|combat|game|pad|turn|action/.test(k)&&!/auditor|playability/.test(k))return 'play';
   if(VERIFY.test(k))return 'verify';
   if(PLAY.test(k))return 'play';
   return 'learn';
 }
 function mount(){
   if(document.getElementById('av186-three-tools'))return;
   const sidebar=document.querySelector('.instrument-panel');if(!sidebar)return;
   const doc=document;
   const top=doc.createElement('div');top.id='av186-three-tools';
   top.style.cssText='display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;position:sticky;top:0;z-index:10;background:#100e19;padding:6px 0;border-bottom:1px solid #a365f2';
   const panes={},buttons={};
   function setActive(name){
     if(!TOOL_IDS.includes(name))return;
     for(const t of TOOL_IDS){
       const on=t===name;
       buttons[t].setAttribute('aria-selected',String(on));
       buttons[t].style.cssText='padding:9px 2px;font-size:12px;font-weight:900;border:1px solid '+(on?'#ff8a36':'#744690')+';background:'+(on?'#332032':'#151021')+';color:'+(on?'#ffbb77':'#d8bafa')+';box-shadow:'+(on?'0 0 13px #fa7a3966':'none');
       panes[t].hidden=!on;
     }
   }
   for(const name of TOOL_IDS){
     const button=doc.createElement('button');button.type='button';button.id='av186-tab-'+name;
     button.textContent=name.toUpperCase();button.setAttribute('role','tab');
     button.addEventListener('click',()=>setActive(name));buttons[name]=button;top.append(button);
   }
   sidebar.prepend(top);
   for(const name of TOOL_IDS){
     const content=doc.createElement('div');content.id='av186-pane-'+name;
     content.setAttribute('role','tabpanel');content.style.cssText='padding:4px 0';
     panes[name]=content;sidebar.append(content);
   }
   function place(node){
     if(!node||node.nodeType!==1||node===top||node===panes.play||node===panes.learn||node===panes.verify)return;
     const heading=node.querySelector?.('summary,.amp-title,h2,h3')?.textContent||node.textContent?.slice(0,90)||'';
     const id=node.id||node.className?.toString?.().split(' ')[0]||'';
     const group=groupFor(id,heading);
     panes[group].append(node);
   }
   for(const node of Array.from(sidebar.children))place(node);
   // Observe only direct additions. Moving nodes into panes does not retrigger this observer.
   if(typeof MutationObserver!=='undefined'){
     const observer=new MutationObserver(changes=>{
       for(const change of changes)for(const node of change.addedNodes)place(node);
     });
     observer.observe(sidebar,{childList:true});
   }
   setActive('play');
   window.JANE_THREE_TOOLS={select:setActive,groups:TOOL_IDS.slice(),route:place};
 }
 return {TOOL_IDS,groupFor,mount};
});
