# Checkpoint: painel de debates anteriores

Data: 2026-06-18

## Status

A interface agora tem uma aba para consultar debates internos anteriores.

## O que foi implementado

- Adicionada aba `Debates` no painel de Ajustes.
- A aba chama `GET /api/agents/debates?limit=10`.
- A lista mostra:
  - pergunta;
  - data/hora;
  - modo;
  - quantidade de agentes;
  - motivo da orquestracao;
  - preview da resposta final;
  - chips com agentes e modelos usados.
- A interface mostra apenas resumos por padrao, sem expor o debate completo.
- Adicionado botao para atualizar debates.

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

Permitir configurar os modelos dos agentes por `.env`, mantendo os defaults atuais como fallback.
