# Calibração segmentada — Commerce Radar v0.6.2

A calibração global da v0.6.1 mede o comportamento geral do ranking. A v0.6.2 adiciona uma camada separada para evitar que categorias, canais e níveis de maturidade muito diferentes sejam tratados como uma única amostra.

## Dimensões disponíveis

### Categoria

Agrupa produtos pela categoria registrada nas fontes, oportunidades, testes, análises ou auditorias.

Exemplos:

- Casa;
- Moda;
- Criadores;
- Beleza;
- Sem categoria.

### Canal

Agrupa pelos canais operacionais encontrados nos dados:

- Mercado Livre;
- Shopee;
- WooCommerce;
- Shopify;
- canal próprio;
- Sem canal.

### Maturidade da evidência

A maturidade é determinada no momento da previsão a partir de confiança e componentes do ranking.

Estados:

- **Inicial:** baixa cobertura ou ausência de validação e economia.
- **Em desenvolvimento:** parte das evidências já existe, mas ainda não é completa.
- **Validada:** confiança, evidência, validação e economia atingem níveis elevados.

A maturidade é uma classificação operacional. Ela não comprova automaticamente que o produto seja lucrativo.

## Metadados das previsões

Novas capturas passam a armazenar:

```text
segments.category
segments.channel
segments.maturity
segments.source
```

Previsões antigas são enriquecidas com o estado atual dos dados. Nesses casos, `segments.source` recebe `inferred` para deixar claro que o metadado não foi capturado originalmente.

## Coortes comparáveis

Cada caso da calibração continua respeitando:

- produto;
- semana da previsão;
- horizonte temporal;
- eventos posteriores;
- resultado conclusivo, inconclusivo ou pendente.

Depois, os casos são separados pela dimensão selecionada.

Exemplo:

```text
Categoria: Casa
→ somente produtos classificados como Casa
→ matriz de acertos própria
→ sugestão de pesos própria
```

Resultados de Moda ou Criadores não entram nessa sugestão.

## Amostra mínima

O padrão exige:

- seis casos conclusivos no segmento;
- pelo menos dois sucessos;
- pelo menos duas falhas.

A amostra mínima pode ser aumentada. O sistema nunca reduz os requisitos de sucessos e falhas para liberar um perfil.

Casos pendentes e inconclusivos não contam como amostra conclusiva.

## Perfil segmentado

Quando o segmento é elegível, o Commerce Radar pode salvar um perfil contendo:

- dimensão;
- valor do segmento;
- pesos sugeridos;
- tamanho da amostra;
- matriz de acertos;
- sucessos e falhas;
- data de aplicação;
- assinatura da Tehkné Solutions.

O perfil é isolado. Ele não substitui os pesos globais da v0.6.1.

## Prévia do impacto

A área segmentada recalcula o ranking apenas para os produtos que pertencem ao perfil selecionado e apresenta:

- score global;
- score segmentado;
- variação;
- recomendação recalculada.

Produtos fora do segmento continuam usando o ranking global e não aparecem na prévia.

## Escolha conservadora

A v0.6.2 não combina automaticamente vários perfis. Um produto pode pertencer simultaneamente a uma categoria, um canal e uma maturidade, mas cada perfil é analisado separadamente.

Isso evita:

- empilhar ajustes sem evidência suficiente;
- amplificar ruído de amostras pequenas;
- ocultar qual segmento causou a alteração;
- transformar correlações em regras universais.

## Histórico

Aplicar, atualizar ou remover um perfil cria uma entrada no histórico com:

- ação;
- perfil atual;
- perfil anterior quando aplicável;
- data e hora.

## Backup e sincronização

A versão adiciona:

```text
segmentCalibrationSettings
segmentCalibrationProfiles
segmentCalibrationHistory
```

Esses campos entram no backup JSON, restauração e workspace sincronizado. Não é necessária uma nova migration no Supabase, pois os dados continuam dentro do JSON versionado.

## Limitações

- Segmentos pequenos podem produzir pesos instáveis.
- Categoria e canal dependem da qualidade do cadastro.
- Previsões antigas podem usar metadados inferidos do estado atual.
- Um perfil segmentado não comprova causalidade.
- A prévia não substitui um novo teste comercial.
- Perfis não alteram automaticamente o ranking global.
- O sistema não combina perfis de dimensões diferentes nesta versão.

## Assinatura

Tehkné Solutions
