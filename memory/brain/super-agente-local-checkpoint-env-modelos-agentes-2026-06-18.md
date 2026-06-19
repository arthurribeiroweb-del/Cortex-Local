# Checkpoint: modelos dos agentes por env

Data: 2026-06-18

## Status

Os modelos dos agentes internos agora podem ser configurados pelo `.env`.

## O que foi implementado

- `src/agents/agentsConfig.js` agora le variaveis `AGENT_MODEL_*`.
- Defaults atuais continuam funcionando quando a variavel nao existe.
- `.env.example` documenta os modelos do conselho multiagente.
- `.env` local recebeu os modelos grandes disponiveis para a RTX 3090.

## Variaveis adicionadas

```text
AGENT_MODEL_MAIN=qwen3.6:27b
AGENT_MODEL_CODER=qwen3-coder:30b
AGENT_MODEL_VISION=qwen3-vl:32b
AGENT_MODEL_REASONING=deepseek-r1:32b
AGENT_MODEL_AUTOMATION=devstral-small-2:latest
AGENT_MODEL_CRITIC=mistral-small3.2:24b
AGENT_MODEL_VALIDATOR=gemma4:31b
AGENT_MODEL_QUICK=mistral:7b
AGENT_MODEL_QUICK_CODER=qwen2.5-coder:7b
```

## Arquivos alterados

- `.env`
- `.env.example`
- `src/agents/agentsConfig.js`
- `test/agentsConfig.test.js`

## Testes

Resultado:

```text
npm test
49 testes
49 passando
0 falhas
```

## Proximo passo recomendado

Adicionar um atalho no chat para gerar uma resposta usando explicitamente o modo auditor, sem depender apenas do classificador automatico.
