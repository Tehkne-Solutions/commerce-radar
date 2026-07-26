# Commerce Radar — Tehkné Solutions

Produto web para ajudar empreendedores a decidir **o que vender, onde vender, como validar e quando transformar uma hipótese em lançamento**.

## MVP 0.3.3

- Radar com 20 oportunidades iniciais.
- Cadastro de oportunidades próprias.
- Filtros por categoria, capital e modelo operacional.
- Score, margem, preço mínimo e ranking de canais.
- Kanban de experimentos com métricas reais.
- Planos de lançamento para hipóteses validadas.
- Backup e restauração em JSON.
- Conta opcional e sincronização entre dispositivos.
- Provisionamento automatizado do Supabase.
- Diagnóstico administrativo de Auth, Data API, RLS e PWA.
- **Histórico das últimas 30 revisões do workspace.**
- **Detecção de conflito entre dispositivos por revisão esperada.**
- **Restauração de versões antigas como uma nova revisão.**
- **Exportação individual de qualquer versão em JSON.**
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

## Ativação automatizada

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
3. aplica todas as migrations com `supabase db push`;
4. cria workspace, histórico, RPC e políticas RLS;
5. obtém a chave pública;
6. gera `cloud-config.js`;
7. verifica Auth, Data API e isolamento anônimo;
8. publica a configuração na `main`;
9. aciona o GitHub Pages.

Guia completo: [`docs/AUTOMATED_ACTIVATION.md`](docs/AUTOMATED_ACTIVATION.md).

## Primeira conta

Na tela **Conta e sincronização**:

1. informe e-mail e senha;
2. clique em **Criar conta e ativar agora**;
3. confirme o e-mail, quando essa exigência estiver habilitada;
4. o primeiro workspace será enviado automaticamente.

## Sincronização com revisões

Cada dispositivo conserva o número da última revisão que recebeu ou publicou.

Ao enviar dados, o app chama:

```text
sync_commerce_radar_workspace(expected_revision, workspace_payload, source_device, reason)
```

O banco bloqueia a operação quando `expected_revision` não corresponde à revisão atual. Isso impede que um dispositivo desatualizado sobrescreva silenciosamente outro.

### Resolução de conflito

Quando ocorre conflito, nenhuma informação é alterada. O usuário escolhe:

- **Usar versão da nuvem:** substitui o navegador pela revisão remota.
- **Mesclar e criar revisão:** combina registros por identificador e publica o resultado.
- **Manter este dispositivo:** publica o estado local sobre a revisão remota atual, preservando a versão anterior no histórico.

A sincronização automática fica suspensa enquanto houver conflito pendente.

## Histórico e recuperação

A tela **Conta e sincronização** lista até 30 revisões recentes, com:

- número da revisão;
- data e hora;
- dispositivo de origem;
- motivo do envio;
- exportação em JSON;
- restauração.

Restaurar não apaga o histórico. O conteúdo escolhido é publicado como uma nova revisão, permitindo retornar novamente a qualquer estado posterior.

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

## Diagnóstico administrativo

O botão **Executar diagnóstico** verifica:

- navegador e LocalStorage;
- configuração pública;
- Supabase Auth;
- Data API;
- isolamento anônimo por RLS;
- sessão autenticada;
- acesso ao workspace;
- Service Worker.

O relatório copiável não inclui credenciais ou tokens.

## Segurança

- O modo local não transmite dados.
- PAT e senha do banco ficam apenas em GitHub Secrets.
- Usuários autenticados possuem somente leitura direta da tabela atual e do próprio histórico.
- Escritas são realizadas exclusivamente pelo RPC versionado.
- O RPC usa `auth.uid()`, trava a linha durante a atualização e limita o payload a 5 MB.
- Cada usuário acessa somente os próprios registros por RLS.
- Consultas anônimas não recebem dados.
- Restaurações e resoluções geram novas revisões auditáveis.

## Limitações atuais

- O catálogo contém hipóteses, não produtos com retorno garantido.
- Não há coleta automática de tendências ou preços.
- Métricas de testes ainda são inseridas manualmente.
- A mesclagem ocorre por identificador; não é edição colaborativa em tempo real.
- O histórico padrão exibe as 30 revisões mais recentes.
- O score não constitui previsão financeira.

## Publicação

```text
https://tehkne-solutions.github.io/commerce-radar/
```

A `main` é publicada automaticamente pelo workflow do GitHub Pages.

## Roadmap

- v0.4: importação de CSV e conectores oficiais de marketplaces.
- v0.5: atualização assistida de tendências e catálogo.
- v1.0: inteligência de mercado e recomendações assistidas.

## Assinatura

Tehkné Solutions
