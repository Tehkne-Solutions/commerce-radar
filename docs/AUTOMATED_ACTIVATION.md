# Ativação automatizada do Supabase

O Commerce Radar pode provisionar a infraestrutura de nuvem por GitHub Actions sem copiar URL, chave pública ou executar SQL manualmente.

## O que a automação faz

O workflow `.github/workflows/provision-supabase.yml`:

1. usa um projeto Supabase existente ou cria um novo;
2. aguarda os serviços ficarem saudáveis;
3. vincula o Supabase CLI ao projeto;
4. aplica todas as migrations de `supabase/migrations`;
5. cria a tabela `commerce_radar_workspaces` e as políticas RLS;
6. obtém a publishable key do projeto;
7. gera `cloud-config.js` automaticamente;
8. testa Auth, Data API e isolamento anônimo por RLS;
9. faz commit da configuração pública na `main`;
10. dispara o deploy do GitHub Pages.

A publishable key é pública por natureza e pode ser enviada ao navegador. Tokens pessoais, senha do banco e chaves secretas nunca são incluídos no frontend.

## Preparação única

No GitHub, abra:

`Settings > Secrets and variables > Actions > New repository secret`

Crie estes dois secrets:

### `SUPABASE_ACCESS_TOKEN`

Personal Access Token criado na conta Supabase. O token precisa conseguir criar ou administrar o projeto selecionado.

### `SUPABASE_DB_PASSWORD`

- Projeto existente: use a senha atual do banco.
- Projeto novo: defina uma senha forte; ela será usada ao criar e vincular o projeto.

Nunca coloque esses valores em arquivos do repositório, inputs visíveis do workflow ou mensagens de commit.

## Executar

Abra:

`Actions > Provisionar Supabase > Run workflow`

### Usar projeto existente

- `mode`: `existing`
- `project_ref`: identificador de 20 caracteres do projeto
- os demais campos podem ficar vazios

### Criar projeto novo

- `mode`: `create`
- `organization_slug`: slug da organização Supabase
- `project_name`: nome desejado
- `region`: região desejada, por exemplo `sa-east-1`

A criação pode falhar quando a organização já atingiu o limite de projetos do plano ou quando o token não possui permissão suficiente.

## Primeira conta e envio

Depois do deploy:

1. abra **Conta e sincronização**;
2. informe e-mail e senha;
3. clique em **Criar conta e ativar agora**.

O aplicativo cria a conta e envia o workspace automaticamente quando a sessão estiver disponível. Quando a confirmação por e-mail estiver habilitada, o envio ocorre depois que o usuário confirmar o endereço e entrar.

## Reexecução segura

As migrations são idempotentes e registradas pelo Supabase CLI. Reexecutar o workflow:

- não recria a tabela quando ela já existe;
- reaplica somente migrations ainda não registradas;
- atualiza `cloud-config.js` apenas quando a configuração mudou;
- testa novamente Auth, Data API e RLS.

## Diagnóstico de falhas

### Segredo ausente

O job encerra antes de fazer alterações e informa o nome do secret necessário.

### Projeto não fica saudável

A automação aguarda até dez minutos. Verifique o status no Supabase e execute novamente.

### Falha no `db push`

Normalmente indica senha incorreta, projeto pausado ou migration inválida.

### Nenhuma publishable key encontrada

Verifique se o token possui acesso às chaves de API do projeto.

### Push bloqueado na `main`

Uma regra de proteção pode impedir o commit automático. Nesse caso, permita que GitHub Actions escreva na branch ou adapte o workflow para abrir um pull request.

## Assinatura

Tehkné Solutions
