# Validação da versão 0.2

## Verificações automáticas

O workflow `Validar Commerce Radar` executa em cada pull request:

- sintaxe de `app.js`, `data.js` e `sw.js`;
- inicialização e quantidade do catálogo;
- unicidade dos IDs das oportunidades;
- ausência de IDs HTML duplicados;
- correspondência entre IDs do HTML e referências do JavaScript;
- carregamento dos arquivos de estilo e scripts esperados;
- campos obrigatórios do manifesto PWA.

## Fluxos manuais esperados

1. Filtrar o catálogo por capital e modelo.
2. Abrir uma oportunidade como análise.
3. Gerar e salvar o diagnóstico.
4. Criar um experimento a partir da análise.
5. Atualizar etapa e métricas.
6. Exportar CSV e backup JSON.
7. Recarregar a página e confirmar persistência local.

## Restrições conscientes

- Sem sincronização entre dispositivos.
- Sem dados automáticos de marketplaces.
- Sem previsão ou garantia de faturamento.
- Sem backend ou dependências pagas.

## Assinatura

Tehkné Solutions