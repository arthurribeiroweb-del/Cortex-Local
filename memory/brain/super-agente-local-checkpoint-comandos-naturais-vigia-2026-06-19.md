# Checkpoint - Comandos naturais do Vigia

Data: 2026-06-19

## Contexto

O usuario pediu comandos naturais para o Vigia, como "Jarvis, pare o vigia", "mostre vigias ativos" e "revogue autorizacao desse alvo". Este bloco implementou interpretacao local desses comandos sem chamar Ollama.

## Git e workspace

- A checagem Git obrigatoria foi tentada em `C:\PROJETOS\IA-LOCAL`.
- Git continua bloqueado por `fatal: detected dubious ownership in repository at 'C:/PROJETOS'`.
- Nao foi alterada configuracao global de Git.
- O trabalho continuou somente em `assistant-local-pc`.

## Implementado

- Novo modulo `src/agents/watchCommands.js`.
- Comandos naturais reconhecidos:
  - `Jarvis, mostre vigias ativos`;
  - `Jarvis, pare o vigia`;
  - `Jarvis, mostre autorizacoes do vigia`;
  - `Jarvis, revogue autorizacao dos logs`.
- Os comandos sao processados localmente em:
  - `/api/chat`;
  - `/api/chat/stream`.
- Nenhum desses comandos chama Ollama.

## Comportamento

- `list_jobs`:
  - lista apenas jobs `running`.
- `stop_jobs`:
  - cancela todos os jobs ativos do Vigia.
- `list_authorizations`:
  - lista autorizacoes do Vigia com status e expiracao.
- `revoke_authorization`:
  - revoga autorizacoes ativas que batem com o alvo indicado;
  - atualmente detecta bem `logs`, `email`, `web/site/url` e caminhos.

## Segurança

- Comandos do Vigia continuam limitados a operacoes locais do proprio Vigia.
- Parar Vigia apenas cancela jobs ativos.
- Revogar autorizacao apenas remove permissao futura.
- Nada executa comandos do sistema.
- Nada apaga, move, posta, envia ou altera arquivo monitorado.

## Testes

Comando executado:

```powershell
npm.cmd test
```

Resultado:

- 81 testes passaram.
- 0 falhas.

Cobertura adicionada:

- deteccao de comandos naturais;
- ignorar mensagens fora do Vigia;
- match de autorizacao por alvo;
- formatacao de vigias ativos;
- integracao HTTP para listar jobs via chat;
- listar autorizacoes via chat;
- parar Vigia via chat;
- revogar autorizacao dos logs via chat;
- garantia indireta de que nao chama Ollama.

## Estado atual

O Vigia agora pode ser controlado por comandos naturais basicos dentro da conversa principal.

## Proximo bloco recomendado

Notificacoes locais mais fortes:

- som opcional;
- realce visual mais forte no alerta principal;
- configuracao para ligar/desligar notificacoes;
- sem notificacao externa por padrao.
