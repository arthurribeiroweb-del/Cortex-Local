# Checkpoint - Alertas do Vigia na tela principal

Data: 2026-06-19

## Contexto

O usuario pediu alertas do Vigia na tela principal do Jarvis, sem precisar abrir Ajustes. A implementacao foi feita em `public/app.js`, mantendo o padrao dos blocos anteriores porque `public/index.html` e `public/styles.css` estavam bloqueados para escrita no Windows.

## Git e workspace

- A checagem Git obrigatoria foi tentada em `C:\PROJETOS\IA-LOCAL`.
- Git continua bloqueado por `fatal: detected dubious ownership in repository at 'C:/PROJETOS'`.
- Nao foi alterada configuracao global de Git.
- O trabalho seguiu somente em `assistant-local-pc`.

## Implementado

- Novo alerta compacto do Vigia injetado abaixo do topo principal.
- O alerta aparece quando existem eventos `changed` nao vistos.
- O alerta mostra:
  - contador de mudancas pendentes;
  - resumo humano da mudanca mais recente;
  - botao `Abrir Vigia`;
  - botao `Marcar visto`.
- O frontend busca alertas em:
  - `GET /api/agents/watch/events?limit=50`
- Polling automatico a cada 6 segundos.
- Eventos vistos sao salvos no `localStorage` com chave:
  - `jarvisSeenWatchChangeIds`
- Ao marcar visto, os IDs pendentes entram na lista local e o alerta some.
- Ao clicar em `Abrir Vigia`, o drawer de Ajustes abre direto na aba `Vigia`.

## Segurança

- A funcionalidade apenas le eventos locais ja registrados.
- Nao executa comandos.
- Nao envia notificacao externa.
- Nao altera jobs do Vigia.
- Nao marca eventos como vistos no backend; o estado visto e local do navegador.

## Verificacoes

Comandos executados:

```powershell
node --check public\app.js
npm.cmd test
```

Resultado:

- `public/app.js` sem erro de sintaxe.
- 70 testes passaram.
- 0 falhas.

## Estado atual

O Vigia agora alerta na tela principal quando detecta mudancas, alem de manter a aba completa em Ajustes para revisar planos, jobs e eventos.

## Proximo bloco recomendado

Adicionar autorizacoes persistentes por escopo:

- salvar autorizacao por alvo;
- expirar autorizacao por tempo;
- permitir revogar autorizacao;
- mostrar autorizacoes ativas na UI do Vigia.
