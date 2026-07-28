# Commerce Radar — Prevenção de reincidência

## Objetivo

A v0.8.3 acompanha experimentos após uma recuperação verificada. O módulo observa a evolução da confiança, registra checkpoints e classifica o período como `monitoring`, `attention`, `stable` ou `recurrent`.

## Fluxo

1. `CommerceRadarEvidenceRecovery.verify()` confirma uma recuperação.
2. O módulo cria um monitoramento com janela padrão de 21 dias.
3. Cada checkpoint preserva score e componentes observados.
4. Perda de 4 pontos ou quedas sucessivas geram atenção.
5. Perda de 8 pontos após a recuperação caracteriza reincidência.
6. O encerramento da janela sem regressão relevante classifica o monitoramento como estável.

## API

- `startMonitoring(experimentId, source)`
- `checkpoint(experimentId, input)`
- `evaluate(monitorId)`
- `report()`
- `history(experimentId)`
- `captureSnapshot(reference)`
- `exportMarkdown()`
- `settings()`

## Persistência

Os dados são mantidos em LocalStorage e incorporados ao mapa de dados do modo nuvem:

- `evidencePrevention`
- `evidencePreventionCheckpoints`
- `evidencePreventionEvents`
- `evidencePreventionSettings`
- `evidencePreventionSnapshots`
- `evidencePreventionReports`

## Garantias

- nenhuma pontuação é modificada automaticamente;
- nenhuma decisão experimental é promovida, revertida ou encerrada;
- reincidência exige evidência posterior à recuperação;
- relatórios e snapshots carregam a assinatura Tehkné Solutions.
