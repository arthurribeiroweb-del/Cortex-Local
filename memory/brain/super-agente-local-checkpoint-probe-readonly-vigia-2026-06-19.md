# Checkpoint - Probe read-only do Vigia

Data: 2026-06-19

## Contexto

Depois da persistencia de jobs/eventos, o modo vigia ganhou checagem real read-only para alvos `path` e `logs`. A implementacao continua sem ler conteudo de arquivos por padrao e sem executar comandos do usuario.

## Implementado

- Novo modulo `src/agents/watchProbe.js`.
- O probe read-only coleta apenas metadados:
  - existencia;
  - tipo: arquivo, pasta, outro ou ausente;
  - tamanho;
  - data de modificacao;
  - quantidade de itens quando for pasta;
  - assinatura de mudanca.
- `src/agents/watchRunner.js` agora:
  - chama o probe em cada tick;
  - guarda `lastSnapshot` no job;
  - registra evento `changed` quando a assinatura muda;
  - inclui detalhes do probe no evento;
  - continua usando `tick` quando nada mudou.
- `src/agents/watchPermissions.js` corrigiu o parser de caminho para nao engolir o trecho `a cada`, `por` ou `durante` como parte do caminho.

## Segurança

- O probe nao le conteudo do arquivo.
- O probe nao executa comandos.
- O probe nao altera arquivos.
- Alvos web/email continuam sem execucao automatica real.
- Mudancas sao detectadas por metadados, nao por leitura de conteudo.

## Testes

Comando executado:

```powershell
npm.cmd test
```

Resultado:

- 70 testes passaram.
- 0 falhas.

Cobertura adicionada:

- resolucao de caminho relativo;
- leitura read-only de metadados;
- deteccao de mudanca em arquivo temporario;
- evento `changed` no runner;
- parser de caminho preserva somente o caminho real.

## Estado atual

O modo vigia agora consegue:

- criar plano seguro;
- iniciar/cancelar worker;
- persistir eventos/jobs;
- restaurar historico sem religar jobs;
- monitorar metadados read-only de caminho/logs;
- detectar mudanca entre ticks.

## Proximo bloco recomendado

Melhorar a UI do Vigia para destacar eventos `changed`:

- badge visual para `changed`;
- filtro por tipo de evento;
- botao para copiar resumo do evento;
- resumo humano do que mudou com base nos metadados.
