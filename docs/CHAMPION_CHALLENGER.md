# Champion–challenger — Commerce Radar v0.6.5

O modo **Champion–challenger** permite comparar a configuração ativa do ranking com uma configuração candidata sem alterar a operação durante o experimento.

## Conceitos

### Champion

É a configuração efetivamente utilizada no ranking no momento da criação do experimento.

Ela preserva:

- modo global ou ativo;
- perfis autorizados;
- ordem de precedência;
- hash da configuração;
- data de início.

### Challenger

É uma configuração candidata formada por:

- perfis segmentados selecionados;
- precedência própria;
- hipótese documentada.

O challenger é calculado em modo sombra e não altera o ranking operacional.

## Congelamento do baseline

Champion e challenger são congelados no início.

Caso a configuração ativa seja alterada por outra ação enquanto o experimento está em andamento, o sistema marca:

```text
Baseline alterado
```

Nesse estado, a promoção direta é bloqueada. A equipe deve reiniciar o experimento ou encerrar a comparação atual.

## Capturas em modo sombra

Cada captura registra, para os mesmos produtos:

- score do champion;
- score do challenger;
- posição no champion;
- posição no challenger;
- perfil utilizado em cada lado;
- confiança;
- data e semana da previsão.

Capturas do mesmo produto dentro da mesma semana são deduplicadas. A captura mais recente da semana é preservada.

## Resultados posteriores

O resultado utiliza a mesma regra do monitoramento de drift.

### Sucesso

- teste posterior marcado como validado; ou
- pelo menos três pedidos com auditoria posterior lucrativa e margem mínima de 8%.

### Falha

- teste posterior descartado sem outra validação; ou
- auditoria posterior com prejuízo.

### Pendente

O horizonte ainda não terminou.

### Inconclusivo

O horizonte terminou sem evidência suficiente.

Resultados anteriores à previsão são ignorados.

## Métricas

Champion e challenger são comparados com:

- acurácia;
- precisão;
- recall;
- verdadeiros positivos;
- falsos positivos;
- verdadeiros negativos;
- falsos negativos;
- Brier score.

O Brier score mede a distância entre o score previsto e o resultado real. Quanto menor, melhor.

## Requisitos mínimos

O padrão exige:

```text
6 casos conclusivos
2 sucessos
2 falhas
```

Sem essa cobertura, o resultado permanece **Amostra insuficiente**.

## Critério de vencedor

O challenger é considerado superior quando:

```text
acurácia ≥ 5 pontos percentuais acima do champion
com Brier sem piora relevante
```

ou:

```text
Brier pelo menos 0,03 melhor
sem perda relevante de acurácia
```

O champion utiliza a regra inversa. Quando nenhum lado demonstra vantagem suficiente, o resultado é **Sem vencedor**.

## Ciclo do experimento

Estados disponíveis:

- Rascunho;
- Em sombra;
- Pausado;
- Concluído;
- Promovido;
- Rejeitado.

Criar um experimento não altera o ranking. Capturar resultados também não altera a configuração ativa.

## Promoção manual

A promoção só é liberada quando:

- a amostra é suficiente;
- o challenger é classificado como superior;
- o champion ativo ainda corresponde ao baseline congelado;
- o usuário confirma explicitamente a troca.

Ao promover:

1. a configuração do challenger é enviada ao controle de perfis;
2. a ativação entra no histórico do controle;
3. o experimento passa para **Promovido**;
4. a decisão fica registrada.

Nenhuma promoção ocorre automaticamente.

## Manter o champion

A equipe pode encerrar o experimento mantendo o champion.

A decisão registra:

- experimento;
- data e hora;
- observação;
- assinatura da Tehkné Solutions.

## Proteções

- mesmos produtos para os dois lados;
- mesmos resultados e horizontes;
- baseline congelado;
- configuração candidata isolada;
- deduplicação semanal;
- amostra mínima;
- promoção manual;
- nenhuma mudança automática;
- histórico auditável.

## Backup e sincronização

A versão adiciona:

```text
championExperiments
championSnapshots
championDecisions
championSettings
```

Esses dados entram no backup JSON, restauração, sincronização e histórico versionado do workspace.

Não é necessária uma nova migration no Supabase.

## Limitações

- A comparação depende da qualidade dos resultados registrados.
- Correlação não comprova causalidade.
- Um challenger vencedor em uma janela pode perder desempenho posteriormente.
- A configuração congelada pode ficar obsoleta durante experimentos longos.
- Amostras pequenas ou muito homogêneas não sustentam promoção.
- O módulo não substitui teste estatístico independente ou decisão de negócio.

## Assinatura

Tehkné Solutions
