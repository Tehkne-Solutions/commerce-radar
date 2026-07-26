(()=>{'use strict';
const PENDING_KEY='tehkne-commerce-radar-cloud-bootstrap-pending';
const SESSION_KEY='tehkne-commerce-radar-cloud-session';
const LAST_SYNC_KEY='tehkne-commerce-radar-cloud-last-sync';
const byId=id=>document.getElementById(id);
const readSession=()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}};
function notify(message,error=false){const toast=byId('cloudToast');if(!toast)return;toast.className=`cloudToast show${error?' error':''}`;toast.textContent=message;clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove('show'),4500)}
function setPending(value){if(value)localStorage.setItem(PENDING_KEY,'1');else localStorage.removeItem(PENDING_KEY)}
function isPending(){return localStorage.getItem(PENDING_KEY)==='1'}
function inject(){
  const signUp=byId('cloudSignUp');
  if(!signUp||byId('cloudBootstrap'))return false;
  signUp.insertAdjacentHTML('afterend','<button class="btn primary" id="cloudBootstrap" type="button">Criar conta e ativar agora</button>');
  const button=byId('cloudBootstrap');
  button.onclick=()=>{
    const email=byId('cloudEmail')?.value?.trim();
    const password=byId('cloudPassword')?.value||'';
    if(!/^\S+@\S+\.\S+$/.test(email||'')||password.length<8){notify('Informe e-mail válido e senha com pelo menos 8 caracteres.',true);return}
    setPending(true);signUp.click();notify('Criando conta. O workspace será enviado automaticamente após o login.');watchSession();
  };
  if(isPending())watchSession();
  return true;
}
function watchSession(){
  clearInterval(watchSession.timer);let attempts=0;
  watchSession.timer=setInterval(()=>{
    attempts++;const session=readSession();const push=byId('cloudPush');
    if(session?.access_token&&session?.user&&push&&!push.disabled){clearInterval(watchSession.timer);const previous=localStorage.getItem(LAST_SYNC_KEY);push.click();waitForSync(previous);return}
    if(attempts>=1200)clearInterval(watchSession.timer);
  },500);
}
function waitForSync(previous){
  let attempts=0;const timer=setInterval(()=>{
    attempts++;const current=localStorage.getItem(LAST_SYNC_KEY);
    if(current&&current!==previous){clearInterval(timer);setPending(false);notify('Conta ativada e workspace enviado para a nuvem.')}
    else if(attempts>=120){clearInterval(timer);notify('Conta conectada. Use “Enviar este dispositivo” para concluir.',true)}
  },500);
}
function addStyle(href){if(!document.querySelector(`link[href="${href}"]`)){const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.append(link)}}
function addScript(src){if(document.querySelector(`script[src="${src}"]`))return false;const script=document.createElement('script');script.src=src;document.body.append(script);return true}
function loadReviewCalendar(){
  addStyle('./trend-calendar.css');
  if(document.querySelector('script[src="./trend-calendar.js"]'))return;
  let attempts=0;const timer=setInterval(()=>{attempts++;if(window.CommerceRadarTrendQueue){clearInterval(timer);addScript('./trend-calendar.js')}else if(attempts>240)clearInterval(timer)},50);
}
function loadReviewOperations(){
  addStyle('./trend-operations.css');
  if(document.querySelector('script[src="./trend-operations.js"]'))return;
  let attempts=0;const timer=setInterval(()=>{attempts++;if(window.CommerceRadarReviewCalendar){clearInterval(timer);addScript('./trend-operations.js')}else if(attempts>300)clearInterval(timer)},50);
}
function loadReviewSla(){
  addStyle('./trend-sla.css');
  if(document.querySelector('script[src="./trend-sla.js"]'))return;
  let attempts=0;const timer=setInterval(()=>{attempts++;if(window.CommerceRadarReviewOperations){clearInterval(timer);addScript('./trend-sla.js')}else if(attempts>360)clearInterval(timer)},50);
}
function boot(){loadReviewCalendar();loadReviewOperations();loadReviewSla();if(inject())return;let attempts=0;const timer=setInterval(()=>{attempts++;if(inject()||attempts>100)clearInterval(timer)},100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();