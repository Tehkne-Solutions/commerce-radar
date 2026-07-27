# Governança da alocação dos ciclos — Commerce Radar v0.7.8

## Objetivo

A área **Governança da alocação** controla como novos ciclos são distribuídos entre champion e challenger nos experimentos entre versões.

Ela reduz desequilíbrios de amostra, registra exceções e gera alertas de duração e parada. O módulo não encerra experimentos nem promove versões automaticamente.

## Distribuição recomendada

O padrão utiliza divisão 50/50.

O sistema recomenda o braço que estiver abaixo da proporção esperada depois da próxima alocação.

```text
Próximo braço recomendado =
braço com menor cobertura em relação à meta
```

## Limite de desequilíbrio

O padrão permite diferença máxima de um ciclo entre os braços.

Uma nova alocação é bloqueada quando:

```text
diferença projetada > limite configurado
```

O bloqueio pode ser superado por uma exceção formal com justificativa mínima de 20 caracteres.

## Duração

Valores padrão:

- duração mínima: 7 dias;
- duração máxima: 30 dias;
- inatividade máxima: 5 dias.

Antes da duração mínima, o painel informa que a observação ainda está incompleta.

Ao atingir a duração máxima ou o limite de inatividade, o sistema recomenda revisão humana.

## Critérios de parada

O painel pode sinalizar:

- champion superior com amostra suficiente;
- challenger superior com amostra suficiente;
- duração máxima atingida;
- inatividade;
- amostra desequilibrada;
- alteração da configuração congelada.

Esses sinais não encerram o experimento automaticamente.

## Exceções

Uma exceção registra:

- experimento;
- braço autorizado;
- justificativa;
- validade opcional;
- data da aprovação;
- assinatura da Tehkné Solutions.

A exceção não apaga o desequilíbrio. Ela apenas autoriza uma alocação específica dentro do período definido.

## Snapshots e auditoria

Cada snapshot preserva:

- total por braço;
- próximo braço recomendado;
- alertas ativos;
- data da captura.

Eventos registram atualização de política, exceção e criação de ciclo governado.

## Backup e sincronização

A versão adiciona:

```text
allocationPolicies
allocationExceptions
allocationEvents
allocationSnapshots
allocationSettings
```

Os campos entram no backup e no workspace sincronizado. Não é necessária nova migration no Supabase.

## Limitações

- Balanceamento operacional não equivale a randomização estatística.
- Produtos, canais, preços e períodos distintos podem continuar causando viés.
- Alertas de parada não substituem revisão metodológica.
- Exceções excessivas reduzem a comparabilidade entre os braços.

## Assinatura

Tehkné Solutions
