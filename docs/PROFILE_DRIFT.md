# Monitoramento pós-ativação e drift — Commerce Radar v0.6.4

A área **Monitoramento de drift** compara o desempenho dos perfis segmentados aplicados com o baseline global usando os mesmos produtos, previsões e resultados posteriores.

## Objetivo

A aplicação controlada da v0.6.3 permite que perfis segmentados alterem o ranking principal. A v0.6.4 verifica se esses perfis continuam entregando resultado melhor ou equivalente ao modelo global.

O módulo responde:

1. o perfil ativo mantém desempenho aceitável?
2. a acurácia piorou em relação ao baseline global?
3. a calibração probabilística piorou?
4. existe amostra suficiente para concluir?
5. a equipe deve manter, revisar, simular ou considerar rollback?

Nenhuma recomendação altera o ranking automaticamente.

## Casos comparáveis

O monitor usa somente linhas de snapshots controlados que:

- foram capturadas no modo **Ativo**;
- possuem um perfil aplicado;
- estão dentro da janela histórica configurada;
- têm o mesmo produto e período para os cálculos global e segmentado.

Capturas repetidas do mesmo produto, perfil e semana são deduplicadas. A versão mais recente da semana é utilizada.

## Horizonte de resultado

O horizonte padrão é de 21 dias.

Exemplo:

```text
Previsão em 1º de agosto
→ resultados observados de 2 a 22 de agosto
```

Enquanto o horizonte não termina, o caso permanece **Pendente**.

## Resultado positivo

Um caso é positivo quando, depois da previsão:

- existe teste validado; ou
- existem pelo menos três pedidos e uma auditoria lucrativa com margem líquida mínima de 8%.

## Resultado negativo

Um caso é negativo quando, depois da previsão:

- existe teste descartado sem outro teste validado; ou
- existe auditoria com prejuízo.

Sem sucesso ou falha após o fim do horizonte, o caso fica **Inconclusivo**.

## Baseline global

Para cada caso são preservados dois scores:

```text
score_controlado
score_global
```

Os dois scores são avaliados contra o mesmo resultado real. Dessa forma, mudanças no mercado, no produto ou no período afetam os dois lados da comparação.

## Métricas

### Acurácia

```text
acurácia =
verdadeiros positivos + verdadeiros negativos
÷ casos conclusivos
```

### Precisão

```text
precisão =
verdadeiros positivos
÷ previsões positivas
```

### Recall

```text
recall =
verdadeiros positivos
÷ resultados positivos
```

### Brier score

```text
Brier = média de (probabilidade prevista - resultado real)²
```

Quanto menor o Brier score, melhor a calibração probabilística.

O monitor apresenta:

```text
diferença de acurácia =
acurácia do perfil - acurácia global

diferença de Brier =
Brier do perfil - Brier global
```

## Estados

### Estável

O perfil possui amostra suficiente e não apresenta deterioração relevante contra o global.

### Atenção

O padrão inicial é:

- acurácia pelo menos 7 pontos percentuais abaixo do global; ou
- Brier pelo menos 0,04 pior.

A recomendação é revisar o perfil e comparar novamente em modo de simulação.

### Drift crítico

O padrão inicial é:

- acurácia pelo menos 15 pontos percentuais abaixo do global; ou
- Brier pelo menos 0,08 pior.

A recomendação é considerar rollback ou retorno ao global, sempre após revisão humana.

### Amostra insuficiente

O padrão exige:

```text
6 casos conclusivos
2 sucessos
2 falhas
```

Sem essa cobertura, o módulo não emite conclusão de drift.

## Janela histórica

A janela padrão é de 90 dias. Estão disponíveis:

- 30 dias;
- 60 dias;
- 90 dias;
- 180 dias.

Uma janela curta reage mais rápido, mas pode ficar instável. Uma janela longa reduz ruído, mas demora mais para detectar mudanças.

## Revisões humanas

Para cada perfil é possível registrar:

- revisão solicitada;
- recomendação de simulação;
- recomendação de rollback;
- observação textual.

Esses registros não alteram o modo atual nem executam rollback.

## Snapshots de drift

Cada diagnóstico diário preserva:

- parâmetros utilizados;
- estado geral;
- quantidade de casos conclusivos;
- perfis estáveis, em atenção ou críticos;
- métricas controladas e globais;
- diferenças de acurácia e Brier;
- recomendação por perfil.

São mantidos até 180 snapshots.

## Backup e sincronização

A versão adiciona:

```text
profileDriftSettings
profileDriftSnapshots
profileDriftReviews
```

Esses dados entram no backup JSON, restauração e workspace sincronizado. Não é necessária nova migration no Supabase.

## Proteções

- perfil e baseline usam os mesmos casos;
- amostras pequenas permanecem inconclusivas;
- resultados anteriores à previsão são ignorados;
- casos repetidos na mesma semana são deduplicados;
- drift não é tratado como prova de causalidade;
- alertas não alteram o ranking;
- rollback nunca é automático;
- o histórico permanece auditável.

## Limitações

- resultados incorretos ou incompletos geram diagnósticos incorretos;
- o score é tratado como aproximação probabilística, não probabilidade certificada;
- mudanças de mix de produtos podem alterar o resultado;
- um perfil pode piorar temporariamente por sazonalidade;
- a ferramenta não substitui experimentação controlada, análise estatística ou julgamento humano.

## Assinatura

Tehkné Solutions
