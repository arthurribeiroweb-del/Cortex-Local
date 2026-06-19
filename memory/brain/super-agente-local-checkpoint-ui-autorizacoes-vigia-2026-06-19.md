# Checkpoint - UI de autorizacoes do Vigia

Data: 2026-06-19

## Contexto

Depois de implementar autorizacoes persistentes por escopo, foi adicionada a UI para visualizar autorizacoes ativas, expiradas e revogadas, alem de revogar autorizacoes ativas diretamente pelo painel do Vigia.

## Git e workspace

- A checagem Git obrigatoria foi tentada em `C:\PROJETOS\IA-LOCAL`.
- Git continua bloqueado por `fatal: detected dubious ownership in repository at 'C:/PROJETOS'`.
- Nao foi alterada configuracao global de Git.
- O trabalho continuou somente em `assistant-local-pc`.

## Implementado

- O painel `Vigia` em Ajustes agora inclui bloco de autorizacoes.
- A UI carrega dados de:
  - `GET /api/agents/watch/authorizations`
- O bloco mostra:
  - alvo;
  - tipo do alvo;
  - status: ativa, expirada ou revogada;
  - data de criacao;
  - data de expiracao;
  - data de revogacao quando houver;
  - acoes permitidas;
  - pergunta/fonte que criou a autorizacao.
- Filtro local por status:
  - todas;
  - ativas;
  - expiradas;
  - revogadas.
- Autorizacoes ativas exibem botao `Revogar`.
- Revogacao chama:
  - `POST /api/agents/watch/authorizations/:id/revoke`
- Apos revogar, a lista e recarregada.
- Como `index.html` e `styles.css` estavam bloqueados anteriormente, a UI e estilos seguem injetados por `public/app.js`.

## Segurança

- A UI nao cria autorizacoes arbitrarias.
- A UI apenas lista e revoga autorizacoes existentes.
- Revogar impede novos jobs para aquele escopo.
- Jobs existentes continuam sob controle separado de cancelamento.

## Verificacoes

Comandos executados:

```powershell
node --check public\app.js
npm.cmd test
```

Resultado:

- `public/app.js` sem erro de sintaxe.
- 75 testes passaram.
- 0 falhas.

## Estado atual

O Vigia agora possui:

- autorizacoes persistentes por escopo;
- log JSONL de autorizacoes;
- rotas de listar/revogar;
- UI para filtrar e revogar autorizacoes;
- worker validando autorizacao ativa antes de iniciar.

## Proximo bloco recomendado

Comandos naturais para o Vigia:

- "Jarvis, mostre vigias ativos";
- "Jarvis, pare o vigia";
- "Jarvis, revogue autorizacao dos logs";
- "Jarvis, mostre autorizacoes do vigia".
