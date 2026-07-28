# Aprendizado adaptativo — v0.8.4

O módulo transforma sinais históricos do Commerce Radar em recomendações ordenadas e explicáveis.

## Fontes consideradas

- experimentos e playbooks;
- confiança da evidência;
- estabilidade pós-recuperação;
- reincidências;
- feedback humano.

## Cálculo

Cada recomendação combina resultado observado e confiança da evidência. A amostra insuficiente reduz proporcionalmente o score. Reincidências, baixa confiança e rejeições humanas aplicam penalidades. Estabilidade e aceitações humanas adicionam bônus moderados.

O score é relativo e limitado entre 0 e 100. Ele não representa garantia de resultado financeiro.

## Explicabilidade

Cada linha apresenta:

- score e nível de confiança;
- tamanho da amostra;
- fatores positivos;
- riscos;
- limitação de uso;
- playbook, canal, produto e segmento quando disponíveis.

## Feedback humano

O operador pode registrar uma recomendação como aceita, ignorada ou rejeitada. Esse registro passa a compor os recálculos posteriores, sem executar nenhuma ação operacional.

## Segurança funcional

O módulo não altera automaticamente experimentos, orçamento, produtos, canais, ranking definitivo ou decisões. Recomendações com amostra abaixo do mínimo são marcadas como exploratórias.

## Persistência e nuvem

Recomendações, feedbacks, snapshots, relatórios e configurações são mantidos em LocalStorage e registrados nas chaves opcionais de sincronização em nuvem.

Tehkné Solutions