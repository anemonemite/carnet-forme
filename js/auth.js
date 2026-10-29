// ---------- comptes : connexion, inscription, mot de passe, suppression (Supabase Auth) ----------
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// le client Supabase (bibliothèque chargée par js/vendor/supabase.js) ; la session reste enregistrée sur l'appareil
export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
    storageKey: "carnet-forme-auth",
    // « implicit » plutôt que « pkce » : sur iPhone, le lien de l'e-mail s'ouvre dans Safari et non dans l'app installée,
    // qui n'a pas le même stockage ; le mode pkce échouerait dans ce cas
    flowType: "implicit"
  }
});

const $ = id => document.getElementById(id);
const USER_KEY = "carnet-forme-user"; // dernier compte connecté : permet d'ouvrir l'app sans réseau
export function cachedUser(){ try{return JSON.parse(localStorage.getItem(USER_KEY)||"null")}catch(e){return null} }
function rememberUser(u){ try{localStorage.setItem(USER_KEY,JSON.stringify({id:u.id,email:u.email}))}catch(e){} }
export function forgetUser(){ try{localStorage.removeItem(USER_KEY)}catch(e){} }
const redirectTo = () => location.origin + location.pathname;

// messages d'erreur Supabase traduits
export function frError(e){
  const m=String(e&&e.message||"").toLowerCase(), code=e&&e.code;
  if(code==="invalid_credentials"||m.includes("invalid login"))return "E-mail ou mot de passe incorrect.";
  if(code==="email_not_confirmed"||m.includes("not confirmed"))return "Confirme d'abord ton adresse : clique sur le lien reçu par e-mail (pense aux spams).";
  if(code==="user_already_exists"||m.includes("already registered"))return "Un compte existe déjà avec cette adresse. Connecte-toi.";
  if(code==="weak_password"||m.includes("password should"))return "Mot de passe trop faible : 8 caractères minimum.";
  if(code==="same_password")return "Choisis un mot de passe différent de l'actuel.";
  if(code==="over_email_send_rate_limit"||code==="over_request_rate_limit"||(e&&e.status===429))return "Trop de tentatives. Réessaie dans quelques minutes.";
  if(code==="email_address_invalid"||m.includes("invalid format"))return "Adresse e-mail invalide.";
  if(code==="signup_disabled")return "Les inscriptions sont fermées pour le moment.";
  if(!navigator.onLine||m.includes("fetch"))return "Pas de connexion internet. Réessaie quand tu auras du réseau.";
  return "Une erreur est survenue. Réessaie dans un moment.";
}

// ---------- écran de connexion ----------
const MODES={
  login: {title:"Connexion",submit:"Se connecter",fields:["email","pass"],links:[["signup","Créer un compte"],["forgot","Mot de passe oublié ?"]]},
  signup:{title:"Créer un compte",submit:"Créer mon compte",fields:["email","pass","pass2"],links:[["login","J'ai déjà un compte"]]},
  forgot:{title:"Mot de passe oublié",submit:"Recevoir le lien",fields:["email"],links:[["login","Retour à la connexion"]]},
  reset: {title:"Nouveau mot de passe",submit:"Enregistrer",fields:["pass","pass2"],links:[]},
  sent:  {title:"Vérifie tes e-mails",submit:null,fields:[],links:[["login","Retour à la connexion"]]}
};
let mode="login", handlers=null, recovering=/type=recovery/.test(location.hash);

function say(text,kind){const m=$("authMsg");m.hidden=!text;m.textContent=text||"";m.className="msg"+(kind?" "+kind:"")}
export function showAuth(m,text,kind){
  mode=m;const cfg=MODES[m];
  $("app").hidden=true;$("authView").hidden=false;
  $("authTitle").textContent=cfg.title;
  $("fEmail").hidden=!cfg.fields.includes("email");
  $("fPass").hidden=!cfg.fields.includes("pass");
  $("fPass2").hidden=!cfg.fields.includes("pass2");
  $("aPass").autocomplete=m==="login"?"current-password":"new-password";
  $("fPass").firstChild.textContent=m==="reset"?"Nouveau mot de passe":"Mot de passe";
  $("authSubmit").hidden=!cfg.submit;$("authSubmit").textContent=cfg.submit||"";
  const links=$("authLinks");links.innerHTML="";
  cfg.links.forEach(([to,l])=>{const b=document.createElement("button");b.type="button";b.className="linkbtn";b.textContent=l;b.onclick=()=>showAuth(to);links.appendChild(b)});
  say(text,kind);
}
export function hideAuth(){$("authView").hidden=true;$("app").hidden=false}

$("authForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("aEmail").value.trim(), pass=$("aPass").value, pass2=$("aPass2").value;
  const cfg=MODES[mode];
  if(cfg.fields.includes("email")&&!/^\S+@\S+\.\S+$/.test(email))return say("Indique une adresse e-mail valide.","err");
  if(cfg.fields.includes("pass")&&pass.length<8)return say("Le mot de passe doit faire au moins 8 caractères.","err");
  if(cfg.fields.includes("pass2")&&pass!==pass2)return say("Les deux mots de passe ne sont pas identiques.","err");
  $("authSubmit").disabled=true;say("Un instant…");
  try{
    if(mode==="login"){
      const {error}=await sb.auth.signInWithPassword({email,password:pass});if(error)throw error;
      say("");// la suite est gérée par onAuthStateChange
    }else if(mode==="signup"){
      const {data,error}=await sb.auth.signUp({email,password:pass,options:{emailRedirectTo:redirectTo()}});if(error)throw error;
      if(!data.session)showAuth("sent","Un lien de confirmation vient d'être envoyé à "+email+". Clique dessus, puis reviens te connecter ici. Pense à regarder dans les spams.","ok");
    }else if(mode==="forgot"){
      const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:redirectTo()});if(error)throw error;
      showAuth("sent","Si un compte existe pour "+email+", un lien pour choisir un nouveau mot de passe vient d'être envoyé.","ok");
    }else if(mode==="reset"){
      const {data,error}=await sb.auth.updateUser({password:pass});if(error)throw error;
      recovering=false;history.replaceState(null,"",location.pathname);
      $("aPass").value=$("aPass2").value="";
      handlers.onSignedIn(data.user);
    }
  }catch(err){say(frError(err),"err")}
  finally{$("authSubmit").disabled=false}
});

// ---------- suivi de la session ----------
// onSignedIn(user) : un compte est connecté (au démarrage ou après connexion)
// onSignedOut() : plus de compte connecté (déconnexion, compte supprimé, session expirée)
export function initAuth(h){
  handlers=h;
  sb.auth.onAuthStateChange((event,session)=>{
    // la doc Supabase déconseille d'appeler Supabase directement dans ce rappel : on diffère d'un tour
    setTimeout(()=>{
      if(event==="PASSWORD_RECOVERY"){recovering=true;showAuth("reset","Choisis ton nouveau mot de passe.");return}
      if(session&&session.user){
        rememberUser(session.user);
        if(recovering)showAuth("reset","Choisis ton nouveau mot de passe.");
        else if(event==="INITIAL_SESSION"||event==="SIGNED_IN")h.onSignedIn(session.user);
        return;
      }
      // sans réseau, une session qui n'a pas pu être rafraîchie n'est pas une déconnexion : on garde l'app ouverte
      if(event==="INITIAL_SESSION"&&!navigator.onLine&&cachedUser())return;
      if(event==="SIGNED_OUT"||event==="INITIAL_SESSION")h.onSignedOut();
    },0);
  });
}

// ---------- actions des Réglages ----------
export async function signOut(){await sb.auth.signOut({scope:"local"})}
export async function changePassword(password){const {error}=await sb.auth.updateUser({password});if(error)throw error}
export async function deleteAccount(){
  // fonction SQL delete_my_account (voir supabase/schema.sql) : supprime le compte, les données suivent (on delete cascade)
  const {error}=await sb.rpc("delete_my_account");if(error)throw error;
  await sb.auth.signOut({scope:"local"});
}
