# Definição do Produto — Commerce Radar

## Problema

Pessoas que querem iniciar ou expandir no e-commerce encontram excesso de opções, dados dispersos e conteúdo contraditório. Elas não sabem qual produto priorizar, em qual canal começar, qual teste executar ou quando interromper uma hipótese ruim.

## Proposta

Uma ferramenta simples que transforma oportunidades de produto em decisões comparáveis e experimentos mensuráveis.

## Usuário inicial

- Iniciantes no e-commerce.
- Afiliados e revendedores.
- Pequenos negócios avaliando novos produtos.
- Agências e operadores que precisam priorizar catálogos.

## Job to be done

“Quando eu encontrar uma ideia de produto, quero avaliar rapidamente seu potencial, escolher um canal e acompanhar um teste real, para não perder tempo e dinheiro escolhendo no escuro.”

## Fluxo principal da v0.2

1. Explorar oportunidades compatíveis com categoria, capital e modelo.
2. Transformar uma oportunidade em diagnóstico detalhado.
3. Salvar as melhores hipóteses para comparação.
4. Criar um experimento com canal, etapa e próxima ação.
5. Registrar visualizações, cliques, pedidos, investimento e receita.
6. Decidir continuar, ajustar, validar ou descartar.

## Critérios de sucesso

O usuário deve conseguir:

1. encontrar uma ideia compatível com o capital disponível;
2. concluir uma análise em menos de 3 minutos;
3. entender por que recebeu determinado score;
4. comparar pelo menos três produtos;
5. criar e atualizar um experimento;
6. registrar aprendizados e decisão;
7. exportar os dados sem criar conta.

## Estrutura de dados local

- `tehkne-commerce-radar-v2-analyses`: diagnósticos salvos.
- `tehkne-commerce-radar-v2-tests`: experimentos e métricas.
- migração automática de `tehkne-commerce-radar-v1`.

## Limitações assumidas

- O catálogo contém hipóteses iniciais, não recomendações garantidas.
- O score usa informações fornecidas pelo usuário e parâmetros internos.
- Não há coleta automática de preços, vendas ou tendências.
- As métricas dos experimentos são registradas manualmente.
- O resultado não é previsão financeira.
- Integrações futuras deverão utilizar APIs oficiais.

## Princípio de segurança comercial

Nenhuma hipótese deve receber estoque relevante ou mídia em escala antes de demonstrar sinais reais de demanda, conversão e margem.

## Assinatura

Tehkné Solutions