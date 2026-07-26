# Commerce Radar — Tehkné Solutions

MVP estático para ajudar empreendedores a decidir:

1. **O que vender:** score de viabilidade, margem, risco e sinais comerciais.
2. **Onde vender:** ranking entre TikTok Shop, Mercado Livre, Shopee, Instagram/WhatsApp e loja própria.
3. **Como vender:** oferta, argumento central, ganchos de conteúdo e plano de sete dias.

## Stack da versão 0.1

- HTML semântico
- CSS responsivo
- JavaScript ES Modules
- LocalStorage
- PWA/service worker
- Nenhuma dependência, banco, login ou API paga

## Executar localmente

Não abra apenas o arquivo no navegador, porque o service worker exige HTTP.

```bash
python -m http.server 4173
```

Depois acesse `http://localhost:4173`.

## Deploy gratuito recomendado

### Cloudflare Pages

1. Envie esta pasta para um repositório GitHub.
2. No Cloudflare: **Workers & Pages > Create > Pages > Connect to Git**.
3. Framework preset: `None`.
4. Build command: deixe vazio.
5. Build output directory: `/`.
6. Publique.

Também é possível usar upload direto da pasta no Cloudflare Pages.

## Privacidade

- As análises são salvas em `localStorage` no navegador.
- Nenhum dado é transmitido para a Tehkné Solutions nesta versão.
- Limpar dados do navegador remove as análises.

## Roadmap

- v0.2: autenticação e projetos com Supabase.
- v0.3: importação de CSV e histórico de testes.
- v0.4: integrações oficiais com marketplaces.
- v1.0: inteligência de mercado e recomendações assistidas.

## Assinatura

Tehkné Solutions
