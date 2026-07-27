# Identidade local e perfis de acesso — Commerce Radar v0.6.8

A área **Identidade e acesso** associa ações críticas do Commerce Radar a usuários operacionais cadastrados no próprio workspace.

O objetivo é reduzir registros anônimos e impedir que qualquer pessoa com acesso ao navegador aprove, execute ou altere controles sem possuir uma sessão e a permissão correspondente.

## Primeiro acesso

Quando o workspace ainda não possui usuários, o sistema permite criar um primeiro administrador local.

São informados:

- nome;
- e-mail opcional;
- PIN;
- perfil Administrador.

O primeiro administrador é autenticado automaticamente após a criação.

Depois que existe pelo menos um usuário, novas contas somente podem ser criadas por uma sessão com a permissão `identity.manage`.

## Proteção do PIN

O PIN precisa ter entre 4 e 32 caracteres.

O valor não é salvo em texto aberto. O sistema gera:

```text
salt individual
+
PIN informado
→ SHA-256
→ hash armazenado
```

O backup e a sincronização contêm somente o salt e o hash.

Essa proteção reduz a exposição direta do PIN, mas não transforma o navegador em um provedor corporativo de identidade.

## Sessão local

A sessão contém:

- identificador da sessão;
- usuário autenticado;
- início;
- última atividade registrada;
- expiração.

O prazo padrão é de oito horas e pode ser configurado entre 5 minutos e 24 horas.

A sessão fica em `sessionStorage` e não entra no:

- backup JSON;
- workspace sincronizado;
- histórico da nuvem;
- outro dispositivo.

Ao restaurar um backup, a sessão atual é encerrada.

## Bloqueio por tentativas

Depois de cinco tentativas de PIN inválidas, o usuário é bloqueado durante cinco minutos.

Os valores padrão podem ser alterados:

```text
maximumFailedAttempts
lockMinutes
sessionMinutes
```

Falhas, bloqueios, logins e encerramentos de sessão entram na trilha de identidade.

## Perfis iniciais

### Administrador

Possui todas as permissões e administra usuários e perfis.

### Gestor

Configura governança, opera experimentos e solicita decisões.

### Operador

Opera experimentos, registra dados e solicita decisões quando é o operador designado.

### Aprovador

Aprova ou rejeita uma solicitação quando seu nome corresponde ao aprovador esperado da etapa.

### Executor

Executa uma decisão aprovada quando seu nome corresponde ao executor cadastrado na matriz.

### Auditor

Administra matriz, exceções, snapshots e relatórios de auditoria.

### Leitor

Possui acesso somente para consulta aos módulos autorizados.

## Perfis personalizados

Um administrador pode criar perfis com qualquer combinação das permissões disponíveis:

```text
workspace.view
identity.manage
profiles.manage
experiment.operate
governance.manage
decision.request
decision.approve
decision.execute
matrix.view
matrix.manage
exception.approve
audit.view
audit.capture
audit.export
recommendations.view
imports.manage
finance.view
```

Perfis internos não podem ser sobrescritos por um perfil personalizado.

## Dupla verificação das ações

Uma ação crítica precisa satisfazer dois controles.

### Permissão do perfil

Exemplo:

```text
Perfil Executor
→ possui decision.execute
```

### Correspondência com o papel do experimento

Exemplo:

```text
Sessão atual: Diego Executor
Executor da matriz: Diego Executor
→ execução permitida
```

```text
Sessão atual: Administrador Local
Executor da matriz: Diego Executor
→ execução bloqueada
```

Mesmo o perfil Administrador não substitui automaticamente a pessoa designada como aprovador, operador, executor ou auditor.

## Ações protegidas

A versão protege:

- configuração da governança;
- solicitação de decisão;
- primeira e segunda aprovação;
- rejeição da solicitação;
- edição da matriz de responsabilidades;
- aprovação e revogação de exceções;
- execução de promover challenger ou manter champion;
- captura de snapshot de auditoria;
- exportação do relatório de auditoria.

A proteção é aplicada nos botões da interface e nas APIs públicas dos módulos.

## Autoria verificada

A trilha de identidade registra:

- usuário;
- perfil;
- tipo da ação;
- experimento afetado;
- permissão utilizada;
- data e hora;
- assinatura da Tehkné Solutions.

Eventos anteriores da governança e da auditoria continuam preservados. A nova trilha adiciona a identidade da sessão que autorizou a ação.

## Usuários ativos e inativos

Administradores podem:

- criar usuário;
- escolher perfil;
- redefinir PIN;
- ativar usuário;
- desativar usuário.

Usuários inativos não conseguem iniciar sessão.

## Backup e sincronização

A v0.6.8 adiciona:

```text
identityUsers
identityAccessProfiles
identityEvents
identitySettings
```

Esses dados entram no backup, restauração e workspace sincronizado.

A sessão atual nunca é sincronizada.

Não é necessária uma nova migration no Supabase, pois os registros continuam dentro do JSON versionado do workspace.

## Relatório de acesso

A exportação Markdown apresenta:

- usuários cadastrados e ativos;
- perfil de cada usuário;
- último acesso;
- perfis e permissões;
- quantidade de eventos;
- limitações do modelo local;
- assinatura da Tehkné Solutions.

## Limitações

- Não existe SSO, OAuth corporativo ou integração com diretório de funcionários.
- Não existe MFA.
- O nome e o e-mail são declarados localmente.
- O PIN protegido ainda depende da segurança física e lógica do dispositivo.
- Um usuário com acesso ao armazenamento do navegador pode alterar dados locais.
- A sessão não comprova identidade legal e não constitui assinatura digital.
- O controle reduz erros e conflitos operacionais, mas não substitui IAM, RBAC corporativo, logs imutáveis ou auditoria independente.

## Assinatura

Tehkné Solutions
