# Checkpoint - UI do modo vigia

Data: 2026-06-19

## Contexto

Depois da base segura do modo vigia, foi implementado o painel visual para acompanhar os planos salvos. O objetivo foi permitir auditoria do que o Jarvis entendeu como monitoramento antes de criar qualquer worker em background.

## Git e permissoes

- A checagem Git obrigatoria foi tentada em `C:\PROJETOS\IA-LOCAL`.
- O Git bloqueou a raiz com `fatal: detected dubious ownership in repository at 'C:/PROJETOS'`.
- Nao foi alterada configuracao global de Git.
- `git fetch --all --prune`, `git log` e `git diff --stat` tambem ficaram bloqueados por esse estado.
- `public/index.html` e `public/styles.css` negaram escrita pelo Windows durante a edicao.
- Para manter o bloco andando sem mexer em permissoes do sistema, a aba e os estilos do Vigia foram injetados via `public/app.js`.

## Implementado

- `public/app.js` agora cria dinamicamente a aba `Vigia` dentro de Ajustes.
- O painel do Vigia mostra:
  - botao `Atualizar vigia`;
  - status de carregamento;
  - lista dos ultimos planos do vigia;
  - alvo;
  - tipo do alvo;
  - intervalo;
  - duracao;
  - status autorizado ou pendente;
  - acoes permitidas;
  - nota de seguranca.
- O painel carrega dados de:
  - `GET /api/agents/watch/plans?limit=10`
- Ao abrir a aba `Vigia`, o historico carrega automaticamente.
- O botao `Atualizar vigia` recarrega os planos.
- Os estilos do painel foram adicionados por `ensureWatchSettingsStyles()` no JS por causa do bloqueio de escrita em `styles.css`.

## Verificacoes

Comandos executados:

```powershell
node --check public\app.js
npm.cmd test
```

Resultado:

- `public/app.js` sem erro de sintaxe.
- 62 testes passaram.
- 0 falhas.

## Estado atual

O modo vigia agora tem:

- classificador;
- plano seguro local;
- persistencia em JSONL;
- API de historico;
- painel visual em Ajustes.

Ainda nao existe worker real executando monitoramento em background.

## Proximo bloco recomendado

Implementar o worker real do vigia com:

- fila local em memoria;
- iniciar plano autorizado;
- listar planos ativos;
- cancelar plano ativo;
- tick controlado por intervalo;
- eventos salvos em log;
- sem acoes destrutivas;
- sem executar comandos arbitrarios do usuario.
