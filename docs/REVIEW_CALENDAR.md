# Calendário de revisões e alertas

## Objetivo

A versão 0.5.2 transforma os prazos da Fila de fontes em uma agenda operacional. O módulo não cria uma segunda fonte de verdade: ele usa os mesmos metadados de revisão já existentes.

```text
nextReviewAt
→ quando definido, é a data principal da agenda

expiresAt
→ usado quando não existe um reagendamento manual
```

## Responsáveis

Cada responsável possui:

- nome;
- e-mail opcional;
- função;
- estado ativo ou inativo.

A atribuição é gravada no campo `owner` do metadado da fila. Responsáveis inativos permanecem visíveis em registros antigos, mas deixam de aparecer como opção para novas atribuições.

## Calendário mensal e semanal

A visão mensal apresenta uma grade de 42 dias iniciada na segunda-feira. A visão semanal apresenta sete dias e amplia a capacidade de eventos por coluna.

Cada evento contém:

- produto ou tema;
- fonte;
- responsável;
- prioridade;
- estado da revisão;
- situação do prazo;
- presença de contradição.

O calendário pode ser filtrado por responsável ou por fontes sem atribuição.

## Reagendamento

Ao abrir um evento, o usuário pode alterar:

- próxima revisão;
- responsável;
- prioridade;
- estado;
- nota da alteração.

A alteração é registrada no histórico da fonte com os valores anteriores e posteriores. O reagendamento não modifica a data de observação nem renova automaticamente a validade comercial da evidência.

## Alertas dentro do aplicativo

O centro de alertas considera:

- revisões atrasadas;
- revisões previstas para hoje;
- revisões dentro do horizonte configurado;
- fontes sem responsável nos próximos 15 dias;
- contradições próximas do prazo.

O horizonte pode variar de 1 a 30 dias. Um alerta dispensado fica oculto somente no dia corrente; a fonte continua no calendário e volta a aparecer quando aplicável.

## Notificações do navegador

As notificações são opcionais e dependem da permissão do navegador. Elas são emitidas somente enquanto o Commerce Radar é aberto ou inicializado; não existe push remoto, cron ou rastreamento em segundo plano.

No máximo um resumo é mostrado por dia no dispositivo.

## Backup e sincronização

A versão adiciona:

```text
trendOwners
trendCalendarSettings
trendAlertState
```

Os dados entram no backup JSON e no workspace sincronizado. Não é necessária nova migration no Supabase, pois o estado continua armazenado no JSON versionado.

## Privacidade

- E-mails de responsáveis são opcionais.
- Nenhum e-mail é enviado automaticamente.
- Nenhum calendário externo é acessado.
- Alertas e notificações são processados localmente.
- O navegador só recebe notificações após consentimento explícito.

## Limitações

- A agenda não confirma que a fonte foi realmente revisada.
- Adiar ou reagendar não torna uma evidência atual.
- Notificações do navegador não funcionam quando o aplicativo está totalmente fechado.
- O módulo não substitui Google Calendar, gestão de projetos ou automações corporativas.

## Assinatura

Tehkné Solutions
