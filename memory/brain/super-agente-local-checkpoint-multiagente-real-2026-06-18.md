# Checkpoint: fluxo multiagente real

Data: 2026-06-18

## Status

O Jarvis agora executa o primeiro fluxo multiagente real no backend.

Antes, o sistema apenas classificava a tarefa e registrava quais agentes participariam. Agora, em modos nao simples, o backend chama agentes internos selecionados pelo orquestrador, junta as contribuicoes, passa pelo critico e gera uma sintese final.

## O que foi implementado

- Execucao real de agentes internos para modo profundo/codigo/auditoria.
- Cada agente recebe prompt proprio com papel, contexto, memoria, brain e decisao do orquestrador.
- Cada agente tenta usar seu modelo configurado.
- Se o modelo do agente falhar, o agente usa fallback para `DRAFT_MODEL`.
- O critico revisa as contribuicoes dos agentes.
- A resposta final e sintetizada a partir do debate, critica, memoria, brain e web check quando houver.
- O debate interno completo fica salvo apenas em memoria de sessao.
- O debate nao aparece por padrao na resposta normal.
- O comando `Jarvis, mostre o debate interno` retorna o debate salvo.

## Arquivos alterados

- `server.js`
- `test/chatOrchestration.integration.test.js`

## Fluxo atual

1. Usuario envia pergunta.
2. `createChatPlan()` classifica a tarefa.
3. O orquestrador escolhe agentes.
4. Agentes executaveis respondem individualmente.
5. As contribuicoes viram o draft interno.
6. O critico revisa.
7. A web pode ser acionada se necessario.
8. O modelo final sintetiza a resposta.
9. O debate interno e salvo em `lastAgentDebate`.
10. O usuario pode pedir para ver o debate interno.

## Regras de exposicao

Por padrao, a resposta da API nao inclui o debate completo.

O debate so aparece:

- quando o usuario pede explicitamente;
- ou quando debug estiver ativo.

## Testes

Resultado:

```text
npm test
47 testes
47 passando
0 falhas
```

Cobertura nova:

- modo profundo executa agentes reais;
- resposta normal nao expoe debate completo;
- comando para mostrar debate interno retorna o debate salvo.

## Proximo passo recomendado

Expor no status do sistema a disponibilidade dos modelos de cada agente, para saber rapidamente quais modelos do conselho interno estao instalados no Ollama e quais precisam de `ollama pull`.
