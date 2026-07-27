# Experimentos controlados entre versões — Commerce Radar v0.7.7

A área **Experimentos entre versões** permite testar uma variante candidata em ciclos reais sem publicá-la como versão principal do playbook.

## Objetivo

O módulo responde:

1. A variante candidata reproduz resultados melhores que a versão ativa?
2. A diferença aparece em reprodução, lucro preliminar ou ambos?
3. Existe amostra suficiente em cada braço?
4. Champion e challenger permaneceram iguais durante o teste?
5. A evidência justifica promover a candidata ou manter a versão ativa?

Nenhuma mudança de versão ocorre automaticamente.

## Champion e challenger

- **Champion:** versão ativa do playbook no momento em que o experimento é criado.
- **Challenger:** variante candidata em rascunho no mesmo momento.

O experimento preserva snapshots completos dos dois braços, incluindo:

- oferta;
- público;
- promessa;
- estratégia;
- critérios;
- checklist;
- hash do conteúdo;
- identificadores de versão e candidata.

## Configuração congelada

Ao iniciar o teste, o Commerce Radar verifica:

```text
versão champion ativa
+
hash champion preservado
+
variante challenger existente
+
hash challenger preservado
```

Caso a versão ativa seja trocada ou a candidata seja editada externamente, o experimento fica bloqueado para promoção.

Os ciclos já criados continuam preservados no histórico.

## Modo sombra

A candidata não é publicada para participar do teste.

Cada ciclo é criado explicitamente como:

```text
Champion
ou
Challenger
```

O plano recebe:

```text
versionExperiment.id
versionExperiment.arm
versionExperiment.versionId
versionExperiment.versionLabel
versionExperiment.frozenHash
```

A aplicação também registra:

```text
versionExperimentId
versionExperimentArm
playbookVersionId
playbookVersionLabel
playbookVersionSource
```

Para o challenger, a origem da versão é marcada como `candidate_shadow`.

## Proteção contra resultados fictícios

Todo ciclo começa com métricas zeradas.

O módulo transfere somente:

- oferta;
- estratégia;
- critérios;
- checklist;
- identificação do braço;
- identificação da configuração congelada.

Não são copiados:

- pedidos;
- visualizações;
- cliques;
- receita;
- investimento;
- lucro;
- margem;
- decisão do ciclo anterior.

## Comparação dos braços

Os resultados seguem as mesmas regras do desempenho dos playbooks.

### Reproduzido

O ciclo:

- foi validado;
- possui pelo menos um pedido;
- apresentou lucro preliminar positivo.

### Falha

O ciclo:

- foi descartado;
- recebeu decisão de abandono; ou
- terminou com prejuízo preliminar.

### Parcial

Existe evidência comercial, mas o resultado completo ainda não foi reproduzido.

### Pendente

O ciclo ainda não possui resultado conclusivo.

## Métricas por braço

Para champion e challenger são calculados:

- ciclos atribuídos;
- ciclos concluídos;
- ciclos pendentes;
- reproduções;
- falhas;
- taxa de reprodução;
- taxa de ciclos lucrativos;
- variação média de score;
- variação média de lucro preliminar.

Valores monetários são exibidos em real brasileiro, por exemplo `R$ 1.250,50`.

## Amostra mínima

O padrão exige:

```text
4 ciclos concluídos no total
2 ciclos concluídos no champion
2 ciclos concluídos no challenger
```

Os limites ficam armazenados no experimento e não mudam retroativamente quando as configurações globais são alteradas.

## Critério de vencedor

O challenger pode ser considerado superior quando:

```text
taxa de reprodução pelo menos 15 pontos percentuais maior
+
sem perda média de lucro superior a R$ 50,00
```

Ou quando:

```text
lucro médio pelo menos R$ 50,00 superior
+
sem perda de reprodução superior a 10 pontos percentuais
```

O champion vence quando o challenger apresenta perda equivalente.

Quando a diferença é menor, o resultado permanece **Sem vencedor**.

Esses valores são parâmetros operacionais. Não representam significância estatística formal.

## Promoção do challenger

A promoção exige simultaneamente:

- amostra mínima;
- challenger classificado como vencedor;
- champion ainda igual ao snapshot inicial;
- candidata ainda igual ao snapshot inicial;
- justificativa com pelo menos 20 caracteres;
- confirmação textual `PROMOVER`.

A execução utiliza o fluxo controlado da v0.7.6 para publicar a candidata como nova versão.

A versão anterior continua preservada e pode receber rollback posteriormente.

## Manter o champion

A decisão de manter exige:

- amostra mínima;
- justificativa humana;
- confirmação textual `MANTER`.

A variante candidata não é apagada automaticamente. Ela pode ser revisada, descartada em uma evolução posterior ou usada em outro teste.

## Alteração externa

A promoção é bloqueada se:

- o champion deixou de ser a versão ativa;
- o snapshot do champion mudou;
- a candidata foi removida;
- a candidata foi publicada por outro fluxo;
- o conteúdo da candidata foi alterado depois do congelamento.

O relatório apresenta a situação como **Revisão necessária**.

## Snapshots

A captura diária registra:

- estado do experimento;
- resultado atual;
- ciclos concluídos;
- reprodução de cada braço;
- diferença média de lucro;
- configuração usada na data.

São preservados até 365 snapshots por padrão.

## Relatório

A exportação Markdown inclui:

- playbook;
- champion e challenger;
- hipótese;
- estado;
- amostra;
- reprodução dos braços;
- diferença de lucro;
- resultado atual;
- controles metodológicos;
- assinatura da Tehkné Solutions.

## Backup e sincronização

A versão adiciona:

```text
playbookVersionExperiments
playbookVersionAssignments
playbookVersionDecisions
playbookVersionExperimentSnapshots
playbookVersionExperimentSettings
```

Esses campos entram no backup, restauração, workspace sincronizado e histórico da nuvem.

Não é necessária uma nova migration no Supabase.

## Limitações

- O teste é observacional e operacional; não substitui desenho estatístico formal.
- Produtos, públicos, períodos e canais diferentes podem reduzir comparabilidade.
- Lucro e margem permanecem preliminares até auditoria financeira.
- Amostras pequenas podem gerar falsos vencedores.
- O módulo não distribui tráfego automaticamente.
- O usuário escolhe manualmente qual braço gera cada ciclo.
- Nenhuma candidata é publicada automaticamente.
- Nenhum champion é mantido automaticamente.

## Assinatura

Tehkné Solutions
