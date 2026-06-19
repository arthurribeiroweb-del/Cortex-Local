# Checkpoint: orquestrador inicial conectado

Data: 2026-06-18

## Status

O Jarvis agora tem a primeira versao funcional do orquestrador local conectada ao chat.

Esta etapa nao implementa ainda debate multiagente completo, mas finaliza a fundacao obrigatoria:

- configuracao de agentes/modelos;
- classificador de tarefas;
- plano de orquestracao;
- exposicao de agentes usados na resposta;
- logs com metadados de orquestracao;
- trava de confirmacao para acao perigosa.

## Arquivos criados

- `src/agents/agentsConfig.js`
- `src/agents/taskClassifier.js`
- `src/agents/orchestrator.js`
- `test/taskClassifier.test.js`
- `test/orchestrator.test.js`
- `test/chatOrchestration.integration.test.js`

## Arquivos alterados

- `server.js`
- `public/app.js`

## O que mudou no backend

O endpoint `/api/chat` agora usa `createChatPlan()` para:

- classificar a mensagem;
- decidir modo interno;
- definir agentes participantes;
- montar metadados de orquestracao;
- devolver `orchestration` e `agentsUsed`;
- registrar essas informacoes nos logs.

Mapeamento temporario para o motor atual:

- `quick` -> `simple`
- `audit` -> `critical`
- `deep`, `code`, `vision`, `watch` -> `deliberate`

Esse mapeamento mantem compatibilidade com o pipeline existente enquanto o debate multiagente real ainda nao foi implementado.

## Seguranca adicionada

Se o classificador detectar acao perigosa, o Jarvis nao chama o Ollama e nao tenta executar nada.

Ele retorna uma resposta local pedindo confirmacao explicita.

Isso vale para:

- `/api/chat`
- `/api/chat/stream`

Exemplos de acoes sensiveis detectadas:

- apagar arquivos;
- deletar;
- mover tudo;
- limpar banco;
- `drop table`;
- enviar email;
- postar;
- executar trade;
- alterar banco.

## O que mudou na interface

Quando o modo esta em `Auto`, a interface agora envia `auto` para o backend.

O backend passa a ser a fonte da decisao.

A interface tambem mostra chips simples como:

- `Modo quick`
- `Modo code`
- `3 agentes`
- `Multi-modelo`

## Testes

Resultado da validacao:

```text
npm test
46 testes
46 passando
0 falhas
```

Cobertura adicionada:

- classificacao de tarefas;
- plano de orquestracao;
- mapeamento de modos;
- retorno de agentes usados;
- bloqueio de acao perigosa antes do Ollama.

## Proximo passo recomendado

Criar o primeiro fluxo multiagente real dentro do orquestrador:

1. executar agente Conselheiro Geral;
2. executar agente Critico;
3. consolidar resposta final;
4. salvar debate interno resumido;
5. permitir mostrar debate interno quando o usuario pedir.

Ainda nao chamar todos os modelos grandes de uma vez. Comecar sequencial e pequeno.
