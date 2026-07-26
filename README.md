# Commerce Radar — Tehkné Solutions

Produto web para decidir **o que vender, onde vender, como validar, quanto capital será necessário e se a operação gera caixa**.

## MVP 0.4.5

- Radar com 20 oportunidades iniciais e oportunidades próprias.
- Score, margem, preço mínimo e ranking de canais.
- Kanban de testes e planos de lançamento.
- Importação CSV/TXT/TSV e adaptadores de marketplaces.
- Auditoria de margem líquida.
- Reconciliação financeira por pedido.
- Fechamento por período e controle de repasses.
- Metas, orçamento, ponto de equilíbrio e projeção de caixa.
- Cenários conservador, provável e otimista.
- Backup, PWA e sincronização opcional com Supabase.

## Stack

HTML, CSS e JavaScript sem framework ou build, LocalStorage, Service Worker, GitHub Pages e Supabase opcional com RLS.

## Executar localmente

```bash
python -m http.server 4173
```

Acesse `http://localhost:4173`.

## Fluxo do produto

```text
Descobrir → analisar → testar → importar → auditar → reconciliar → fechar → projetar
```

## Planejamento financeiro

A tela **Metas e caixa** usa auditorias do período-base para calcular:

- receita mensal observada;
- margem de contribuição;
- ponto de equilíbrio;
- capital para estoque;
- necessidade causada pelo prazo de repasse;
- reserva de custos fixos;
- margem de segurança;
- fluxo de caixa mensal;
- caixa final e déficit máximo;
- cenários conservador, provável e otimista.

O usuário informa custos fixos, meta mensal, caixa inicial, prazo de repasse, dias de estoque e horizonte da projeção.

Guia: [`docs/FINANCIAL_PLANNING.md`](docs/FINANCIAL_PLANNING.md).

## Módulos financeiros

- [`docs/FINANCIAL_AUDIT.md`](docs/FINANCIAL_AUDIT.md)
- [`docs/ORDER_RECONCILIATION.md`](docs/ORDER_RECONCILIATION.md)
- [`docs/PERIOD_CLOSE.md`](docs/PERIOD_CLOSE.md)
- [`docs/FINANCIAL_PLANNING.md`](docs/FINANCIAL_PLANNING.md)

## Backup 0.4.5

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
```

Backups anteriores continuam compatíveis. A nuvem continua opcional e não exige nova migration para os novos campos.

## Segurança e limitações

- Arquivos e cálculos são processados no navegador.
- Nenhuma tarifa fixa é presumida.
- Não há acesso a conta bancária ou credenciais de marketplace.
- Projeções dependem das premissas e da qualidade dos dados.
- O produto não substitui contabilidade, apuração fiscal, conciliação bancária, análise de crédito ou aconselhamento financeiro.

## Publicação

```text
https://tehkne-solutions.github.io/commerce-radar/
```

A `main` é publicada automaticamente pelo GitHub Pages.

## Roadmap

- v0.5: atualização assistida de tendências e catálogo.
- v0.6: recomendações com evidências e ranking temporal.
- v1.0: inteligência de mercado e recomendações assistidas.

## Assinatura

Tehkné Solutions
