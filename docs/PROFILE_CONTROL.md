# Aplicação controlada de perfis — Commerce Radar v0.6.3

A área **Aplicação de perfis** controla quando os pesos produzidos pela calibração segmentada podem influenciar o ranking principal.

## Objetivo

A calibração segmentada da v0.6.2 cria perfis isolados por categoria, canal ou maturidade. A v0.6.3 adiciona uma camada de governança para:

1. selecionar quais perfis estão autorizados;
2. definir uma precedência explícita;
3. simular o impacto sem alterar o ranking;
4. ativar manualmente os perfis;
5. identificar o perfil utilizado em cada produto;
6. restaurar a configuração anterior.

## Modos

### Global

O ranking usa somente os pesos globais. Perfis segmentados permanecem armazenados, mas não modificam scores ou posições.

### Simulação

Os perfis selecionados são utilizados apenas na comparação lado a lado.

O ranking principal continua global.

### Ativo

Os perfis selecionados podem alterar o ranking principal. A ativação exige confirmação explícita.

## Precedência

As dimensões disponíveis são:

```text
Categoria
Canal
Maturidade
```

A ordem configurada determina qual perfil vence quando um produto corresponde a mais de um perfil.

Exemplo:

```text
1. Categoria
2. Canal
3. Maturidade
```

Um produto da categoria Casa, vendido na Shopee e com maturidade Validada utilizará o perfil de categoria quando os três estiverem selecionados.

## Regra de perfil único

Perfis não são somados nem combinados.

```text
produto
→ localizar perfis compatíveis
→ percorrer a precedência
→ selecionar o primeiro perfil autorizado
→ recalcular o produto uma vez
```

Isso mantém a explicação simples e reduz o risco de sobreajuste.

## Comparação antes da ativação

A tela mostra:

- score global;
- score simulado;
- variação;
- posição global;
- posição simulada;
- perfil vencedor.

Produtos sem perfil compatível permanecem com os pesos globais.

## Ranking principal

Quando o modo está ativo, cada card informa:

- score global;
- score atual;
- variação;
- dimensão aplicada;
- nome do perfil;
- posição da dimensão na precedência;
- segmentos do produto.

As explicações comerciais, riscos e lacunas continuam sendo gerados pelo motor de recomendações.

## Ativação

A ativação registra:

- configuração anterior;
- perfis autorizados;
- ordem de precedência;
- data e hora;
- observação da ação;
- assinatura da Tehkné Solutions.

Nenhuma ativação acontece automaticamente após uma calibração.

## Rollback

O botão **Rollback** restaura a configuração anterior registrada no histórico.

O rollback não apaga:

- perfis calibrados;
- resultados anteriores;
- snapshots;
- histórico de ativações.

## Snapshots

O ranking controlado pode ser capturado diariamente com:

- posição;
- produto;
- score atual;
- score global;
- variação;
- confiança;
- recomendação;
- perfil utilizado;
- modo da aplicação.

## Backup e sincronização

A versão adiciona:

```text
profileControlSettings
profileControlHistory
profileControlSnapshots
```

Esses dados entram no backup JSON, restauração e workspace sincronizado. Não é necessária nova migration no Supabase.

## Proteções

- perfis precisam existir na calibração segmentada;
- somente perfis selecionados podem ser usados;
- apenas um perfil vence por produto;
- simulação não modifica o ranking principal;
- ativação exige confirmação;
- pesos globais continuam disponíveis;
- rollback restaura a configuração anterior;
- cards mostram o perfil responsável;
- produtos externos ao segmento permanecem globais.

## Limitações

- o perfil pode estar baseado em uma amostra pequena mesmo quando elegível;
- precedência não prova que uma dimensão seja causalmente superior;
- mudanças de posição não garantem vendas ou lucro;
- perfis antigos podem perder validade à medida que a operação muda;
- o rollback restaura configurações, não apaga decisões tomadas com rankings anteriores;
- a ferramenta não substitui validação comercial, auditoria ou julgamento humano.

## Assinatura

Tehkné Solutions
