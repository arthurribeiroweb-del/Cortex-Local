# Fase 0: diagnostico do Jarvis atual

Data: 2026-06-18

## Resumo

O projeto real do Jarvis fica em `assistant-local-pc`. Ele e um app Node.js com Express, interface web em `public/`, memoria Markdown em `memory/`, voz local com Whisper/Piper e chamadas ao Ollama via HTTP.

O projeto ja tem uma base inicial de orquestracao:

- modo rapido com streaming em `/api/chat/stream`;
- modo deliberado/critico em `/api/chat`;
- pipeline draft -> critico -> web opcional -> resposta final;
- memoria local pesquisada antes da resposta;
- logs JSONL em `logs/conversations.jsonl`;
- verificacao web e salvamento de correcoes no brain.

## Arquivos principais

- `server.js`: concentra rotas HTTP, prompt principal, chamada ao Ollama, fluxo multi-modelo, web check, memoria e logs.
- `src/config.js`: le `.env` e define modelos principais (`DEFAULT_MODEL`, `DRAFT_MODEL`, `CRITIC_MODEL`, `FINAL_MODEL`).
- `src/memory.js`: lista, le, salva e pesquisa arquivos Markdown da memoria.
- `src/critic.js`: normaliza revisao do critico e decide quando acionar web check.
- `src/webSearch.js`: provedores de busca web.
- `src/brainCorrections.js`: salva correcoes e pesquisas no `memory/brain`.
- `src/ollamaStream.js`: helpers puros para streaming NDJSON do Ollama.
- `public/app.js`: interface web, selecao de modo e chamada ao backend.
- `public/index.html`: estrutura da interface.

## Como funciona hoje

1. Usuario envia mensagem pela interface.
2. O front escolhe modo `simple`, `deliberate` ou `critical`.
3. No modo `simple`, o front chama `/api/chat/stream`.
4. No modo `deliberate` ou `critical`, o front chama `/api/chat`.
5. O backend pesquisa memoria local relevante.
6. O backend gera uma resposta draft com `DRAFT_MODEL`.
7. O critico revisa com `CRITIC_MODEL`.
8. Se o critico ou a pergunta indicarem informacao atual, a web pode ser acionada.
9. O backend gera resposta final com `FINAL_MODEL`.
10. A resposta e registrada nos logs.

## Onde o Ollama e chamado

As chamadas ao Ollama ficam em `server.js`:

- `callOllamaChat`: chamada normal com `stream: false`.
- `callOllamaChatStream`: chamada com `stream: true`.
- `getOllamaModels`: lista modelos via `/api/tags`.

## Onde entram memoria e historico

- Memoria persistente: `memory/`, buscada por `searchMemory`.
- Brain: `memory/brain`, usado para correcoes e fatos verificados.
- Historico curto em memoria RAM: `chatHistory` dentro de `server.js`, limitado a 20 turnos.
- Log permanente: `logs/conversations.jsonl`.

## Onde encaixar o orquestrador

O melhor encaixe e criar modulos novos em `src/agents/` e depois substituir gradualmente a logica de decisao dentro de `/api/chat`.

Ordem recomendada:

1. `src/agents/agentsConfig.js`: configuracao dos agentes e modelos.
2. `src/agents/taskClassifier.js`: classificador puro da tarefa.
3. `src/agents/orchestrator.js`: decide fluxo, chama agentes e devolve metadados.
4. Integrar no `/api/chat`, mantendo compatibilidade com os modos atuais.

## Riscos

- `server.js` concentra muita responsabilidade; alterar tudo de uma vez aumenta risco.
- Hoje o modo `auto` e decidido no front-end; o orquestrador correto deve morar no backend.
- Os modelos configurados hoje ainda apontam para defaults antigos, como `qwen2.5:3b` e `mistral:7b`.
- Rodar muitos modelos grandes em paralelo pode estourar VRAM ou ficar lento na RTX 3090; o fluxo deve ser sequencial no inicio.
- Mostrar debate interno por padrao pode vazar bastidores; deve ficar atras de opcao/debug.

## Primeira etapa implementavel

Criar a fundacao sem conectar ainda no fluxo principal:

- configuracao de agentes/modelos;
- classificador de tarefa;
- testes unitarios;
- metadados com agentes recomendados.

Depois disso, conectar o classificador ao `/api/chat` e registrar `agentsUsed` nos logs e na resposta.
