const fs = require('fs');
const store = new Map();
global.window = undefined;
global.document = undefined;
global.localStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
};
require('../trend-sla.js');
const api = global.CommerceRadarReviewSla;
if (!api) throw new Error('API de SLA não inicializada');

const snapshots = [
  {date:'2026-07-13',metrics:{compliance:70,completed:7,overdue:3,dueToday:0},workload:[{ownerId:'a',ownerName:'Ana',completed7:5,overdue:2,utilization:120}]},
  {date:'2026-07-19',metrics:{compliance:75,completed:8,overdue:2,dueToday:0},workload:[{ownerId:'a',ownerName:'Ana',completed7:6,overdue:2,utilization:110}]},
  {date:'2026-07-20',metrics:{compliance:80,completed:8,overdue:2,dueToday:1},workload:[{ownerId:'a',ownerName:'Ana',completed7:6,overdue:2,utilization:110},{ownerId:'b',ownerName:'Bruno',completed7:7,overdue:0,utilization:70}]},
  {date:'2026-07-26',metrics:{compliance:90,completed:9,overdue:1,dueToday:0},workload:[{ownerId:'a',ownerName:'Ana',completed7:7,overdue:1,utilization:90},{ownerId:'b',ownerName:'Bruno',completed7:8,overdue:0,utilization:60}]},
];
const config = {teamComplianceTarget:85,maxTeamOverdue:2,maxUtilization:100,ownerComplianceTarget:80,maxOwnerOverdue:1,lookbackWeeks:2};
if (api.weekStart('2026-07-26') !== '2026-07-20' || api.weekEnd('2026-07-26') !== '2026-07-26') throw new Error('Período semanal inválido');
const current = api.weeklySummary(snapshots, '2026-07-26');
const previous = api.weeklySummary(snapshots, '2026-07-19');
if (current.compliance !== 85 || current.overdue !== 1 || current.overloaded !== 0 || current.days !== 2) throw new Error(`Resumo atual inválido: ${JSON.stringify(current)}`);
if (previous.compliance !== 73 || previous.overdue !== 2 || previous.overloaded !== 1) throw new Error(`Resumo anterior inválido: ${JSON.stringify(previous)}`);
const comparison = api.compareWeeks(current, previous);
if (comparison.compliance !== 12 || comparison.overdue !== -1 || comparison.overloaded !== -1) throw new Error('Comparação semanal inválida');
const evaluation = api.evaluateSla(current, config);
if (evaluation.status !== 'Dentro do SLA' || evaluation.owners.some(owner => owner.slaStatus !== 'Dentro do SLA')) throw new Error('Avaliação de SLA inválida');
const deviations = api.recurringDeviations(snapshots, config, '2026-07-26');
const ana = deviations.find(item => item.ownerId === 'a');
if (!ana || ana.totalBreaches !== 3) throw new Error(`Recorrência inválida: ${JSON.stringify(deviations)}`);
const closing = api.buildClosing(snapshots, config, '2026-07-26', {status:'closed',decisions:'Rebalancear a fila.',actions:[{description:'Mover duas fontes',owner:'Ana',dueDate:'2026-07-28'}]});
if (closing.status !== 'closed' || closing.actions.length !== 1 || closing.signature !== 'Tehkné Solutions') throw new Error('Fechamento inválido');
store.set(api.K.snapshots, JSON.stringify(snapshots));
store.set(api.K.settings, JSON.stringify(config));
api.saveClosing(closing);
const saved = JSON.parse(store.get(api.K.closings));
if (saved.length !== 1 || saved[0].weekStart !== '2026-07-20') throw new Error('Fechamento não foi persistido');

const code = fs.readFileSync('trend-sla.js', 'utf8');
const css = fs.readFileSync('trend-sla.css', 'utf8');
const bootstrap = fs.readFileSync('cloud-bootstrap.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const docs = fs.readFileSync('docs/SLA_WEEKLY_CLOSE.md', 'utf8');
const version = fs.readFileSync('VERSION', 'utf8').trim();
for (const marker of ['SLA, tendências e fechamento', 'trendSlaSettings', 'trendWeeklyClosings', "version: '0.5.4'", 'Desvios repetidos', 'Tehkné Solutions']) if (!code.includes(marker)) throw new Error(`Marcador ausente: ${marker}`);
for (const asset of ['./trend-sla.css', './trend-sla.js']) {
  if (!bootstrap.includes(asset)) throw new Error(`Bootstrap ausente: ${asset}`);
  if (!sw.includes(asset)) throw new Error(`Cache offline ausente: ${asset}`);
}
if (bootstrap.indexOf('./trend-sla.js') < bootstrap.indexOf('./trend-operations.js')) throw new Error('SLA deve carregar após operação');
if (!css.includes('.tsSummary') || !css.includes('.tsOwners') || css.length < 2500) throw new Error('Estilos de SLA incompletos');
const versionParts = version.split('.').map(Number);
if (versionParts[0] < 0 || (versionParts[0] === 0 && versionParts[1] < 5) || (versionParts[0] === 0 && versionParts[1] === 5 && versionParts[2] < 4)) throw new Error(`Versão anterior a 0.5.4: ${version}`);
const cacheMatch = sw.match(/commerce-radar-v(\d+)/);
if (!cacheMatch || Number(cacheMatch[1]) < 19) throw new Error('Cache PWA anterior ao SLA');
for (const marker of ['Fonte dos indicadores', 'Metas de SLA', 'Comparação semanal', 'Desvios recorrentes', 'Fechamento semanal', 'Backup e sincronização']) if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
console.log('SLA, recorrência, fechamento, integração e PWA válidos.');