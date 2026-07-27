# Qualidade e confiança da evidência

A v0.8.0 consolida a força operacional de cada experimento sem apresentar o resultado como probabilidade estatística ou causalidade.

## Componentes

- **Amostra:** considera ciclos concluídos no total e por braço.
- **Cobertura:** reaproveita a cobertura dos estratos da v0.7.9.
- **Representatividade:** usa diversidade, equilíbrio e alertas observacionais.
- **Estabilidade:** mede a dispersão dos resultados financeiros comparáveis.
- **Integridade:** cai para zero quando Champion ou Challenger mudou depois do congelamento.

## Penalidades por viés

Alertas de estratificação, desequilíbrio entre braços e amostra insuficiente reduzem a pontuação final. Cada penalidade permanece visível no relatório.

## Níveis

- Muito alta: 85–100
- Alta: 70–84,9
- Moderada: 50–69,9
- Baixa: 30–49,9
- Insuficiente: abaixo de 30

## Revisão humana

O índice orienta a revisão, mas não promove, mantém ou encerra experimentos automaticamente. Revisões formais exigem justificativa e confirmação `REVISAR`.

## Snapshots e relatório

Snapshots preservam pontuação, nível, penalidade e vencedor observado. O relatório Markdown detalha todos os componentes e limitações.

## Backup e sincronização

As chaves `evidenceAssessments`, `evidenceReviews`, `evidenceSnapshots` e `evidenceSettings` são registradas no workspace sincronizado. Não é necessária nova migration no Supabase.

## Limitações

A confiança é um índice operacional explicável. Ela não substitui randomização, significância estatística, análise causal ou julgamento humano.

**Assinatura:** Tehkné Solutions