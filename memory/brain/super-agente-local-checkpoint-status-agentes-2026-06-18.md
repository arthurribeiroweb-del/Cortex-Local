# Checkpoint: status dos agentes

Data: 2026-06-18

## Status

O status do Jarvis agora informa a disponibilidade dos modelos usados pelos agentes internos.

Isso ajuda a saber rapidamente quais modelos do conselho multiagente estao instalados no Ollama e quais precisam ser baixados com `ollama pull`.

## O que foi implementado

- `/api/status` agora inclui `features.agentOrchestration`.
- `/api/status` agora inclui `models.agents`.
- Cada agente mostra:
  - `id`;
  - `name`;
  - `role`;
  - modelo configurado;
  - se o modelo esta disponivel;
  - hint de instalacao quando faltar.
- `/api/health` tambem inclui `orchestration.agents`.

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

Atualizar a interface para mostrar a saude dos agentes no painel de modelos, exibindo quais modelos estao prontos e quais precisam ser instalados.
