# Checkpoint: rota de debates anteriores

Data: 2026-06-18

## Status

O Jarvis agora tem uma rota para listar debates internos anteriores.

## O que foi implementado

- Criada rota `GET /api/agents/debates`.
- A rota aceita `limit`, com limite maximo interno.
- Por padrao, retorna apenas resumo dos debates.
- O resumo inclui:
  - timestamp;
  - pergunta;
  - modo;
  - motivo da orquestracao;
  - agentes;
  - modelos usados;
  - estado resumido do critico;
  - preview da resposta final.
- A rota so retorna o debate completo se receber `full=true`.

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

Criar uma aba ou painel na interface para consultar debates anteriores sem abrir o arquivo de log manualmente.
