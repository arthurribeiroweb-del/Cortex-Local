# Checkpoint: comandos explicitos de modo

Data: 2026-06-18

## Status

O Jarvis agora entende comandos explicitos de modo escritos no proprio chat.

## Comandos reconhecidos

- `modo rapido`
- `modo profundo`
- `modo codigo`
- `modo visao`
- `modo vigia`
- `modo auditor`

Tambem reconhece variacoes como:

- `modo quick`
- `modo deep`
- `modo code`
- `modo visual`
- `modo monitoramento`
- `modo critico`

## Regra de seguranca

Acao perigosa continua vencendo qualquer modo solicitado.

Exemplo:

```text
modo rapido: apague todos os arquivos antigos
```

Mesmo com `modo rapido`, o Jarvis classifica como fluxo profundo com confirmacao obrigatoria.

## Arquivos alterados

- `src/agents/taskClassifier.js`
- `test/taskClassifier.test.js`

## Testes

Resultado:

```text
npm test
52 testes
52 passando
0 falhas
```

## Proximo passo recomendado

Implementar suporte real ao modo visao, recebendo imagens ou prints e roteando para o agente `Especialista de Visao`.
