/* Static archive search. Index regenerated from sitemap by GitHub Actions. */
(function(){
"use strict";
const form=document.getElementById("archive-search-form");
const input=document.getElementById("archive-query");
const status=document.getElementById("search-status");
const results=document.getElementById("search-results");
let pending=null;
function normalize(s){
 return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
}
async function fallbackLoad(){
 const response=await fetch("sitemap.xml",{cache:"no-cache"});
 if(!response.ok)throw Error("Sitemap unavailable");
 const xml=new DOMParser().parseFromString(await response.text(),"application/xml");
 if(xml.querySelector("parsererror"))throw Error("Invalid sitemap");
 const base=new URL(".",location.href);
 const urls=[...xml.getElementsByTagName("loc")].map(n=>n.textContent.trim()).map(v=>{try{return new URL(v)}catch(e){return null}})
  .filter(u=>u&&u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&u.pathname.endsWith(".html")&&!u.pathname.endsWith("/search.html"))
  .map(u=>u.pathname.slice(base.pathname.length));
 const unique=[...new Set(urls)],docs=new Array(unique.length);
 let cursor=0;
 async function worker(){
  while(cursor<unique.length){
   const i=cursor++,url=unique[i];
   try{
    const r=await fetch(url);
    if(!r.ok)continue;
    const page=new DOMParser().parseFromString(await r.text(),"text/html");
    const title=(page.querySelector("title")?.textContent||url).replace(/\\s*[—|]\\s*Sattva Intelligence.*$/,"").trim();
    for(const el of page.querySelectorAll("script,style,nav,footer,header.site-header"))el.remove();
    const text=(page.querySelector("main")?.textContent||"").replace(/\\s+/g," ").trim();
    docs[i]={url,title,text,norm:normalize(text),titleNorm:normalize(title)};
   }catch(e){}
  }
 }
 await Promise.all(Array.from({length:Math.min(6,unique.length)},()=>worker()));
 return docs.filter(Boolean);
}
function load(){
 if(!pending)pending=fetch("search-index.json",{cache:"no-cache"}).then(r=>{
  if(!r.ok)throw Error("Search index unavailable");
  return r.json();
 }).then(data=>{
  if(data.version!==1||!Array.isArray(data.documents))throw Error("Invalid search index");
  return data.documents.map(d=>({...d,norm:normalize(d.text),titleNorm:normalize(d.title)}));
 }).catch(async e=>{try{return await fallbackLoad();}catch(err){pending=null;throw err;}});
 return pending;
}
function snippet(text,q){
 const chars=Array.from(text||"");
 let folded="",offsets=[];
 chars.forEach((c,j)=>{for(const ch of normalize(c)){folded+=ch;offsets.push(j);}});
 const i=folded.indexOf(q);
 if(i<0)return chars.slice(0,175).join("")+(chars.length>175?"…":"");
 const start=Math.max(0,(offsets[i]??0)-75);
 const end=Math.min(chars.length,(offsets[i+q.length-1]??0)+111);
 return (start?"…":"")+chars.slice(start,end).join("")+(end<chars.length?"…":"");
}
form.addEventListener("submit",async e=>{
 e.preventDefault();
 const q=normalize(input.value);
 if(q.length<2){status.textContent="Enter at least two characters.";return;}
 status.textContent="Searching published pages…";results.replaceChildren();
 try{
  const docs=await load();
  const hits=docs.filter(d=>d.norm.includes(q)||d.titleNorm.includes(q));
  hits.sort((a,b)=>Number(b.titleNorm.includes(q))-Number(a.titleNorm.includes(q)));
  status.textContent=hits.length+" matching page"+(hits.length===1?"":"s")+" found across "+docs.length+" indexed pages.";
  for(const hit of hits){
   const article=document.createElement("article");article.className="search-result";
   const heading=document.createElement("h2"),link=document.createElement("a");
   link.href=hit.url;link.textContent=hit.title;heading.append(link);
   const desc=document.createElement("p");desc.textContent=snippet(hit.text,q);
   article.append(heading,desc);results.append(article);
  }
  if(!hits.length){const p=document.createElement("p");p.textContent="No matching published page found. Try another spelling or browse the indexes.";results.append(p);}
 }catch(err){
  status.textContent="Search index is temporarily unavailable. Please use the indexes below.";
 }
});
const initial=new URLSearchParams(location.search).get("q");
if(initial){input.value=initial;form.requestSubmit();}
})();
