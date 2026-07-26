# Commerce Radar — Tehkné Solutions

Produto web para ajudar empreendedores a decidir **o que vender, onde vender, como validar e se a operação realmente gera lucro**.

## MVP 0.4.3

- Radar com 20 oportunidades iniciais.
- Cadastro de oportunidades próprias.
- Score, margem, preço mínimo e ranking de canais.
- Kanban de experimentos com métricas reais.
- Planos de lançamento para hipóteses validadas.
- Importação de CSV, TXT e TSV.
- Adaptadores para Mercado Livre, Shopee, WooCommerce e Shopify.
- Auditoria de margem líquida por produto e canal.
- Reconciliação por pedido, taxas e repasses.
- Perfis financeiros, alertas e comparação de custos.
- Backup, restauração e sincronização opcional.
- Histórico de revisões e resolução de conflitos.
- Provisionamento automatizado do Supabase.
- PWA e modo local preservados.

## Stack

- HTML semântico.
- CSS responsivo.
- JavaScript sem framework ou build.
- LocalStorage e Service Worker.
- Supabase Auth e Data REST API opcionais.
- PostgreSQL com Row Level Security.
- Supabase CLI e Management API para provisionamento.
- GitHub Actions e GitHub Pages.

O aplicativo funciona sem conta e sem Supabase. A nuvem é uma extensão opcional do modo local.

## Executar localmente

```bash
python -m http.server 4173
```

Acesse `http://localhost:4173`.

## Importação de dados

A tela **Importar dados** aceita arquivos de até 8 MB e processa até 20.000 linhas no navegador.

O sistema reconhece:

- ponto e vírgula;
- vírgula;
- tabulação;
- barra vertical;
- arquivos com BOM;
- valores como `R$ 1.234,56` e `90,00`;
- cabeçalhos em português ou inglês.

### Adaptadores

Existem presets para:

- Mercado Livre — vendas;
- Shopee — pedidos;
- WooCommerce — produtos;
- WooCommerce — pedidos e Analytics por item;
- Shopify — produtos;
- Shopify — pedidos.

A detecção é revisável. Arquivos genéricos continuam usando o mapeamento padrão.

Guias:

- [`docs/CSV_IMPORT.md`](docs/CSV_IMPORT.md)
- [`docs/MARKETPLACE_ADAPTERS.md`](docs/MARKETPLACE_ADAPTERS.md)

## Auditoria financeira

A tela **Auditoria financeira** calcula o resultado real ou estimado por produto e canal.

Entradas principais:

- receita bruta;
- descontos e reembolsos;
- custo dos produtos;
- taxas do canal e de pagamento;
- frete e subsídio;
- impostos;
- publicidade;
- embalagens e outros custos.

Saídas:

- receita líquida;
- lucro líquido;
- margem líquida;
- contribuição antes da mídia;
- lucro por pedido;
- CPA;
- ROAS;
- ROAS de equilíbrio;
- participação dos custos na receita;
- alertas e reconciliação contra o perfil planejado.

O sistema não presume tarifas fixas de marketplace. Perfis financeiros são criados pelo usuário e permanecem editáveis.

Guia: [`docs/FINANCIAL_AUDIT.md`](docs/FINANCIAL_AUDIT.md).

## Reconciliação por pedido

A tela **Reconciliação por pedido** lê relatórios financeiros com várias linhas para o mesmo pedido.

O motor:

1. agrupa itens pelo identificador do pedido;
2. soma receita e taxas realmente cobradas por item;
3. conta uma única vez valores repetidos de frete, desconto, imposto e repasse;
4. ignora pedidos cancelados ou totalmente reembolsados;
5. calcula o repasse esperado;
6. compara o repasse informado;
7. rateia custos do pedido pela participação de cada produto na receita;
8. cria auditorias financeiras por produto e canal.

```text
repasse esperado =
  receita bruta
  - descontos
  - reembolsos
  - taxas do canal
  - taxas de pagamento
  - frete
  + subsídio de frete
  - impostos
  - outros ajustes
```

A diferença entre o repasse informado e o esperado é mantida no histórico do lote.

Guia: [`docs/ORDER_RECONCILIATION.md`](docs/ORDER_RECONCILIATION.md).

## Backup

O backup da v0.4.3 contém:

```text
analyses
tests
customOpportunities
launchPlans
importBatches
financialAudits
financialProfiles
reconciliationBatches
```

Backups antigos continuam compatíveis. Campos ausentes são tratados como listas vazias.

## Ativação automatizada da nuvem

Cadastre uma vez os GitHub Actions secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

Depois execute:

```text
Actions → Provisionar Supabase → Run workflow
```

O workflow cria ou conecta o projeto, aplica migrations, configura RLS, publica `cloud-config.js` e aciona o GitHub Pages.

Guia: [`docs/AUTOMATED_ACTIVATION.md`](docs/AUTOMATED_ACTIVATION.md).

## Sincronização com revisões

Cada dispositivo conserva o número da última revisão recebida ou publicada. O banco bloqueia sobrescritas quando outro dispositivo publica primeiro.

O workspace sincroniza:

- análises;
- testes;
- oportunidades próprias;
- planos de lançamento;
- lotes de importação;
- auditorias financeiras;
- perfis financeiros;
- lotes de reconciliação.

Não é necessária uma nova migration para esses campos, pois o workspace é armazenado como JSON versionado.

## Segurança e privacidade

- O modo local não transmite dados.
- Arquivos são processados no navegador.
- CSVs brutos não são armazenados no histórico.
- O histórico de reconciliação guarda apenas resumos.
- PAT e senha do banco ficam apenas em GitHub Secrets.
- Escritas na nuvem passam pelo RPC versionado.
- Cada usuário acessa somente os próprios registros por RLS.
- Backups não incluem credenciais.

## Limitações atuais

- O catálogo contém hipóteses, não produtos com retorno garantido.
- A importação depende da qualidade e do período dos dados.
- Cabeçalhos dos marketplaces podem mudar.
- Relatórios de repasse podem misturar ajustes de períodos diferentes.
- A deduplicação automática deve ser revisada quando cobranças iguais forem legítimas em várias linhas.
- A auditoria não substitui contabilidade, apuração fiscal ou conciliação bancária.
- Não há conexão OAuth direta com marketplaces nesta versão.

## Publicação

```text
https://tehkne-solutions.github.io/commerce-radar/
```

A `main` é publicada automaticamente pelo workflow do GitHub Pages.

## Roadmap

- v0.4.4: fechamento financeiro por período e painel de divergências.
- v0.5: atualização assistida de tendências e catálogo.
- v1.0: inteligência de mercado e recomendações assistidas.

## Assinatura

Tehkné Solutions