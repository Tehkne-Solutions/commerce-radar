# Retrospectiva e comparação entre ciclos — Commerce Radar v0.7.3

A área **Retrospectiva de ciclos** transforma planos concluídos, check-ins e alterações de oferta em uma visão comparável de aprendizado operacional.

## Objetivo

O módulo responde:

1. Quais ciclos apresentaram melhor resultado observado?
2. Quais produtos e canais tiveram desempenho mais consistente?
3. Quais tipos de otimização apareceram associados a melhorias?
4. O que a equipe concluiu que funcionou, falhou e deve ser testado depois?

O sistema separa resultados calculados de interpretações humanas. Correlação temporal não é apresentada como causalidade.

## Ciclos elegíveis

Por padrão, entram na comparação:

- planos com decisão humana registrada;
- planos cujo período terminou;
- planos ativos somente quando a configuração `includeActive` estiver habilitada.

Planos sem dados permanecem com componentes zerados, em vez de receber estimativas positivas.

## Score do ciclo

O score de 0 a 100 utiliza:

```text
Engajamento: 20 pontos
Validação por pedidos: 30 pontos
Economia: 25 pontos
Execução e evidências: 15 pontos
Decisão humana registrada: 10 pontos
```

### Engajamento

Compara visualizações e cliques reais com as metas do ciclo.

### Validação

Compara pedidos reais com a meta de pedidos.

### Economia

Considera lucro preliminar positivo e margem em relação ao limite informado.

### Execução

Considera tarefas concluídas e check-ins com evidência objetiva.

### Decisão

Reconhece a existência da decisão humana, sem avaliar se ela foi correta.

O score organiza ciclos. Ele não comprova repetibilidade, escala ou causalidade.

## Resultado observado

Os ciclos recebem uma classificação:

- **Validado:** decisão de continuar acompanhada de pedidos e lucro preliminar positivo.
- **Parcial:** decisão de ajustar ou existência de pedidos sem validação completa.
- **Descartado:** decisão de abandonar ou ciclo encerrado sem pedidos.
- **Inconclusivo:** dados insuficientes para outra classificação.

## Comparação por produto

Produtos são consolidados por nome e apresentam:

- quantidade de ciclos;
- score médio;
- pedidos;
- receita;
- lucro preliminar;
- margem consolidada;
- taxa de validação.

Vários ciclos do mesmo produto permanecem separados no ranking e juntos no consolidado.

## Comparação por canal

Os canais usam os mesmos indicadores. Essa comparação ajuda a localizar onde a operação teve melhor histórico observado, mas não neutraliza diferenças de público, orçamento, sazonalidade, preço ou maturidade.

## Padrões de otimização

Mudanças registradas no acompanhamento diário são agrupadas por elemento:

- título ou gancho;
- preço;
- imagem ou criativo;
- público;
- oferta;
- descrição;
- frete ou prazo;
- canal ou posicionamento;
- outro.

Somente mudanças com check-in anterior e posterior entram na comparação.

O painel calcula:

- quantidade de comparações;
- percentual de comparações positivas;
- variação média de pedidos;
- variação média de lucro;
- variação média de CTR;
- variação média de conversão.

Uma comparação positiva possui aumento de pedidos ou lucro preliminar. Isso representa associação temporal, não efeito causal comprovado.

## Retrospectiva humana

Cada ciclo pode registrar:

- o que funcionou;
- o que não funcionou;
- próxima hipótese;
- observação adicional;
- etiquetas opcionais.

Os três campos principais exigem conteúdo mínimo. A retrospectiva não altera o score calculado.

## Snapshots

O botão **Capturar comparação** registra diariamente:

- posição dos ciclos;
- produto e canal;
- score;
- resultado;
- pedidos;
- lucro;
- margem;
- melhores produtos;
- melhores canais.

São mantidos até 365 snapshots por padrão.

## Relatório

A exportação Markdown inclui:

- ranking de ciclos;
- comparação por produto;
- comparação por canal;
- padrões de otimização;
- retrospectivas humanas;
- limitações metodológicas;
- assinatura da Tehkné Solutions.

## Backup e sincronização

A versão adiciona:

```text
cycleRetrospectives
cycleComparisonSnapshots
cycleRetrospectiveSettings
```

Esses campos entram no backup JSON, restauração e workspace sincronizado. Não é necessária uma nova migration no Supabase.

## Limitações

- Ciclos diferentes podem ter públicos, preços e investimentos incompatíveis.
- Resultados manuais podem conter erros.
- Uma semana pode ser curta para determinados ciclos de compra.
- Comparações antes/depois não isolam todas as variáveis.
- Lucro e margem são preliminares até auditoria financeira.
- Score alto não garante repetibilidade ou escala.
- Aprendizados humanos dependem da qualidade da análise registrada.

## Assinatura

Tehkné Solutions
