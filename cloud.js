(()=>{'use strict';
const SESSION_KEY='tehkne-commerce-radar-cloud-session';
const CONFIG_KEY='tehkne-commerce-radar-cloud-config';
const AUTO_KEY='tehkne-commerce-radar-cloud-auto';
const LAST_SYNC_KEY='tehkne-commerce-radar-cloud-last-sync';
const REVISION_KEY='tehkne-commerce-radar-cloud-revision';
const FINGERPRINT_KEY='tehkne-commerce-radar-cloud-fingerprint';
const DEVICE_KEY='tehkne-commerce-radar-cloud-device';
const CONFLICT_KEY='tehkne-commerce-radar-cloud-conflict';
const DATA_KEYS={
  analyses:'tehkne-commerce-radar-v2-analyses',
  tests:'tehkne-commerce-radar-v2-tests',
  customOpportunities:'tehkne-commerce-radar-v2-custom-opportunities',
  launchPlans:'tehkne-commerce-radar-v2-launch-plans'
};
const DEFAULT_CONFIG=window.COMMERCE_RADAR_CLOUD||{};
const byId=id=>document.getElementById(id);
const safe=(value,max=500)=>String(value??'').trim().slice(0,max);
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
let session=read(SESSION_KEY,null),syncTimer=null,busy=false;

function makeDeviceId(){
  let value=localStorage.getItem(DEVICE_KEY);
  if(value)return value;
  value=globalThis.crypto?.randomUUID?.()||`device-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  localStorage.setItem(DEVICE_KEY,value);
  return value;
}
const deviceId=makeDeviceId();

function config(){
  const local=read(CONFIG_KEY,{});
  return{
    url:safe(local.url||DEFAULT_CONFIG.url,240).replace(/\/$/,''),
    publishableKey:safe(local.publishableKey||DEFAULT_CONFIG.publishableKey,500),
    table:safe(DEFAULT_CONFIG.table||'commerce_radar_workspaces',80),
    versionsTable:safe(DEFAULT_CONFIG.versionsTable||'commerce_radar_workspace_versions',80)
  };
}
function configured(){const value=config();return /^https:\/\/.+\.supabase\.co$/.test(value.url)&&value.publishableKey.length>20}
function toast(message,error=false){
  let element=byId('cloudToast');
  if(!element){element=document.createElement('div');element.id='cloudToast';document.body.append(element)}
  element.className=`cloudToast show${error?' error':''}`;
  element.textContent=message;
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>element.classList.remove('show'),4200);
}
function fingerprint(payload){
  const compact={};
  for(const name of Object.keys(DATA_KEYS))compact[name]=Array.isArray(payload?.[name])?payload[name]:[];
  const text=JSON.stringify(compact);
  let hash=2166136261;
  for(let index=0;index<text.length;index++){
    hash^=text.charCodeAt(index);
    hash=Math.imul(hash,16777619);
  }
  return (hash>>>0).toString(16).padStart(8,'0');
}
function currentRevision(){return Math.max(0,Number(localStorage.getItem(REVISION_KEY)||0)||0)}
function setRevision(revision,payload){
  localStorage.setItem(REVISION_KEY,String(Math.max(0,Number(revision)||0)));
  if(payload)localStorage.setItem(FINGERPRINT_KEY,fingerprint(payload));
  localStorage.removeItem(CONFLICT_KEY);
}
function hasLocalChanges(){
  const base=localStorage.getItem(FINGERPRINT_KEY);
  if(!base)return countLocal()>0;
  return fingerprint(snapshot())!==base;
}
function conflictState(){return read(CONFLICT_KEY,null)}
function announceConflict(remoteRevision){
  const detail={
    createdAt:new Date().toISOString(),
    localRevision:currentRevision(),
    remoteRevision:Number(remoteRevision)||0,
    localChanged:hasLocalChanges(),
    deviceId
  };
  write(CONFLICT_KEY,detail);
  window.dispatchEvent(new CustomEvent('commerce-radar-cloud-conflict',{detail}));
  toast(`Conflito detectado: a nuvem está na revisão ${detail.remoteRevision}.`,true);
  render();
  return detail;
}

function inject(){
  const nav=document.querySelector('.side nav');
  const method=nav?.querySelector('[data-view="method"]');
  if(method&&!byId('cloudNav'))method.insertAdjacentHTML('beforebegin','<button class="nav" id="cloudNav"><span>Conta e sincronização</span><b id="cloudNavState">Local</b></button>');
  const actions=document.querySelector('.top .actions');
  if(actions&&!byId('cloudTop'))actions.insertAdjacentHTML('afterbegin','<button class="btn ghost desktopOnly" id="cloudTop">Modo local</button>');
  const methodView=byId('method');
  if(methodView&&!byId('account'))methodView.insertAdjacentHTML('beforebegin',`<section class="view" id="account"><div class="sectionHead"><div><span class="eyebrow">WORKSPACE NA NUVEM</span><h2>Conta e sincronização</h2><p class="muted">O modo local continua disponível. A nuvem é opcional e usa seu próprio projeto Supabase.</p></div><span class="cloudBadge" id="cloudState">Modo local</span></div><div class="accountGrid"><article class="card cloudPanel"><span class="eyebrow">CONFIGURAÇÃO</span><h3>Conectar projeto Supabase</h3><p class="muted">Use somente a URL do projeto e a chave pública/publishable. Nunca use a service role no navegador.</p><label class="field"><span>Project URL</span><input id="cloudUrl" placeholder="https://seu-projeto.supabase.co"></label><label class="field"><span>Publishable/anon key</span><input id="cloudKey" type="password" autocomplete="off" placeholder="sb_publishable_..."></label><div class="actions"><button class="btn primary" id="saveCloudConfig">Salvar configuração</button><button class="btn" id="clearCloudConfig">Remover</button></div><p class="cloudHint" id="cloudConfigHint"></p></article><article class="card cloudPanel"><span class="eyebrow">ACESSO</span><h3 id="cloudAuthTitle">Entrar ou criar conta</h3><div id="cloudAuthGuest"><label class="field"><span>E-mail</span><input id="cloudEmail" type="email" autocomplete="email" placeholder="voce@empresa.com"></label><label class="field"><span>Senha</span><input id="cloudPassword" type="password" minlength="8" autocomplete="current-password" placeholder="Mínimo de 8 caracteres"></label><div class="actions"><button class="btn primary" id="cloudSignIn">Entrar</button><button class="btn" id="cloudSignUp">Criar conta</button></div></div><div id="cloudAuthUser" class="hide"><div class="cloudUser"><span class="cloudAvatar">T</span><div><b id="cloudUserEmail"></b><small>Workspace protegido por usuário</small></div></div><button class="btn" id="cloudSignOut">Sair da conta</button></div><p class="cloudHint" id="cloudAuthHint"></p></article><article class="card cloudPanel wide"><span class="eyebrow">SINCRONIZAÇÃO</span><h3>Escolha como combinar os dados</h3><div class="syncActions"><button class="btn primary" id="cloudPush">Enviar este dispositivo</button><button class="btn" id="cloudPull">Substituir pelo conteúdo da nuvem</button><button class="btn" id="cloudMerge">Mesclar dispositivo e nuvem</button></div><label class="cloudToggle"><input type="checkbox" id="cloudAuto"> <span>Sincronizar automaticamente após alterações locais</span></label><div class="cloudMeta"><div><small>Última sincronização</small><b id="cloudLastSync">Nunca</b></div><div><small>Revisão local</small><b id="cloudRevision">0</b></div><div><small>Itens locais</small><b id="cloudLocalCount">0</b></div><div><small>Estado</small><b id="cloudSyncState">Aguardando conta</b></div></div><div class="notice">Cada envio confirmado cria uma revisão recuperável. Se outro dispositivo publicar primeiro, o sistema bloqueia a sobrescrita e abre a resolução de conflito.</div></article></div></section>`);
  if(!byId('cloudToast'))document.body.insertAdjacentHTML('beforeend','<div id="cloudToast" class="cloudToast"></div>');
  bind();
  render();
  window.dispatchEvent(new CustomEvent('commerce-radar-cloud-ready'));
}
function showAccount(){
  document.querySelectorAll('.view').forEach(view=>view.classList.toggle('on',view.id==='account'));
  document.querySelectorAll('.nav').forEach(item=>item.classList.toggle('on',item.id==='cloudNav'));
  const title=byId('title');if(title)title.textContent='Sincronize seu workspace';
  document.querySelector('.side')?.classList.remove('open');
  scrollTo({top:0,behavior:'smooth'});
}
function bind(){
  byId('cloudNav').onclick=showAccount;
  byId('cloudTop').onclick=showAccount;
  byId('saveCloudConfig').onclick=saveConfig;
  byId('clearCloudConfig').onclick=clearConfig;
  byId('cloudSignIn').onclick=()=>authenticate('login');
  byId('cloudSignUp').onclick=()=>authenticate('signup');
  byId('cloudSignOut').onclick=logout;
  byId('cloudPush').onclick=()=>pushCloud('manual_push');
  byId('cloudPull').onclick=()=>pullCloud(false);
  byId('cloudMerge').onclick=()=>pullCloud(true);
  byId('cloudAuto').checked=read(AUTO_KEY,false);
  byId('cloudAuto').onchange=event=>write(AUTO_KEY,event.target.checked);
}
function saveConfig(){
  const url=safe(byId('cloudUrl').value,240).replace(/\/$/,'');
  const publishableKey=safe(byId('cloudKey').value,500);
  if(!/^https:\/\/.+\.supabase\.co$/.test(url)||publishableKey.length<20)return toast('Informe uma URL Supabase e uma chave pública válidas.',true);
  write(CONFIG_KEY,{url,publishableKey});
  session=null;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REVISION_KEY);
  localStorage.removeItem(FINGERPRINT_KEY);
  localStorage.removeItem(CONFLICT_KEY);
  render();
  toast('Configuração de nuvem salva neste navegador.');
}
function clearConfig(){
  if(!confirm('Remover a configuração, sessão e referência de revisão deste navegador?'))return;
  for(const key of [CONFIG_KEY,SESSION_KEY,REVISION_KEY,FINGERPRINT_KEY,CONFLICT_KEY])localStorage.removeItem(key);
  session=null;
  render();
  toast('Configuração removida.');
}
async function request(path,{method='GET',body,token,prefer}={}){
  const value=config();
  if(!configured())throw new Error('Configure o projeto Supabase primeiro.');
  const headers={apikey:value.publishableKey,'Content-Type':'application/json'};
  if(token)headers.Authorization=`Bearer ${token}`;
  if(prefer)headers.Prefer=prefer;
  const response=await fetch(`${value.url}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  let data=null;try{data=await response.json()}catch{}
  if(!response.ok)throw new Error(data?.msg||data?.message||data?.error_description||data?.error||`Erro HTTP ${response.status}`);
  return data;
}
async function authenticate(mode){
  if(busy)return;
  const email=safe(byId('cloudEmail').value,180).toLowerCase();
  const password=byId('cloudPassword').value;
  if(!/^\S+@\S+\.\S+$/.test(email)||password.length<8)return toast('Informe e-mail válido e senha com pelo menos 8 caracteres.',true);
  setBusy(true);
  try{
    const data=mode==='signup'
      ?await request('/auth/v1/signup',{method:'POST',body:{email,password}})
      :await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
    if(data?.access_token){
      setSession(data);
      toast(mode==='signup'?'Conta criada e conectada.':'Conta conectada.');
      await cloudExists();
    }else{
      toast('Conta criada. Confirme o e-mail antes de entrar.');
      byId('cloudAuthHint').textContent='Verifique a caixa de entrada e depois use Entrar.';
    }
  }catch(error){toast(error.message,true)}finally{setBusy(false);render()}
}
function setSession(data){
  session={
    access_token:data.access_token,
    refresh_token:data.refresh_token,
    expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600),
    user:data.user||session?.user
  };
  write(SESSION_KEY,session);
}
async function validSession(){
  if(!session?.access_token)return null;
  if((session.expires_at||0)>Math.floor(Date.now()/1000)+60)return session;
  if(!session.refresh_token){await logout(false);return null}
  try{
    const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});
    setSession(data);
    return session;
  }catch{await logout(false);return null}
}
async function logout(show=true){
  try{if(session?.access_token)await request('/auth/v1/logout',{method:'POST',token:session.access_token})}catch{}
  session=null;
  localStorage.removeItem(SESSION_KEY);
  render();
  if(show)toast('Sessão encerrada.');
}
function snapshot(){
  const payload={version:'0.3.3',signature:'Tehkné Solutions',updatedAt:new Date().toISOString()};
  for(const [name,key] of Object.entries(DATA_KEYS))payload[name]=read(key,[]);
  return payload;
}
function normalizePayload(raw={}){
  const output={version:safe(raw.version,20)||'0.3.3',signature:'Tehkné Solutions',updatedAt:safe(raw.updatedAt,40)||new Date().toISOString()};
  for(const name of Object.keys(DATA_KEYS))output[name]=Array.isArray(raw[name])?raw[name].slice(0,5000):[];
  return output;
}
function mergeRows(first,second){
  const rows=new Map();
  for(const item of [...first,...second]){
    if(!item||typeof item!=='object')continue;
    const key=safe(item.id,120)||JSON.stringify(item).slice(0,120);
    const previous=rows.get(key);
    if(!previous){rows.set(key,item);continue}
    const previousTime=Date.parse(previous.updatedAt||previous.createdAt||0)||0;
    const currentTime=Date.parse(item.updatedAt||item.createdAt||0)||0;
    rows.set(key,currentTime>=previousTime?item:previous);
  }
  return [...rows.values()];
}
function mergePayload(local,remote){
  const merged=normalizePayload(local);
  for(const name of Object.keys(DATA_KEYS))merged[name]=mergeRows(local[name]||[],remote[name]||[]);
  merged.updatedAt=new Date().toISOString();
  return merged;
}
function applyPayload(payload,revision){
  const normalized=normalizePayload(payload);
  for(const [name,key] of Object.entries(DATA_KEYS))localStorage.setItem(key,JSON.stringify(normalized[name]));
  setRevision(revision,normalized);
  window.location.reload();
}
async function syncPayload(payload,{reason='manual',expectedRevision=currentRevision()}={}){
  const active=await validSession();
  if(!active)throw new Error('Entre na conta antes de sincronizar.');
  const data=await request('/rest/v1/rpc/sync_commerce_radar_workspace',{
    method:'POST',
    token:active.access_token,
    body:{
      expected_revision:Number(expectedRevision)||0,
      workspace_payload:normalizePayload(payload),
      source_device:deviceId,
      reason:safe(reason,120)||'manual'
    }
  });
  const result=Array.isArray(data)?data[0]:data;
  if(result?.status==='conflict'){
    announceConflict(result.conflict_revision??result.revision);
    return result;
  }
  if(result?.status!=='ok')throw new Error('O servidor não confirmou a sincronização.');
  const normalized=normalizePayload(payload);
  setRevision(result.revision,normalized);
  localStorage.setItem(LAST_SYNC_KEY,result.updated_at||new Date().toISOString());
  window.dispatchEvent(new CustomEvent('commerce-radar-cloud-sync',{detail:{revision:Number(result.revision)||0,reason}}));
  render();
  return result;
}
async function pushCloud(reason='manual_push'){
  if(busy)return;
  const active=await validSession();
  if(!active)return toast('Entre na conta antes de sincronizar.',true);
  setBusy(true);
  try{
    const result=await syncPayload(snapshot(),{reason});
    if(result?.status==='ok')toast(`Workspace enviado como revisão ${result.revision}.`);
  }catch(error){toast(error.message,true)}finally{setBusy(false)}
}
async function fetchCloud(){
  const active=await validSession();
  if(!active)throw new Error('Entre na conta antes de sincronizar.');
  const value=config();
  const rows=await request(`/rest/v1/${encodeURIComponent(value.table)}?user_id=eq.${encodeURIComponent(active.user.id)}&select=payload,updated_at,revision,device_id,sync_reason&limit=1`,{token:active.access_token});
  return Array.isArray(rows)&&rows[0]?rows[0]:null;
}
async function pullCloud(mergeMode){
  if(busy)return;
  setBusy(true);
  try{
    const row=await fetchCloud();
    if(!row)return toast('Ainda não há dados na nuvem. Envie este dispositivo primeiro.',true);
    const local=snapshot();
    const remote=normalizePayload(row.payload);
    if(mergeMode){
      const merged=mergePayload(local,remote);
      const result=await syncPayload(merged,{reason:'manual_merge',expectedRevision:Number(row.revision)||0});
      if(result?.status==='ok')applyPayload(merged,result.revision);
    }else{
      const warning=hasLocalChanges()?'Existem alterações locais desde a última sincronização. ':'';
      if(!confirm(`${warning}Substituir os dados deste navegador pela revisão ${row.revision||0} da nuvem?`))return;
      applyPayload(remote,Number(row.revision)||0);
    }
  }catch(error){toast(error.message,true)}finally{setBusy(false)}
}
async function cloudExists(){
  try{
    const row=await fetchCloud();
    if(row)byId('cloudSyncState').textContent=`Nuvem na revisão ${row.revision||0}`;
    else byId('cloudSyncState').textContent='Nuvem vazia';
  }catch{}
}
function countLocal(){return Object.values(DATA_KEYS).reduce((sum,key)=>sum+(Array.isArray(read(key,[]))?read(key,[]).length:0),0)}
function setBusy(value){
  busy=value;
  document.querySelectorAll('#account button').forEach(button=>button.disabled=value);
  if(byId('cloudSyncState'))byId('cloudSyncState').textContent=value?'Sincronizando…':session?'Conectado':'Aguardando conta';
}
function render(){
  const value=config(),ok=configured(),user=session?.user,conflict=conflictState();
  byId('cloudUrl').value=value.url||'';
  byId('cloudKey').value=value.publishableKey||'';
  byId('cloudConfigHint').textContent=ok?'Configuração pronta neste navegador.':'A nuvem está desativada até informar o projeto.';
  byId('cloudAuthGuest').classList.toggle('hide',!!user);
  byId('cloudAuthUser').classList.toggle('hide',!user);
  byId('cloudUserEmail').textContent=user?.email||'';
  byId('cloudAuthTitle').textContent=user?'Conta conectada':'Entrar ou criar conta';
  byId('cloudState').textContent=conflict?'Conflito pendente':user?'Sincronização ativa':ok?'Pronto para login':'Modo local';
  byId('cloudTop').textContent=conflict?'Resolver conflito':user?user.email:'Modo local';
  byId('cloudNavState').textContent=conflict?'Conflito':user?'Online':'Local';
  byId('cloudLocalCount').textContent=countLocal();
  byId('cloudRevision').textContent=currentRevision();
  const last=localStorage.getItem(LAST_SYNC_KEY);
  byId('cloudLastSync').textContent=last?new Date(last).toLocaleString('pt-BR'):'Nunca';
  byId('cloudSyncState').textContent=conflict?`Nuvem r${conflict.remoteRevision}; local r${conflict.localRevision}`:user?'Conectado':ok?'Aguardando login':'Não configurado';
  document.querySelectorAll('#cloudPush,#cloudPull,#cloudMerge').forEach(button=>button.disabled=!user||busy);
  const side=document.querySelector('.sidebox');
  if(side){
    side.querySelector('.eyebrow').textContent='MVP 0.3.3';
    side.querySelector('b').textContent=conflict?'Conflito aguardando resolução':'Nuvem com histórico de versões';
    side.querySelector('p').textContent=user?'Revisões protegidas entre dispositivos.':'Dados locais; conta opcional.';
  }
}

window.CommerceRadarCloud={
  config,configured,toast,request,validSession,snapshot,normalizePayload,mergePayload,applyPayload,
  syncPayload,fetchCloud,currentRevision,setRevision,hasLocalChanges,conflictState,fingerprint,
  dataKeys:DATA_KEYS,deviceId,getSession:()=>session,render
};
const originalSetItem=Storage.prototype.setItem;
Storage.prototype.setItem=function(key,value){
  originalSetItem.call(this,key,value);
  if(Object.values(DATA_KEYS).includes(String(key))&&read(AUTO_KEY,false)&&session?.user&&!conflictState()){
    clearTimeout(syncTimer);
    syncTimer=setTimeout(()=>pushCloud('automatic'),1800);
  }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject,{once:true});else inject();
})();
