// ---------- Carnet Forme : logique de l'app (rendu, repas, musculation, catalogue, séance proposée, minuteur) ----------
// Repris de l'artefact d'origine ; seuls le stockage, les comptes et l'IA ont changé.
import { SPORTS, QUICK, DEFAULT_EX, GROUPS, EQUIP, CATALOG, TEMPLATES, BASE_EX, ISO_EX, CLASSICS } from "./data.js";
import * as storage from "./storage.js";
import { initAuth, showAuth, hideAuth, cachedUser, forgetUser, signOut, changePassword, deleteAccount, frError } from "./auth.js";

const pad=n=>String(n).padStart(2,"0");
const keyOf=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const fromKey=k=>{const[y,m,d]=k.split("-").map(Number);return new Date(y,m-1,d)};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const fmt1=n=>(Math.round(n*10)/10).toLocaleString("fr-FR");
const $=id=>document.getElementById(id);

const state={days:{},settings:{weight:null,factor:1.8,dose:5,weekGoal:3},sel:keyOf(new Date()),month:null};
state.month=(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)})();

// ---------- stockage : tout passe par js/storage.js ----------
function saveDay(k){storage.saveDay(k,state.days[k]||{date:k,protein:[],creatine:false,sports:[]})}
let setTimer=null;
function saveSettings(){
  clearTimeout(setTimer);
  setTimer=setTimeout(()=>storage.saveSettings({...state.settings}),500);
}
function day(k){return state.days[k]||{date:k,protein:[],creatine:false,sports:[]}}
function editDay(k,fn){const d=JSON.parse(JSON.stringify(day(k)));fn(d);state.days[k]=d;saveDay(k);render()}

// ---------- calculs ----------
const target=()=>state.settings.weight?Math.round(state.settings.weight*state.settings.factor):null;
const total=d=>(d.protein||[]).reduce((s,e)=>s+(+e.g||0),0);
function streak(){
  let d=new Date(); if(!day(keyOf(d)).creatine) d=addDays(d,-1);
  let n=0; while(day(keyOf(d)).creatine){n++;d=addDays(d,-1)} return n;
}

// ---------- rendu ----------
function render(){
  const k=state.sel, d=day(k), date=fromKey(k), todayK=keyOf(new Date());
  const lbl=date.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
  const ago=Math.round((fromKey(todayK)-date)/864e5);
  $("dayRel").textContent=ago===0?"Aujourd'hui":ago===1?"Hier":"Il y a "+ago+" jours";
  $("dayLabel").textContent=lbl;
  $("nextDay").disabled=k>=todayK;

  const t=target(), tot=total(d);
  $("pTotal").innerHTML=fmt1(tot)+"<small> g</small>";
  $("targetLbl").textContent=t?"/ "+t+" g":"";
  $("setupNote").hidden=!!t;
  $("welcome").hidden=!!state.settings.weight||welcomeOff();
  $("pBar").firstElementChild.style.width=(t?Math.min(100,tot/t*100):0)+"%";
  $("pBar").classList.toggle("done",!!t&&tot>=t);
  $("pStatus").innerHTML=!t?"Objectif à définir":tot>=t?"<b>Objectif atteint</b>":"Encore <b>"+fmt1(t-tot)+" g</b>";

  const kt=state.settings.kcalTarget||null, ktot=(d.kcal||[]).reduce((s,e)=>s+(+e.kcal||0),0);
  $("kTotal").innerHTML=Math.round(ktot).toLocaleString("fr-FR")+"<small> kcal</small>";
  $("kTargetLbl").textContent=kt?"/ "+kt.toLocaleString("fr-FR"):"";
  $("kBar").firstElementChild.style.width=(kt?Math.min(100,ktot/kt*100):0)+"%";
  $("kBar").classList.toggle("done",!!kt&&ktot>=kt);
  $("kStatus").innerHTML=!kt?"Objectif facultatif":ktot>=kt?"<b>Objectif atteint</b>":"Encore <b>"+Math.round(kt-ktot).toLocaleString("fr-FR")+" kcal</b>";

  // liste unique : une ligne par repas, kcal et protéines liées réunies
  const items=[], usedP=new Set();
  (d.kcal||[]).forEach((e,i)=>{
    const pi=e.link?(d.protein||[]).findIndex(p=>p.link===e.link):-1;
    if(pi>=0)usedP.add(pi);
    items.push({label:e.label,kcal:e.kcal,g:pi>=0?d.protein[pi].g:null,est:e.est,desc:e.desc,field:"kcal",i});
  });
  (d.protein||[]).forEach((e,i)=>{if(!usedP.has(i))items.push({label:e.label,kcal:null,g:e.g,field:"protein",i})});
  const ul=$("entries"); ul.innerHTML="";
  if(!items.length){const li=document.createElement("li");li.className="empty";li.style.borderTop="0";li.textContent="Aucun repas noté ce jour. Saisis les kcal et les protéines de ton repas, ou ajoute un shaker.";ul.appendChild(li)}
  items.forEach(it=>{
    const li=document.createElement("li");
    const n=document.createElement("span");n.textContent=it.label||"Repas";
    if(it.est){const tg=document.createElement("span");tg.className="est-tag";tg.textContent="estimé";tg.title=it.desc||"";n.appendChild(tg)}
    const g=document.createElement("span");g.className="g";
    g.textContent=[it.kcal!=null?Math.round(it.kcal)+" kcal":null,it.g!=null?fmt1(it.g)+" g":null].filter(Boolean).join(" · ");
    const b=document.createElement("button");b.className="del";b.setAttribute("aria-label","Supprimer "+(it.label||"ce repas"));b.textContent="×";
    b.onclick=()=>removeEntry(k,it.field,it.i,(it.label||"Repas")+" retiré");
    li.append(n,g,b);ul.appendChild(li);
  });

  const cb=$("creaBtn");cb.classList.toggle("on",!!d.creatine);cb.setAttribute("aria-pressed",d.creatine?"true":"false");
  $("creaTxt").textContent=d.creatine?"Créatine prise":"Pas encore prise";
  $("creaDose").textContent=fmt1(state.settings.dose)+" g de monohydrate";
  $("streak").innerHTML=streak()+"<small>jours d'affilée</small>";

  const chips=$("chips");chips.innerHTML="";
  const rest=Array.isArray(d.sports)&&d.sports.length===0&&d.rest;
  SPORTS.forEach(s=>{
    const b=document.createElement("button");b.className="chip";b.style.setProperty("--c","var(--"+s.id+")");
    const on=(d.sports||[]).includes(s.id);b.setAttribute("aria-pressed",on);
    b.innerHTML='<span class="dot"></span>';b.append(s.name);
    b.onclick=()=>editDay(k,x=>{x.sports=x.sports||[];const i=x.sports.indexOf(s.id);if(i>=0)x.sports.splice(i,1);else{x.sports.push(s.id);x.rest=false}});
    chips.appendChild(b);
  });
  const r=document.createElement("button");r.className="chip rest";r.style.setProperty("--c","var(--repos)");
  r.setAttribute("aria-pressed",!!rest);r.innerHTML='<span class="dot"></span>';r.append("Repos");
  r.onclick=()=>editDay(k,x=>{x.rest=!x.rest;if(x.rest)x.sports=[]});
  chips.appendChild(r);

  renderWorkout();
  renderCatalog();
  renderPlan();
  renderCal();
  renderHome();
}

function renderCal(){
  const m=state.month, y=m.getFullYear(), mo=m.getMonth(), todayK=keyOf(new Date()), t=target();
  $("hM").textContent=m.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
  const now=new Date();$("nextMonth").disabled=y>now.getFullYear()||(y===now.getFullYear()&&mo>=now.getMonth());
  const cal=$("cal");cal.innerHTML="";
  ["lun","mar","mer","jeu","ven","sam","dim"].forEach(n=>{const e=document.createElement("div");e.className="dow";e.textContent=n;cal.appendChild(e)});
  const first=(new Date(y,mo,1).getDay()+6)%7, nd=new Date(y,mo+1,0).getDate();
  for(let i=0;i<first;i++){const e=document.createElement("div");e.className="day out";cal.appendChild(e)}
  const counts={};SPORTS.forEach(s=>counts[s.id]=0);
  let trainedDays=0,protHit=0,creaDays=0,elapsed=0;
  for(let dn=1;dn<=nd;dn++){
    const k=y+"-"+pad(mo+1)+"-"+pad(dn), d=day(k), sp=d.sports||[];
    const b=document.createElement("button");b.className="day";
    if(k>todayK)b.classList.add("future"); else elapsed++;
    if(k===todayK)b.classList.add("today");
    if(k===state.sel)b.classList.add("sel");
    if(sp.length){b.classList.add("trained");b.style.setProperty("--c1","var(--"+sp[0]+")");trainedDays++;sp.forEach(s=>counts[s]++)}
    const hit=t&&total(d)>=t; if(hit)protHit++; if(d.creatine)creaDays++;
    b.innerHTML='<span class="n">'+dn+'</span><span class="dots">'+sp.map(s=>'<i style="--c:var(--'+s+')"></i>').join("")+'</span><span class="marks">'+(hit?'<span class="p"></span>':'')+(d.creatine?'<span class="c"></span>':'')+'</span>';
    const label=fromKey(k).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
    b.setAttribute("aria-label",label+" : "+(sp.length?sp.map(s=>SPORTS.find(x=>x.id===s).name).join(", "):"pas de séance")+(hit?", objectif protéines atteint":"")+(d.creatine?", créatine prise":""));
    if(k<=todayK)b.onclick=()=>{state.sel=k;render();window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})}; else b.disabled=true;
    cal.appendChild(b);
  }
  $("legend").innerHTML=SPORTS.map(s=>'<span><i style="--c:var(--'+s.id+')"></i>'+s.name+'</span>').join("")+'<span><i class="bar" style="--c:var(--ok)"></i>Objectif protéines</span><span><i style="--c:var(--accent);width:5px;height:5px"></i>Créatine</span>';
  const el=Math.max(elapsed,1);
  const max=Math.max(1,...Object.values(counts));
  $("bysport").innerHTML=SPORTS.map(s=>'<div class="bs"><span>'+s.name+'</span><span class="t"><i style="--c:var(--'+s.id+');width:'+(counts[s.id]/max*100)+'%"></i></span><span class="v">'+counts[s.id]+'</span></div>').join("");
}

function renderSettings(){
  $("sWeight").value=state.settings.weight??"";
  $("sFactor").value=state.settings.factor;
  $("sDose").value=state.settings.dose;
  $("sKcal").value=state.settings.kcalTarget??"";
  $("sWeekGoal").value=state.settings.weekGoal||3;
}

// ---------- saisie des repas ----------
const newLink=()=>"m"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function addMeal(label,kcal,g,extra){
  editDay(state.sel,x=>{const link=newLink();
    if(kcal>0){x.kcal=x.kcal||[];x.kcal.push(Object.assign({label,kcal:Math.round(kcal),link},extra||{}))}
    if(g>0){x.protein=x.protein||[];x.protein.push({label,g:Math.round(g*10)/10,link})}});
}
const num=id=>parseFloat(String($(id).value).replace(",","."));
$("manualForm").addEventListener("submit",e=>{e.preventDefault();
  const kc=num("kVal"), g=num("cGrams");
  if(!(kc>0)&&!(g>0)){$("manualStatus").hidden=false;$("manualStatus").textContent="Indique au moins les kcal ou les grammes de protéines.";return}
  $("manualStatus").hidden=true;
  addMeal($("kLabel").value.trim()||"Saisie libre",kc,g);
  $("kVal").value="";$("cGrams").value="";$("kLabel").value=""});


// ---------- interactions ----------
$("quick").innerHTML="";
QUICK.forEach(q=>{const b=document.createElement("button");b.className="qbtn";b.innerHTML="<span></span><span></span>";b.firstChild.textContent=q.name;b.lastChild.textContent="+"+fmt1(q.g)+" g";b.title=(q.p?q.p+" · ":"")+fmt1(q.g)+" g de protéines · "+q.kcal+" kcal";b.setAttribute("aria-label","Ajouter "+q.name+(q.p?" ("+q.p+")":"")+" : "+fmt1(q.g)+" g de protéines, "+q.kcal+" kcal");
  b.onclick=()=>addMeal(q.name,q.kcal,q.g);$("quick").appendChild(b)});
$("creaBtn").onclick=()=>editDay(state.sel,x=>{x.creatine=!x.creatine});
$("prevDay").onclick=()=>{state.sel=keyOf(addDays(fromKey(state.sel),-1));syncMonth();render()};
$("nextDay").onclick=()=>{const n=keyOf(addDays(fromKey(state.sel),1));if(n<=keyOf(new Date())){state.sel=n;syncMonth();render()}};
$("goToday").onclick=()=>{state.sel=keyOf(new Date());syncMonth();render()};
$("prevMonth").onclick=()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1);renderCal()};
$("nextMonth").onclick=()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()+1,1);renderCal()};
$("openSettings").onclick=()=>{$("settingsBox").open=true;$("sWeight").focus()};
function syncMonth(){const d=fromKey(state.sel);state.month=new Date(d.getFullYear(),d.getMonth(),1)}
[["sWeight","weight"],["sFactor","factor"],["sDose","dose"],["sKcal","kcalTarget"],["sWeekGoal","weekGoal"]].forEach(([id,f])=>$(id).addEventListener("input",()=>{
  const v=parseFloat(String($(id).value).replace(",","."));state.settings[f]=v>0?v:((f==="weight"||f==="kcalTarget")?null:state.settings[f]);render();saveSettings()}));

// ---------- suppression avec annulation ----------
let undo=null, toastTimer=null;
function removeEntry(k,field,i,msg){
  const before=JSON.parse(JSON.stringify(day(k)));
  const link=(before[field]||[])[i]&&before[field][i].link;
  editDay(k,x=>{if(link){x.protein=(x.protein||[]).filter(e=>e.link!==link);x.kcal=(x.kcal||[]).filter(e=>e.link!==link)}else x[field].splice(i,1)});
  undo={k,before};
  $("toastTxt").textContent=msg;$("toast").hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$("toast").hidden=true;undo=null},6000);
}
// bandeau « Annuler » pour une action qui ne touche pas une journée (ex. retirer un exercice de la proposition)
function showUndo(msg,fn){
  undo={fn};
  $("toastTxt").textContent=msg;$("toast").hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$("toast").hidden=true;undo=null},6000);
}
$("undoBtn").onclick=()=>{
  if(!undo)return;const u=undo;undo=null;
  if(u.fn)u.fn();
  else editDay(u.k,x=>{Object.keys(x).forEach(f=>delete x[f]);Object.assign(x,JSON.parse(JSON.stringify(u.before)))});
  clearTimeout(toastTimer);$("toast").hidden=true;
};

// ---------- musculation ----------
const norm=x=>String(x||"").trim().toLowerCase();
const shortDate=k=>fromKey(k).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"});
const fmtSets=sets=>sets.map(x=>fmt1(x.kg)+" kg × "+x.reps).join(" · ");
const best=sets=>Math.max(0,...sets.map(x=>+x.kg||0));
// tonnage = somme charge × reps ; pour les tractions, la charge = poids de corps + lest
// exercices au poids du corps : part du poids de corps comptée dans le tonnage (le champ kg sert alors au lest)
const BW_SHARE=[[/traction|pull[- ]?up|chin[- ]?up/i,1],[/^\s*dips\s*$/i,1],[/pompe|push[- ]?up/i,0.65]];
const bwShare=ex=>{const m=BW_SHARE.find(([r])=>r.test(ex||""));return m?m[1]:0};
const isBW=ex=>bwShare(ex)>0;
const effKg=(ex,kg)=>bwShare(ex)*(+state.settings.weight||0)+(+kg||0);
// exercices faits bras par bras (haltères) : tonnage ×2 ; réglable par exercice
const DEF_ARM=/halt[eè]re|dumbbell|unilat|curl(?!.*barre)/i;
const perArm=ex=>{const o=(state.settings.perArm||{})[norm(ex)];return o===undefined?DEF_ARM.test(ex||""):!!o};
const vol=(ex,sets)=>(sets||[]).reduce((s,x)=>s+effKg(ex,x.kg)*(+x.reps||0),0)*(perArm(ex)?2:1);
const fmtKg=n=>Math.round(n).toLocaleString("fr-FR")+" kg";
// une série en texte : 60×10, PDC×15 (sans charge), PDC+10×8 (lest), 45 s (gainage)
const setTxt=(ex,x)=>isHold(ex)&&!(+x.kg)?x.reps+" s":(+x.kg>0?(isBW(ex)?"PDC+":"")+fmt1(x.kg):"PDC")+"×"+x.reps;
function prevSessions(ex,k,n){
  const out=[];
  Object.keys(state.days).filter(x=>x<k).sort().reverse().some(dk=>{
    const w=(state.days[dk].workout||[]).find(e=>norm(e.ex)===norm(ex)&&(e.sets||[]).length);
    if(w)out.push({k:dk,sets:w.sets});
    return out.length>=n;
  });
  return out;
}
let woDirty=false;
// pour la recherche : minuscules, sans accents (« developpe » trouve « Développé », « oeuf » trouve « œuf »)
const fold=s=>norm(s).normalize("NFD").replace(/\p{M}/gu,"").replace(/œ/g,"oe").replace(/æ/g,"ae");
// tous les exercices connus : les plus faits d'abord, puis les classiques, puis le reste du catalogue et tes exercices perso
function allNames(){
  const count={};
  Object.values(state.days).forEach(x=>(x.workout||[]).forEach(e=>{if(e.ex)count[e.ex]=(count[e.ex]||0)+1}));
  const used=Object.keys(count).sort((a,b)=>count[b]-count[a]||a.localeCompare(b,"fr"));
  const seen=new Set(used.map(fold));
  const rest=DEFAULT_EX.concat(fullCatalog().filter(c=>c[5]!=="wait").map(c=>c[0]));
  return used.concat(rest.filter(n=>!seen.has(fold(n))&&seen.add(fold(n))));
}
function addExercise(name){
  name=name.trim();if(!name)return;
  const known=allNames().find(v=>fold(v)===fold(name)); // même exercice malgré les accents ou majuscules
  name=known||name.charAt(0).toUpperCase()+name.slice(1);
  (day(state.sel).workout||[]).forEach(e=>folded.add(state.sel+"|"+e.ex));folded.delete(state.sel+"|"+name);woCardOpen=true;
  editDay(state.sel,x=>{x.workout=x.workout||[];x.workout.push({ex:name,sets:[]});x.sports=x.sports||[];if(!x.sports.includes("muscu"))x.sports.push("muscu");x.rest=false});
  $("woName").value="";renderSugg();
}
function renderSugg(){
  const q=fold($("woName").value), words=q.split(/\s+/).filter(Boolean);
  const today=new Set((day(state.sel).workout||[]).map(e=>fold(e.ex)));
  const names=allNames().filter(n=>!today.has(fold(n)));
  let list;
  if(!words.length)list=names.slice(0,8);
  else{
    // d'abord les noms qui contiennent tous les mots tapés, puis les exercices dont les muscles ou le groupe correspondent
    const gName=Object.fromEntries(GROUPS), info=new Map(fullCatalog().map(c=>[fold(c[0]),fold((c[3]||"")+" "+(gName[c[1]]||""))]));
    const has=(txt)=>words.every(w=>txt.includes(w));
    const byName=names.filter(n=>has(fold(n))), byMuscle=names.filter(n=>!has(fold(n))&&has(info.get(fold(n))||""));
    list=byName.concat(byMuscle).slice(0,12);
  }
  $("suggLbl").textContent=q?(list.length?"Suggestions":"Nouvel exercice : touche Ajouter pour le créer"):"Exercices fréquents · touche pour ajouter";
  const box=$("exSugg");box.innerHTML="";
  list.forEach(n=>{const b=document.createElement("button");b.type="button";b.className="chip";b.textContent=n;b.onclick=()=>addExercise(n);box.appendChild(b)});
}
$("woName").addEventListener("input",renderSugg);
const folded=new Set(); let woCardOpen=true, lastAdded=null;
// ↻ dans la séance : exercice suivant du même groupe (mêmes critères que la séance proposée : tes habitudes, puis les classiques),
// sans doublon dans la séance ; on fait défiler les choix, puis on repart du début
let swapAsk=null, swapCands=null; const swapSeen={};
function swapPick(k,wi){
  const list=day(k).workout||[], w=list[wi], g=w&&groupOf(w.ex);
  if(!g)return null; // exercice pas encore classé : pas de groupe, pas de remplaçant
  swapCands=swapCands||buildPlan(k,0).candsFor; // calculé une fois par affichage
  const inDay=new Set(list.map(e=>norm(e.ex))), pool=swapCands(g).filter(n=>!inDay.has(norm(n)));
  const seen=swapSeen[k+"|"+wi]||[];
  return pool.find(n=>!seen.includes(norm(n)))||pool[0]||null;
}
function swapExercise(k,wi){
  const n=swapPick(k,wi), old=(day(k).workout||[])[wi];if(!n||!old)return;
  const key=k+"|"+wi, seen=swapSeen[key]||[norm(old.ex)];
  swapSeen[key]=seen.includes(norm(n))?[norm(old.ex),norm(n)]:seen.concat(norm(n)); // liste parcourue : on repart du début
  if(folded.has(k+"|"+old.ex))folded.add(k+"|"+n);
  // un exercice venu de la séance proposée garde un objectif, recalculé pour le nouvel exercice
  const p=old.plan?progression(n,k):null;
  undoable(k,old.ex+" remplacé par "+n,x=>{x.workout[wi]=p?{ex:n,sets:[],plan:Object.assign({sets:p.sets,reps:p.reps,kg:p.kg},p.deload?{deload:true}:{})}:{ex:n,sets:[]}});
  const c=$("woList").querySelectorAll(".ex")[wi];const b=c&&c.querySelector(".mv-swap:not(:disabled)");b&&b.focus();
}
function renderWorkout(){
  const k=state.sel, d=day(k), list=d.workout||[];
  const show=(d.sports||[]).includes("muscu");
  $("woCard").hidden=!show;
  if(!show)return;
  const box=$("woList");
  if(box.contains(document.activeElement)&&document.activeElement.tagName==="INPUT"){woDirty=true;return}
  woDirty=false;swapCands=null;
  renderSugg();
  const nSets=list.reduce((s,e)=>s+(e.sets||[]).length,0);
  const tot=list.reduce((s,e)=>s+vol(e.ex,e.sets),0);
  $("woCount").textContent=list.length?list.length+" exo"+(list.length>1?"s":"")+" · "+nSets+" série"+(nSets>1?"s":"")+(tot?" · "+fmtKg(tot):""):"";
  $("woTotal").hidden=!tot;
  if(tot){
    const prevDay=Object.keys(state.days).filter(x=>x<k&&(state.days[x].workout||[]).some(e=>(e.sets||[]).length)).sort().pop();
    const pt=prevDay?(state.days[prevDay].workout||[]).reduce((s,e)=>s+vol(e.ex,e.sets),0):0;
    $("woTotal").innerHTML='<span class="lbl">Tonnage de la séance</span><b>'+fmtKg(tot)+'</b>'+(pt?'<span class="cmp">séance précédente ('+shortDate(prevDay)+') : '+fmtKg(pt)+'</span>':'');
  }
  renderWoTime();
  $("woToggle").setAttribute("aria-expanded",woCardOpen);
  $("woBody").hidden=!woCardOpen;
  // « Tout replier » (ou « Tout déplier » si tout est déjà replié), affiché dès 2 exercices
  const allFolded=list.length>0&&list.every(w=>folded.has(k+"|"+w.ex));
  $("foldAll").hidden=list.length<2;$("foldAll").textContent=allFolded?"Tout déplier":"Tout replier";
  box.innerHTML="";
  if(!list.length){const p=document.createElement("p");p.className="empty";p.style.margin="0";p.textContent="Ajoute ton premier exercice : la charge et les reps de ta dernière séance s'afficheront automatiquement.";box.appendChild(p)}
  list.forEach((w,wi)=>{
    const sets=w.sets||[], prev=prevSessions(w.ex,k,5), last=prev[0];
    const id=k+"|"+w.ex, open=!folded.has(id);
    const ex=document.createElement("div");ex.className="ex";
    const head=document.createElement("div");head.className="ex-head";
    const tg=document.createElement("button");tg.type="button";tg.className="ex-toggle";tg.setAttribute("aria-expanded",open);
    tg.innerHTML='<span class="chev" aria-hidden="true">›</span><span class="ex-name"></span><span class="ex-meta"></span>';
    tg.querySelector(".ex-name").textContent=w.ex;
    let meta=sets.length?sets.length+" série"+(sets.length>1?"s":"")+" · "+fmtKg(vol(w.ex,sets)):"à faire";
    if(last&&sets.length){const diff=best(sets)-best(last.sets);if(diff>0)meta+=" ↑";}
    tg.querySelector(".ex-meta").textContent=meta;
    tg.onclick=()=>{open?folded.add(id):folded.delete(id);renderWorkout()};
    const del=document.createElement("button");del.className="del";del.setAttribute("aria-label","Supprimer l'exercice "+w.ex);del.textContent="×";
    del.onclick=()=>undoable(k,w.ex+" retiré",x=>x.workout.splice(wi,1));
    // monter / descendre l'exercice dans la séance ; le focus reste sur le bouton pour enchaîner
    const move=(to,cls)=>{editDay(k,x=>{x.workout.splice(to,0,x.workout.splice(wi,1)[0])});
      const b=$("woList").querySelectorAll(".ex")[to];const f=b&&b.querySelector("."+cls+":not(:disabled)");f&&f.focus()};
    const up=document.createElement("button");up.type="button";up.className="del mv mv-up";up.textContent="↑";up.setAttribute("aria-label","Monter "+w.ex);up.disabled=wi===0;up.onclick=()=>move(wi-1,"mv-up");
    const down=document.createElement("button");down.type="button";down.className="del mv mv-down";down.textContent="↓";down.setAttribute("aria-label","Descendre "+w.ex);down.disabled=wi===list.length-1;down.onclick=()=>move(wi+1,"mv-down");
    if(list.length<2){up.hidden=down.hidden=true}
    // remplacer par un autre exercice du même groupe ; confirmation seulement si des séries sont déjà notées
    const next=swapPick(k,wi), rr=document.createElement("button");rr.type="button";rr.className="del mv mv-swap";rr.textContent="↻";
    rr.setAttribute("aria-label","Remplacer "+w.ex+" par un autre exercice");rr.title=next?"Autre exercice":"Pas d'autre exercice dans ce groupe";rr.disabled=!next;
    rr.onclick=()=>{if(sets.length){swapAsk=id;renderWorkout();const c=$("woList").querySelectorAll(".ex")[wi];c&&c.querySelector(".swap-go").focus()}else swapExercise(k,wi)};
    head.append(tg,up,down,rr,del);ex.appendChild(head);
    if(swapAsk===id&&next){
      const c=document.createElement("div");c.className="confirm";
      c.innerHTML='<p></p><div class="btnrow"><button type="button" class="danger solid swap-go">Remplacer</button><button type="button" class="ghost swap-no">Annuler</button></div>';
      c.querySelector("p").textContent="Remplacer "+w.ex+" par "+next+" ? "+(sets.length>1?"Les "+sets.length+" séries notées seront supprimées.":"La série notée sera supprimée.");
      c.querySelector(".swap-go").onclick=()=>{swapAsk=null;swapExercise(k,wi)};
      c.querySelector(".swap-no").onclick=()=>{swapAsk=null;renderWorkout()};
      ex.appendChild(c);
    }
    if(open){
      const body=document.createElement("div");body.className="ex-body";
      const info=document.createElement("div");info.className="last";
      if(last){info.textContent="Dernière fois ("+shortDate(last.k)+") : ";const b=document.createElement("b");b.textContent=last.sets.map(x=>setTxt(w.ex,x)).join("  ");info.appendChild(b)}
      else info.textContent="Premier enregistrement de cet exercice.";
      if(last&&sets.length){const diff=best(sets)-best(last.sets);if(diff>0){const u=document.createElement("span");u.className="up";u.textContent=" ↑ +"+fmt1(diff)+" kg";info.appendChild(u)}}
      body.appendChild(info);
      if(w.plan){const g=document.createElement("div");g.className="ex-goal";g.textContent="Objectif : ";const b=document.createElement("b");b.textContent=planTxt(w.ex,w.plan);g.appendChild(b);
        if(sets.length)g.appendChild(document.createTextNode(" · "+sets.length+"/"+w.plan.sets+" séries"));body.appendChild(g)}
      if(sets.length){
        const v=vol(w.ex,sets), vl=document.createElement("div");vl.className="last";
        vl.textContent="Total : ";const b=document.createElement("b");b.textContent=fmtKg(v);vl.appendChild(b);
        if(last){const pv=vol(w.ex,last.sets);if(pv){const d=Math.round((v-pv)/pv*100);const c=document.createElement("span");c.className=d>0?"up":"";c.textContent=" ("+(d>0?"+":"")+d+" % vs dernière fois : "+fmtKg(pv)+")";vl.appendChild(c)}}
        if(perArm(w.ex))vl.appendChild(document.createTextNode(" · ×2 (par bras)"));
        if(isBW(w.ex)){const sh=bwShare(w.ex);vl.appendChild(document.createTextNode(state.settings.weight?" · "+(sh<1?Math.round(sh*100)+" % du ":"")+"poids de corps ("+fmt1(state.settings.weight*sh)+" kg) inclus":" · renseigne ton poids dans les Réglages pour compter le poids de corps"))}
        body.appendChild(vl);
      }
      if(sets.length){
        const row=document.createElement("div");row.className="setchips";
        sets.forEach((st,si)=>{
          const c=document.createElement("span");c.className="setchip";
          const t=document.createElement("span");t.textContent=setTxt(w.ex,st);
          const b=document.createElement("button");b.setAttribute("aria-label","Supprimer la série "+(si+1));b.textContent="×";
          b.onclick=()=>undoable(k,"Série "+(si+1)+" retirée",x=>x.workout[wi].sets.splice(si,1));
          c.append(t,b);row.appendChild(c);
        });
        body.appendChild(row);
      }
      const ref=sets.length?sets[sets.length-1]:(w.plan&&w.plan.kg!=null?{kg:w.plan.kg,reps:w.plan.reps}:(last?last.sets[last.sets.length-1]:null));
      const pdc=isBW(w.ex)||equipOf(w.ex)==="pdc"; // exercice au poids du corps : le champ kg sert au lest
      const f=document.createElement("form");f.className="setform";
      f.innerHTML='<input id="kg-'+wi+'" type="number" inputmode="decimal" min="0" step="0.5" placeholder="'+(pdc?"lest":"kg")+'" aria-label="'+(pdc?"Lest en kg, laisser vide pour le poids du corps":"Charge en kg")+'"><span class="x" aria-hidden="true">kg ×</span><input id="rp-'+wi+'" type="number" inputmode="numeric" min="1" step="1" placeholder="reps" aria-label="Répétitions"><button class="addset" type="submit">+ Série</button>';
      if(ref){f.querySelector("#kg-"+wi).value=pdc&&!(+ref.kg)?"":ref.kg;f.querySelector("#rp-"+wi).value=ref.reps}
      f.addEventListener("submit",e=>{e.preventDefault();
        let kg=parseFloat(String(f.querySelector("#kg-"+wi).value).replace(",",".")), r=parseInt(f.querySelector("#rp-"+wi).value,10);
        // exercice au poids du corps : charge vide = sans lest ; ailleurs la charge reste obligatoire
        if(String(f.querySelector("#kg-"+wi).value).trim()===""&&pdc)kg=0;
        if(!(kg>=0)){f.querySelector("#kg-"+wi).focus();return}
        if(!(r>0)){f.querySelector("#rp-"+wi).focus();return}
        document.activeElement&&document.activeElement.blur();
        editDay(k,x=>{x.workout[wi].sets=x.workout[wi].sets||[];x.workout[wi].sets.push({kg,reps:r,t:Date.now()})}); // t : heure de la série
        startRest(restDur);
      });
      body.appendChild(f);
      const arm=document.createElement("button");arm.type="button";arm.className="armtoggle";arm.setAttribute("aria-pressed",perArm(w.ex));
      arm.innerHTML='<span class="sw" aria-hidden="true"></span>Charge et reps par bras (tonnage ×2)';
      arm.onclick=()=>{const m=Object.assign({},state.settings.perArm||{});m[norm(w.ex)]=!perArm(w.ex);state.settings.perArm=m;saveSettings();renderWorkout()};
      body.appendChild(arm);
      if(prev.length>1){
        const det=document.createElement("details");det.className="hist";
        det.innerHTML="<summary>Historique</summary><ul></ul>";
        prev.forEach(pv=>{const li=document.createElement("li");li.innerHTML="<span></span><span></span>";li.firstChild.textContent=shortDate(pv.k);li.lastChild.textContent=pv.sets.map(x=>setTxt(w.ex,x)).join("  ");det.querySelector("ul").appendChild(li)});
        body.appendChild(det);
      }
      ex.appendChild(body);
    }
    box.appendChild(ex);
  });
}
$("woList").addEventListener("focusout",()=>setTimeout(()=>{if(woDirty&&!$("woList").contains(document.activeElement))renderWorkout()},0));
$("woToggle").onclick=()=>{woCardOpen=!woCardOpen;renderWorkout()};
// ---------- heures de la séance de musculation ----------
// automatiques : début = heure de la 1re série, fin = heure de la dernière (champ t de chaque série) ;
// corrigeables d'un tap, la correction est gardée dans day.muscuTime = {start:"HH:MM", end:"HH:MM"}
const hhmm=ms=>{const d=new Date(ms);return pad(d.getHours())+":"+pad(d.getMinutes())};
const toMin=s=>{const [h,m]=String(s).split(":").map(Number);return h*60+m};
const fmtDur=m=>m>=60?Math.floor(m/60)+" h "+pad(m%60):m+" min";
const LIVE_MS=20*60000; // aujourd'hui, une série notée il y a moins de 20 min : la séance est « en cours »
function sessionTime(k){
  const d=day(k), o=d.muscuTime||{}, ts=[];
  (d.workout||[]).forEach(e=>(e.sets||[]).forEach(s=>{if(s.t)ts.push(s.t)}));
  const first=ts.length?Math.min(...ts):null, last=ts.length?Math.max(...ts):null;
  const live=!o.end&&last!=null&&k===keyOf(new Date())&&Date.now()-last<LIVE_MS;
  const start=o.start||(first!=null?hhmm(first):null), end=o.end||(last!=null?hhmm(last):null);
  const until=live?hhmm(Date.now()):end;
  const dur=start&&until&&toMin(until)>toMin(start)?toMin(until)-toMin(start):null;
  return {start,end,live,dur};
}
let timeEdit=null; // "start" ou "end" pendant la correction d'une heure
function renderWoTime(){
  const k=state.sel, el=$("woTime"), hasSets=(day(k).workout||[]).some(e=>(e.sets||[]).length), st=sessionTime(k);
  el.hidden=!hasSets&&!st.start;
  if(el.hidden)return;
  const part=(which,val,empty)=>{
    if(timeEdit===which)return '<input type="time" class="t-in" data-w="'+which+'" value="'+(val||"")+'" aria-label="'+(which==="start"?"Heure de début":"Heure de fin")+'">';
    return '<button type="button" class="t-btn" data-w="'+which+'" aria-label="'+(which==="start"?"Modifier l\'heure de début":"Modifier l\'heure de fin")+'">'+(val||empty)+'</button>';
  };
  el.innerHTML='<span aria-hidden="true">🕒</span> '+part("start",st.start,"début ?")+' → '+(st.live&&timeEdit!=="end"?'<button type="button" class="t-btn live" data-w="end" aria-label="Séance en cours, modifier l\'heure de fin">en cours</button>':part("end",st.end,"fin ?"))+
    (st.dur?' <span class="t-dur">· '+fmtDur(st.dur)+'</span>':'');
  el.querySelectorAll(".t-btn").forEach(b=>b.onclick=()=>{timeEdit=b.dataset.w;renderWoTime();const i=el.querySelector(".t-in");i&&i.focus()});
  const inp=el.querySelector(".t-in");
  if(inp){
    // enregistré en quittant le champ (« OK » sur iPhone, Entrée sur ordinateur) ; champ vidé = retour à l'heure automatique ; Échap annule
    const w=inp.dataset.w, before=inp.value;
    const save=()=>{
      if(timeEdit!==w)return;timeEdit=null;
      const v=inp.value;if(v===before){renderWoTime();return}
      editDay(k,x=>{const o=Object.assign({},x.muscuTime||{});if(v)o[w]=v;else delete o[w];if(Object.keys(o).length)x.muscuTime=o;else delete x.muscuTime});
    };
    inp.addEventListener("blur",save);
    inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();inp.blur()}else if(e.key==="Escape"){timeEdit=null;renderWoTime()}});
  }
}
// pendant une séance en cours, la durée avance toute seule ; « en cours » laisse place à l'heure de fin 20 min après la dernière série
setInterval(()=>{if(!document.hidden&&!$("woTime").hidden&&!timeEdit&&(sessionTime(state.sel).live||$("woTime").querySelector(".live")))renderWoTime()},30000);
$("foldAll").onclick=()=>{
  const k=state.sel, ids=(day(k).workout||[]).map(w=>k+"|"+w.ex), all=ids.every(id=>folded.has(id));
  ids.forEach(id=>all?folded.delete(id):folded.add(id));renderWorkout();
};
$("woForm").addEventListener("submit",e=>{e.preventDefault();addExercise($("woName").value)});
// ---------- minuteur de repos ----------
let restDur=90, tEnd=0, tTotal=0, tInt=null, actx=null, wlock=null, tHide=null;
try{const v=parseInt(localStorage.getItem("carnet-forme-rest"),10);if(v>0)restDur=v}catch(e){}
function paintRestChips(){[...$("restChips").children].forEach(b=>b.setAttribute("aria-pressed",+b.dataset.s===restDur))}
$("restChips").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;restDur=+b.dataset.s;try{localStorage.setItem("carnet-forme-rest",restDur)}catch(_){}paintRestChips();if(tInt)startRest(restDur)});
paintRestChips();
const mmss=s=>Math.floor(s/60)+":"+String(s%60).padStart(2,"0");
// sons du minuteur : un bip court à 3, 2 et 1 s, puis un signal plus long et plus aigu pour la reprise
function tone(freq,at,dur,vol){
  const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=freq;o.connect(g);g.connect(actx.destination);
  const st=actx.currentTime+at;g.gain.setValueAtTime(.0001,st);g.gain.exponentialRampToValueAtTime(vol,st+.02);g.gain.exponentialRampToValueAtTime(.0001,st+dur);o.start(st);o.stop(st+dur+.02);
}
function beep(kind){
  if(!actx)return;
  try{
    if(actx.state==="suspended")actx.resume();
    if(kind==="tick")tone(660,0,.12,.25);
    else{tone(880,0,.16,.3);tone(880,.22,.16,.3);tone(1320,.44,.5,.35)}
  }catch(e){}
}
let lastCue=null; // dernière seconde déjà signalée (évite de bipper deux fois la même)
function startRest(sec){
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state==="suspended")actx.resume()}catch(e){actx=null}
  clearTimeout(tHide);clearInterval(tInt);
  tTotal=sec;tEnd=Date.now()+sec*1000;lastCue=null;
  $("timer").classList.remove("done");$("tLbl").textContent="Repos";$("timer").hidden=false;document.body.classList.add("timing");
  try{if(navigator.wakeLock&&!wlock)navigator.wakeLock.request("screen").then(l=>{wlock=l;l.addEventListener("release",()=>{wlock=null})}).catch(()=>{})}catch(e){}
  tick();tInt=setInterval(tick,250);
}
function tick(){
  const rem=Math.ceil((tEnd-Date.now())/1000);
  // compte à rebours sonore sur les 3 dernières secondes, le chiffre pulse en même temps
  if(rem>3)lastCue=null;
  else if(rem>=1&&lastCue!==rem){lastCue=rem;beep("tick");try{navigator.vibrate&&navigator.vibrate(60)}catch(e){}}
  $("timer").classList.toggle("soon",rem>=1&&rem<=3);
  if(rem<=0){
    clearInterval(tInt);tInt=null;beep("go");try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}
    $("tTime").textContent="0:00";$("tLbl").textContent="C'est reparti !";$("tProg").style.width="0%";$("timer").classList.add("done");
    tHide=setTimeout(stopRest,8000);return;
  }
  $("tTime").textContent=mmss(rem);
  $("tProg").style.width=Math.max(0,(tEnd-Date.now())/(tTotal*1000)*100)+"%";
}
function stopRest(){
  clearInterval(tInt);tInt=null;clearTimeout(tHide);$("timer").hidden=true;$("timer").classList.remove("soon");document.body.classList.remove("timing");
  try{wlock&&wlock.release()}catch(e){}wlock=null;
}
$("restGo").onclick=()=>startRest(restDur);
$("tPlus").onclick=()=>{if(tInt){tEnd+=15000;tTotal+=15}else startRest(15);tick()};
$("tStop").onclick=stopRest;
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&tInt){try{actx&&actx.state!=="running"&&actx.resume()}catch(e){}tick()}});

function undoable(k,msg,fn){
  const before=JSON.parse(JSON.stringify(day(k)));
  editDay(k,fn);
  undo={k,before};
  $("toastTxt").textContent=msg;$("toast").hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$("toast").hidden=true;undo=null},6000);
}

// ---------- catalogue d'exercices ----------
const cat={q:"",group:null,equip:null,open:new Set()};
// ---------- exercices ajoutés depuis les séances : classés à la main (pas d'IA en phase 1) ----------
const customEx=()=>Array.isArray(state.settings.customEx)?state.settings.customEx:[];
const inCatalog=n=>CATALOG.some(c=>norm(c[0])===norm(n))||customEx().some(c=>norm(c.n)===norm(n));
const usedNames=()=>{const m=new Map();Object.values(state.days).forEach(x=>(x.workout||[]).forEach(e=>{if(e.ex&&!m.has(norm(e.ex)))m.set(norm(e.ex),e.ex)}));return [...m.values()]};
const unclassified=()=>usedNames().filter(n=>!inCatalog(n));
function fullCatalog(){
  const mine=customEx().map(c=>[c.n,c.g,c.e,c.m||"",c.c||[],"mine"]);
  const wait=unclassified().map(n=>[n,"autres",null,"Touche pour choisir son groupe et son matériel",[],"wait"]);
  return CATALOG.concat(mine,wait);
}
let editing=null; // exercice perso dont le formulaire de classement est rouvert
// enregistre (ou corrige) le groupe, le matériel et les muscles d'un exercice créé par l'utilisateur
function saveCustom(n,g,e,m){
  const old=customEx().find(c=>norm(c.n)===norm(n));
  state.settings.customEx=customEx().filter(c=>norm(c.n)!==norm(n)).concat({n,g,e:e||null,m:m.slice(0,80),c:old&&old.c||[]});
  editing=null;saveSettings();render();
}
function classifyForm(n,cur){
  const f=document.createElement("form");f.className="classify";
  f.innerHTML='<label>Groupe musculaire<select name="g"></select></label><label>Matériel<select name="e"></select></label>'+
    '<label class="full">Muscles travaillés (facultatif)<input name="m" type="text" maxlength="80" placeholder="ex. Moyen fessier"></label>'+
    '<p class="msg err full" hidden></p><div class="acts"><button class="addset" type="submit">Enregistrer</button></div>';
  const el=f.elements;
  el.g.add(new Option("Choisir…",""));GROUPS.forEach(([v,l])=>el.g.add(new Option(l,v)));
  [["","Aucun / autre"]].concat(EQUIP).forEach(([v,l])=>el.e.add(new Option(l,v)));
  if(cur){el.g.value=cur.g;el.e.value=cur.e||"";el.m.value=cur.m||""}
  if(cur){const c=document.createElement("button");c.type="button";c.className="ghost";c.textContent="Annuler";c.onclick=()=>{editing=null;renderCatalog()};f.querySelector(".acts").appendChild(c)}
  f.addEventListener("submit",ev=>{ev.preventDefault();
    if(!el.g.value){const m=f.querySelector(".msg");m.hidden=false;m.textContent="Choisis un groupe musculaire.";return}
    document.activeElement&&document.activeElement.blur();
    saveCustom(n,el.g.value,el.e.value,el.m.value.trim())});
  return f;
}
function filterBtns(id,list,key){
  const box=$(id);box.innerHTML="";
  [[null,"Tous"]].concat(list).forEach(([v,l])=>{const b=document.createElement("button");b.type="button";b.textContent=l;b.setAttribute("aria-pressed",cat[key]===v);
    b.onclick=()=>{cat[key]=v;filterBtns(id,list,key);renderCatalog()};box.appendChild(b)});
}
filterBtns("fEquip",EQUIP,"equip");
$("exSearch").addEventListener("input",()=>{cat.q=norm($("exSearch").value);renderCatalog()});
function lastDone(name){const k=Object.keys(state.days).filter(x=>(state.days[x].workout||[]).some(e=>norm(e.ex)===norm(name)&&(e.sets||[]).length)).sort().pop();return k||null}
function renderCatalog(){
  // ne pas effacer un formulaire de classement en cours de saisie
  const act=document.activeElement;if($("catList").contains(act)&&act.matches("input,select"))return;
  const k=state.sel, today=new Set((day(k).workout||[]).map(e=>norm(e.ex)));
  const isToday=k===keyOf(new Date());
  $("exTarget").textContent="Les exercices s'ajoutent à la séance "+(isToday?"d'aujourd'hui":"du "+shortDate(k))+". Ceux que tu crées dans une séance s'ajoutent ici : choisis leur groupe pour qu'ils entrent dans les séances proposées.";
  const gName=Object.fromEntries(GROUPS), eName=Object.fromEntries(EQUIP);
  const all=fullCatalog();
  filterBtns("fGroup",GROUPS.filter(([id])=>id!=="autres"||all.some(c=>c[1]==="autres")),"group");
  const list=all.filter(([n,g,e,m])=>(!cat.group||g===cat.group)&&(!cat.equip||e===cat.equip)&&(!cat.q||norm(n+" "+m+" "+gName[g]).includes(cat.q)));
  $("exCount").textContent=list.length+" exercice"+(list.length>1?"s":"");
  const box=$("catList");box.innerHTML="";
  if(!list.length){const p=document.createElement("p");p.className="empty";p.textContent="Aucun exercice ne correspond. Essaie un autre filtre, ou crée l'exercice depuis l'onglet Séances.";box.appendChild(p);return}
  list.forEach(([n,g,e,m,cues,kind])=>{
    const open=cat.open.has(n);
    const it=document.createElement("div");it.className="cat";
    const row=document.createElement("div");row.className="cat-row";
    const main=document.createElement("button");main.type="button";main.className="cat-main";main.setAttribute("aria-expanded",open);
    main.innerHTML='<span class="cat-name"><span class="chev" aria-hidden="true">›</span><span></span></span><span class="cat-sub"></span>';
    main.querySelector(".cat-name span:last-child").textContent=n;
    main.querySelector(".cat-sub").textContent=m;
    main.onclick=()=>{open?cat.open.delete(n):cat.open.add(n);renderCatalog()};
    const add=document.createElement("button");add.type="button";add.className="cat-add";
    const inDay=today.has(norm(n));add.disabled=inDay;add.textContent=inDay?"✓ Ajouté":"+ Séance";
    add.setAttribute("aria-label",inDay?n+" est déjà dans la séance":"Ajouter "+n+" à la séance");
    add.onclick=()=>{const before=JSON.parse(JSON.stringify(day(k)));addExercise(n);undo={k,before};
      $("toastTxt").textContent=n+" ajouté à la séance";$("toast").hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$("toast").hidden=true;undo=null},6000)};
    row.append(main,add);it.appendChild(row);
    const tags=document.createElement("div");tags.className="tags";
    if(e){const eq=document.createElement("span");eq.className="eq";eq.textContent=eName[e];tags.appendChild(eq)}
    if(kind){const t=document.createElement("span");t.className="eq "+kind;t.textContent=kind==="mine"?"Ajouté par toi":"À classer";tags.appendChild(t)}
    if(tags.children.length)it.appendChild(tags);
    if(open){
      const ul=document.createElement("ul");ul.className="cues";cues.forEach(c=>{const li=document.createElement("li");li.textContent=c;ul.appendChild(li)});it.appendChild(ul);
      if(kind==="wait"||(kind==="mine"&&editing===n))it.appendChild(classifyForm(n,kind==="mine"?customEx().find(c=>norm(c.n)===norm(n)):null));
      else if(kind==="mine"){const b=document.createElement("button");b.type="button";b.className="cat-act";b.textContent="Modifier le classement";b.onclick=()=>{editing=n;renderCatalog()};it.appendChild(b)}
      const ld=lastDone(n);const l=document.createElement("div");l.className="cat-last";l.textContent=ld?"Dernière fois : "+shortDate(ld):"Jamais fait pour l'instant";it.appendChild(l);
    }
    box.appendChild(it);
  });
}

// ---------- séance proposée ----------
// Réglages retenus : objectif prise de muscle, séance d'environ 45 min (5 exercices), 48 h de repos par groupe.
const REST_DAYS=2;  // un groupe travaillé il y a moins de 2 jours est encore en récupération
// full body : jambes, pecs, dos, épaules, plus le bras (biceps ou triceps) le moins travaillé récemment
function fullBody(since){
  const oldest=gs=>gs.map((g,i)=>({g,i,d:since(g)==null?999:since(g)})).sort((a,b)=>b.d-a.d||a.i-b.i)[0].g;
  return {id:"full",name:"Full body",groups:[["jambes",1],["pecs",1],["dos",1],["epaules",1],[oldest(["biceps","triceps"]),1]]};
}
// groupes principaux d'une séance : ceux qui doivent être reposés pour la proposer
const mainGroups=t=>t.id==="full"?["jambes","pecs","dos","epaules"]:t.groups.filter(([,c])=>c>=2).map(([g])=>g);
const groupOf=n=>{const c=fullCatalog().find(c=>norm(c[0])===norm(n));return c?c[1]:null};
const equipOf=n=>{const c=fullCatalog().find(c=>norm(c[0])===norm(n));return c?c[2]:null};
const dayDiff=(a,b)=>Math.round((fromKey(a)-fromKey(b))/864e5);
const isHold=ex=>/gainage|planche/i.test(ex||""); // exercice tenu : le champ reps contient des secondes
const planTxt=(ex,p)=>p.sets+" × "+p.reps+(isHold(ex)?" s":"")+(p.kg==null?"":(isBW(ex)||!p.kg)?(p.kg>0?" · PDC+"+fmt1(p.kg)+" kg":isHold(ex)?"":" · PDC"):" · "+fmt1(p.kg)+" kg");
let plan=null, planShift=0;

// type d'exercice → fourchette de reps (prise de muscle)
const inList=(list,n)=>list.some(x=>norm(x)===norm(n));
function exType(ex){
  const g=groupOf(ex);
  if(g==="abdos")return "abdos";
  if(inList(BASE_EX,ex))return "base";
  if(inList(ISO_EX,ex)||["biceps","triceps","mollets"].includes(g))return "iso";
  return "autre";
}
const RANGES={base:[6,10],autre:[8,12],iso:[10,15],abdos:[12,20]};
const TYPE_ORDER={base:0,autre:1,iso:2,abdos:3};

function sessionLog(k){
  return Object.keys(state.days).filter(x=>x<=k&&(state.days[x].workout||[]).some(e=>(e.sets||[]).length)).sort().reverse();
}
// dernières séances d'un exercice (la plus récente d'abord), avec l'objectif qui avait été proposé
function exHistory(ex,k,n){
  const out=[];
  Object.keys(state.days).filter(x=>x<k).sort().reverse().some(dk=>{
    const w=(state.days[dk].workout||[]).find(e=>norm(e.ex)===norm(ex)&&(e.sets||[]).length);
    if(w)out.push({k:dk,sets:w.sets,plan:w.plan});
    return out.length>=n;
  });
  return out;
}
// performance d'une séance : charge max, puis total de reps à cette charge
function perf(sets){const t=best(sets);return {t,r:sets.filter(x=>(+x.kg||0)===t).reduce((a,x)=>a+(+x.reps||0),0)}}
const beats=(a,b)=>a.t>b.t||(a.t===b.t&&a.r>b.r);
// stagnation : les 3 dernières séances n'ont pas battu la meilleure performance d'avant
// (sauf si une séance allégée a déjà été proposée récemment : on laisse le temps de remonter)
function stalled(h){
  if(h.length<4||h.slice(0,3).some(x=>x.plan&&x.plan.deload))return false;
  const ref=h.slice(3).map(x=>perf(x.sets)).reduce((m,p)=>beats(p,m)?p:m);
  return !h.slice(0,3).some(x=>beats(perf(x.sets),ref));
}
function progression(ex,k){
  const type=exType(ex), hold=isHold(ex), [lo,hi]=hold?[30,60]:RANGES[type], unit=hold?" s":" reps";
  const h=exHistory(ex,k+"~",8), prev=h[0];
  if(!prev)return {sets:3,reps:lo,kg:null,why:hold?"Nouveau : tiens "+lo+" à "+hi+" s par série.":"Nouveau : choisis une charge qui te permet "+lo+" à "+hi+" reps propres."};
  const s=prev.sets, top=best(s), topSets=s.filter(x=>(+x.kg||0)===top);
  const minR=Math.min(...topSets.map(x=>+x.reps||0)), n=Math.max(3,Math.min(4,s.length));
  const gap=dayDiff(k,prev.k), when=shortDate(prev.k), last=s.map(x=>setTxt(ex,x)).join(", ");
  const said="Le "+when+" : "+last+" → ";
  if(gap>21)return {sets:n,reps:minR,kg:top,why:"Reprise après "+gap+" jours : mêmes charges que le "+when+"."};
  // stagnation : on allège de 10 % et on ajoute une série, en visant le haut de la fourchette
  if(stalled(h)){
    const kg=top>0?Math.round(top*0.9*2)/2:top;
    return {sets:Math.min(6,s.length+1),reps:hold?Math.max(lo,minR):hi,kg,deload:true,stall:true,
      why:"⚠ Pas de progrès depuis 3 séances : "+(top>0?"on allège de 10 % ("+fmt1(top)+" → "+fmt1(kg)+" kg) et ":"")+"on ajoute une série"+(hold?"":" en visant "+hi+" reps")+" pour relancer."};
  }
  if(hold)return {sets:n,reps:minR+5,kg:top,why:said+"tiens 5 s de plus.",up:true};
  // sans charge (poids du corps) : lest de 2,5 kg pour les tractions et dips en haut de fourchette, sinon une rep de plus
  if(!top){
    if(bwShare(ex)===1&&minR>=hi)return {sets:n,reps:lo,kg:2.5,why:said+hi+" reps tenues : ajoute 2,5 kg de lest et repars à "+lo+" reps.",up:true};
    return {sets:n,reps:minR+1,kg:0,why:said+"vise une rep de plus.",up:true};
  }
  // double progression : on monte les reps jusqu'au haut de la fourchette, puis la charge
  if(minR>=hi){
    const step=(equipOf(ex)==="halteres"||perArm(ex))?2:2.5;
    return {sets:n,reps:lo,kg:top+step,why:said+hi+" reps tenues sur toutes les séries : +"+fmt1(step)+" kg et on repart à "+lo+" reps.",up:true};
  }
  const r=Math.min(hi,Math.max(lo,minR+1));
  return {sets:n,reps:r,kg:top,why:said+"même charge, vise "+r+unit+" (fourchette "+lo+"-"+hi+").",up:true};
}
function buildPlan(k,shift){
  const log=sessionLog(k), lastDate={}, gName=Object.fromEntries(GROUPS);
  log.slice().reverse().forEach(dk=>(state.days[dk].workout||[]).forEach(e=>{if((e.sets||[]).length){const g=groupOf(e.ex);if(g)lastDate[g]=dk}}));
  const since=g=>lastDate[g]?dayDiff(k,lastDate[g]):null;
  const tired=g=>{const d=since(g);return d!=null&&d<REST_DAYS};
  const rest=t=>Math.min(...mainGroups(t).map(g=>since(g)==null?999:since(g)));
  // séances possibles : celles dont les groupes principaux sont reposés passent devant ;
  // parmi elles, le full body d'abord, puis la séance ciblée la plus reposée. « Autre proposition » fait défiler la liste.
  const ranked=[fullBody(since)].concat(log.length?TEMPLATES:[])
    .map((t,i)=>({t,i,ok:!mainGroups(t).some(tired),r:rest(t)}))
    .sort((a,b)=>(b.ok-a.ok)||(a.ok&&(a.t.id==="full")!==(b.t.id==="full")?(a.t.id==="full"?-1:1):0)||b.r-a.r||a.i-b.i);
  const pick=ranked[shift%ranked.length], tpl=pick.t, allTired=!ranked.some(x=>x.ok);
  const tiredMain=mainGroups(tpl).filter(tired).map(g=>gName[g].toLowerCase());
  const tiredOther=Object.keys(lastDate).filter(g=>tired(g)&&!mainGroups(tpl).includes(g)).map(g=>gName[g].toLowerCase());
  const reason=!log.length?"":allTired?"Tous tes groupes ont travaillé il y a moins de 48 h : repos ou cardio conseillé. Si tu y vas quand même, voici la séance la plus reposée."
    :!pick.ok?"Attention : "+tiredMain.join(", ")+" "+(tiredMain.length>1?"ont":"a")+" travaillé il y a moins de 48 h."
    :tpl.id==="full"?"Tes groupes principaux sont reposés : full body."
    :"Séance "+tpl.name.toLowerCase()+" : "+mainGroups(tpl).map(g=>gName[g].toLowerCase()).join(" et ")+" reposés"+(tiredOther.length?", "+tiredOther.join(", ")+" encore en récupération":"")+".";
  // habitudes sur 60 jours : fréquence de chaque exercice et matériel utilisé
  const freq={}, recent={}, equipUsed={};
  log.filter(dk=>dayDiff(k,dk)<=60).forEach(dk=>(state.days[dk].workout||[]).forEach(e=>{if((e.sets||[]).length){const n=norm(e.ex);freq[n]=(freq[n]||0)+1;if(!recent[n])recent[n]=dk;const q=equipOf(e.ex);if(q)equipUsed[q]=1}}));
  const items=[], used=new Set();
  // en full body, on alterne : un exercice fait à la dernière séance passe derrière tes autres habituels du même groupe
  const prevK=log.find(dk=>dk<k)||null;
  const lastEx=new Set(prevK?(state.days[prevK].workout||[]).filter(e=>(e.sets||[]).length).map(e=>norm(e.ex)):[]);
  const rank=n=>!freq[norm(n)]?2:(tpl.id==="full"&&lastEx.has(norm(n)))?1:0;
  // jamais faits : les grands classiques d'abord, avec le matériel que tu utilises déjà
  const classic=n=>{const i=CLASSICS.findIndex(c=>norm(c)===norm(n));return i<0?999:i};
  const candsFor=g=>fullCatalog().filter(c=>c[1]===g&&c[5]!=="wait").map(c=>c[0])
    .sort((a,b)=>rank(a)-rank(b)||(freq[norm(b)]||0)-(freq[norm(a)]||0)||String(recent[norm(b)]||"").localeCompare(String(recent[norm(a)]||""))
      ||(classic(a)<999?0:1)-(classic(b)<999?0:1)||(equipUsed[equipOf(a)]?0:1)-(equipUsed[equipOf(b)]?0:1)||classic(a)-classic(b));
  tpl.groups.forEach(([g,count])=>{
    candsFor(g).filter(n=>!used.has(norm(n))).slice(0,count).forEach(n=>{used.add(norm(n));items.push({ex:n,g,p:progression(n,k),seen:[norm(n)]})});
  });
  // ordre de la séance : exercices de base d'abord, puis les autres, l'isolation et les abdos à la fin
  items.sort((a,b)=>TYPE_ORDER[exType(a.ex)]-TYPE_ORDER[exType(b.ex)]);
  const lastK=log.find(dk=>dk<k)||log[0]||null;
  const lastGroups=lastK?[...new Set((state.days[lastK].workout||[]).filter(e=>(e.sets||[]).length).map(e=>groupOf(e.ex)).filter(Boolean))].map(g=>gName[g]):[];
  const recov=tpl.groups.map(([g])=>{const d=since(g);return gName[g]+" "+(d==null?"jamais travaillé":d===0?"travaillé aujourd'hui":"il y a "+d+" j")});
  return {k,tpl,items,lastK,lastGroups,recov,reason,allTired,first:!log.length,candsFor};
}
function renderPlan(){
  const box=$("planBox");
  if(plan&&plan.k!==state.sel)plan=null;
  $("planBtn").hidden=!!plan;$("planIntro").hidden=!!plan;
  box.hidden=!plan;box.innerHTML="";
  if(!plan)return;
  const inDay=new Set((day(plan.k).workout||[]).map(e=>norm(e.ex)));
  const head=document.createElement("div");head.className="plan-head";
  head.innerHTML='<b></b><span class="lbl"></span>';
  head.firstChild.textContent=plan.tpl.name;head.lastChild.textContent=plural(plan.items.length,"exercice","exercices");
  const ctx=document.createElement("div");ctx.className="plan-ctx";
  const l1=document.createElement("span");
  if(plan.first)l1.textContent="Aucune séance de muscu enregistrée : un full body pour démarrer.";
  else{l1.textContent="Dernière séance ("+shortDate(plan.lastK)+") : ";const b=document.createElement("b");b.textContent=plan.lastGroups.join(", ")||"exercices non classés";l1.appendChild(b)}
  const l2=document.createElement("span");l2.textContent=plan.first?"":"Récupération : "+plan.recov.join(" · ");
  if(plan.reason){const l0=document.createElement("span");l0.className="plan-why"+(plan.allTired?" warn":"");l0.textContent=plan.reason;ctx.append(l0)}
  ctx.append(l1);if(!plan.first)ctx.append(l2);
  const ul=document.createElement("ul");ul.className="plan-list";
  // après un clic, on redonne le focus au même bouton (sur la ligne qui a bougé) pour enchaîner au clavier
  const refocus=(i,cls)=>{const b=$("planBox").querySelectorAll(".plan-list li")[i];const x=b&&b.querySelector("."+cls+":not(:disabled)");x&&x.focus()};
  const btn=(cls,txt,label,title,on)=>{const b=document.createElement("button");b.type="button";b.className="reroll "+cls;b.textContent=txt;b.setAttribute("aria-label",label);b.title=title;b.onclick=on;return b};
  plan.items.forEach((it,i)=>{
    const li=document.createElement("li");
    const n=document.createElement("span");n.className="pn";n.textContent=it.ex+(inDay.has(norm(it.ex))?" ✓":"");
    const t=document.createElement("span");t.className="pt";t.textContent=planTxt(it.ex,it.p);
    const w=document.createElement("span");w.className="pw"+(it.p.stall?" warn":"");w.textContent=it.p.why;
    const acts=document.createElement("span");acts.className="pa";
    // monter / descendre : change l'ordre des exercices (repris tel quel par « Ajouter à la séance »)
    const up=btn("p-up","↑","Monter "+it.ex,"Monter",()=>{plan.items.splice(i-1,0,plan.items.splice(i,1)[0]);renderPlan();refocus(i-1,"p-up")});
    const down=btn("p-down","↓","Descendre "+it.ex,"Descendre",()=>{plan.items.splice(i+1,0,plan.items.splice(i,1)[0]);renderPlan();refocus(i+1,"p-down")});
    up.disabled=i===0;down.disabled=i===plan.items.length-1;
    const r=btn("p-reroll","↻","Remplacer "+it.ex+" par un autre exercice","Autre exercice",()=>{const n=rerollPick(i);if(!n)return;it.ex=n;it.p=progression(n,plan.k);it.seen.push(norm(n));renderPlan();refocus(i,"p-reroll")});
    r.disabled=!rerollPick(i,true);
    // retirer de la proposition, avec « Annuler » dans le bandeau du bas
    const x=btn("p-del","×","Retirer "+it.ex+" de la proposition","Retirer",()=>{
      const p=plan;p.items.splice(i,1);renderPlan();
      showUndo(it.ex+" retiré de la proposition",()=>{if(plan===p){p.items.splice(i,0,it);renderPlan()}});
    });
    acts.append(up,down,r,x);
    li.append(n,t,w,acts);ul.appendChild(li);
  });
  if(!plan.items.length){const li=document.createElement("li");li.className="empty";li.textContent="Tous les exercices ont été retirés. Touche « Autre proposition » pour repartir d'une nouvelle séance.";ul.appendChild(li)}
  const acts=document.createElement("div");acts.className="plan-acts";
  const todo=plan.items.filter(it=>!inDay.has(norm(it.ex)));
  const isToday=plan.k===keyOf(new Date());
  const add=document.createElement("button");add.type="button";add.className="primary";
  add.disabled=!todo.length;add.textContent=todo.length?"Ajouter à la séance "+(isToday?"du jour":"du "+shortDate(plan.k)):"✓ Déjà dans la séance";
  add.onclick=()=>{
    const k=plan.k, before=JSON.parse(JSON.stringify(day(k)));
    (day(k).workout||[]).forEach(e=>folded.add(k+"|"+e.ex));
    todo.forEach((it,i)=>{if(i>0)folded.add(k+"|"+it.ex);else folded.delete(k+"|"+it.ex)});
    woCardOpen=true;
    editDay(k,x=>{x.workout=x.workout||[];todo.forEach(it=>x.workout.push({ex:it.ex,sets:[],plan:Object.assign({sets:it.p.sets,reps:it.p.reps,kg:it.p.kg},it.p.deload?{deload:true}:{})}));
      x.sports=x.sports||[];if(!x.sports.includes("muscu"))x.sports.push("muscu");x.rest=false});
    undo={k,before};
    $("toastTxt").textContent="Séance "+plan.tpl.name.toLowerCase()+" ajoutée";$("toast").hidden=false;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$("toast").hidden=true;undo=null},6000);
    showView("seances");window.scrollTo({top:0});
  };
  const other=document.createElement("button");other.type="button";other.className="ghost";other.textContent="Autre proposition";
  other.hidden=plan.first;
  other.onclick=()=>{planShift++;plan=buildPlan(state.sel,planShift);renderPlan()};
  const close=document.createElement("button");close.type="button";close.className="ghost";close.textContent="Fermer";
  close.onclick=()=>{plan=null;renderPlan()};
  acts.append(add,other,close);
  box.append(head,ctx,ul,acts);
}
// remplace un exercice par le suivant du même groupe, sans doublon dans la séance ; repart au début une fois la liste parcourue
function rerollPick(i,dry){
  const it=plan.items[i], others=new Set(plan.items.filter((_,j)=>j!==i).map(x=>norm(x.ex)));
  const pool=plan.candsFor(it.g).filter(n=>!others.has(norm(n))&&norm(n)!==norm(it.ex));
  if(!pool.length)return null;
  if(dry)return pool[0];
  const fresh=pool.find(n=>!it.seen.includes(norm(n)));
  if(fresh)return fresh;
  it.seen=[norm(it.ex)];return pool[0];
}
$("planBtn").onclick=()=>{planShift=0;plan=buildPlan(state.sel,0);renderPlan()};

// ---------- accueil : la journée en un coup d'œil, la semaine, le tonnage, les records ----------
const sportName=id=>(SPORTS.find(s=>s.id===id)||{name:id}).name;
const sportShort=id=>{const s=SPORTS.find(x=>x.id===id);return s?s.short||s.name:id};
const mondayOf=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-(x.getDay()+6)%7);return x};
const weekKeys=mon=>[0,1,2,3,4,5,6].map(i=>keyOf(addDays(mon,i)));
const trainedOn=k=>(day(k).sports||[]).length>0;
const dayVol=k=>(day(k).workout||[]).reduce((s,e)=>s+vol(e.ex,e.sets),0);
const weekGoal=()=>Math.max(1,Math.round(+state.settings.weekGoal||3));
const plural=(n,s,p)=>n+" "+(n>1?p:s);
// pour donner une idée du tonnage : le plus gros objet dont on a soulevé au moins l'équivalent
const EQUIV=[[150000,"baleine bleue","baleines bleues","🐋"],[6000,"éléphant","éléphants","🐘"],[1200,"voiture","voitures","🚗"],[400,"piano à queue","pianos à queue","🎹"],[70,"personne de 70 kg","personnes de 70 kg","🧍"]];
function equiv(kg){
  for(const [w,s,p,ic] of EQUIV){const n=kg/w;if(n>=1){const r=n>=10?Math.round(n):Math.round(n*2)/2;return ic+" Soit le poids de "+fmt1(r)+" "+(r>=2?p:s)+"."}}
  return "";
}
function fillTile(el,lbl,big,sub,extra){
  el.innerHTML='<span class="lbl"></span><b></b><small></small>';
  el.children[0].textContent=lbl;el.children[1].textContent=big;el.children[2].textContent=sub;
  if(extra)el.insertBefore(extra,el.children[2]);
}
// records : séances où la charge max d'un exercice dépasse tout ce qui avait été fait avant (30 derniers jours)
function recentPRs(){
  const since=keyOf(addDays(new Date(),-30)), top={}, out=[];
  Object.keys(state.days).sort().forEach(dk=>(state.days[dk].workout||[]).forEach(e=>{
    if(!(e.sets||[]).length)return;
    const n=norm(e.ex), b=best(e.sets);
    if(top[n]!==undefined&&b>top[n]&&dk>=since)out.push({ex:e.ex,k:dk,kg:b,gain:b-top[n]});
    if(top[n]===undefined||b>top[n])top[n]=b;
  }));
  const seen=new Set(); // le plus récent record par exercice
  return out.reverse().filter(r=>!seen.has(norm(r.ex))&&seen.add(norm(r.ex))).slice(0,4);
}
let tonPick=null; // semaine touchée dans le graphique (détail affiché dessous)
function renderHome(){
  const k=state.sel, d=day(k), todayK=keyOf(new Date());
  $("hToday").textContent=k===todayK?"Aujourd'hui":fromKey(k).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});

  // tuiles du jour
  const sp=d.sports||[], nSets=(d.workout||[]).reduce((s,e)=>s+(e.sets||[]).length,0);
  let dots=null;
  if(sp.length){dots=document.createElement("span");dots.className="dots";sp.forEach(s=>{const i=document.createElement("i");i.style.setProperty("--c","var(--"+s+")");dots.appendChild(i)})}
  fillTile($("tileSport"),"Séance",sp.length?sp.map(sportShort).join(" + "):d.rest?"Repos":"—",
    nSets?plural(nSets,"série","séries")+" · "+(sessionTime(k).dur?fmtDur(sessionTime(k).dur):fmtKg(dayVol(k))):sp.length?"Bien joué !":d.rest?"Récupération":"Pas encore de séance",dots);
  $("tileSport").setAttribute("aria-label","Séance : "+(sp.length?sp.map(sportName).join(", "):d.rest?"repos":"aucune")+". Ouvrir l'onglet Séances");
  const t=target(), tot=total(d), bar=document.createElement("span");
  bar.className="bar"+(t&&tot>=t?" done":"");bar.innerHTML="<i></i>";bar.firstChild.style.width=(t?Math.min(100,tot/t*100):0)+"%";
  fillTile($("tileProt"),"Protéines",fmt1(tot)+" g",t?(tot>=t?"Objectif atteint":"sur "+t+" g"):"Objectif à définir",bar);
  $("tileProt").setAttribute("aria-label","Protéines : "+fmt1(tot)+" g"+(t?" sur "+t:"")+". Ouvrir l'onglet Nutrition");
  const st=streak();
  fillTile($("tileCrea"),"Créatine",d.creatine?"✓ Prise":"À prendre",st?plural(st,"jour","jours")+" d'affilée":"Touche quand c'est pris");
  $("tileCrea").classList.toggle("on",!!d.creatine);$("tileCrea").setAttribute("aria-pressed",!!d.creatine);
  $("tileCrea").setAttribute("aria-label","Créatine "+(d.creatine?"prise":"pas encore prise")+", "+st+" jours d'affilée. Touche pour changer");

  // la semaine (lundi → dimanche) du jour affiché
  const mon=mondayOf(fromKey(k)), keys=weekKeys(mon), goal=weekGoal(), n=keys.filter(trainedOn).length;
  const thisWeek=keyOf(mon)===keyOf(mondayOf(new Date()));
  $("hWeek").textContent=thisWeek?"Cette semaine":"Semaine du "+fromKey(keyOf(mon)).toLocaleDateString("fr-FR",{day:"numeric",month:"short"});
  $("weekCount").textContent=n+" / "+plural(goal,"séance","séances");
  const strip=$("weekStrip");strip.innerHTML="";
  keys.forEach((dk,i)=>{
    const x=day(dk), s=x.sports||[], b=document.createElement("button");b.type="button";b.className="wday";
    if(s.length){b.classList.add("done");b.style.setProperty("--c","var(--"+s[0]+")")}else if(x.rest)b.classList.add("rest");
    if(dk===todayK)b.classList.add("today");if(dk===k)b.classList.add("sel");
    b.innerHTML='<span>'+"LMMJVSD"[i]+'</span><span class="c">'+(s.length>1?s.length:s.length?"✓":"")+'</span>';
    b.setAttribute("aria-label",fromKey(dk).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric"})+" : "+(s.length?s.map(sportName).join(", "):x.rest?"repos":"pas de séance"));
    if(dk>todayK)b.disabled=true;else b.onclick=()=>{state.sel=dk;syncMonth();render()};
    strip.appendChild(b);
  });
  // série de semaines à l'objectif, en comptant la semaine en cours seulement si elle est déjà réussie
  let wk=mondayOf(new Date()), run=0;
  if(weekKeys(wk).filter(trainedOn).length>=goal)run++;
  for(wk=addDays(wk,-7);run<520&&weekKeys(wk).filter(trainedOn).length>=goal;wk=addDays(wk,-7))run++;
  $("weekGoalTxt").textContent=(n>=goal?"Objectif de la semaine atteint 🎉":thisWeek?"Encore "+plural(goal-n,"séance","séances")+" pour atteindre ton objectif.":"Objectif non atteint cette semaine-là.")+
    (run>=2?" 🔥 "+run+" semaines d'affilée à l'objectif.":"");

  // tonnage des 8 dernières semaines (jusqu'à la semaine du jour affiché)
  const weeks=[7,6,5,4,3,2,1,0].map(i=>{const m=addDays(mon,-7*i);return {m,v:weekKeys(m).reduce((s,x)=>s+dayVol(x),0)}});
  const cur=weeks[7].v, prev=weeks[6].v, maxV=Math.max(...weeks.map(w=>w.v));
  const head=$("tonHead");
  if(!maxV){
    head.innerHTML='<span class="empty">Note tes séries en musculation (kg × reps) pour voir ici ton tonnage semaine après semaine.</span>';
    $("tonChart").innerHTML="";$("tonInfo").textContent="";
  }else{
    head.innerHTML='<b></b><span></span>';
    head.firstChild.textContent=fmtKg(cur);
    head.lastChild.textContent=(thisWeek?"cette semaine":"cette semaine-là")+(prev?" · "+fmtKg(prev)+" la semaine d'avant"+(cur>prev?" ↑":""):"");
    const wrap=document.createElement("div");wrap.className="tw";
    const bars=document.createElement("div");bars.className="tw-bars";
    const labels=document.createElement("div");labels.className="tw-labels";labels.setAttribute("aria-hidden","true");
    weeks.forEach((w,i)=>{
      const wk0=keyOf(w.m), lbl="Semaine du "+w.m.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})+" : "+fmtKg(w.v);
      const c=document.createElement("button");c.type="button";c.className="tw-col"+(i===7?" cur":"")+(tonPick===wk0?" on":"");
      c.setAttribute("aria-label",lbl);c.title=lbl;
      const bar=document.createElement("i");bar.style.height=(w.v?Math.max(3,w.v/maxV*100):0)+"%";c.appendChild(bar);
      c.onclick=()=>{tonPick=tonPick===wk0?null:wk0;renderHome()};
      bars.appendChild(c);
      const l=document.createElement("span");l.textContent=w.m.getDate()+"/"+(w.m.getMonth()+1);labels.appendChild(l);
    });
    wrap.append(bars,labels);$("tonChart").innerHTML="";$("tonChart").appendChild(wrap);
    const pickW=weeks.find(w=>keyOf(w.m)===tonPick);
    $("tonInfo").textContent=pickW?"Semaine du "+pickW.m.toLocaleDateString("fr-FR",{day:"numeric",month:"long"})+" : "+fmtKg(pickW.v)+".":equiv(cur);
  }

  // records récents
  const prs=recentPRs(), ul=$("prList");ul.innerHTML="";
  if(!prs.length){const li=document.createElement("li");li.className="empty";li.textContent=maxV||Object.keys(state.days).length?"Pas de nouveau record ces 30 derniers jours. Ça viendra !":"Tes records en musculation s'afficheront ici.";ul.appendChild(li)}
  prs.forEach(r=>{
    const li=document.createElement("li");li.innerHTML='<span class="pr-ex"></span><span class="pr-kg"></span><span class="pr-d"></span>';
    li.children[0].textContent="🏆 "+r.ex;
    li.children[1].textContent=(isBW(r.ex)?"PDC+"+fmt1(r.kg):fmt1(r.kg))+" kg (+"+fmt1(r.gain)+")";
    li.children[2].textContent=shortDate(r.k);
    ul.appendChild(li);
  });

  // aperçu de la séance proposée
  const p=buildPlan(k,0), nb=$("nextBox");nb.innerHTML='<div class="plan-head"><b></b><span class="lbl"></span></div><p class="status"></p><p class="next-ex"></p>';
  nb.querySelector("b").textContent=p.tpl.name;nb.querySelector(".lbl").textContent=plural(p.items.length,"exercice","exercices");
  nb.querySelector(".status").textContent=p.first?"Aucune séance de muscu notée : un full body pour démarrer.":p.reason||("Dernière séance le "+shortDate(p.lastK)+".");
  nb.querySelector(".next-ex").textContent=p.items.map(it=>it.ex).join(" · ");
}
$("tileSport").onclick=()=>{showView("seances");window.scrollTo({top:0})};
$("tileProt").onclick=()=>{showView("nutrition");window.scrollTo({top:0})};
$("tileCrea").onclick=()=>editDay(state.sel,x=>{x.creatine=!x.creatine});
$("nextGo").onclick=()=>{showView("exercices");planShift=0;plan=buildPlan(state.sel,0);renderPlan();window.scrollTo({top:0})};

// ---------- onglets principaux ----------
const VIEWS={accueil:["tabHome","viewHome"],nutrition:["tabNutri","viewNutri"],seances:["tabSport","viewSport"],exercices:["tabExo","viewExo"]};
function showView(v){
  if(!VIEWS[v])v="accueil";
  Object.entries(VIEWS).forEach(([name,[t,p]])=>{$(t).setAttribute("aria-selected",name===v);$(p).hidden=name!==v});
  try{localStorage.setItem("carnet-forme-tab",v)}catch(e){}
}
$("tabHome").onclick=()=>showView("accueil");
$("tabNutri").onclick=()=>showView("nutrition");
$("tabSport").onclick=()=>showView("seances");
$("tabExo").onclick=()=>showView("exercices");
(()=>{let v=location.hash.slice(1);if(!VIEWS[v]){try{v=localStorage.getItem("carnet-forme-tab")}catch(e){}}showView(v)})();

// ---------- accueil d'un nouveau compte ----------
const WELCOME_KEY="carnet-forme-welcome-off";
function welcomeOff(){try{return localStorage.getItem(WELCOME_KEY)==="1"}catch(e){return false}}
function openSettingsAt(id){showView("nutrition");$("settingsBox").open=true;$("settingsBox").scrollIntoView({block:"start"});id&&$(id).focus()}
$("welcomeGo").onclick=()=>openSettingsAt("sWeight");
$("welcomeLater").onclick=()=>{try{localStorage.setItem(WELCOME_KEY,"1")}catch(e){}render()};

// ---------- mes données : export / import ----------
const isDayKey=k=>/^\d{4}-\d{2}-\d{2}$/.test(k);
function exportData(){
  const payload={app:"carnet-forme",version:1,exported:new Date().toISOString(),settings:state.settings,days:state.days};
  const name="carnet-forme-"+keyOf(new Date())+".json";
  const blob=new Blob([JSON.stringify(payload)],{type:"application/json"});
  const file=new File([blob],name,{type:"application/json"});
  // sur iPhone, la feuille de partage propose « Enregistrer dans Fichiers » ; sur ordinateur, téléchargement classique
  if(matchMedia("(pointer:coarse)").matches&&navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],title:name}).catch(()=>{});return}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
}
// accepte l'export de cette app ({days:{…}, settings:{…}}), celui de l'artefact, ou une simple liste de jours
function parseImport(text){
  const raw=JSON.parse(text), days={};
  const src=raw&&raw.days!==undefined?raw.days:raw;
  if(Array.isArray(src))src.forEach(d=>{if(d&&isDayKey(String(d.date||"")))days[d.date]=d});
  else if(src&&typeof src==="object")Object.entries(src).forEach(([k,d])=>{if(isDayKey(k)&&d&&typeof d==="object")days[k]={...d,date:k}});
  const settings=raw&&raw.settings&&typeof raw.settings==="object"&&!Array.isArray(raw.settings)?raw.settings:null;
  if(!Object.keys(days).length&&!settings)throw new Error("vide");
  return {days,settings};
}
let pendingImport=null;
function importMsg(t,kind){const m=$("importMsg");m.hidden=!t;m.textContent=t||"";m.className="msg"+(kind?" "+kind:"")}
function readImport(text){
  try{pendingImport=parseImport(text)}catch(e){pendingImport=null;importMsg("Ce fichier n'est pas une sauvegarde Carnet Forme lisible.","err");return}
  const ks=Object.keys(pendingImport.days).sort(), clash=ks.filter(k=>state.days[k]).length;
  $("importTxt").textContent=(ks.length?ks.length+" jour"+(ks.length>1?"s":"")+" trouvé"+(ks.length>1?"s":"")+" (du "+shortDate(ks[0])+" au "+shortDate(ks[ks.length-1])+")"+
    (clash?", dont "+clash+" déjà présent"+(clash>1?"s":"")+" ici qui ser"+(clash>1?"ont":"a")+" remplacé"+(clash>1?"s":""):"")+". ":"Aucun jour trouvé. ")+
    (pendingImport.settings?"Tes réglages (poids, objectifs, exercices perso) seront remplacés par ceux du fichier. ":"")+"Les autres jours ne changent pas.";
  $("importConfirm").hidden=false;importMsg("");
}
$("exportBtn").onclick=exportData;
$("importBtn").onclick=()=>$("importFile").click();
$("importFile").addEventListener("change",async()=>{const f=$("importFile").files[0];if(f)readImport(await f.text());$("importFile").value=""});
$("pasteBtn").onclick=()=>{$("pasteBox").hidden=!$("pasteBox").hidden;if(!$("pasteBox").hidden)$("pasteText").focus()};
$("pasteRead").onclick=()=>{const t=$("pasteText").value.trim();if(t)readImport(t)};
$("importCancel").onclick=()=>{pendingImport=null;$("importConfirm").hidden=true};
$("importGo").onclick=()=>{
  const imp=pendingImport;if(!imp)return;pendingImport=null;$("importConfirm").hidden=true;
  Object.entries(imp.days).forEach(([k,d])=>{state.days[k]=d;saveDay(k)});
  if(imp.settings){Object.assign(state.settings,imp.settings);storage.saveSettings({...state.settings})}
  $("pasteText").value="";$("pasteBox").hidden=true;
  renderSettings();render();
  const n=Object.keys(imp.days).length;importMsg("Import terminé : "+n+" jour"+(n>1?"s":"")+" ajouté"+(n>1?"s":"")+".","ok");
};

// ---------- compte ----------
function accMsg(t,kind){const m=$("accMsg");m.hidden=!t;m.textContent=t||"";m.className="msg"+(kind?" "+kind:"")}
$("pwBtn").onclick=()=>{$("pwForm").hidden=!$("pwForm").hidden;accMsg("")};
$("pwForm").addEventListener("submit",async e=>{e.preventDefault();
  const p=$("pwNew").value,p2=$("pwNew2").value;
  if(p.length<8)return accMsg("Le mot de passe doit faire au moins 8 caractères.","err");
  if(p!==p2)return accMsg("Les deux mots de passe ne sont pas identiques.","err");
  try{await changePassword(p);$("pwNew").value=$("pwNew2").value="";$("pwForm").hidden=true;accMsg("Mot de passe modifié.","ok")}
  catch(err){accMsg(frError(err),"err")}});
$("logoutBtn").onclick=async()=>{
  await storage.flush();
  const n=storage.pendingCount();
  if(!n)return signOut();
  $("logoutTxt").textContent=n+" modification"+(n>1?"s":"")+" pas encore envoyée"+(n>1?"s":"")+" (pas de réseau ?) ser"+(n>1?"ont":"a")+" perdue"+(n>1?"s":"")+" si tu te déconnectes maintenant.";
  $("logoutConfirm").hidden=false;
};
$("logoutGo").onclick=()=>signOut();
$("logoutCancel").onclick=()=>{$("logoutConfirm").hidden=true};
$("deleteBtn").onclick=()=>{$("deleteConfirm").hidden=false;accMsg("")};
$("deleteCancel").onclick=()=>{$("deleteConfirm").hidden=true};
$("deleteGo").onclick=async()=>{
  if(!navigator.onLine)return accMsg("Il faut être connecté à internet pour supprimer ton compte.","err");
  $("deleteGo").disabled=true;
  try{sessionStorage.setItem("carnet-forme-bye","1");await deleteAccount()}
  catch(err){sessionStorage.removeItem("carnet-forme-bye");accMsg(frError(err),"err");$("deleteGo").disabled=false}
};

// ---------- démarrage ----------
let ready=null, currentUser=null, lastToday=keyOf(new Date());
async function openApp(user){
  await storage.open(user.id);
  const c=await storage.getAll();
  state.days=c.days;if(c.settings)Object.assign(state.settings,c.settings);
  storage.onStatus(t=>{$("sync").textContent=t});
  hideAuth();renderSettings();render();
}
// appelé au démarrage (compte mémorisé sur l'appareil) puis quand Supabase confirme la session
async function startApp(user,fromCache){
  if(currentUser&&user.id!==currentUser.id){await storage.wipe();location.reload();return}
  if(!ready){currentUser=user;ready=openApp(user)}
  await ready;
  $("accEmail").textContent=user.email||"";
  if(!fromCache)refresh();
}
// récupère les données à jour (saisies faites sur un autre appareil), puis envoie ce qui attend
async function refresh(){
  try{
    const r=await storage.pull();
    if(r){
      Object.entries(r.days).forEach(([k,v])=>{if(!storage.isPending("day:"+k))state.days[k]=v});
      if(r.settings&&!storage.isPending("settings")){Object.assign(state.settings,r.settings);if(!document.activeElement||!document.activeElement.closest(".settings"))renderSettings()}
      render();
    }
  }catch(e){$("sync").textContent="Impossible de récupérer tes données pour l'instant. Tes saisies restent sur ce téléphone."}
  storage.flush();
}
async function onSignedOut(){
  await storage.wipe();forgetUser();
  try{localStorage.removeItem(WELCOME_KEY)}catch(e){}
  if(ready){location.replace(location.pathname);return} // repart d'une page propre pour le compte suivant
  let bye=false;try{bye=sessionStorage.getItem("carnet-forme-bye")==="1";sessionStorage.removeItem("carnet-forme-bye")}catch(e){}
  showAuth("login",bye?"Ton compte et toutes tes données ont été supprimés.":"",bye?"ok":"");
}
// au retour dans l'app : nouvelle journée et données des autres appareils
document.addEventListener("visibilitychange",()=>{
  if(document.hidden||!ready)return;
  const t=keyOf(new Date());
  if(t!==lastToday){if(state.sel===lastToday){state.sel=t;syncMonth()}lastToday=t;render()}
  if(storage.sincePull()>30000)refresh();
});
const cu=cachedUser();
if(cu)startApp(cu,true); // ouverture immédiate depuis le cache, même sans réseau
initAuth({onSignedIn:u=>startApp(u,false),onSignedOut});
// mises à jour de l'app : à chaque retour dans l'app, on regarde si une nouvelle version est en ligne ;
// dès qu'elle est installée, la page se recharge une fois pour l'afficher (en attendant la fin d'une saisie en cours)
if("serviceWorker" in navigator){
  const hadSW=!!navigator.serviceWorker.controller; let reloading=false;
  const reloadWhenIdle=()=>{const a=document.activeElement;if(a&&a.matches("input,textarea,select"))return setTimeout(reloadWhenIdle,2000);location.reload()};
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(hadSW&&!reloading){reloading=true;reloadWhenIdle()}});
  addEventListener("load",()=>navigator.serviceWorker.register("sw.js").then(reg=>{
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)reg.update().catch(()=>{})});
  }).catch(()=>{}));
}
