# Commerce Radar — Tehkné Solutions

Produto web para ajudar empreendedores a identificar sinais, decidir **o que vender, onde vender, como validar, quanto capital será necessário e se a operação realmente gera caixa**.

## MVP 0.5.0

- Radar com 20 oportunidades iniciais.
- Radar de tendências com fontes, validade e confiança.
- Agrupamento de evidências, contradições e ranking temporal.
- Cadastro de oportunidades próprias.
- Score, margem, preço mínimo e ranking de canais.
- Kanban de experimentos e planos de lançamento.
- Importação de CSV, TXT e TSV.
- Adaptadores para Mercado Livre, Shopee, WooCommerce e Shopify.
- Auditoria de margem líquida por produto e canal.
- Reconciliação financeira por pedido, taxas e repasses.
- Fechamento financeiro por período.
- Comparação de canais e evolução mensal da margem.
- Controle de repasses pendentes, parciais, recebidos e contestados.
- Metas, orçamento, ponto de equilíbrio e projeção de caixa.
- Cenários conservador, provável e otimista.
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

A tela **Radar de tendências** registra sinais com:

- produto ou tema;
- categoria;
- tipo, nome e URL da fonte;
- geografia e período analisado;
- data de observação e validade;
- crescimento, demanda, concorrência, margem, risco e confiança;
- evidência textual e observações.

O score pondera crescimento, demanda, margem potencial, concorrência invertida, risco invertido, confiança, frescor e qualidade do tipo de fonte.

Sinais do mesmo tema são agrupados. Fontes diferentes aumentam a confirmação, enquanto avaliações muito divergentes geram o aviso **Sinais contraditórios**. Evidências vencidas deixam de aparecer por padrão, mas permanecem auditáveis.

Uma tendência pode gerar uma oportunidade própria ou um teste no estágio de pesquisa. Também é possível importar e exportar os sinais em CSV.

O módulo não consulta nem raspa fontes automaticamente. Interesse e popularidade não comprovam intenção de compra.

Guia: [`docs/TREND_RADAR.md`](docs/TREND_RADAR.md).

## Importação de dados

A tela **Importar dados** aceita arquivos de até 8 MB e processa até 20.000 linhas no navegador.

O sistema reconhece separadores comuns, arquivos com BOM, valores monetários pt-BR e cabeçalhos em português ou inglês.

Adaptadores disponíveis:

- Mercado Livre — vendas;
- Shopee — pedidos;
- WooCommerce — produtos e pedidos;
- Shopify — produtos e pedidos.

Guias:

- [`docs/CSV_IMPORT.md`](docs/CSV_IMPORT.md)
- [`docs/MARKETPLACE_ADAPTERS.md`](docs/MARKETPLACE_ADAPTERS.md)

## Auditoria financeira

A tela **Auditoria financeira** calcula:

- receita líquida;
- custos totais;
- lucro e margem líquida;
- contribuição antes da mídia;
- lucro por pedido;
- CPA;
- ROAS e ROAS de equilíbrio;
- alertas e reconciliação contra perfis planejados.

O sistema não presume tarifas fixas de marketplace.

Guia: [`docs/FINANCIAL_AUDIT.md`](docs/FINANCIAL_AUDIT.md).

## Reconciliação por pedido

A tela **Reconciliação por pedido**:

1. agrupa várias linhas pelo identificador do pedido;
2. soma taxas cobradas por item;
3. conta uma vez valores repetidos do pedido;
4. ignora pedidos cancelados;
5. calcula o repasse esperado;
6. compara o repasse informado;
7. rateia custos entre produtos;
8. cria auditorias financeiras.

Guia: [`docs/ORDER_RECONCILIATION.md`](docs/ORDER_RECONCILIATION.md).

## Fechamento financeiro

A tela **Fechamento financeiro** consolida um intervalo e apresenta:

- receita, custos, lucro e margem;
- comparação entre canais;
- evolução mensal da margem;
- repasses esperados, informados, recebidos e pendentes;
- atrasos e contestações;
- divergências de repasse;
- cobertura de dados reais;
- snapshots de períodos fechados.

Controles de repasse podem ser criados manualmente ou gerados a partir dos lotes reconciliados.

Guia: [`docs/PERIOD_CLOSE.md`](docs/PERIOD_CLOSE.md).

## Metas, orçamento e projeção de caixa

A tela **Metas e caixa** usa as auditorias do período-base para calcular:

- receita e pedidos mensalizados;
- margem de contribuição;
- ponto de equilíbrio;
- capital para cobertura de estoque;
- necessidade causada pelo intervalo até o repasse;
- reserva de custos fixos;
- margem de segurança;
- fluxo mensal de recebimentos e saídas;
- déficit máximo e caixa final;
- cenários conservador, provável e otimista.

O usuário informa meta mensal, custos fixos, caixa inicial, prazo de repasse, cobertura de estoque, reserva e horizonte da projeção. Receitas são deslocadas entre os meses conforme o prazo informado, permitindo distinguir lucro contábil de disponibilidade real de caixa.

Guia: [`docs/FINANCIAL_PLANNING.md`](docs/FINANCIAL_PLANNING.md).

## Backup e sincronização

O backup da v0.5.0 contém:

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
- URLs e evidências de tendência só são armazenadas quando informadas pelo usuário.
- PAT e senha do banco ficam somente em GitHub Secrets.
- Escritas na nuvem passam por RPC versionado.
- Cada usuário acessa somente os próprios registros por RLS.
- Backups não incluem credenciais.

## Limitações

- O catálogo contém hipóteses, não retorno garantido.
- Tendência, busca e popularidade não comprovam venda.
- A qualidade dos resultados depende das fontes e dados informados.
- Duas fontes podem repetir a mesma origem primária.
- Sinais podem ser sazonais, manipulados ou efêmeros.
- Cabeçalhos e relatórios de marketplaces podem mudar.
- Um lote pode misturar ajustes de períodos diferentes.
- O valor informado por um canal não comprova recebimento bancário.
- Projeções dependem das premissas e não garantem venda, lucro ou liquidez.
- A ferramenta não substitui contabilidade, apuração fiscal, conciliação bancária, análise de crédito ou aconselhamento financeiro.
- Não há conexão OAuth direta com marketplaces nesta versão.

## Publicação

```text
https://tehkne-solutions.github.io/commerce-radar/
```

A `main` é publicada automaticamente pelo GitHub Pages.

## Roadmap

- v0.5.1: fila de atualização de fontes e revisão em lote.
- v0.6: recomendações com evidências e ranking temporal.
- v1.0: inteligência de mercado e recomendações assistidas.

## Assinatura

Tehkné Solutions
