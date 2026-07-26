# Commerce Radar — Tehkné Solutions

Produto web para ajudar empreendedores a decidir:

1. **O que vender:** catálogo inicial, oportunidades próprias e score de viabilidade.
2. **Onde vender:** ranking entre TikTok Shop, Mercado Livre, Shopee, Instagram/WhatsApp e loja própria.
3. **Como vender:** oferta, ganchos e plano de validação.
4. **Quando continuar:** funil de experimentos com métricas e aprendizados reais.
5. **Como lançar:** metas, orçamento e checklist para hipóteses validadas.
6. **Como preservar o trabalho:** backup local e sincronização opcional entre dispositivos.

## MVP 0.3

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
- PWA e funcionamento offline preservados.

## Stack

- HTML semântico.
- CSS responsivo.
- JavaScript sem framework ou etapa de build.
- LocalStorage e Service Worker.
- Supabase Auth e Data REST API opcionais.
- PostgreSQL com RLS para isolamento de dados.
- GitHub Pages para publicação estática.

O aplicativo continua utilizável sem Supabase. Quando a nuvem não está configurada, todos os recursos locais permanecem disponíveis.

## Executar localmente

```bash
python -m http.server 4173
```

Depois acesse `http://localhost:4173`.

## Configurar sincronização com Supabase

1. Crie um projeto Supabase.
2. Execute o arquivo `docs/supabase.sql` no SQL Editor.
3. Obtenha a **Project URL** e a chave **publishable/anon**.
4. Escolha uma das formas de configuração:
   - preencha `cloud-config.js` antes do deploy; ou
   - abra **Conta e sincronização** no aplicativo e salve a configuração neste navegador.
5. Crie uma conta no Commerce Radar e envie o primeiro workspace.

Exemplo de `cloud-config.js`:

```js
window.COMMERCE_RADAR_CLOUD = {
  url: 'https://SEU-PROJETO.supabase.co',
  publishableKey: 'SUA_CHAVE_PUBLICA',
  table: 'commerce_radar_workspaces'
};
```

A chave pública pode estar no navegador. **Nunca coloque a service role no frontend.** A proteção dos registros depende das políticas RLS incluídas na migration.

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
- Quando a nuvem é ativada, o workspace é enviado ao projeto Supabase configurado.
- Cada usuário acessa somente a própria linha pela política baseada em `auth.uid()`.
- A senha é processada pelo Supabase Auth e não é armazenada pelo Commerce Radar.
- A sessão fica no navegador e é renovada com refresh token.
- A configuração local contém somente URL e chave pública.
- Limpar os dados do navegador remove a sessão e os registros locais.

## Limitações

- O catálogo é um conjunto inicial de hipóteses, não uma lista de produtos garantidos.
- Não existe coleta automática de tendências, preços ou volume de vendas.
- As métricas dos testes são inseridas manualmente.
- A sincronização usa um workspace JSON por usuário, não colaboração simultânea em tempo real.
- O score e os planos não constituem previsão financeira.

## Roadmap

- v0.3.1: painel administrativo de configuração e diagnóstico de conexão.
- v0.4: importação de CSV e integrações oficiais com marketplaces.
- v0.5: fontes de dados e atualização assistida do catálogo.
- v1.0: inteligência de mercado e recomendações assistidas.

## Assinatura

Tehkné Solutions
