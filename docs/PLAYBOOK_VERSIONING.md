# Versionamento e revisão controlada dos playbooks — v0.7.6

A área **Versões dos playbooks** preserva o conteúdo que orientou cada aplicação e impede que um modelo publicado seja alterado silenciosamente.

## Objetivo

O módulo responde:

1. Qual versão estava ativa quando um novo ciclo foi criado?
2. O que mudou entre duas versões?
3. A variante nova apresentou desempenho diferente?
4. É possível retornar à versão anterior sem apagar o histórico?

## Versão-base retrocompatível

Todo playbook publicado antes da v0.7.6 recebe automaticamente uma versão-base:

```text
v1
```

A migração apenas captura o estado existente. Oferta, checklist, estratégia, critérios, aplicações e resultados não são modificados.

Playbooks em rascunho continuam editáveis e não recebem versão publicada até passarem pelo fluxo normal de publicação.

## Imutabilidade

Depois da publicação, uma versão é imutável.

Não é permitido editar diretamente:

- título;
- descrição;
- público;
- promessa;
- criativo;
- checklist;
- estratégia;
- critérios;
- canais.

Toda mudança precisa nascer como **variante candidata**.

## Variante candidata

A variante começa como cópia da versão ativa ou de outra versão histórica selecionada.

Ela registra:

- versão-base;
- número proposto;
- hipótese;
- resumo das mudanças;
- snapshot completo do conteúdo;
- data de criação e atualização.

Enquanto permanece candidata, pode ser editada sem alterar o playbook utilizado na operação.

## Validação para publicação

A publicação exige:

```text
Hipótese com pelo menos 20 caracteres
Resumo das mudanças com pelo menos 20 caracteres
Título válido
Público definido
Promessa verificável
Pelo menos 5 itens no checklist
Revisão com justificativa
Confirmação textual PUBLICAR
```

Ao publicar:

1. a candidata vira uma versão imutável;
2. a versão anteriormente ativa é marcada como substituída;
3. a nova versão se torna ativa;
4. o conteúdo operacional do playbook é atualizado;
5. o evento entra na trilha.

## Aplicações identificadas

Novos ciclos criados por playbook passam a registrar:

```text
playbookVersionId
playbookVersionLabel
playbookVersionSource = captured
```

Aplicações anteriores à v0.7.6 não possuíam esse identificador. Para manter a comparação histórica, elas são associadas à versão-base com:

```text
playbookVersionSource = inferred
```

A interface e os relatórios deixam explícito quando o vínculo foi inferido.

## Comparação de desempenho

Cada versão pode ser comparada por:

- aplicações;
- ciclos concluídos;
- taxa de reprodução;
- taxa de ciclos lucrativos;
- variação média do score;
- variação média do lucro preliminar.

Os resultados utilizam as mesmas regras do módulo **Desempenho dos playbooks**.

A comparação é observacional. Produtos, canais, preços, públicos e períodos diferentes podem limitar a equivalência entre versões.

## Rollback

O rollback exige:

```text
Versão histórica válida
Justificativa com pelo menos 20 caracteres
Confirmação textual ROLLBACK
```

A operação:

- reativa a versão selecionada;
- marca a versão atual como substituída;
- restaura o snapshot do conteúdo;
- preserva todas as versões;
- preserva aplicações e resultados;
- registra o evento de rollback.

Rollback não cria retroativamente resultados para a versão reativada.

## Hash do snapshot

Cada versão possui um hash FNV-1a calculado sobre o snapshot normalizado.

O hash ajuda a detectar diferenças de conteúdo, mas não é uma assinatura criptográfica ou certificação externa.

## Snapshots e relatório

O snapshot diário registra:

- versão ativa de cada playbook;
- quantidade de versões;
- candidata em revisão;
- desempenho resumido por versão.

A exportação Markdown inclui histórico, estado, aplicações comparáveis, taxa de reprodução, variação de lucro e controles metodológicos.

## Backup e sincronização

A versão adiciona:

```text
playbookVersions
playbookVersionCandidates
playbookVersionEvents
playbookVersionSnapshots
playbookVersionSettings
```

Esses dados entram no backup JSON, restauração, workspace sincronizado e histórico da nuvem.

Não é necessária nova migration no Supabase, pois o workspace continua armazenado como JSON versionado.

## Limitações

- Aplicações antigas são vinculadas à versão-base por inferência.
- O hash não substitui assinatura digital.
- A publicação é confirmada localmente; não existe aprovação externa obrigatória nesta versão.
- Comparações não comprovam causalidade.
- Lucro e margem permanecem preliminares até auditoria financeira.
- Rollback não apaga nem reclassifica resultados anteriores.
- Nenhuma versão é promovida ou restaurada automaticamente.

## Assinatura

Tehkné Solutions
