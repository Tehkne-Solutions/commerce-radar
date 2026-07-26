# Fila de atualização de fontes — Commerce Radar v0.5.1

A fila organiza a manutenção dos sinais cadastrados no Radar de tendências. Ela não busca dados automaticamente e não altera uma evidência sem ação explícita do usuário.

## Objetivo

Evitar que decisões sejam tomadas com fontes vencidas, contraditórias ou esquecidas. Cada sinal recebe uma posição na fila conforme urgência, prioridade e qualidade da evidência.

## Prioridade da fila

A ordenação considera:

- sinal vencido;
- revisão atrasada;
- vencimento em até 3, 7 ou 15 dias;
- prioridade manual alta, média ou baixa;
- contradição entre fontes do mesmo tema;
- baixa confiança do sinal;
- estado revisado ou adiado.

O score da fila indica urgência de revisão. Ele não substitui o score comercial da tendência.

## Estados

- **Pendente:** fonte ainda precisa ser revisada.
- **Em revisão:** revisão iniciada pelo responsável.
- **Revisado:** evidência conferida e validade atualizada.
- **Adiado:** próxima revisão deslocada sem alterar a evidência original.

## Revisão individual

Ao revisar uma fonte, o usuário pode atualizar:

- data da observação;
- validade em dias;
- prioridade;
- evidência;
- nota da revisão.

A alteração cria uma entrada no histórico com os valores anteriores e posteriores.

## Revisão em lote

A fila permite selecionar várias fontes e:

- marcar revisão na data atual;
- aplicar prioridade alta;
- adiar a próxima revisão por sete dias.

A revisão em lote preserva uma trilha de auditoria para cada sinal.

## Histórico por sinal

O histórico registra:

- data e hora;
- ação executada;
- nota da revisão;
- campos modificados;
- snapshot do sinal após a ação.

As alterações não apagam versões anteriores do histórico.

## Vencimentos próximos

A classificação utilizada é:

- vencido;
- revisão atrasada;
- até 3 dias;
- até 7 dias;
- até 15 dias;
- em dia.

O usuário pode filtrar por prazo, estado e prioridade.

## Backup e sincronização

A versão 0.5.1 adiciona:

```text
trendReviewQueue
trendSignalHistory
trendQueueSettings
```

Esses campos entram no backup JSON e no workspace sincronizado. Nenhuma migration adicional do Supabase é necessária.

## Privacidade

- Nenhuma fonte é consultada automaticamente.
- URLs, evidências e históricos ficam no dispositivo ou no workspace do usuário.
- A fila não envia dados a terceiros.
- O histórico não deve ser tratado como prova contábil, jurídica ou comercial.

## Limitações

- Revisar uma fonte não comprova que a informação está correta.
- Adiar uma revisão não renova a validade da evidência.
- A prioridade depende da configuração e da qualidade dos dados cadastrados.
- Tendências continuam sendo hipóteses até validação comercial real.

## Assinatura

Tehkné Solutions
