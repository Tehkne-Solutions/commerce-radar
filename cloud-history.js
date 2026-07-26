(()=>{'use strict';
const HISTORY_TABLE='commerce_radar_workspace_versions';
const byId=id=>document.getElementById(id);
const escapeHtml=value=>String(value??'').replace(/[&<>\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char]));
let versions=[];
let loading=false;

function api(){return window.CommerceRadarCloud}
function formatDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?'Data indisponível':date.toLocaleString('pt-BR')}
function reasonLabel(reason='manual'){
  const labels={
    manual_push:'Envio manual',automatic:'Sincronização automática',manual_merge:'Mesclagem manual',
    conflict_merge:'Conflito mesclado',conflict_keep_local:'Dispositivo preservado',bootstrap:'Ativação inicial'
  };
  if(String(reason).startsWith('restore_r'))return `Restauração da ${String(reason).replace('restore_r','revisão ')}`;
  return labels[reason]||String(reason).replaceAll('_',' ');
}
function inject(){
  const account=byId('account');
  const grid=account?.querySelector('.accountGrid');
  if(!grid||byId('cloudHistoryPanel'))return false;
  grid.insertAdjacentHTML('beforeend',`<article class="card cloudPanel wide historyPanel" id="cloudHistoryPanel"><div class="historyHead"><div><span class="eyebrow">CONTROLE DE VERSÕES</span><h3>Histórico e conflitos</h3><p class="muted">Cada sincronização confirmada cria uma revisão recuperável do workspace.</p></div><button class="btn" id="refreshCloudHistory">Atualizar histórico</button></div><div class="conflictBox" id="cloudConflictBox"><div class="conflictHead"><div><span class="eyebrow">CONFLITO DE SINCRONIZAÇÃO</span><h4>Outro dispositivo publicou primeiro</h4></div><span class="cloudBadge">Ação necessária</span></div><p class="muted">Nenhum dado foi sobrescrito. Escolha qual estado deve originar a próxima revisão.</p><div class="conflictDetails"><div><small>Revisão deste dispositivo</small><b id="conflictLocalRevision">0</b></div><div><small>Revisão atual na nuvem</small><b id="conflictRemoteRevision">0</b></div><div><small>Alterações locais</small><b id="conflictLocalChanged">Não</b></div></div><div class="historyActions"><button class="btn" id="conflictUseRemote">Usar versão da nuvem</button><button class="btn primary" id="conflictMerge">Mesclar e criar revisão</button><button class="btn" id="conflictKeepLocal">Manter este dispositivo</button></div></div><div class="historySummary"><div><small>Revisão local</small><b id="historyLocalRevision">0</b></div><div><small>Versões carregadas</small><b id="historyCount">0</b></div><div><small>Dispositivo</small><b id="historyDevice">—</b></div></div><div class="historyList" id="cloudHistoryList"><div class="historyEmpty">Entre na conta para carregar o histórico.</div></div></article>`);
  byId('refreshCloudHistory').onclick=loadHistory;
  byId('conflictUseRemote').onclick=useRemote;
  byId('conflictMerge').onclick=mergeConflict;
  byId('conflictKeepLocal').onclick=keepLocal;
  renderConflict();
  loadHistory();
  return true;
}
function setLoading(value){
  loading=value;
  byId('cloudHistoryPanel')?.classList.toggle('historyLoading',value);
  document.querySelectorAll('#cloudHistoryPanel button').forEach(button=>button.disabled=value);
}
function renderConflict(){
  const cloud=api();
  if(!cloud)return;
  const state=cloud.conflictState();
  byId('cloudConflictBox')?.classList.toggle('show',!!state);
  if(state){
    byId('conflictLocalRevision').textContent=state.localRevision??0;
    byId('conflictRemoteRevision').textContent=state.remoteRevision??0;
    byId('conflictLocalChanged').textContent=state.localChanged?'Sim':'Não';
  }
  if(byId('historyLocalRevision'))byId('historyLocalRevision').textContent=cloud.currentRevision();
  if(byId('historyDevice'))byId('historyDevice').textContent=String(cloud.deviceId||'—').slice(0,18);
}
async function loadHistory(){
  if(loading)return;
  const cloud=api();
  if(!cloud)return;
  const user=cloud.getSession()?.user;
  if(!user){
    versions=[];
    renderHistory('Entre na conta para carregar o histórico.');
    return;
  }
  setLoading(true);
  try{
    const session=await cloud.validSession();
    if(!session)throw new Error('A sessão expirou. Entre novamente.');
    const value=cloud.config();
    const table=value.versionsTable||HISTORY_TABLE;
    const query=`/rest/v1/${encodeURIComponent(table)}?user_id=eq.${encodeURIComponent(session.user.id)}&select=revision,payload,device_id,sync_reason,created_at&order=revision.desc&limit=30`;
    const rows=await cloud.request(query,{token:session.access_token});
    versions=Array.isArray(rows)?rows:[];
    renderHistory();
  }catch(error){
    versions=[];
    renderHistory(error.message);
  }finally{setLoading(false);renderConflict()}
}
function renderHistory(message=''){
  const cloud=api();
  const list=byId('cloudHistoryList');
  if(!list)return;
  byId('historyCount').textContent=versions.length;
  if(message||!versions.length){
    list.innerHTML=`<div class="historyEmpty">${escapeHtml(message||'Nenhuma revisão registrada. O primeiro envio criará a revisão 1.')}</div>`;
    return;
  }
  const current=cloud?.currentRevision?.()||0;
  list.innerHTML=versions.map(item=>{
    const revision=Number(item.revision)||0;
    const isCurrent=revision===current;
    const device=String(item.device_id||'dispositivo não identificado').slice(0,36);
    return `<div class="historyItem${isCurrent?' current':''}"><div><div class="historyTitle"><b>Revisão ${revision}</b>${isCurrent?'<span class="historyTag current">Neste dispositivo</span>':''}<span class="historyTag">${escapeHtml(reasonLabel(item.sync_reason))}</span></div><small>${escapeHtml(formatDate(item.created_at))} · ${escapeHtml(device)}</small></div><div class="historyButtons"><button class="btn" data-export-revision="${revision}">Exportar</button><button class="btn" data-restore-revision="${revision}"${isCurrent?' disabled':''}>Restaurar</button></div></div>`;
  }).join('');
  list.querySelectorAll('[data-export-revision]').forEach(button=>button.onclick=()=>exportVersion(Number(button.dataset.exportRevision)));
  list.querySelectorAll('[data-restore-revision]').forEach(button=>button.onclick=()=>restoreVersion(Number(button.dataset.restoreRevision)));
}
function findVersion(revision){return versions.find(item=>Number(item.revision)===Number(revision))}
function downloadJson(filename,payload){
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportVersion(revision){
  const item=findVersion(revision);
  if(!item)return;
  downloadJson(`commerce-radar-revisao-${revision}.json`,{
    version:'0.3.3',signature:'Tehkné Solutions',revision,
    createdAt:item.created_at,deviceId:item.device_id,reason:item.sync_reason,
    workspace:item.payload
  });
}
async function useRemote(){
  if(loading)return;
  const cloud=api();
  setLoading(true);
  try{
    const row=await cloud.fetchCloud();
    if(!row)throw new Error('Nenhum workspace foi encontrado na nuvem.');
    if(!confirm(`Substituir este dispositivo pela revisão ${row.revision||0} da nuvem?`))return;
    cloud.applyPayload(row.payload,Number(row.revision)||0);
  }catch(error){cloud.toast(error.message,true)}finally{setLoading(false)}
}
async function mergeConflict(){
  if(loading)return;
  const cloud=api();
  setLoading(true);
  try{
    const row=await cloud.fetchCloud();
    if(!row)throw new Error('Nenhum workspace foi encontrado na nuvem.');
    const merged=cloud.mergePayload(cloud.snapshot(),cloud.normalizePayload(row.payload));
    const result=await cloud.syncPayload(merged,{reason:'conflict_merge',expectedRevision:Number(row.revision)||0});
    if(result?.status==='ok'){
      cloud.toast(`Conflito mesclado na revisão ${result.revision}.`);
      cloud.applyPayload(merged,result.revision);
    }
  }catch(error){cloud.toast(error.message,true)}finally{setLoading(false)}
}
async function keepLocal(){
  if(loading)return;
  const cloud=api();
  if(!confirm('Criar uma nova revisão usando os dados deste dispositivo? A versão atual da nuvem permanecerá no histórico.'))return;
  setLoading(true);
  try{
    const row=await cloud.fetchCloud();
    const expected=Number(row?.revision)||0;
    const result=await cloud.syncPayload(cloud.snapshot(),{reason:'conflict_keep_local',expectedRevision:expected});
    if(result?.status==='ok'){
      cloud.toast(`Este dispositivo foi preservado na revisão ${result.revision}.`);
      await loadHistory();
    }
  }catch(error){cloud.toast(error.message,true)}finally{setLoading(false);renderConflict()}
}
async function restoreVersion(revision){
  if(loading)return;
  const cloud=api();
  const selected=findVersion(revision);
  if(!selected)return;
  if(!confirm(`Restaurar o conteúdo da revisão ${revision}? A restauração será registrada como uma nova revisão.`))return;
  setLoading(true);
  try{
    const row=await cloud.fetchCloud();
    const expected=Number(row?.revision)||0;
    const payload=cloud.normalizePayload(selected.payload);
    const result=await cloud.syncPayload(payload,{reason:`restore_r${revision}`,expectedRevision:expected});
    if(result?.status==='ok'){
      cloud.toast(`Revisão ${revision} restaurada como revisão ${result.revision}.`);
      cloud.applyPayload(payload,result.revision);
    }
  }catch(error){cloud.toast(error.message,true)}finally{setLoading(false)}
}
function boot(){
  if(inject())return;
  let attempts=0;
  const timer=setInterval(()=>{attempts++;if(inject()||attempts>180)clearInterval(timer)},100);
}
window.addEventListener('commerce-radar-cloud-ready',boot);
window.addEventListener('commerce-radar-cloud-conflict',renderConflict);
window.addEventListener('commerce-radar-cloud-sync',()=>{renderConflict();loadHistory()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
