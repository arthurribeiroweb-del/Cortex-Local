# Checkpoint: UI de status dos agentes

Data: 2026-06-18

## Status

O painel de modelos da interface agora mostra a saude dos agentes locais.

## O que foi implementado

- Adicionado bloco `agentModelStatus` no painel Modelos.
- A interface renderiza a lista de agentes retornada por `/api/status`.
- Cada agente mostra:
  - nome;
  - modelo;
  - estado `Pronto` ou `Instalar`.
- Agentes prontos recebem indicador visual diferente dos agentes ausentes.

## Arquivos alterados

- `public/index.html`
- `public/app.js`
- `public/styles.css`

## Testes

Resultado:

```text
npm test
48 testes
48 passando
0 falhas
```

## Proximo passo recomendado

Persistir o debate interno em arquivo de log proprio, em vez de manter apenas em memoria de sessao. Isso permitiria consultar debates anteriores mesmo depois de reiniciar o Jarvis.
