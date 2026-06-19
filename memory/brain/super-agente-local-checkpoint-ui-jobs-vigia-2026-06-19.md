# Checkpoint - UI de jobs e eventos do Vigia

Data: 2026-06-19

## Contexto

Depois do worker local do modo vigia, a UI foi conectada aos jobs ativos e eventos recentes. Como `public/index.html` e `public/styles.css` continuam bloqueados para escrita pelo Windows, a solucao segue concentrada em `public/app.js`, que injeta a aba, o painel e os estilos.

## Implementado

- A aba `Vigia` em Ajustes agora mostra tres blocos:
  - planos recentes;
  - jobs ativos/recentes;
  - eventos recentes.
- Ao abrir a aba, o frontend carrega:
  - `GET /api/agents/watch/plans?limit=10`
  - `GET /api/agents/watch/jobs`
  - `GET /api/agents/watch/events?limit=10`
- Planos autorizados exibem botao `Iniciar vigia`.
- Jobs com status `running` exibem botao `Cancelar vigia`.
- Depois de iniciar ou cancelar, jobs e eventos sao recarregados.
- O painel exibe:
  - alvo;
  - status;
  - ticks;
  - inicio;
  - ultimo tick;
  - proximo tick;
  - ultima mensagem/evento.

## Segurança

- A UI so chama a rota de iniciar usando um `watchPlan` ja autorizado.
- O backend continua rejeitando plano pendente ou sem alvo.
- O worker continua sem executar comandos do usuario.

## Verificacoes

Comandos executados:

```powershell
node --check public\app.js
npm.cmd test
```

Resultado:

- `public/app.js` sem erro de sintaxe.
- 65 testes passaram.
- 0 falhas.

## Estado atual

O modo vigia agora tem:

- plano seguro;
- persistencia de planos;
- painel de planos;
- worker local em memoria;
- API de jobs;
- API de eventos;
- UI para iniciar e cancelar jobs.

## Proximo bloco recomendado

Persistir eventos/jobs em arquivo JSONL e restaurar estado recente ao reiniciar o servidor, sem reiniciar jobs automaticamente sem nova autorizacao.
