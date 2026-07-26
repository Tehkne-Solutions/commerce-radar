# Commerce Radar — Tehkné Solutions

Produto web para ajudar empreendedores a identificar sinais, decidir **o que vender, onde vender, como validar, quanto capital será necessário e se a operação realmente gera caixa**.

## MVP 0.5.3

- Radar com 20 oportunidades iniciais.
- Radar de tendências com fontes, validade, confiança e contradições.
- Fila de atualização de fontes com prioridade, vencimentos e revisão em lote.
- Responsáveis, calendário semanal/mensal e alertas de revisão.
- Indicadores de cumprimento, capacidade e sobrecarga por responsável.
- Rotina operacional diária e snapshots históricos.
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
→ priorizar tendências
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

O backup da v0.5.3 contém:

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

## Limitações

- Tendência, busca e popularidade não comprovam venda.
- Revisar uma fonte não comprova que a informação esteja correta.
- Adiar uma revisão não renova a validade da evidência.
- Reagendar no calendário não atualiza a observação da fonte.
- Cumprimento mede execução registrada, não qualidade da revisão.
- Capacidade semanal é uma premissa operacional, não produtividade garantida.
- Snapshots representam o momento da captura e não recriam o passado.
- Notificações locais não funcionam com o aplicativo totalmente fechado.
- A qualidade dos resultados depende das fontes e dados informados.
- Projeções não garantem venda, lucro ou liquidez.
- A ferramenta não substitui contabilidade, apuração fiscal, conciliação bancária, análise de crédito, gestão de pessoas ou aconselhamento financeiro.
- Não há conexão OAuth direta com marketplaces nesta versão.

## Publicação

```text
https://tehkne-solutions.github.io/commerce-radar/
```

A `main` é publicada automaticamente pelo GitHub Pages.

## Roadmap

- v0.5.4: metas de SLA, tendências operacionais e fechamento semanal da equipe.
- v0.6: recomendações com evidências e ranking temporal.
- v1.0: inteligência de mercado e recomendações assistidas.

## Assinatura

Tehkné Solutions
