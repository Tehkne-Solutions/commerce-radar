# Changelog — Commerce Radar

## 0.4.5 — Metas, Orçamento e Projeção de Caixa

### Adicionado

- Área **Metas e caixa**.
- Receita mensalizada a partir do período-base.
- Margem de contribuição e ponto de equilíbrio.
- Capital de giro separado em estoque, intervalo de repasse, reserva fixa e segurança.
- Fluxo mensal de caixa com recebimentos deslocados pelo prazo do canal.
- Cenários conservador, provável e otimista.
- Crescimento mensal configurável.
- Alertas de margem insuficiente, meta abaixo do equilíbrio, déficit de caixa e baixa confiança dos dados.
- Planos salvos com snapshots e exportação Markdown.
- `financialPlans` no backup e no workspace sincronizado.
- Documentação em `docs/FINANCIAL_PLANNING.md`.
- Workflow específico para fórmulas e integração.

### Compatibilidade

- Sem nova migration do Supabase.
- Backups antigos permanecem válidos.
- PWA atualizado para cache offline dos novos módulos.

## 0.4.4 — Fechamento Financeiro por Período

- Consolidação de auditorias por período e canal.
- Comparação entre canais e evolução mensal da margem.
- Controle de repasses esperados, informados, recebidos, pendentes e atrasados.
- Snapshots de fechamentos e relatórios Markdown.
- `payoutControls` e `periodClosings` no backup e na sincronização.

## 0.4.3 — Reconciliação por Pedido

- Agrupamento de itens por pedido.
- Deduplicação de valores repetidos e soma de taxas por item.
- Rateio proporcional e comparação de repasse esperado e informado.
- Criação de auditorias por produto e canal.

## 0.4.2 — Auditoria Financeira

- Margem líquida, lucro, CPA, ROAS e perfis financeiros.

## 0.4.1 — Adaptadores de Marketplaces

- Mercado Livre, Shopee, WooCommerce e Shopify.

## 0.4.0 — Importação de Dados

- CSV, TXT e TSV, mapeamento e histórico de lotes.

## Assinatura

Tehkné Solutions
