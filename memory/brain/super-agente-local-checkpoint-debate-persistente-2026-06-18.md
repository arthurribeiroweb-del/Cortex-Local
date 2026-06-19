# Checkpoint: debate interno persistente

Data: 2026-06-18

## Status

O debate interno dos agentes agora e salvo em arquivo local.

Antes, o ultimo debate ficava apenas em memoria de sessao. Agora cada execucao multiagente grava uma linha JSON em:

```text
logs/agent-debates.jsonl
```

## O que foi implementado

- Criado log JSONL dedicado para debates internos.
- Cada debate salvo inclui:
  - timestamp;
  - pergunta;
  - orquestracao;
  - agentes;
  - modelo solicitado;
  - modelo usado;
  - fallback, quando ocorreu;
  - resposta de cada agente;
  - revisao do critico;
  - web check;
  - resposta final.
- O comando `Jarvis, mostre o debate interno` agora tenta usar:
  1. o debate em memoria da sessao;
  2. o ultimo debate salvo em `logs/agent-debates.jsonl`.

## Arquivos alterados

- `server.js`
- `test/chatOrchestration.integration.test.js`

## Testes

Resultado:

```text
npm test
48 testes
48 passando
0 falhas
```

## Proximo passo recomendado

Criar uma rota para listar debates anteriores, com limite e sem expor tudo por padrao na interface.
