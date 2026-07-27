# Calibração do ranking — Commerce Radar v0.6.1

A área **Calibração do ranking** compara recomendações anteriores com resultados comerciais registrados depois da previsão.

O objetivo é medir se o ranking está ajudando a priorizar produtos e sugerir ajustes de peso com proteção contra alterações precipitadas.

## Princípio central

O sistema separa:

1. a previsão existente em uma determinada data;
2. o resultado observado depois dessa data;
3. a avaliação de acerto ou erro;
4. a sugestão de novos pesos;
5. a decisão explícita de aplicar ou não o ajuste.

Nenhum peso é alterado automaticamente.

## Captura de previsões

A captura completa registra para cada produto:

- score;
- confiança;
- classificação;
- componentes de mercado, validação, economia, prontidão, atualidade e evidência;
- pesos utilizados;
- evidência mais recente;
- data e semana da previsão.

O módulo captura uma previsão por dia e utiliza uma observação por produto em cada coorte semanal para reduzir duplicação excessiva.

## Horizonte de resultado

O horizonte padrão é de **21 dias**.

Somente eventos posteriores à previsão e dentro do horizonte entram no resultado:

```text
previsão em 01/08
→ eventos de 02/08 até 22/08
```

Eventos anteriores não podem ser usados para declarar que a previsão acertou.

## Resultado positivo

Uma previsão recebe resultado positivo quando ocorre pelo menos uma destas condições:

- existe teste marcado como validado; ou
- o produto atinge o mínimo de pedidos configurado e possui auditoria lucrativa com margem líquida mínima.

Valores padrão:

```text
Pedidos mínimos: 3
Margem líquida mínima: 8%
```

## Resultado negativo

Uma previsão recebe resultado negativo quando não houve resultado positivo e ocorre uma destas condições:

- existe teste descartado; ou
- a auditoria posterior registra prejuízo.

## Resultado inconclusivo

Um caso é inconclusivo quando o horizonte terminou, mas não existem evidências suficientes para declarar sucesso ou falha.

Casos inconclusivos não entram na matriz de acertos.

## Resultado pendente

Um caso permanece pendente enquanto o horizonte de observação ainda não terminou.

## Classificação da previsão

São consideradas previsões positivas:

- **Priorizar**;
- **Testar agora**;
- ou score igual ou superior ao limite configurado.

O limite padrão é 64 pontos.

As demais classificações representam uma previsão de cautela.

## Matriz de acertos

O módulo calcula:

- verdadeiro positivo: recomendou avanço e houve sucesso;
- falso positivo: recomendou avanço e houve falha;
- verdadeiro negativo: recomendou cautela e houve falha;
- falso negativo: recomendou cautela e houve sucesso.

## Métricas

### Acurácia

```text
verdadeiros positivos + verdadeiros negativos
÷
total de resultados conclusivos
```

### Precisão

```text
verdadeiros positivos
÷
todas as previsões positivas
```

A precisão responde: quando o sistema recomendou avanço, com que frequência houve sucesso?

### Recall

```text
verdadeiros positivos
÷
todos os sucessos observados
```

O recall responde: entre as oportunidades que deram certo, quantas o sistema identificou?

### Brier score

O Brier score compara o score convertido em probabilidade com o resultado binário observado.

Quanto menor o valor, melhor a calibração probabilística.

## Sugestão de pesos

Para cada componente, o sistema compara:

```text
média do componente nos sucessos
-
média do componente nas falhas
```

Uma diferença positiva indica que o componente ajudou a separar sucessos de falhas na amostra.

Uma diferença negativa indica que pontuações maiores naquele componente apareceram mais nas falhas do que nos sucessos.

## Proteções da calibração

A sugestão só fica disponível quando existem:

- pelo menos 8 casos conclusivos;
- pelo menos 2 sucessos;
- pelo menos 2 falhas;
- componentes históricos completos;
- alguma diferença mensurável entre sucesso e falha.

O limite de alteração padrão é de **15% do peso atual por rodada**.

Exemplo:

```text
Peso atual de mercado: 24%
Alteração máxima por rodada: 15%
Faixa bruta permitida: aproximadamente 20,4% a 27,6%
```

Depois do ajuste, os pesos são normalizados para totalizar 100%.

## Aplicação e reversão

Ao aplicar uma sugestão, o sistema registra:

- data;
- tamanho da amostra;
- métricas da rodada;
- pesos anteriores;
- pesos aplicados;
- assinatura da Tehkné Solutions.

A ação **Restaurar pesos anteriores** reverte a última calibração aplicada.

## Histórico

São mantidas até 50 rodadas de calibração.

Cada rodada mostra:

- amostra utilizada;
- acurácia;
- alteração de cada peso;
- indicação de reversão.

## Backup e sincronização

A versão adiciona:

```text
calibrationSettings
calibrationPredictions
calibrationRuns
```

Esses dados entram no backup JSON, restauração e workspace sincronizado.

Não é necessária uma nova migration no Supabase porque o workspace continua armazenado como JSON versionado.

## Limitações

- Correlação histórica não prova causalidade.
- Resultados dependem da qualidade dos registros de teste e auditoria.
- Alterar a etapa de um teste sem data confiável pode reduzir a precisão temporal.
- Coortes semanais ainda podem compartilhar parte do mesmo período comercial.
- Uma amostra pequena pode parecer precisa por acaso.
- Mudanças de mercado podem tornar uma calibração antiga menos útil.
- Produtos diferentes podem exigir modelos específicos no futuro.
- A calibração não garante venda, lucro, recorrência ou liquidez.
- A ferramenta não substitui análise estatística independente, contabilidade ou decisão empresarial.

## Assinatura

Tehkné Solutions
