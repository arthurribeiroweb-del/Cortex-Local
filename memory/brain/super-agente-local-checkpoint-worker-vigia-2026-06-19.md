# Checkpoint - Worker local do modo vigia

Data: 2026-06-19

## Contexto

Depois da UI do Vigia, foi implementada a primeira versao do worker local. O foco foi criar execucao controlada em memoria, com cancelamento e eventos, sem executar comandos arbitrarios e sem acoes destrutivas.

## Implementado

- Novo modulo `src/agents/watchRunner.js`.
- O worker mantem jobs em memoria.
- Cada job tem:
  - id;
  - status `running`, `cancelled` ou `completed`;
  - pergunta original;
  - plano do vigia;
  - horario de inicio;
  - proximo tick;
  - contador de ticks;
  - ultimo evento.
- Ao iniciar um job autorizado, o worker:
  - valida que o plano tem status `authorized_plan`;
  - rejeita alvo desconhecido;
  - exige `notify_only` nas acoes;
  - registra evento `started`;
  - executa um tick inicial;
  - agenda ticks pelo intervalo do plano;
  - agenda parada automatica pela duracao do plano;
  - usa `unref()` nos timers para nao prender o Node sozinho.
- O tick atual e somente informativo/read-only.
- Alvos web e email continuam bloqueados para checagem automatica real nesta fase.

## Rotas adicionadas

- `GET /api/agents/watch/jobs`
  - lista jobs do vigia.
- `GET /api/agents/watch/events?limit=50`
  - lista eventos recentes.
- `POST /api/agents/watch/jobs`
  - inicia um job a partir de um `watchPlan` autorizado.
- `POST /api/agents/watch/jobs/:id/cancel`
  - cancela um job ativo ou existente.

## Segurança

- Plano pendente nao inicia worker.
- Plano sem alvo definido nao inicia worker.
- Worker nao executa comandos do usuario.
- Worker nao apaga, move, envia, posta, altera banco, compra, vende ou opera trade.
- Leitura externa automatica de web/email ainda nao foi liberada.

## Testes

Comando executado:

```powershell
npm.cmd test
```

Resultado:

- 65 testes passaram.
- 0 falhas.

Cobertura adicionada:

- `test/watchRunner.test.js`
- Integracao HTTP para iniciar e cancelar job autorizado.
- Integracao garante que o fluxo do worker nao chama Ollama.

## Proximo bloco recomendado

Conectar a UI do Vigia aos jobs ativos e eventos:

- mostrar jobs ativos;
- mostrar eventos recentes;
- botao de cancelar job;
- botao de iniciar job a partir de plano autorizado;
- atualizar historico sem recarregar a pagina.
