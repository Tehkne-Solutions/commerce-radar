# Commerce Radar — Tehkné Solutions

Produto web para ajudar empreendedores a decidir **o que vender, onde vender, como validar e se a operação realmente gera lucro**.

## MVP 0.4.2

- Radar com 20 oportunidades iniciais.
- Cadastro de oportunidades próprias.
- Score, margem, preço mínimo e ranking de canais.
- Kanban de experimentos com métricas reais.
- Planos de lançamento para hipóteses validadas.
- Backup e restauração em JSON.
- Conta opcional e sincronização entre dispositivos.
- Histórico de revisões e resolução de conflitos.
- Provisionamento automatizado do Supabase.
- Diagnóstico administrativo de Auth, Data API, RLS e PWA.
- Importação de CSV, TXT e TSV.
- Adaptadores para Mercado Livre, Shopee, WooCommerce e Shopify.
- Auditoria de margem líquida por produto e canal.
- Perfis financeiros, reconciliação e alertas de custo.
- Exportação financeira em CSV e Markdown.
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

O fluxo é:

1. selecionar ou arrastar o arquivo;
2. informar a origem;
3. revisar o mapeamento das colunas;
4. analisar qualidade, totais e produtos;
5. salvar somente o diagnóstico ou aplicar os dados.

### Adaptadores

A versão 0.4.1 adicionou presets para:

- Mercado Livre — vendas;
- Shopee — pedidos;
- WooCommerce — produtos;
- WooCommerce — pedidos e Analytics por item;
- Shopify — produtos;
- Shopify — pedidos.

A detecção é revisável. Arquivos genéricos continuam usando o mapeamento da v0.4.

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
- participação de cada custo na receita;
- alertas e reconciliação contra o perfil planejado.

O sistema não presume tarifas fixas de marketplace. Perfis financeiros são criados pelo usuário e permanecem editáveis em cada auditoria.

Uma auditoria pode começar a partir de:

- um teste real;
- um produto do histórico de importação;
- preenchimento manual.

Guia: [`docs/FINANCIAL_AUDIT.md`](docs/FINANCIAL_AUDIT.md).

## Backup

O backup da v0.4.2 contém:

```text
analyses
tests
customOpportunities
launchPlans
importBatches
financialAudits
financialProfiles
```

Backups antigos continuam compatíveis. Campos que não existirem são tratados como listas vazias.

## Ativação automatizada da nuvem

Cadastre uma vez os GitHub Actions secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

Depois execute:

```text
Actions → Provisionar Supabase → Run workflow
```

O workflow:

1. usa um projeto existente ou cria um novo;
2. aguarda os serviços ficarem saudáveis;
3. aplica todas as migrations;
4. cria workspace, histórico, RPC e políticas RLS;
5. obtém a chave pública;
6. gera `cloud-config.js`;
7. verifica Auth, Data API e isolamento anônimo;
8. publica a configuração na `main`;
9. aciona o GitHub Pages.

Guia: [`docs/AUTOMATED_ACTIVATION.md`](docs/AUTOMATED_ACTIVATION.md).

## Sincronização com revisões

Cada dispositivo conserva o número da última revisão recebida ou publicada.

O banco bloqueia a operação quando a revisão esperada não corresponde à revisão atual. Isso impede sobrescrita silenciosa entre dispositivos.

Quando ocorre conflito, o usuário pode:

- usar a versão da nuvem;
- mesclar e criar uma revisão;
- manter o dispositivo e publicar uma nova revisão.

A sincronização automática fica suspensa enquanto houver conflito pendente.

A v0.4.2 amplia dinamicamente o workspace para sincronizar também:

- lotes de importação;
- auditorias financeiras;
- perfis financeiros.

Não é necessária nova migration para esses campos, pois o workspace é armazenado como JSON versionado.

## Configuração manual alternativa

Execute [`docs/supabase.sql`](docs/supabase.sql) no SQL Editor e configure:

```js
window.COMMERCE_RADAR_CLOUD = {
  url: 'https://SEU-PROJETO.supabase.co',
  publishableKey: 'SUA_CHAVE_PUBLICA',
  table: 'commerce_radar_workspaces',
  versionsTable: 'commerce_radar_workspace_versions'
};
```

A publishable key pode ser utilizada no navegador. **Nunca coloque `service_role`, PAT ou senha do banco no frontend.**

## Segurança e privacidade

- O modo local não transmite dados.
- Arquivos importados são processados no navegador.
- O CSV bruto não é armazenado no histórico.
- Auditorias e perfis ficam no navegador até a sincronização opcional.
- PAT e senha do banco ficam apenas em GitHub Secrets.
- Escritas na nuvem passam pelo RPC versionado.
- O RPC limita o workspace a 5 MB.
- Cada usuário acessa somente os próprios registros por RLS.
- Consultas anônimas não recebem dados.
- Backups não incluem credenciais.

## Limitações atuais

- O catálogo contém hipóteses, não produtos com retorno garantido.
- A importação depende da qualidade e do período dos dados fornecidos.
- Arquivos de períodos sobrepostos podem duplicar métricas quando a opção **Somar** for utilizada.
- Adaptadores podem exigir ajuste quando a plataforma altera seus cabeçalhos.
- A auditoria financeira não substitui contabilidade ou apuração fiscal.
- Não há conexão OAuth direta com marketplaces nesta versão.
- A mesclagem da nuvem ocorre por identificador; não é edição colaborativa em tempo real.
- O score não constitui previsão financeira.

## Publicação

```text
https://tehkne-solutions.github.io/commerce-radar/
```

A `main` é publicada automaticamente pelo workflow do GitHub Pages.

## Roadmap

- v0.4.3: importação financeira ampliada e reconciliação por pedido.
- v0.5: atualização assistida de tendências e catálogo.
- v1.0: inteligência de mercado e recomendações assistidas.

## Assinatura

Tehkné Solutions
