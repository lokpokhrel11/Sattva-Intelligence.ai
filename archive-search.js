/* Client-side search across published site pages. Update the episode range as the series grows. */
(function(){
"use strict";
const fixedResources=[
["episodes.html","Episode Index"],["verse-index.html","Verse Index"],
["concept-index.html","Concept Index"],["sanskrit-terms.html","Sanskrit Terms"],
["sanskrit-grammar.html","Sanskrit Text & Grammar"],["teaching-learning.html","Teaching & Learning"],
["indic-minds.html","Indic Minds"],["indic-wisdom.html","Indic Wisdom"]
];
async function discoverResources(){
 const response=await fetch("sitemap.xml",{cache:"no-cache"});
 if(!response.ok)throw Error("Sitemap unavailable");
 const xml=new DOMParser().parseFromString(await response.text(),"application/xml");
 if(xml.querySelector("parsererror"))throw Error("Invalid sitemap");
 const episodeUrls=Array.from(xml.getElementsByTagName("loc"))
  .map(node=>node.textContent.trim())
  .map(value=>{try{return new URL(value,location.href)}catch(e){return null}})
  .filter(url=>url&&url.origin===location.origin&&url.pathname.startsWith(new URL(".",location.href).pathname)&&/\/episode-\d+\.html$/.test(url.pathname))
  .map(url=>url.pathname.split("/").pop());
 const episodes=[...new Set(episodeUrls)].sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]))
  .map(url=>[url,"Episode "+Number(url.match(/\d+/)[0])]);
 return [...fixedResources,...episodes];
}
const form=document.getElementById("archive-search-form");
const input=document.getElementById("archive-query");
const status=document.getElementById("search-status");
const results=document.getElementById("search-results");
let cached=null;
function normalize(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();}
async function load(){
 if(cached)return cached;
 const resources=await discoverResources();
 const docs=new Array(resources.length);
 let cursor=0;
 async function worker(){
  while(cursor<resources.length){
   const i=cursor++;
   const [url,label]=resources[i];
   try{
    const response=await fetch(url,{cache:"default"});
    if(!response.ok)throw Error("HTTP "+response.status);
    const html=new DOMParser().parseFromString(await response.text(),"text/html");
    const title=(html.querySelector("title")?.textContent||label).replace(/\s*[—|]\\s*Sattva Intelligence.*$/,"").trim();
    for(const el of html.querySelectorAll("script,style,nav,footer,header.site-header"))el.remove();
    const main=html.querySelector("main")||html.body;
    const raw=(main.textContent||"").replace(/\s+/g," ").trim();
    docs[i]={url,label,title,text:raw,norm:normalize(raw),titleNorm:normalize(title)};
   }catch(e){docs[i]=null;}
  }
 }
 await Promise.all(Array.from({length:Math.min(6,resources.length)},()=>worker()));
 return {docs:docs.filter(Boolean),total:resources.length};
}
function snippet(text,q){
const chars=Array.from(text);
let folded="",offsets=[];
chars.forEach((c,j)=>{for(const ch of normalize(c)){folded+=ch;offsets.push(j);}});
const i=folded.indexOf(q);
if(i<0)return text.slice(0,175)+(chars.length>175?"…":"");
const start=Math.max(0,(offsets[i]??0)-75),end=Math.min(chars.length,(offsets[i+q.length-1]??0)+111);
return (start?"…":"")+chars.slice(start,end).join("")+(end<chars.length?"…":"");
}
form.addEventListener("submit",async e=>{
e.preventDefault();
const q=normalize(input.value);
if(q.length<2){status.textContent="Enter at least two characters.";return;}
status.textContent="Searching published pages…";results.replaceChildren();
try{
const {docs,total}=await load();const hits=docs.filter(d=>d.norm.includes(q)||d.titleNorm.includes(q));
status.textContent=hits.length+" matching page"+(hits.length===1?"":"s")+" found across "+docs.length+" of "+total+" indexed pages."+(docs.length<total?" Some pages could not be loaded.":"");
hits.sort((a,b)=>Number(b.titleNorm.includes(q))-Number(a.titleNorm.includes(q)));
for(const hit of hits){
const article=document.createElement("article");article.className="search-result";
const heading=document.createElement("h2"),link=document.createElement("a");
link.href=hit.url;link.textContent=hit.title;heading.append(link);
const desc=document.createElement("p");desc.textContent=snippet(hit.text,q);
article.append(heading,desc);results.append(article);
}
if(!hits.length){const p=document.createElement("p");p.textContent="No matching published page found. Try another spelling or browse the indexes.";results.append(p);}
}catch(err){status.textContent="Search could not load the archive. Please use the indexes below.";}
});
const initial=new URLSearchParams(location.search).get("q");if(initial){input.value=initial;form.requestSubmit();}
})();