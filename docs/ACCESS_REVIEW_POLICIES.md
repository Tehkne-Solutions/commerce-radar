# Políticas e revisão de acesso — Commerce Radar v0.6.9

A área **Revisão de acessos** complementa a identidade local da v0.6.8 com validade de contas, revogação de sessões, revisão periódica e identificação de privilégios elevados.

## Objetivos

O módulo responde:

1. Quais contas já expiraram?
2. Quais usuários não acessam o workspace há muito tempo?
3. Quais revisões periódicas estão vencidas?
4. Quais perfis concentram permissões privilegiadas?
5. Quais sessões precisam ser revogadas?
6. Qual decisão humana foi tomada para cada acesso?

## Políticas configuráveis

Valores iniciais:

```text
Revisão periódica: 90 dias
Inatividade: 60 dias
Validade padrão da conta: 365 dias
Limite de permissões privilegiadas: 4
Retenção de snapshots: 365 dias
```

Os limites são operacionais e podem ser alterados por um usuário com `identity.manage`.

## Validade da conta

Usuários novos recebem uma data de validade padrão. O administrador interno inicial permanece sem expiração automática para reduzir o risco de bloqueio completo do workspace.

Quando a validade termina:

- novos logins são bloqueados;
- uma sessão existente é encerrada na próxima validação;
- a conta aparece como risco crítico;
- a renovação exige uma decisão registrada.

Renovar uma conta não altera automaticamente seu perfil.

## Revogação de sessões

Cada usuário possui uma versão de sessão:

```text
usuário.sessionVersion = 1
sessão.accessVersion = 1
```

Ao revogar:

```text
usuário.sessionVersion = 2
```

Sessões com versão anterior deixam de ser válidas. No dispositivo atual o encerramento é imediato. Em outros dispositivos, a revogação depende da próxima sincronização do workspace e da validação local.

A nova autenticação grava a versão atual na sessão.

## Inatividade

A inatividade usa o último login registrado. Quando não existe login, utiliza a data de criação da conta.

A conta é sinalizada quando:

```text
dias sem atividade >= limite configurado
```

A sinalização não desativa o usuário automaticamente.

## Permissões privilegiadas

São consideradas privilegiadas:

```text
identity.manage
profiles.manage
governance.manage
decision.approve
decision.execute
matrix.manage
exception.approve
audit.capture
audit.export
```

O perfil Administrador é tratado como privilegiado por possuir `*`.

Uma conta aparece como excessivamente privilegiada quando alcança o limite configurado. O diagnóstico não prova excesso real: contexto, responsabilidade e necessidade operacional precisam ser avaliados por uma pessoa autorizada.

## Revisão periódica

Cada conta possui:

```text
lastAccessReviewAt
nextAccessReviewAt
```

Decisões disponíveis:

- **keep** — manter o acesso atual;
- **reduce** — trocar para um perfil de menor alcance;
- **deactivate** — desativar a conta e revogar sessões;
- **renew** — renovar a validade da conta.

Toda decisão exige justificativa e registra:

- conta revisada;
- perfil anterior e posterior;
- situação anterior e posterior;
- achados que motivaram a revisão;
- revisor autenticado;
- data;
- próxima revisão;
- assinatura da Tehkné Solutions.

## Riscos

Estados apresentados:

- **critical** — conta expirada;
- **high** — revisão vencida ou combinação de inatividade e privilégio;
- **medium** — inatividade, privilégio elevado ou revisão próxima;
- **low** — nenhum alerta relevante.

## Snapshots

O snapshot diário registra:

- usuários cadastrados e ativos;
- contas expiradas;
- contas inativas;
- revisões vencidas;
- contas privilegiadas;
- risco e achados de cada usuário.

São mantidos até 365 snapshots por padrão.

## Relatório

A exportação Markdown apresenta:

- resumo das políticas;
- contas e riscos;
- validade e próxima revisão;
- privilégios;
- revisões recentes;
- limitações;
- assinatura da Tehkné Solutions.

## Backup e sincronização

A versão adiciona:

```text
accessPolicySettings
accessReviews
accessReviewSnapshots
```

Esses dados entram no workspace sincronizado e no backup dinâmico. A sessão continua somente no `sessionStorage` e nunca é copiada para backup ou nuvem.

Não é necessária nova migration no Supabase.

## Proteção das ações críticas

Além do gate da v0.6.8, ações de governança, aprovação, execução, matriz e auditoria verificam:

```text
sessão existente
+ conta ativa
+ conta dentro da validade
+ versão de sessão atual
+ permissão do perfil
+ correspondência com o papel designado
```

## Limitações

- A revogação em outro dispositivo depende da sincronização seguinte.
- A identidade permanece local ao workspace.
- Não existe SSO, MFA, IAM corporativo ou diretório central.
- O hash do PIN protege contra armazenamento em texto aberto, mas não substitui autenticação forte.
- A análise de privilégio usa permissões declaradas e não conhece o contexto organizacional completo.
- Nenhuma redução de permissão é aplicada automaticamente.
- Os logs continuam editáveis por quem controla o armazenamento local do navegador.

## Assinatura

Tehkné Solutions
