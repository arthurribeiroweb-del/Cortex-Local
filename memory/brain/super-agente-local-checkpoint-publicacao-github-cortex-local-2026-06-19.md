# Checkpoint - Publicacao no GitHub como Cortex-Local

Data: 2026-06-19

## Contexto

O projeto, ate entao chamado localmente de "assistant-local-pc" / "Assistente Local",
teve seu nome original confirmado pelo usuario como **Cortex-Local**. Ja existia o
repositorio publico `https://github.com/arthurribeiroweb-del/Cortex-Local` com uma
versao **antiga** (projeto da epoca em que o usuario nao tinha GPU decente, ja apagado
localmente). O pedido foi substituir aquele conteudo antigo pela versao atual.

## Notificacoes locais mais fortes (entregue antes da publicacao)

Implementado apenas em `public/app.js`, no padrao JS-injetado dos blocos anteriores:

- Realce visual: o alerta do Vigia pulsa via `@keyframes watchAlertFlash` quando surge
  uma mudanca nova. Respeita `prefers-reduced-motion`.
- Som opcional: beep "ding-dong" gerado pela Web Audio API (sem arquivo de audio).
  Toggle `Som: on/off` no alerta, persistido em `localStorage` (`jarvisWatchNotifyPrefs`).
- Notificacao do sistema opcional: toggle `Sistema: on/off` usando a Notification API,
  com pedido de permissao e clique que foca a janela e abre a aba Vigia.
- Anti-spam: dispara so quando `latest.id` muda; nao alarma no primeiro carregamento
  (`watchAlertInitialized`).

## Organizacao Git

Diagnostico real encontrado:

- O `.git` de verdade estava em `C:\PROJETOS` (mega-repo "gaveta" com varios projetos
  nao relacionados), que era a origem do erro `dubious ownership`.
- `IA-LOCAL/` estava 100% sem rastreamento nesse repo: o projeto nao tinha historico Git.
- Havia um `IA-LOCAL/.git` vazio (lixo) confundindo a descoberta do git.

Acoes:

1. Removido o `.git` vazio orfao de `IA-LOCAL`.
2. `git init -b main` em `C:\PROJETOS\IA-LOCAL\assistant-local-pc`. Isso isola o projeto:
   `git rev-parse --show-toplevel` agora retorna o proprio projeto e nunca sobe ate
   `C:\PROJETOS`, eliminando o dubious ownership para este projeto.

## Privacidade antes de publicar (repo e PUBLICO)

- Adicionado ao `.gitignore`: `memory/profile.md`, `memory/vault/*`, `memory/index/*`
  (mantendo `.gitkeep`) e `voice/config.json`.
- IP real do servidor (`72.60.1.192`) trocado por IP de documentacao `192.0.2.10` em
  `README.md`, `memory/README.md` e `public/index.html`.
- Varredura confirmou que nenhum perfil, vault, index, `.env`, token ou IP real foi
  para o commit.

## Branding

- `package.json`: name `cortex-local`, descricao atualizada.
- `README.md`: titulo `# Cortex-Local` + nota sobre `memory/` ficar fora do versionamento.

## Publicacao

- Identidade local: `Arthur Ribeiro <arthur.ribeiro.web@gmail.com>`.
- Commit inicial: `9405336` (87 arquivos, sem dados pessoais).
- Autenticacao: chave SSH `~/.ssh/id_ed25519` vinculada pelo usuario em
  github.com/settings/keys. `ssh -T git@github.com` confirmou: `Hi arthurribeiroweb-del`.
- Remote `origin`: `git@github.com:arthurribeiroweb-del/Cortex-Local.git`.
- `git push -u --force origin main`: substituiu o antigo `ab2cbb6` pelo atual `9405336`.
- Branch antiga residual `claude/kind-shamir` (`e730ae8`) removida do remoto.
- Estado final do remoto: apenas `main`, default branch = `main`.

## Verificacoes

```powershell
node --check public\app.js   # OK
node --test                  # 81 testes, 0 falhas
ssh -T git@github.com        # autenticado como arthurribeiroweb-del
```

## Observacao para os proximos projetos

A chave SSH vinculada tem o comentario `claude-daytrader-vps`. Funciona, mas se for
revogada por causa do contexto VPS/DAYTRADER, o push deste projeto tambem para. Opcao
futura: gerar uma chave dedicada so para este PC.

## Estado atual

Cortex-Local publicado e limpo em
`https://github.com/arthurribeiroweb-del/Cortex-Local`, com repo Git proprio isolado de
`C:\PROJETOS`, dados pessoais fora do versionamento e notificacoes locais reforcadas.
