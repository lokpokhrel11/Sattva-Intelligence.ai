document.addEventListener('DOMContentLoaded',()=>{const button=document.querySelector('.menu-button');const nav=document.querySelector('.site-nav');if(button&&nav){button.addEventListener('click',()=>{const open=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(open));button.textContent=open?'Close':'Menu'});nav.addEventListener('click',e=>{if(e.target.matches('a')){nav.classList.remove('open');button.setAttribute('aria-expanded','false');button.textContent='Menu'}})}document.querySelectorAll('table[data-sortable]').forEach(table=>{const body=table.tBodies[0];table.querySelectorAll('th button[data-column]').forEach(btn=>{btn.addEventListener('click',()=>{const index=Number(btn.dataset.column);const current=btn.getAttribute('aria-sort');const direction=current==='ascending'?'descending':'ascending';table.querySelectorAll('th button').forEach(other=>other.removeAttribute('aria-sort'));btn.setAttribute('aria-sort',direction);const rows=[...body.rows];rows.sort((a,b)=>{const av=(a.cells[index]?.dataset.sort||a.cells[index]?.textContent||'').trim();const bv=(b.cells[index]?.dataset.sort||b.cells[index]?.textContent||'').trim();const an=Number(av),bn=Number(bv);let result=!Number.isNaN(an)&&!Number.isNaN(bn)?an-bn:av.localeCompare(bv,undefined,{numeric:true,sensitivity:'base'});return direction==='ascending'?result:-result});rows.forEach(row=>body.appendChild(row))})})})});
/* Archive search deep links: locate and highlight the selected occurrence. */
document.addEventListener("DOMContentLoaded",()=>{
 const params=new URLSearchParams(location.search);
 const query=(params.get("archive_find")||"").trim();
 if(query.length<2)return;
 const requested=Math.max(0,Number.parseInt(params.get("archive_occurrence")||"0",10)||0);
 const main=document.querySelector("main");if(!main)return;
 const normalize=s=>String(s||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();
 const needle=normalize(query);
 const walker=document.createTreeWalker(main,NodeFilter.SHOW_TEXT,{
  acceptNode(node){
   if(!node.nodeValue.trim()||node.parentElement?.closest("script,style,nav,button,select,textarea,mark"))return NodeFilter.FILTER_REJECT;
   return NodeFilter.FILTER_ACCEPT;
  }
 });
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 let count=0,first=null,chosen=null;
 for(const node of nodes){
  const chars=Array.from(node.nodeValue);
  let folded="",offsets=[];
  chars.forEach((c,i)=>{for(const ch of normalize(c)){folded+=ch;offsets.push(i);}});
  let from=0;
  while(from<folded.length){
   const i=folded.indexOf(needle,from);if(i<0)break;
   const start=offsets[i],end=offsets[i+needle.length-1]+1;
   const candidate={node,start,end};
   if(!first)first=candidate;
   if(count===requested){chosen=candidate;break;}
   count++;from=i+Math.max(1,needle.length);
  }
  if(chosen)break;
 }
 const target=chosen||first;if(!target)return;
 const {node,start,end}=target;
 const chars=Array.from(node.nodeValue);
 const before=chars.slice(0,start).join(""),word=chars.slice(start,end).join(""),after=chars.slice(end).join("");
 const mark=document.createElement("mark");mark.textContent=word;
 mark.style.cssText="background:#ffe17a;color:#171717;padding:2px 3px;border-radius:2px";
 const fragment=document.createDocumentFragment();
 fragment.append(document.createTextNode(before),mark,document.createTextNode(after));
 node.replaceWith(fragment);
 mark.setAttribute("tabindex","-1");
 requestAnimationFrame(()=>{mark.scrollIntoView({behavior:"auto",block:"center"});mark.focus({preventScroll:true});});
});
