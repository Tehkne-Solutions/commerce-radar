# Estratificação dos ciclos

A v0.7.9 adiciona uma camada observacional sobre os experimentos Champion × Challenger para reduzir vieses de produto, categoria, canal, região, preço, orçamento e maturidade da evidência.

## Classificação automática

Cada alocação recebe um estrato composto por produto, categoria, canal, região, faixa de preço, faixa de orçamento e maturidade da evidência. Aplicações antigas são classificadas sob demanda sem alterar seus resultados.

## Cobertura

Um estrato é considerado completo quando possui a amostra mínima nos dois braços. O painel mostra estratos completos, ausência de Champion, ausência de Challenger e cobertura percentual.

## Alertas de viés

O sistema sinaliza canais presentes em apenas um braço e estratos sem cobertura equivalente. Os alertas reduzem o índice de representatividade, mas não encerram experimentos.

## Representatividade

A classificação Excelente, Boa, Moderada, Baixa ou Insuficiente combina cobertura, diversidade, tamanho da amostra e alertas ativos. Trata-se de um indicador operacional, não de significância estatística.

## Recomendação por estrato

A recomendação escolhe o estrato com maior diferença entre braços e indica Champion ou Challenger para reduzir o desequilíbrio. Quando não existem ciclos, reutiliza a recomendação da governança de alocação.

## Histórico

Reclassificações manuais preservam estrato anterior, novo estrato, motivo, responsável, data e assinatura Tehkné Solutions.

## Backup e sincronização

As chaves `experimentStrata`, `strataHistory`, `strataRecommendations`, `strataSnapshots` e `strataSettings` entram no workspace sincronizado e no backup dinâmico. Não há nova migration no Supabase.

## Limitações

Estratificação reduz vieses observacionais, mas não substitui randomização estatística. Promoção, manutenção e encerramento continuam sendo decisões humanas.