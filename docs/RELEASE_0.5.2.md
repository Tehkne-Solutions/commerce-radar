# Release 0.5.2 — Responsáveis, calendário e alertas

## Entrega

- cadastro e edição de responsáveis;
- atribuição por fonte;
- calendário mensal e semanal;
- reagendamento de revisão;
- filtro por responsável;
- centro de alertas no aplicativo;
- notificações locais opcionais;
- trilha de alterações de responsável e prazo;
- backup e sincronização dos novos dados;
- cache offline atualizado.

## Compatibilidade

- sem nova migration no Supabase;
- dados antigos permanecem válidos;
- a Fila de fontes continua sendo a origem dos metadados;
- o calendário usa `nextReviewAt` ou `expiresAt`;
- notificações dependem da permissão do navegador.

## Validação

A release possui workflow dedicado para sintaxe, agenda mensal/semanal, responsáveis, alertas, histórico, backup, nuvem e PWA.

## Assinatura

Tehkné Solutions
