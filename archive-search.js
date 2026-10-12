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
    const title=(page.querySelector("title")?.textContent||url).replace(/\s*[—|]\s*Sattva Intelligence.*$/,"").trim();
    for(const el of page.querySelectorAll("script,style,nav,footer,header.site-header"))el.remove();
    const text=(page.querySelector("main")?.textContent||"").replace(/\s+/g," ").trim();
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
function matches(text,q,limit=6){
 const chars=Array.from(text||"");
 let folded="",offsets=[];
 chars.forEach((c,j)=>{const v=normalize(c);for(const ch of v){folded+=ch;offsets.push(j);}});
 const found=[];let from=0,index=0;
 while(from<folded.length){
  const i=folded.indexOf(q,from);if(i<0)break;
  const begin=offsets[i]??0,end=(offsets[i+q.length-1]??begin)+1;
  const left=Math.max(0,begin-85),right=Math.min(chars.length,end+105);
  if(found.length<limit)found.push({occurrence:index,snippet:(left?"…":"")+chars.slice(left,right).join("")+(right<chars.length?"…":""),matchStart:begin-left+(left?1:0),matchLength:end-begin});
  index++;from=i+Math.max(1,q.length);
 }
 return found;
}
function passageLink(url,q,occurrence){
 const target=new URL(url,location.href);
 target.searchParams.set("archive_find",q);
 target.searchParams.set("archive_occurrence",String(occurrence));
 return target.href;
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
   const passages=matches(hit.text,q);
   const heading=document.createElement("h2"),link=document.createElement("a");
   link.href=passages.length?passageLink(hit.url,q,passages[0].occurrence):hit.url;
   link.textContent=hit.title;heading.append(link);article.append(heading);
   if(passages.length){
    const list=document.createElement("div");list.className="search-passages";
    passages.forEach((passage,i)=>{
     const p=document.createElement("p");
     const a=document.createElement("a");
     a.href=passageLink(hit.url,q,passage.occurrence);
     // Only the matching word is yellow; surrounding excerpt remains normal text.
     a.style.cssText="color:inherit;text-decoration:none;display:block;line-height:1.65";
     const chars=Array.from(passage.snippet);
     const begin=passage.matchStart,end=begin+passage.matchLength;
     a.append(document.createTextNode(chars.slice(0,begin).join("")));
     const mark=document.createElement("mark");
     mark.textContent=chars.slice(begin,end).join("");
     mark.style.cssText="background:#ffe27a;color:#171717;font-weight:700;padding:1px 2px;border-radius:2px";
     a.append(mark,document.createTextNode(chars.slice(end).join("")));
     a.addEventListener("mouseenter",()=>{a.style.textDecoration="underline";});
     a.addEventListener("mouseleave",()=>{a.style.textDecoration="none";});
     a.setAttribute("aria-label","Open matching passage "+(i+1)+" in "+hit.title);
     p.append(a);list.append(p);
    });
    article.append(list);
   }else{
    const desc=document.createElement("p");desc.textContent="Term found in page title. Open page.";article.append(desc);
   }
   results.append(article);
  }
  if(!hits.length){const p=document.createElement("p");p.textContent="No matching published page found. Try another spelling or browse the indexes.";results.append(p);}
 }catch(err){
  status.textContent="Search index is temporarily unavailable. Please use the indexes below.";
 }
});
const initial=new URLSearchParams(location.search).get("q");
if(initial){input.value=initial;form.requestSubmit();}
})();
