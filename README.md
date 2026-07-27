# Commerce Radar — Tehkné Solutions

Produto web para ajudar empreendedores a identificar sinais, decidir **o que vender, onde vender, como validar, quanto capital será necessário, se a operação realmente gera caixa e se as recomendações anteriores acertaram**.

## MVP 0.6.1

- Radar com 20 oportunidades iniciais.
- Radar de tendências com fontes, validade, confiança e contradições.
- Fila de atualização de fontes com prioridade, vencimentos e revisão em lote.
- Responsáveis, calendário semanal/mensal e alertas de revisão.
- Indicadores de cumprimento, capacidade e sobrecarga por responsável.
- Rotina operacional diária e snapshots históricos.
- Metas de SLA, comparação semanal e desvios recorrentes.
- Fechamento semanal com decisões, ações e exportação.
- Recomendações explicáveis com ranking temporal.
- Calibração supervisionada com acertos, falsos positivos e falsos negativos.
- Sugestão reversível de pesos baseada em resultados posteriores.
- Histórico auditável de alterações por sinal.
- Cadastro de oportunidades próprias.
- Score, margem, preço mínimo e ranking de canais.
- Kanban de experimentos e planos de lançamento.
- Importação de CSV, TXT e TSV.
- Adaptadores para Mercado Livre, Shopee, WooCommerce e Shopify.
- Auditoria de margem líquida por produto e canal.
- Reconciliação financeira por pedido, taxas e repasses.
- Fechamento financeiro por período.
- Metas, orçamento, ponto de equilíbrio e projeção de caixa.
- Backup, restauração, histórico e sincronização opcional.
- Provisionamento automatizado do Supabase.
- PWA e modo local preservados.

## Stack

- HTML semântico.
- CSS responsivo.
- JavaScript sem framework ou build.
- LocalStorage e Service Worker.
- Supabase Auth e Data REST API opcionais.
- PostgreSQL com Row Level Security.
- GitHub Actions e GitHub Pages.

O aplicativo funciona sem conta e sem Supabase. A nuvem é uma extensão opcional do modo local.

## Executar localmente

```bash
python -m http.server 4173
```

Acesse `http://localhost:4173`.

## Fluxo do produto

```text
Registrar sinais e fontes
→ revisar validade e prioridade
→ atribuir responsáveis e prazos
→ acompanhar cumprimento e capacidade
→ executar a rotina operacional
→ avaliar SLA e fechar a semana
→ priorizar tendências
→ gerar recomendações explicáveis
→ criar oportunidade
→ analisar
→ comparar canais
→ testar
→ importar resultados
→ auditar margem
→ reconciliar pedidos
→ controlar repasses
→ fechar o período
→ projetar metas e caixa
→ comparar previsão com resultado posterior
→ calibrar pesos com ação explícita
```

## Radar de tendências

A tela **Radar de tendências** registra produto, categoria, fonte, URL, geografia, período, data, validade, crescimento, demanda, concorrência, margem, risco, confiança e evidência.

O score pondera crescimento, demanda, margem potencial, concorrência invertida, risco invertido, confiança, frescor e qualidade da fonte. Sinais do mesmo tema são agrupados; fontes diferentes aumentam a confirmação e divergências relevantes geram o aviso **Sinais contraditórios**.

Uma tendência pode gerar uma oportunidade própria ou um teste no estágio de pesquisa. O módulo não consulta nem raspa fontes automaticamente.

Guia: [`docs/TREND_RADAR.md`](docs/TREND_RADAR.md).

## Fila de atualização de fontes

A tela **Fila de fontes** organiza a manutenção das evidências por:

- vencimento ou atraso;
- revisão em 3, 7 ou 15 dias;
- prioridade alta, média ou baixa;
- contradição entre fontes;
- confiança do sinal;
- estado pendente, revisado ou adiado.

É possível revisar várias fontes, aplicar prioridade alta ou adiar a próxima revisão em lote. Cada ação cria uma entrada no histórico do sinal, contendo data, nota e valores anteriores e posteriores.

Guia: [`docs/SOURCE_UPDATE_QUEUE.md`](docs/SOURCE_UPDATE_QUEUE.md).

## Calendário de revisões

A tela **Calendário de revisões** utiliza os mesmos prazos da fila e oferece:

- visualização mensal de 42 dias;
- visualização semanal;
- cadastro de responsáveis;
- atribuição por fonte;
- filtro por responsável ou fontes sem atribuição;
- reagendamento com prioridade e estado;
- alertas de atrasos, revisões de hoje e próximos prazos;
- notificações locais opcionais do navegador.

O campo `nextReviewAt` é usado quando existe um reagendamento manual. Caso contrário, a agenda utiliza o vencimento da evidência. Reagendar não altera a data de observação e não renova a validade comercial da fonte.

Guia: [`docs/REVIEW_CALENDAR.md`](docs/REVIEW_CALENDAR.md).

## Operação de revisões

A tela **Operação de revisões** transforma fila, calendário e histórico em indicadores de execução.

Ela apresenta:

- cumprimento em 7, 14 ou 30 dias;
- revisões concluídas no período;
- atrasos abertos;
- carga dos próximos sete dias;
- capacidade semanal por responsável;
- estados saudável, atenção, sobrecarregado e sem dono;
- rotina operacional diária;
- snapshots históricos de cumprimento;
- relatório Markdown da operação.

O cálculo utilizado é:

```text
cumprimento =
revisões concluídas
÷
(revisões concluídas + revisões atrasadas abertas)
```

A capacidade é uma premissa configurável e não representa automaticamente horas ou produtividade. Os snapshots começam a formar a série histórica a partir da v0.5.3.

Guia: [`docs/REVIEW_OPERATIONS.md`](docs/REVIEW_OPERATIONS.md).

## SLA e fechamento semanal

A tela **SLA e fechamento** consolida os snapshots de segunda-feira a domingo e oferece:

- meta mínima de cumprimento da equipe;
- limite de atrasos da equipe;
- utilização máxima;
- metas individuais de cumprimento e atrasos;
- comparação com a semana anterior;
- tendência das últimas oito semanas;
- classificação Dentro do SLA, Atenção, Fora do SLA ou Sem dados;
- desvios recorrentes por responsável;
- decisões da semana;
- ações com responsável, prazo e estado;
- fechamento em rascunho ou concluído;
- exportação Markdown.

Quando existem vários snapshots na semana, o cumprimento é calculado pela média disponível e atrasos usam o snapshot mais recente. Ausência de snapshot não é convertida em estimativa.

Desvios recorrentes servem para investigação de processo e não devem ser usados isoladamente para avaliação de pessoas.

Guia: [`docs/SLA_WEEKLY_CLOSE.md`](docs/SLA_WEEKLY_CLOSE.md).

## Recomendações explicáveis

A tela **Recomendações** reúne informações de:

- tendências;
- testes;
- auditorias financeiras;
- análises de viabilidade;
- oportunidades próprias;
- planejamento financeiro.

O ranking utiliza os componentes:

```text
Mercado
Validação
Economia
Prontidão
Atualidade
Evidência
```

Dados ausentes recebem zero no componente correspondente. Fontes vencidas, contradições, testes descartados e prejuízos reduzem a recomendação.

Cada produto mostra score, confiança, justificativas, riscos, lacunas, próxima ação e variação em relação ao ranking anterior.

Guia: [`docs/RECOMMENDATIONS.md`](docs/RECOMMENDATIONS.md).

## Calibração do ranking

A tela **Calibração do ranking** compara previsões completas com eventos comerciais registrados depois da previsão.

Ela mede:

- verdadeiros positivos;
- falsos positivos;
- verdadeiros negativos;
- falsos negativos;
- acurácia;
- precisão;
- recall;
- Brier score.

O horizonte padrão é de 21 dias. Resultados anteriores à previsão não entram na avaliação.

A sugestão de pesos exige amostra mínima, sucessos e falhas. A alteração por componente é limitada e os pesos nunca são aplicados automaticamente.

Cada calibração registra os pesos anteriores e aplicados. A última alteração pode ser revertida.

Guia: [`docs/RECOMMENDATION_CALIBRATION.md`](docs/RECOMMENDATION_CALIBRATION.md).

## Importação de dados

A tela **Importar dados** aceita arquivos de até 8 MB e processa até 20.000 linhas no navegador. Reconhece separadores comuns, BOM, valores monetários pt-BR e cabeçalhos em português ou inglês.

Adaptadores disponíveis:

- Mercado Livre — vendas;
- Shopee — pedidos;
- WooCommerce — produtos e pedidos;
- Shopify — produtos e pedidos.

Guias: [`docs/CSV_IMPORT.md`](docs/CSV_IMPORT.md) e [`docs/MARKETPLACE_ADAPTERS.md`](docs/MARKETPLACE_ADAPTERS.md).

## Operação financeira

O Commerce Radar inclui:

- auditoria de receita, custos, lucro, margem, CPA e ROAS;
- reconciliação de pedidos, taxas, fretes, descontos e repasses;
- fechamento por período e comparação entre canais;
- controle de recebimentos pendentes, parciais e contestados;
- ponto de equilíbrio, capital de giro e projeção de caixa;
- cenários conservador, provável e otimista.

Guias:

- [`docs/FINANCIAL_AUDIT.md`](docs/FINANCIAL_AUDIT.md)
- [`docs/ORDER_RECONCILIATION.md`](docs/ORDER_RECONCILIATION.md)
- [`docs/PERIOD_CLOSE.md`](docs/PERIOD_CLOSE.md)
- [`docs/FINANCIAL_PLANNING.md`](docs/FINANCIAL_PLANNING.md)

## Backup e sincronização

O backup da v0.6.1 contém:

```text
analyses
tests
customOpportunities
launchPlans
importBatches
financialAudits
financialProfiles
reconciliationBatches
payoutControls
periodClosings
financialPlans
trendSignals
trendSettings
trendReviewQueue
trendSignalHistory
trendQueueSettings
trendOwners
trendCalendarSettings
trendAlertState
trendOperationalSettings
trendComplianceSnapshots
trendRoutineRuns
trendSlaSettings
trendWeeklyClosings
recommendationSettings
recommendationSnapshots
recommendationDecisions
calibrationSettings
calibrationPredictions
calibrationRuns
```

Backups antigos continuam compatíveis. Os mesmos campos entram no workspace sincronizado, sem nova migration, pois o estado é armazenado como JSON versionado.

## Ativação da nuvem

Cadastre uma vez os GitHub Actions secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

Depois execute:

```text
Actions → Provisionar Supabase → Run workflow
```

Guia: [`docs/AUTOMATED_ACTIVATION.md`](docs/AUTOMATED_ACTIVATION.md).

## Segurança e privacidade

- O modo local não transmite dados.
- Arquivos são processados no navegador.
- CSVs brutos não são armazenados no histórico.
- URLs e evidências só são armazenadas quando informadas pelo usuário.
- E-mails de responsáveis são opcionais e não são utilizados para envio automático.
- Notificações locais dependem de consentimento explícito do navegador.
- Escritas na nuvem passam por RPC versionado.
- Cada usuário acessa somente os próprios registros por RLS.
- Backups não incluem credenciais.
- Pesos de recomendação só mudam após confirmação explícita.

## Limitações

- Tendência, busca e popularidade não comprovam venda.
- Revisar uma fonte não comprova que a informação esteja correta.
- Adiar uma revisão não renova a validade da evidência.
- Reagendar no calendário não atualiza a observação da fonte.
- Cumprimento e SLA medem execução registrada, não qualidade da revisão.
- Capacidade semanal é uma premissa operacional, não produtividade garantida.
- Snapshots representam o momento da captura e não recriam o passado.
- Semanas sem snapshots permanecem sem dados.
- Desvios recorrentes não substituem gestão de pessoas ou análise de causa.
- Correlação histórica não prova causalidade.
- Amostras pequenas podem produzir calibrações instáveis.
- A recomendação e a calibração dependem da qualidade dos dados informados.
- Notificações locais não funcionam com o aplicativo totalmente fechado.
- Projeções não garantem venda, lucro ou liquidez.
- A ferramenta não substitui contabilidade, apuração fiscal, conciliação bancária, análise de crédito, governança corporativa, gestão de pessoas, análise estatística independente ou aconselhamento financeiro.
- Não há conexão OAuth direta com marketplaces nesta versão.

## Publicação

```text
https://tehkne-solutions.github.io/commerce-radar/
```

A `main` é publicada automaticamente pelo GitHub Pages.

## Roadmap

- v0.6.2: segmentação da calibração por categoria, canal e maturidade da evidência.
- v0.7: recomendações de portfólio, alocação de caixa e limite de exposição.
- v1.0: inteligência de mercado e recomendações assistidas.

## Assinatura

Tehkné Solutions
