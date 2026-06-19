# Checkpoint - Autorizacoes persistentes do Vigia

Data: 2026-06-19

## Contexto

O usuario pediu autorizacoes persistentes por escopo para o modo vigia: guardar permissoes por alvo, duracao e acoes permitidas. Este bloco adicionou um store local de autorizacoes e integrou isso ao plano e ao start do worker.

## Git e workspace

- A checagem Git obrigatoria foi tentada em `C:\PROJETOS\IA-LOCAL`.
- Git continua bloqueado por `fatal: detected dubious ownership in repository at 'C:/PROJETOS'`.
- Nao foi alterada configuracao global de Git.
- O trabalho continuou somente em `assistant-local-pc`.

## Implementado

- Novo modulo `src/agents/watchAuthorizations.js`.
- Novo log persistente:
  - `logs/agent-watch-authorizations.jsonl`
- Cada autorizacao guarda:
  - `id`;
  - `scopeKey`;
  - alvo (`target`);
  - acoes permitidas;
  - intervalo;
  - duracao;
  - criacao;
  - expiracao;
  - revogacao;
  - pergunta de origem.
- O escopo combina:
  - tipo do alvo;
  - valor do alvo;
  - lista ordenada de acoes.
- Planos autorizados explicitamente criam autorizacao persistente.
- Planos futuros equivalentes podem reutilizar autorizacao ativa sem nova frase de autorizacao.
- Autorizacao expirada ou revogada nao autoriza plano.
- O start do worker agora exige autorizacao persistente ativa.
- Um plano antigo com `authorizationId` revogado nao inicia job.

## Rotas adicionadas

- `GET /api/agents/watch/authorizations`
  - lista autorizacoes ativas, expiradas e revogadas.
- `GET /api/agents/watch/authorizations?activeOnly=true`
  - lista apenas ativas.
- `POST /api/agents/watch/authorizations/:id/revoke`
  - revoga uma autorizacao.

## Segurança

- Nao existe endpoint amplo para criar autorizacao arbitraria.
- A criacao ocorre pelo fluxo de plano autorizado do chat.
- Start do worker valida autorizacao ativa no store local.
- Revogacao impede iniciar novos jobs com aquele escopo.
- Autorizacoes sao locais e persistidas em JSONL.

## Testes

Comando executado:

```powershell
npm.cmd test
```

Resultado:

- 75 testes passaram.
- 0 falhas.

Cobertura adicionada:

- criacao de autorizacao com expiracao;
- reaproveitamento de escopo equivalente;
- revogacao;
- sink de persistencia;
- restauracao do ultimo estado por id;
- integracao HTTP para listar e revogar;
- start do worker negado apos revogacao.

## Estado atual

O Vigia agora tem:

- plano seguro;
- autorizacao persistente por escopo;
- revogacao;
- worker validado por autorizacao ativa;
- logs de planos, eventos/jobs e autorizacoes;
- UI de alertas e eventos.

## Proximo bloco recomendado

UI de autorizacoes do Vigia:

- mostrar autorizacoes ativas/expiradas/revogadas;
- botao revogar;
- mostrar expiracao;
- destacar escopo e acoes permitidas.
