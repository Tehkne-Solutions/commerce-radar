# Commerce Radar — Tehkné Solutions

Produto web para ajudar empreendedores a decidir:

1. **O que vender:** score de viabilidade, margem, risco e sinais comerciais.
2. **Onde vender:** ranking entre TikTok Shop, Mercado Livre, Shopee, Instagram/WhatsApp e loja própria.
3. **Como vender:** oferta, argumento central, ganchos de conteúdo e plano de sete dias.

## MVP 0.1

- HTML semântico
- CSS responsivo
- JavaScript sem dependências
- LocalStorage
- PWA e funcionamento offline
- Nenhum banco, login ou API paga

## Executar localmente

O service worker exige que o projeto seja aberto por HTTP:

```bash
python -m http.server 4173
```

Depois acesse `http://localhost:4173`.

## Publicação gratuita

O repositório possui um workflow em `.github/workflows/deploy-pages.yml` que publica automaticamente cada atualização da `main` no GitHub Pages.

Endereço esperado:

```text
https://tehkne-solutions.github.io/commerce-radar/
```

Caso seja a primeira publicação do repositório, confirme uma única vez em **Settings > Pages > Source** que a fonte selecionada é **GitHub Actions**.

O workflow não executa build, não instala pacotes e publica diretamente os arquivos estáticos.

## Privacidade

- As análises são salvas em `localStorage` no navegador.
- Nenhum dado é transmitido para a Tehkné Solutions nesta versão.
- Limpar os dados do navegador remove as análises salvas.

## Roadmap

- v0.2: catálogo de oportunidades e histórico de testes.
- v0.3: autenticação e projetos compartilhados com Supabase.
- v0.4: importação de CSV e integrações oficiais com marketplaces.
- v1.0: inteligência de mercado e recomendações assistidas.

## Assinatura

Tehkné Solutions
