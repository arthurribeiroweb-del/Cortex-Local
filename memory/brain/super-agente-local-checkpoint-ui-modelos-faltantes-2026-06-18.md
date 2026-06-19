# Checkpoint: UI de modelos faltantes

Data: 2026-06-18

## Status

O painel de modelos agora mostra comandos para instalar modelos faltantes dos agentes.

## O que foi implementado

- Adicionado botao `Ver modelos faltantes` no painel Modelos.
- O botao chama `GET /api/agents/models/missing`.
- A interface mostra comandos `ollama pull ...` para cada modelo ausente.
- Se todos estiverem disponiveis, mostra mensagem local de sucesso.

## Arquivos alterados

- `public/index.html`
- `public/app.js`
- `public/styles.css`

## Testes

Resultado:

```text
npm test
56 testes
56 passando
0 falhas
```

## Proximo passo recomendado

Implementar o modo vigia real com uma base de autorizacoes, sem executar acoes destrutivas automaticamente.
