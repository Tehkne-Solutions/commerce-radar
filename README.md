# Commerce Radar — Tehkné Solutions

Produto web para ajudar empreendedores a decidir **o que vender, onde vender, como validar e quando transformar uma hipótese em lançamento**.

## MVP 0.4.0

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
- **Importação de CSV, TXT e TSV.**
- **Detecção automática de separador e cabeçalhos.**
- **Mapeamento revisável de produtos, custos, vendas e métricas.**
- **Conversão de arquivos em oportunidades, análises e testes.**
- **Modelos de produtos, vendas e tráfego para download.**
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

O aplicativo continua funcionando sem conta e sem Supabase. A nuvem é uma extensão opcional do modo local.

## Executar localmente

```bash
python -m http.server 4173
```

Acesse `http://localhost:4173`.

## Importação CSV

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

### Saídas automáticas

**Produtos e custos** podem gerar:

- oportunidades próprias;
- análises comparáveis;
- score inicial;
- margem estimada e canal identificado.

**Vendas e tráfego** podem gerar ou atualizar testes com:

- pedidos;
- receita;
- visualizações;
- cliques;
- investimento;
- etapa do funil.

Ao atualizar um teste existente, é possível somar um novo período ou substituir as métricas anteriores.

Guia completo: [`docs/CSV_IMPORT.md`](docs/CSV_IMPORT.md).

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

Guia completo: [`docs/AUTOMATED_ACTIVATION.md`](docs/AUTOMATED_ACTIVATION.md).

## Sincronização com revisões

Cada dispositivo conserva o número da última revisão recebida ou publicada.

O banco bloqueia a operação quando a revisão esperada não corresponde à revisão atual. Isso impede sobrescrita silenciosa entre dispositivos.

Quando ocorre conflito, o usuário pode:

- usar a versão da nuvem;
- mesclar e criar uma revisão;
- manter o dispositivo e publicar uma nova revisão.

A sincronização automática fica suspensa enquanto houver conflito pendente.

## Histórico e recuperação

A tela **Conta e sincronização** lista até 30 revisões recentes, com data, dispositivo, motivo, exportação e restauração.

Restaurar não apaga o histórico. O conteúdo escolhido é publicado como uma nova revisão.

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
- O histórico de importações guarda resumos, não o CSV bruto.
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
- Não há conexão OAuth direta com marketplaces nesta versão.
- A mesclagem da nuvem ocorre por identificador; não é edição colaborativa em tempo real.
- O score não constitui previsão financeira.

## Publicação

```text
https://tehkne-solutions.github.io/commerce-radar/
```

A `main` é publicada automaticamente pelo workflow do GitHub Pages.

## Roadmap

- v0.4.1: adaptadores para formatos exportados por marketplaces.
- v0.5: atualização assistida de tendências e catálogo.
- v1.0: inteligência de mercado e recomendações assistidas.

## Assinatura

Tehkné Solutions
