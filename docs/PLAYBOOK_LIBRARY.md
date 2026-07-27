# Biblioteca de playbooks — Commerce Radar v0.7.4

A área **Biblioteca de playbooks** transforma retrospectivas de ciclos validados em modelos reutilizáveis de oferta, checklist e estratégia.

O playbook não transfere resultados comerciais. Ele reaproveita somente a estrutura da hipótese e cria um novo plano com métricas zeradas.

## Origem obrigatória

Um playbook nasce de um ciclo que possui:

- retrospectiva humana registrada;
- score mínimo configurado;
- classificação **Validado**;
- pelo menos um pedido real;
- lucro preliminar positivo, quando essa política está ativa.

O padrão exige score mínimo de 65.

Ciclos parciais, descartados, inconclusivos ou sem retrospectiva podem aparecer como candidatos, mas não podem ser publicados enquanto as exigências não forem atendidas.

## Estados

- **Rascunho:** criado a partir da retrospectiva e ainda editável.
- **Publicado:** validado e disponível para iniciar novos planos.
- **Arquivado:** preservado no histórico, mas indisponível para aplicação.

Nenhum rascunho é publicado automaticamente.

## Modelo de oferta

Cada playbook pode registrar:

- público;
- problema observado;
- promessa verificável;
- prova disponível;
- criativo ou formato;
- objeções;
- chamada para ação;
- canais compatíveis.

A prova inicial inclui somente fatos do ciclo de origem, como pedidos, lucro preliminar e score.

## Estratégia

A estratégia preserva:

- o que funcionou;
- o que falhou;
- próxima hipótese;
- abordagem de tráfego;
- regra de otimização;
- regra de parada.

As interpretações humanas permanecem separadas das métricas calculadas.

## Checklist reutilizável

O checklist é criado a partir das tarefas do ciclo de origem.

Cada item possui:

- dia de execução entre 1 e 7;
- descrição;
- origem no playbook.

Ao aplicar o playbook, itens adicionais são mesclados ao plano padrão sem remover as tarefas básicas do Plano de 7 dias.

Itens duplicados pela mesma descrição não são adicionados novamente.

## Publicação

Para publicar, o playbook precisa possuir:

- origem elegível;
- título com pelo menos 6 caracteres;
- público definido;
- promessa verificável;
- próxima hipótese;
- pelo menos 5 itens no checklist.

As exigências existem para evitar modelos genéricos ou baseados em ciclos sem evidência comercial.

## Confiança operacional

A confiança do playbook considera:

- score do ciclo;
- resultado validado;
- volume de pedidos;
- lucro preliminar positivo;
- retrospectiva registrada;
- otimizações comparáveis.

O valor é limitado a 95% e representa qualidade da evidência disponível, não probabilidade garantida de sucesso.

## Aplicação em um novo ciclo

Um playbook publicado pode criar um Plano de 7 dias para outro produto ou canal.

O novo plano recebe:

- critérios do ciclo de origem como premissa editável;
- checklist mesclado;
- modelo de oferta;
- estratégia;
- referência ao playbook utilizado.

O plano é criado como **Rascunho**.

As métricas começam obrigatoriamente em:

```text
visualizações = 0
cliques = 0
pedidos = 0
receita = R$ 0,00
investimento = R$ 0,00
```

Nenhum teste é ativado até que o usuário selecione **Ativar plano**.

## Registro de aplicações

Cada aplicação preserva:

- playbook;
- ciclo de origem;
- novo plano;
- produto;
- canal;
- data e hora;
- estado inicial do plano.

Isso permite acompanhar quantas vezes um aprendizado foi reutilizado e comparar os resultados posteriores.

## Exportação

O relatório Markdown contém:

- título e status;
- confiança operacional;
- evidência do ciclo de origem;
- oferta;
- checklist;
- estratégia;
- limitações;
- assinatura da Tehkné Solutions.

## Backup e sincronização

A versão adiciona:

```text
learningPlaybooks
playbookApplications
playbookSettings
```

Esses campos entram no backup JSON, restauração, workspace sincronizado e histórico da nuvem.

Não é necessária uma nova migration no Supabase.

## Limitações

- Um resultado positivo pode não se repetir em outro produto, público, período ou canal.
- O lucro do ciclo de origem permanece preliminar até auditoria financeira.
- Associação entre uma mudança e um resultado não comprova causalidade.
- Playbooks antigos podem perder relevância com mudanças de concorrência, preço, frete ou plataforma.
- O novo ciclo precisa produzir sua própria evidência.
- O sistema não publica, ativa campanhas ou investe automaticamente.

## Assinatura

Tehkné Solutions
