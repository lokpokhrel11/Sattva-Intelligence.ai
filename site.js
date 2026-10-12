document.addEventListener('DOMContentLoaded',()=>{const button=document.querySelector('.menu-button');const nav=document.querySelector('.site-nav');if(button&&nav){button.addEventListener('click',()=>{const open=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(open));button.textContent=open?'Close':'Menu'});nav.addEventListener('click',e=>{if(e.target.matches('a')){nav.classList.remove('open');button.setAttribute('aria-expanded','false');button.textContent='Menu'}})}document.querySelectorAll('table[data-sortable]').forEach(table=>{const body=table.tBodies[0];table.querySelectorAll('th button[data-column]').forEach(btn=>{btn.addEventListener('click',()=>{const index=Number(btn.dataset.column);const current=btn.getAttribute('aria-sort');const direction=current==='ascending'?'descending':'ascending';table.querySelectorAll('th button').forEach(other=>other.removeAttribute('aria-sort'));btn.setAttribute('aria-sort',direction);const rows=[...body.rows];rows.sort((a,b)=>{const av=(a.cells[index]?.dataset.sort||a.cells[index]?.textContent||'').trim();const bv=(b.cells[index]?.dataset.sort||b.cells[index]?.textContent||'').trim();const an=Number(av),bn=Number(bv);let result=!Number.isNaN(an)&&!Number.isNaN(bn)?an-bn:av.localeCompare(bv,undefined,{numeric:true,sensitivity:'base'});return direction==='ascending'?result:-result});rows.forEach(row=>body.appendChild(row))})})})});
/* Archive search: highlight every match and navigate between occurrences. */
document.addEventListener("DOMContentLoaded",()=>{
 const params=new URLSearchParams(location.search);
 const query=(params.get("archive_find")||"").trim();
 if(query.length<2)return;
 const main=document.querySelector("main");if(!main)return;
 const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const needle=normalize(query);
 if(!needle)return;
 const requested=Math.max(0,parseInt(params.get("archive_occurrence")||"0",10)||0);
 const walker=document.createTreeWalker(main,NodeFilter.SHOW_TEXT,{
  acceptNode(node){
   if(!node.nodeValue.trim()||node.parentElement?.closest("script,style,nav,button,select,textarea,mark,[contenteditable]"))return NodeFilter.FILTER_REJECT;
   return NodeFilter.FILTER_ACCEPT;
  }
 });
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 const marks=[];
 for(const node of nodes){
  const chars=Array.from(node.nodeValue);
  let folded="",offsets=[];
  chars.forEach((c,i)=>{for(const ch of normalize(c)){folded+=ch;offsets.push(i);}});
  const ranges=[];let from=0;
  while(from<folded.length){
   const i=folded.indexOf(needle,from);if(i<0)break;
   ranges.push([offsets[i],offsets[i+needle.length-1]+1]);
   from=i+Math.max(1,needle.length);
  }
  if(!ranges.length)continue;
  const fragment=document.createDocumentFragment();let last=0;
  for(const [start,end] of ranges){
   fragment.append(document.createTextNode(chars.slice(last,start).join("")));
   const mark=document.createElement("mark");
   mark.className="archive-find-mark";
   mark.textContent=chars.slice(start,end).join("");
   mark.style.cssText="background:#ffe27a;color:#171717;padding:1px 2px;border-radius:2px";
   fragment.append(mark);marks.push(mark);last=end;
  }
  fragment.append(document.createTextNode(chars.slice(last).join("")));
  node.replaceWith(fragment);
 }
 if(!marks.length)return;
 const bar=document.createElement("div");
 bar.setAttribute("role","region");bar.setAttribute("aria-label","Search match navigation");
 bar.style.cssText="position:fixed;z-index:9999;top:8px;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 24px);box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;padding:9px 12px;border:1px solid #aa842c;border-radius:8px;background:#1e1e1e;color:#fff;box-shadow:0 3px 18px #0008;font:14px system-ui,sans-serif";
 const label=document.createElement("span");label.setAttribute("aria-live","polite");
 label.style.cssText="font-weight:600;margin-right:5px";
 const makeButton=(name,handler)=>{
  const button=document.createElement("button");button.type="button";button.textContent=name;
  button.style.cssText="border:1px solid #bfa05b;border-radius:5px;background:#f0d48d;color:#171717;font:inherit;font-weight:600;padding:5px 9px;cursor:pointer";
  button.addEventListener("click",handler);return button;
 };
 let current=Math.min(requested,marks.length-1);
 const choose=i=>{
  marks[current]?.removeAttribute("data-current");
  if(marks[current])marks[current].style.cssText="background:#ffe27a;color:#171717;padding:1px 2px;border-radius:2px";
  current=(i+marks.length)%marks.length;
  const selected=marks[current];selected.setAttribute("data-current","true");
  selected.style.cssText="background:#ffad21;color:#111;outline:3px solid #c95000;padding:2px 3px;border-radius:2px;font-weight:700";
  label.textContent='"'+query+'" · '+(current+1)+" of "+marks.length;
  selected.scrollIntoView({block:"center",behavior:"auto"});
 };
 const clear=()=>{
  const clean=new URL(location.href);
  clean.searchParams.delete("archive_find");clean.searchParams.delete("archive_occurrence");
  location.assign(clean.href);
 };
 bar.append(label,makeButton("← Previous",()=>choose(current-1)),makeButton("Next →",()=>choose(current+1)),makeButton("Clear",clear));
 document.body.append(bar);
 requestAnimationFrame(()=>choose(current));
});
