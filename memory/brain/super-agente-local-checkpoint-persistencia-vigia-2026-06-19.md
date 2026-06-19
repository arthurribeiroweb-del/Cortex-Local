# Checkpoint - Persistencia do Vigia

Data: 2026-06-19

## Contexto

O modo vigia ja tinha plano seguro, API, worker local e UI de jobs/eventos. Este bloco adicionou persistencia de eventos e snapshots de jobs em JSONL, com restauracao de historico ao iniciar o servidor.

## Git e workspace

- A checagem Git obrigatoria foi tentada novamente em `C:\PROJETOS\IA-LOCAL`.
- Todos os comandos Git principais falharam por `fatal: detected dubious ownership in repository at 'C:/PROJETOS'`.
- Nao foi alterada configuracao global de Git.
- O trabalho continuou somente em `assistant-local-pc`.

## Implementado

- Novo log:
  - `logs/agent-watch-events.jsonl`
- `src/agents/watchRunner.js` agora suporta:
  - `setWatchEventSink()`;
  - persistencia por callback;
  - `restoreWatchHistory()`;
  - restauracao de snapshots de jobs;
  - restauracao de eventos recentes.
- `server.js` agora:
  - salva cada evento do worker no JSONL;
  - salva snapshot do job junto do evento;
  - restaura historico de jobs/eventos ao carregar;
  - usa restauracao sincronizada para evitar corrida no boot.

## Regra de seguranca

- Jobs que estavam `running` antes do reinicio nao voltam a rodar automaticamente.
- Eles sao restaurados como `restored`.
- `nextTickAt` volta como `null`.
- Nenhum timer e recriado a partir do historico.
- Para rodar novamente, o usuario precisa iniciar um novo job autorizado.

## Testes

Comando executado:

```powershell
npm.cmd test
```

Resultado:

- 67 testes passaram.
- 0 falhas.

Cobertura adicionada:

- persistencia via sink recebe eventos e snapshots;
- historico restaura job `running` como `restored`;
- restauracao nao religa timer;
- integracao do worker continua funcionando.

## Estado atual

O modo vigia agora tem:

- classificador;
- plano seguro;
- historico de planos;
- worker local;
- API de jobs;
- API de eventos;
- UI para iniciar/cancelar;
- persistencia JSONL de eventos/jobs;
- restauracao segura de historico.

## Proximo bloco recomendado

Adicionar execucao real read-only para alvo `path` e `logs`:

- checar se arquivo/pasta existe;
- ler metadados seguros como tamanho e data de modificacao;
- detectar mudanca entre ticks;
- registrar evento `changed`;
- nunca ler conteudo sensivel por padrao;
- nunca executar comandos do usuario.
