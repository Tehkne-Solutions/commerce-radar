# Commerce Radar — Tehkné Solutions

Produto web para ajudar empreendedores a decidir:

1. **O que vender:** catálogo inicial, oportunidades próprias e score de viabilidade.
2. **Onde vender:** ranking entre TikTok Shop, Mercado Livre, Shopee, Instagram/WhatsApp e loja própria.
3. **Como vender:** oferta, ganchos e plano de validação.
4. **Quando continuar:** funil de experimentos com métricas e aprendizados reais.
5. **Como lançar:** metas, orçamento e checklist para hipóteses validadas.
6. **Como preservar o trabalho:** backup local e sincronização opcional entre dispositivos.

## MVP 0.3.1

- Radar com 20 oportunidades iniciais.
- Cadastro, edição e exclusão de oportunidades próprias.
- Filtros por categoria, capital e modelo operacional.
- Diagnóstico com margem, capital, canais e plano de sete dias.
- Portfólio de análises comparáveis.
- Kanban de testes: ideia, pesquisa, conteúdo, conversão, validado e descartado.
- Registro manual de visualizações, cliques, pedidos, investimento e receita.
- Geração de plano de lançamento a partir de teste validado.
- Backup completo em JSON e restauração por mesclagem ou substituição.
- Conta opcional com e-mail e senha.
- Sincronização manual por envio, substituição ou mesclagem.
- Sincronização automática opcional após alterações locais.
- Sessão persistente com renovação de token.
- Workspace isolado por usuário com Row Level Security.
- Provisionamento automatizado do Supabase por GitHub Actions.
- Criação de conta e primeiro envio em uma ação guiada.
- PWA e funcionamento offline preservados.

## Stack

- HTML semântico.
- CSS responsivo.
- JavaScript sem framework ou etapa de build.
- LocalStorage e Service Worker.
- Supabase Auth e Data REST API opcionais.
- PostgreSQL com RLS para isolamento de dados.
- Supabase CLI e Management API para provisionamento.
- GitHub Actions e GitHub Pages.

O aplicativo continua utilizável sem Supabase. Quando a nuvem não está configurada, todos os recursos locais permanecem disponíveis.

## Executar localmente

```bash
python -m http.server 4173
```

Depois acesse `http://localhost:4173`.

## Ativação automatizada recomendada

A automação pode usar um projeto Supabase existente ou criar um novo, aplicar migrations e RLS, obter a chave pública, gerar `cloud-config.js`, testar a conexão e publicar a configuração.

### Preparação única

Adicione estes GitHub Actions secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

Depois execute:

`Actions > Provisionar Supabase > Run workflow`

O workflow `.github/workflows/provision-supabase.yml`:

1. resolve ou cria o projeto;
2. aguarda os serviços ficarem saudáveis;
3. executa `supabase db push`;
4. verifica Auth, Data API e RLS;
5. gera e versiona a configuração pública;
6. aciona o deploy da `main`.

Documentação completa: [`docs/AUTOMATED_ACTIVATION.md`](docs/AUTOMATED_ACTIVATION.md).

## Primeira conta e primeiro envio

Depois da publicação:

1. abra **Conta e sincronização**;
2. informe e-mail e senha;
3. clique em **Criar conta e ativar agora**.

Quando o Supabase entrega a sessão imediatamente, o workspace é enviado no mesmo fluxo. Quando a confirmação por e-mail está habilitada, o aplicativo conclui o envio depois da confirmação e do primeiro login.

## Configuração manual alternativa

1. Crie um projeto Supabase.
2. Execute `docs/supabase.sql` no SQL Editor.
3. Obtenha a **Project URL** e a chave **publishable/anon**.
4. Preencha `cloud-config.js` ou salve a configuração na tela **Conta e sincronização**.
5. Crie uma conta e envie o primeiro workspace.

Exemplo:

```js
window.COMMERCE_RADAR_CLOUD = {
  url: 'https://SEU-PROJETO.supabase.co',
  publishableKey: 'SUA_CHAVE_PUBLICA',
  table: 'commerce_radar_workspaces'
};
```

A chave pública pode estar no navegador. **Nunca coloque a service role no frontend.** A proteção dos registros depende das políticas RLS.

## Estratégias de sincronização

- **Enviar este dispositivo:** grava o estado local na nuvem.
- **Substituir pelo conteúdo da nuvem:** troca os dados do navegador pelos dados remotos.
- **Mesclar:** reúne registros locais e remotos pelo identificador e envia o resultado novamente.
- **Automática:** agenda um envio após mudanças em análises, testes, oportunidades próprias ou planos.

Antes da primeira substituição, exporte um backup JSON.

## Publicação gratuita

O workflow `.github/workflows/deploy-pages.yml` publica automaticamente cada atualização da `main` no GitHub Pages.

```text
https://tehkne-solutions.github.io/commerce-radar/
```

## Privacidade e segurança

- O modo local não transmite dados.
- O PAT do Supabase e a senha do banco ficam somente nos GitHub Secrets.
- A configuração publicada contém apenas URL e publishable key.
- Cada usuário acessa somente a própria linha pela política baseada em `auth.uid()`.
- A senha do usuário é processada pelo Supabase Auth.
- A sessão fica no navegador e é renovada com refresh token.
- A substituição integral dos dados exige confirmação.
- Limpar os dados do navegador remove a sessão e os registros locais.

## Limitações

- O catálogo é um conjunto inicial de hipóteses, não uma lista de produtos garantidos.
- Não existe coleta automática de tendências, preços ou volume de vendas.
- As métricas dos testes são inseridas manualmente.
- A sincronização usa um workspace JSON por usuário, não colaboração simultânea em tempo real.
- A criação automática de projeto depende do limite e das permissões da organização Supabase.
- O score e os planos não constituem previsão financeira.

## Roadmap

- v0.3.2: diagnóstico administrativo de conexão, Auth, tabela e políticas.
- v0.4: importação de CSV e integrações oficiais com marketplaces.
- v0.5: fontes de dados e atualização assistida do catálogo.
- v1.0: inteligência de mercado e recomendações assistidas.

## Assinatura

Tehkné Solutions
