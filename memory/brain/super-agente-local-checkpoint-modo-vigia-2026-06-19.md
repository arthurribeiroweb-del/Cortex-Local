# Checkpoint - Modo vigia seguro

Data: 2026-06-19

## Contexto

O Jarvis local ganhou uma primeira base real do modo vigia. A regra principal deste bloco foi: monitoramento pode ser planejado e auditado, mas nenhuma acao automatica, destrutiva ou externa deve ser executada sem autorizacao explicita e sem um worker seguro implementado.

## Git e workspace

- Checklist Git foi iniciado em `C:\PROJETOS\IA-LOCAL`.
- O remoto da raiz continua apontando para `https://github.com/arthurribeiroweb-del/cargaprime.git`.
- O usuario ja tinha orientado deixar CargaPrime para depois.
- `git fetch --all --prune` falhou com `Permission denied` ao abrir `.git/FETCH_HEAD`.
- `assistant-local-pc` nao tem `.git` proprio e aparece como pasta local dentro da raiz.
- Nao foram revertidas ou limpas mudancas externas do workspace.

## Implementado

- Novo modulo `src/agents/watchPermissions.js`.
- O modulo cria um plano local do vigia com:
  - alvo detectado: logs, caminho local, web, email, status ou desconhecido;
  - intervalo com minimo seguro de 60 segundos;
  - duracao com teto de 240 minutos;
  - acoes permitidas em lista controlada;
  - flag de seguranca indicando que acoes destrutivas nao sao executadas;
  - status `needs_authorization` ou `authorized_plan`.
- O comando explicito `modo vigia` agora vence o modo `simple` padrao da interface, mantendo prioridade maior para imagem e acao perigosa.
- `/api/chat` intercepta modo vigia e responde localmente com plano seguro, sem chamar Ollama.
- `/api/chat/stream` tambem intercepta modo vigia e responde por SSE com plano seguro, sem chamar Ollama.
- Planos do vigia sao salvos em `logs/agent-watch-plans.jsonl`.
- Nova rota:
  - `GET /api/agents/watch/plans?limit=10`

## Garantias atuais

- O modo vigia ainda nao executa monitoramento em background.
- Mesmo com autorizacao textual, a resposta informa que a execucao automatica ainda fica bloqueada ate existir o worker do vigia.
- Padrao do vigia: observar e avisar.
- Bloqueado por design: apagar, enviar, postar, comprar, vender, mover em massa, alterar banco ou operar dinheiro/trade.
- Acoes perigosas continuam caindo no fluxo de confirmacao sensivel antes de qualquer outro caminho.

## Testes

Comando executado:

```powershell
npm.cmd test
```

Resultado:

- 62 testes passaram.
- 0 falhas.

Cobertura adicionada:

- `test/watchPermissions.test.js`
- `/api/chat` gera plano local do vigia sem chamar Ollama.
- `/api/chat/stream` gera plano local do vigia sem chamar Ollama.
- classificador respeita `modo vigia` explicito mesmo quando a interface envia `simple`.

## Proximo bloco recomendado

Construir a UI do vigia em Ajustes:

- aba ou painel "Vigia";
- lista dos ultimos planos salvos;
- status autorizado/pendente;
- alvo, intervalo, duracao e acoes permitidas;
- botao para atualizar historico.

Depois disso, implementar o worker real do vigia com fila local, cancelamento, limites, logs e autorizacao explicita por escopo.
