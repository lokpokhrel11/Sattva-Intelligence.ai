/* Client-side search across published site pages. Update the episode range as the series grows. */
(function(){
"use strict";
const resources=[
["episodes.html","Episode Index"],["verse-index.html","Verse Index"],
["concept-index.html","Concept Index"],["sanskrit-terms.html","Sanskrit Terms"],
["sanskrit-grammar.html","Sanskrit Text & Grammar"],["teaching-learning.html","Teaching & Learning"],
["indic-minds.html","Indic Minds"],["indic-wisdom.html","Indic Wisdom"],
...Array.from({length:12},(_,i)=>["episode-"+String(i+1).padStart(2,"0")+".html","Episode "+(i+1)])
];
const form=document.getElementById("archive-search-form");
const input=document.getElementById("archive-query");
const status=document.getElementById("search-status");
const results=document.getElementById("search-results");
let cached=null;
function normalize(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();}
async function load(){
if(cached)return cached;
const docs=await Promise.all(resources.map(async ([url,label])=>{
try{
const response=await fetch(url,{cache:"default"});
if(!response.ok)throw Error("HTTP "+response.status);
const html=new DOMParser().parseFromString(await response.text(),"text/html");
for(const el of html.querySelectorAll("script,style,nav,footer,header.site-header"))el.remove();
const main=html.querySelector("main")||html.body;
const raw=(main.innerText||main.textContent||"").replace(/\s+/g," ").trim();
return {url,label,text:raw,norm:normalize(raw)};
}catch(e){return null;}
}));
cached=docs.filter(Boolean);return cached;
}
function snippet(text,q){
const norm=normalize(text),i=norm.indexOf(q);
if(i<0)return text.slice(0,175)+(text.length>175?"…":"");
const start=Math.max(0,i-75),end=Math.min(text.length,i+q.length+110);
return (start?"…":"")+text.slice(start,end)+(end<text.length?"…":"");
}
form.addEventListener("submit",async e=>{
e.preventDefault();
const q=normalize(input.value);
if(q.length<2){status.textContent="Enter at least two characters.";return;}
status.textContent="Searching published pages…";results.replaceChildren();
try{
const docs=await load();const hits=docs.filter(d=>d.norm.includes(q));
status.textContent=hits.length+" matching page"+(hits.length===1?"":"s")+" found across "+docs.length+" available pages.";
hits.sort((a,b)=>(normalize(b.label).includes(q)?1:0)-(normalize(a.label).includes(q)?1:0));
for(const hit of hits){
const article=document.createElement("article");article.className="search-result";
const heading=document.createElement("h2"),link=document.createElement("a");
link.href=hit.url;link.textContent=hit.label;heading.append(link);
const desc=document.createElement("p");desc.textContent=snippet(hit.text,q);
article.append(heading,desc);results.append(article);
}
if(!hits.length){const p=document.createElement("p");p.textContent="No matching published page found. Try another spelling or browse the indexes.";results.append(p);}
}catch(err){status.textContent="Search could not load the archive. Please use the indexes below.";}
});
const initial=new URLSearchParams(location.search).get("q");if(initial){input.value=initial;form.requestSubmit();}
})();