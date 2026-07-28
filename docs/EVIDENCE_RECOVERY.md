# Commerce Radar — Alertas e recuperação da confiança

## Objetivo

Transformar regressões relevantes da confiança em ações operacionais rastreáveis, sem alterar artificialmente a pontuação nem automatizar decisões de experimento.

## Alertas

O módulo identifica:

- regressão geral de oito pontos ou mais;
- perda de dez pontos ou mais em amostra, cobertura, representatividade, estabilidade ou integridade;
- severidade média, alta ou crítica conforme a magnitude da queda.

## Planos de recuperação

Cada plano registra:

- experimento e pontuação de referência;
- componente degradado;
- ação sugerida;
- prioridade;
- responsável;
- prazo;
- status e evidência de conclusão.

Ações concluídas exigem evidência textual com pelo menos 20 caracteres.

## Verificação da recuperação

A confirmação `VERIFICAR` exige que todas as ações estejam concluídas. O sistema cria uma nova captura e compara a pontuação observada com a linha de base do plano.

- pontuação recuperada ou superior: plano `recovered` e alertas resolvidos;
- pontuação ainda inferior: plano `monitoring` e alertas permanecem abertos.

## Acompanhamento

O painel mostra alertas abertos, planos ativos, ações atrasadas, responsáveis e prazos. Snapshots preservam a situação diária.

## Backup e sincronização

Chaves adicionadas:

- `evidenceRecoveryAlerts`;
- `evidenceRecoveryPlans`;
- `evidenceRecoveryActions`;
- `evidenceRecoveryEvents`;
- `evidenceRecoverySnapshots`;
- `evidenceRecoverySettings`.

## Limitações

- concluir tarefas não aumenta a confiança por si só;
- a recuperação depende de nova evidência observada;
- nenhum plano promove, encerra ou altera automaticamente experimentos;
- as orientações são operacionais e não representam causalidade estatística.

Tehkné Solutions
