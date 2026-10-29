// ---------- stockage : Supabase (source de vérité) + IndexedDB (cache local, fonctionne sans réseau) ----------
// L'interface n'utilise que ces fonctions ; changer de backend ne demande de modifier que ce fichier.
//   open(userId)          ouvre le cache local du compte
//   getAll()              { days, settings } depuis le cache local (instantané, marche hors ligne)
//   pull()                { days, settings } depuis Supabase, et met le cache à jour
//   saveDay(k, data)      enregistre un jour (cache tout de suite, Supabase dès que possible)
//   saveSettings(s)       idem pour les réglages
//   isPending(key)        vrai si une modification locale n'est pas encore envoyée ("day:AAAA-MM-JJ" ou "settings")
//   pendingCount()        nombre de modifications en attente
//   wipe()                vide le cache local (déconnexion)
//   onStatus(fn)          fn(texte) à chaque changement d'état de la synchronisation
import { sb } from "./auth.js";

const DB_NAME="carnet-forme", PAGE=1000;
let idb=null, userId=null, statusFn=()=>{};
const pending=new Map(); // clé → horodatage de la dernière modification locale non envoyée

// ---------- petites aides IndexedDB ----------
// trois tables locales : days (clé = date), meta ("settings", "user"), queue (modifications à envoyer)
function openDb(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(DB_NAME,1);
    r.onupgradeneeded=()=>{const d=r.result;["days","meta","queue"].forEach(s=>{if(!d.objectStoreNames.contains(s))d.createObjectStore(s)})};
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
  });
}
function run(store,mode,fn){
  if(!idb)return Promise.resolve(null);
  return new Promise((res,rej)=>{
    const t=idb.transaction(store,mode), s=t.objectStore(store);let out=null;
    const r=fn(s);if(r)r.onsuccess=()=>{out=r.result};
    t.oncomplete=()=>res(out);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);
  });
}
const put=(store,key,val)=>run(store,"readwrite",s=>s.put(val,key));
const get=(store,key)=>run(store,"readonly",s=>s.get(key));
const del=(store,key)=>run(store,"readwrite",s=>s.delete(key));
async function entries(store){
  const [keys,vals]=await Promise.all([run(store,"readonly",s=>s.getAllKeys()),run(store,"readonly",s=>s.getAll())]);
  return (keys||[]).map((k,i)=>[k,vals[i]]);
}
const clearAll=()=>Promise.all(["days","meta","queue"].map(s=>run(s,"readwrite",x=>x.clear())));

// ---------- ouverture / lecture ----------
export async function open(uid){
  userId=uid;
  try{idb=await openDb()}catch(e){idb=null} // navigation privée très ancienne : l'app marche, sans cache
  // un autre compte a utilisé ce téléphone : on repart d'un cache vide
  if((await get("meta","user"))!==uid){await clearAll();await put("meta","user",uid)}
  pending.clear();
  (await entries("queue")).forEach(([k,v])=>pending.set(k,v));
}
export async function getAll(){
  const days={};
  (await entries("days")).forEach(([k,v])=>{days[k]=v});
  return {days,settings:await get("meta","settings")};
}

// ---------- lecture depuis Supabase ----------
let lastPull=0;
export async function pull(){
  if(!userId||!navigator.onLine)return null;
  const days={};
  // Supabase renvoie 1000 lignes au plus par requête : on lit par pages
  for(let from=0;;from+=PAGE){
    const {data,error}=await sb.from("days").select("date,data").order("date").range(from,from+PAGE-1);
    if(error)throw error;
    data.forEach(r=>{days[r.date]=r.data});
    if(data.length<PAGE)break;
  }
  const {data:srow,error}=await sb.from("settings").select("data").maybeSingle();
  if(error)throw error;
  // mise à jour du cache, sauf pour ce qui a été modifié ici et pas encore envoyé
  for(const [k,v] of Object.entries(days))if(!pending.has("day:"+k))await put("days",k,v);
  if(srow&&!pending.has("settings"))await put("meta","settings",srow.data);
  lastPull=Date.now();
  return {days,settings:srow?srow.data:null};
}
export const sincePull=()=>Date.now()-lastPull;

// ---------- écriture ----------
export async function saveDay(k,data){
  const key="day:"+k, ts=new Date().toISOString();
  pending.set(key,ts);
  try{await put("days",k,data);await put("queue",key,ts)}catch(e){}
  scheduleFlush();
}
export async function saveSettings(s){
  const ts=new Date().toISOString();
  pending.set("settings",ts);
  try{await put("meta","settings",s);await put("queue","settings",ts)}catch(e){}
  scheduleFlush();
}
export const isPending=key=>pending.has(key);
export const pendingCount=()=>pending.size;

// envoi des modifications en attente ; « la dernière écriture gagne » grâce à updated_at (voir le trigger SQL)
let flushTimer=null, flushing=false, retryTimer=null;
function scheduleFlush(delay=800){clearTimeout(flushTimer);flushTimer=setTimeout(flush,delay);report()}
export async function flush(){
  if(flushing||!userId||!pending.size)return report();
  if(!navigator.onLine)return report();
  flushing=true;clearTimeout(retryTimer);report("Envoi…");
  const batch=[...pending.entries()]; // on note ce qu'on envoie, pour ne pas effacer une modification faite pendant l'envoi
  try{
    const dayRows=[];let setRow=null;
    for(const [key,ts] of batch){
      if(key==="settings")setRow={user_id:userId,data:(await get("meta","settings"))||{},updated_at:ts};
      else{const k=key.slice(4),data=await get("days",k);if(data)dayRows.push({user_id:userId,date:k,data,updated_at:ts})}
    }
    for(let i=0;i<dayRows.length;i+=200){
      const {error}=await sb.from("days").upsert(dayRows.slice(i,i+200),{onConflict:"user_id,date"});
      if(error)throw error;
    }
    if(setRow){const {error}=await sb.from("settings").upsert(setRow,{onConflict:"user_id"});if(error)throw error}
    for(const [key,ts] of batch)if(pending.get(key)===ts){pending.delete(key);await del("queue",key)}
    flushing=false;
    if(pending.size)return scheduleFlush(300);
    report();
  }catch(e){
    flushing=false;
    report(e&&e.code==="PGRST301"||e&&e.status===401?"Session expirée : reconnecte-toi pour envoyer tes modifications.":"Envoi impossible pour l'instant : nouvel essai dans 30 s. Tes saisies restent sur ce téléphone.");
    retryTimer=setTimeout(flush,30000);
  }
}

// ---------- état affiché en bas de l'app ----------
export function onStatus(fn){statusFn=fn;report()}
function report(text){
  const n=pending.size;
  statusFn(text||(!navigator.onLine
    ?"Hors ligne"+(n?" : "+n+" modification"+(n>1?"s":"")+" à envoyer au retour du réseau.":". Tes saisies seront envoyées au retour du réseau.")
    :n?"Enregistrement…":"Synchronisé sur tous tes appareils."));
}
addEventListener("online",()=>flush());
addEventListener("offline",()=>report());

// ---------- déconnexion ----------
export async function wipe(){
  pending.clear();userId=null;clearTimeout(flushTimer);clearTimeout(retryTimer);
  try{if(!idb)idb=await openDb();await clearAll()}catch(e){}
}
