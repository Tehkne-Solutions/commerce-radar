# Commerce Radar — Tehkné Solutions

Produto web para ajudar empreendedores a decidir:

1. **O que vender:** catálogo inicial, oportunidades próprias e score de viabilidade.
2. **Onde vender:** ranking entre TikTok Shop, Mercado Livre, Shopee, Instagram/WhatsApp e loja própria.
3. **Como vender:** oferta, ganchos e plano de validação.
4. **Quando continuar:** funil de experimentos com métricas e aprendizados reais.
5. **Como lançar:** metas, orçamento e checklist para hipóteses validadas.

## MVP 0.2.1

- Radar com 20 oportunidades iniciais.
- Cadastro, edição e exclusão de oportunidades próprias.
- Filtros por categoria, capital e modelo operacional.
- Comparação da atratividade média dos nichos.
- Diagnóstico com margem, capital, canais e plano de sete dias.
- Portfólio de análises comparáveis.
- Kanban de testes: ideia, pesquisa, conteúdo, conversão, validado e descartado.
- Registro manual de visualizações, cliques, pedidos, investimento e receita.
- Geração de plano de lançamento a partir de teste validado.
- Metas de pedidos e receita, orçamento, início, status e checklist.
- Exportação das análises, testes e planos em CSV.
- Exportação individual de plano em Markdown.
- Backup completo em JSON e restauração por mesclagem ou substituição.
- Migração das análises salvas no MVP 0.1 e compatibilidade com a v0.2.
- PWA e funcionamento offline.

## Stack

- HTML semântico.
- CSS responsivo.
- JavaScript sem dependências.
- LocalStorage.
- Service Worker.
- Nenhum banco, login ou API paga.

## Executar localmente

O service worker exige que o projeto seja aberto por HTTP:

```bash
python -m http.server 4173
```

Depois acesse `http://localhost:4173`.

## Publicação gratuita

O workflow `.github/workflows/deploy-pages.yml` publica automaticamente cada atualização da `main` no GitHub Pages.

```text
https://tehkne-solutions.github.io/commerce-radar/
```

Caso seja a primeira publicação, confirme em **Settings > Pages > Source** que a fonte selecionada é **GitHub Actions**.

## Privacidade e backup

- Análises, testes, oportunidades próprias e planos ficam no navegador.
- Nenhum dado é transmitido para a Tehkné Solutions nesta versão.
- Limpar os dados do navegador remove os registros locais.
- **Exportar backup** gera um arquivo JSON completo.
- **Restaurar backup** permite mesclar os registros ou substituir o dispositivo atual.
- Antes de usar a opção de substituição, conserve uma cópia do backup atual.

## Limitações

- O catálogo é um conjunto inicial de hipóteses, não uma lista de produtos garantidos.
- Não existe coleta automática de tendências, preços ou volume de vendas.
- As métricas dos testes são inseridas manualmente.
- O score e os planos não constituem previsão financeira.

## Roadmap

- v0.3: autenticação e projetos compartilhados com Supabase.
- v0.4: importação de CSV e integrações oficiais com marketplaces.
- v0.5: fontes de dados e atualização assistida do catálogo.
- v1.0: inteligência de mercado e recomendações assistidas.

## Assinatura

Tehkné Solutions
