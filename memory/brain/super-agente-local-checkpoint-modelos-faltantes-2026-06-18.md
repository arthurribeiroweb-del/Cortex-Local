# Checkpoint: modelos faltantes dos agentes

Data: 2026-06-18

## Status

O Jarvis agora consegue listar quais modelos dos agentes ainda faltam no Ollama.

## O que foi implementado

- Criada rota `GET /api/agents/models/missing`.
- A rota retorna:
  - agentes;
  - modelo configurado;
  - disponibilidade;
  - comando `ollama pull` quando faltar.
- Criado comando no chat:

```text
Jarvis, modelos faltantes dos agentes
```

- O comando responde localmente sem chamar `/api/chat` do Ollama.
- A mesma logica de disponibilidade foi reaproveitada no status/health.

## Arquivos alterados

- `server.js`
- `test/chatOrchestration.integration.test.js`

## Testes

Resultado:

```text
npm test
56 testes
56 passando
0 falhas
```

## Proximo passo recomendado

Adicionar um botao no painel de modelos para carregar os modelos faltantes e mostrar os comandos `ollama pull` diretamente na interface.
