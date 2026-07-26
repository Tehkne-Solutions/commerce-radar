(()=>{'use strict';
const CONFIG_KEY='tehkne-commerce-radar-cloud-config';
const SESSION_KEY='tehkne-commerce-radar-cloud-session';
const REPORT_KEY='tehkne-commerce-radar-cloud-diagnostics';
const DATA_KEYS=['tehkne-commerce-radar-v2-analyses','tehkne-commerce-radar-v2-tests','tehkne-commerce-radar-v2-custom-opportunities','tehkne-commerce-radar-v2-launch-plans'];
const REPO='https://github.com/Tehkne-Solutions/commerce-radar';
const byId=id=>document.getElementById(id);
const safe=(value,max=500)=>String(value??'').trim().slice(0,max);
const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
const config=()=>{const local=read(CONFIG_KEY,{})||{},base=window.COMMERCE_RADAR_CLOUD||{};return{url:safe(local.url||base.url,240).replace(/\/$/,''),publishableKey:safe(local.publishableKey||base.publishableKey,500),table:safe(base.table||'commerce_radar_workspaces',80)}};
const session=()=>read(SESSION_KEY,null);
let currentReport=null;
function inject(){
  const account=byId('account');
  if(!account||byId('cloudDiagnosticsPanel'))return false;
  const grid=account.querySelector('.accountGrid');
  if(!grid)return false;
  grid.insertAdjacentHTML('beforeend',`<article class="card cloudPanel wide diagPanel" id="cloudDiagnosticsPanel"><div class="diagHead"><div><span class="eyebrow">DIAGNÓSTICO ADMINISTRATIVO</span><h3>Verifique a ativação ponta a ponta</h3><p class="muted">O teste não altera dados e nunca exibe chaves ou tokens.</p></div><span class="cloudBadge" id="diagOverall">Não executado</span></div><div class="diagSummary" id="diagSummary"><div><small>Sucessos</small><b id="diagPass">0</b></div><div><small>Avisos</small><b id="diagWarn">0</b></div><div><small>Falhas</small><b id="diagFail">0</b></div><div><small>Último teste</small><b id="diagTime">Nunca</b></div></div><div class="diagList" id="diagList"><p class="muted">Execute o diagnóstico para verificar configuração, Auth, Data API, RLS, sessão e PWA.</p></div><div class="actions"><button class="btn primary" id="runCloudDiagnostics">Executar diagnóstico</button><button class="btn" id="copyCloudReport" disabled>Copiar relatório</button><a class="btn" href="${REPO}/actions/workflows/provision-supabase.yml" target="_blank" rel="noopener">Abrir provisionamento</a><a class="btn" href="${REPO}/actions/workflows/verify-production.yml" target="_blank" rel="noopener">Verificação externa</a></div></article>`);
  byId('runCloudDiagnostics').onclick=run;
  byId('copyCloudReport').onclick=copyReport;
  const stored=read(REPORT_KEY,null);if(stored)render(stored);
  return true;
}
const result=(id,label,status,detail)=>({id,label,status,detail});
async function request(url,headers={}){const response=await fetch(url,{headers,cache:'no-store'});let body=null;try{body=await response.json()}catch{}return{response,body}}
async function run(){
  const button=byId('runCloudDiagnostics');button.disabled=true;button.textContent='Verificando…';
  const results=[],c=config(),s=session();
  try{
    let storage=true;try{const k='__commerce_radar_diag__';localStorage.setItem(k,'1');localStorage.removeItem(k)}catch{storage=false}
    results.push(result('browser','Navegador e armazenamento',storage&&typeof fetch==='function'?'pass':'fail',storage?'Fetch e LocalStorage disponíveis.':'O navegador bloqueou o armazenamento local.'));
    const localCount=DATA_KEYS.reduce((sum,key)=>{const value=read(key,[]);return sum+(Array.isArray(value)?value.length:0)},0);
    results.push(result('local','Dados locais',localCount?'pass':'warn',localCount?`${localCount} registro(s) disponíveis para sincronização.`:'Nenhum registro local foi criado ainda.'));
    const urlOk=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.url),keyOk=c.publishableKey.length>20,tableOk=/^[a-zA-Z0-9_]+$/.test(c.table);
    results.push(result('config','Configuração pública',urlOk&&keyOk&&tableOk?'pass':'fail',urlOk&&keyOk&&tableOk?`Projeto configurado; tabela ${c.table}.`:'Project URL, publishable key ou nome da tabela estão ausentes/inválidos.'));
    if(urlOk&&keyOk&&tableOk){
      try{const {response}=await request(`${c.url}/auth/v1/health`,{apikey:c.publishableKey});results.push(result('auth-health','Supabase Auth',response.ok?'pass':'fail',response.ok?`Auth respondeu HTTP ${response.status}.`:`Auth respondeu HTTP ${response.status}.`))}catch(error){results.push(result('auth-health','Supabase Auth','fail',`Falha de rede: ${error.message}`))}
      try{
        const {response,body}=await request(`${c.url}/rest/v1/${encodeURIComponent(c.table)}?select=user_id&limit=1`,{apikey:c.publishableKey});
        const isolated=response.ok&&Array.isArray(body)&&body.length===0;
        results.push(result('rls','Data API e RLS anônimo',isolated?'pass':'fail',isolated?'Consulta anônima retornou lista vazia, como esperado.':response.ok?`A consulta anônima retornou ${Array.isArray(body)?body.length:'conteúdo inesperado'} registro(s).`:`Data API respondeu HTTP ${response.status}.`));
      }catch(error){results.push(result('rls','Data API e RLS anônimo','fail',`Falha de rede: ${error.message}`))}
      if(s?.access_token&&s?.user?.id){
        try{
          const {response,body}=await request(`${c.url}/auth/v1/user`,{apikey:c.publishableKey,Authorization:`Bearer ${s.access_token}`});
          results.push(result('session','Sessão autenticada',response.ok&&body?.id===s.user.id?'pass':'fail',response.ok?`Sessão válida para ${safe(body?.email||s.user.email,100)}.`:`Sessão rejeitada com HTTP ${response.status}.`));
        }catch(error){results.push(result('session','Sessão autenticada','fail',`Falha de rede: ${error.message}`))}
        try{
          const {response,body}=await request(`${c.url}/rest/v1/${encodeURIComponent(c.table)}?user_id=eq.${encodeURIComponent(s.user.id)}&select=updated_at&limit=1`,{apikey:c.publishableKey,Authorization:`Bearer ${s.access_token}`});
          results.push(result('workspace','Workspace autenticado',response.ok&&Array.isArray(body)?'pass':'fail',response.ok?body.length?'Workspace encontrado e acessível.':'Tabela acessível; primeiro envio ainda não foi realizado.':`Data API respondeu HTTP ${response.status}.`));
        }catch(error){results.push(result('workspace','Workspace autenticado','fail',`Falha de rede: ${error.message}`))}
      }else{
        results.push(result('session','Sessão autenticada','warn','Nenhum usuário conectado neste navegador.'));
        results.push(result('workspace','Workspace autenticado','warn','Entre na conta para verificar o acesso protegido.'));
      }
    }else{
      results.push(result('auth-health','Supabase Auth','warn','Ignorado até a configuração pública ser concluída.'));
      results.push(result('rls','Data API e RLS anônimo','warn','Ignorado até a configuração pública ser concluída.'));
      results.push(result('session','Sessão autenticada','warn','Ignorado até a configuração pública ser concluída.'));
      results.push(result('workspace','Workspace autenticado','warn','Ignorado até a configuração pública ser concluída.'));
    }
    if('serviceWorker'in navigator){
      try{const registration=await navigator.serviceWorker.getRegistration();results.push(result('pwa','PWA e modo offline',registration?.active?'pass':'warn',registration?.active?'Service Worker ativo.':'Service Worker disponível, mas ainda não está ativo.'))}catch(error){results.push(result('pwa','PWA e modo offline','warn',error.message))}
    }else results.push(result('pwa','PWA e modo offline','warn','Service Worker não suportado neste navegador.'));
    const report={version:'0.3.2',signature:'Tehkné Solutions',createdAt:new Date().toISOString(),project:c.url?c.url.replace(/^https:\/\//,''):'não configurado',results};
    localStorage.setItem(REPORT_KEY,JSON.stringify(report));currentReport=report;render(report);
  }finally{button.disabled=false;button.textContent='Executar diagnóstico'}
}
function render(report){currentReport=report;const counts={pass:0,warn:0,fail:0};report.results.forEach(item=>counts[item.status]++);byId('diagPass').textContent=counts.pass;byId('diagWarn').textContent=counts.warn;byId('diagFail').textContent=counts.fail;byId('diagTime').textContent=new Date(report.createdAt).toLocaleString('pt-BR');const overall=counts.fail?'Requer correção':counts.warn?'Parcialmente pronto':'Ambiente pronto';const badge=byId('diagOverall');badge.textContent=overall;badge.dataset.status=counts.fail?'fail':counts.warn?'warn':'pass';byId('diagList').innerHTML=report.results.map(item=>`<div class="diagItem ${item.status}"><span class="diagIcon">${item.status==='pass'?'✓':item.status==='warn'?'!':'×'}</span><div><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.detail)}</small></div><span class="diagStatus">${item.status==='pass'?'OK':item.status==='warn'?'Aviso':'Falha'}</span></div>`).join('');byId('copyCloudReport').disabled=false}
function escapeHtml(value){return String(value??'').replace(/[&<>\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]))}
function reportText(report){const counts={pass:0,warn:0,fail:0};report.results.forEach(item=>counts[item.status]++);return[`Commerce Radar — Diagnóstico de nuvem`,`Data: ${new Date(report.createdAt).toLocaleString('pt-BR')}`,`Projeto: ${report.project}`,`Resultado: ${counts.pass} OK, ${counts.warn} aviso(s), ${counts.fail} falha(s)`,``,...report.results.map(item=>`[${item.status.toUpperCase()}] ${item.label}: ${item.detail}`),``,`Assinatura: Tehkné Solutions`].join('\n')}
async function copyReport(){if(!currentReport)return;const text=reportText(currentReport);try{await navigator.clipboard.writeText(text);const button=byId('copyCloudReport');const old=button.textContent;button.textContent='Relatório copiado';setTimeout(()=>button.textContent=old,1800)}catch{const area=document.createElement('textarea');area.value=text;document.body.append(area);area.select();document.execCommand('copy');area.remove()}}
function boot(){if(inject())return;let attempts=0;const timer=setInterval(()=>{attempts++;if(inject()||attempts>150)clearInterval(timer)},100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
