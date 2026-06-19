# Plano mestre: Super Agente Local Multiagente

Data: 2026-06-18

## Objetivo

Transformar o Jarvis local atual em um super agente local multiagente, usando Ollama, RTX 3090 24 GB e os modelos ja disponiveis, sem recriar o projeto do zero.

O Jarvis deve deixar de ser apenas um chatbot com um modelo unico e passar a funcionar como um conselho interno de especialistas. Para perguntas simples, ele responde rapido. Para perguntas importantes, complexas, tecnicas, estrategicas, de negocio, risco, programacao ou decisao, ele ativa um fluxo multiagente com analise, debate, auditoria e sintese final.

## Principio central

O sistema nao deve chamar varios agentes sempre. O orquestrador deve decidir quando vale a pena.

- Pergunta simples: resposta direta com um modelo so.
- Pergunta importante: ativa conselho interno de agentes.
- Pedido perigoso: explica risco e pede confirmacao antes de executar.
- Informacao atual: pesquisa antes de responder.
- Codigo complexo: chama especialista de codigo e auditor.
- Imagem ou print: chama agente de visao.

## Modelos disponiveis

- `qwen3.6:27b`: modelo principal geral, conselheiro, planejamento, conversa e decisoes.
- `qwen3-coder:30b`: especialista em programacao, arquitetura, bugs, codigo e sistemas.
- `qwen3-vl:32b`: especialista em visao, prints, telas, imagens, interfaces e documentos visuais.
- `deepseek-r1:32b`: especialista em raciocinio profundo, logica, decisao dificil, matematica, analise pesada e planejamento.
- `devstral-small-2:latest`: especialista alternativo em agentes, automacao, ferramentas e codigo.
- `mistral-small3.2:24b`: agente critico/auditor, revisao, discordancia, riscos e falhas.
- `gemma4:31b`: segundo conselheiro geral para comparacao de ideias e validacao.
- `mistral:7b`: modelo leve para modo rapido ou fallback.
- `qwen2.5-coder:7b`: modelo leve para codigo rapido ou fallback.

## Agentes propostos

- Orquestrador: decide modo, agentes, ferramentas, risco e ordem de execucao.
- Conselheiro Geral: analisa contexto geral, estrategia e resposta principal.
- Programador: arquitetura, bugs, implementacao, refatoracao e testes.
- Especialista de Automacao: ferramentas, comandos, fluxos, integracoes e execucao local.
- Especialista de Visao: interpreta imagens, prints, telas e layouts.
- Raciocinio Profundo: problemas dificeis, logica, matematica, decisao e planejamento.
- Critico/Auditor: procura erro, risco, contradicao, suposicao fraca e alucinacao.
- Validador Geral: compara ideias e valida a qualidade da resposta.
- Pesquisador Web: busca informacao atual quando necessario.
- Vigia: monitora apenas itens autorizados pelo usuario e nao executa acoes destrutivas sem confirmacao.

## Modos do sistema

### Modo Rapido

- Usa um modelo so.
- Responde direto.
- Serve para perguntas simples.
- Deve priorizar velocidade e fluidez.

### Modo Profundo

- Ativa multiplos agentes.
- Usa modelos melhores.
- Aceita demorar mais.
- Prioriza qualidade, analise, debate e auditoria.

### Modo Codigo

- Usa `qwen3-coder:30b`.
- Pode chamar `devstral-small-2:latest`.
- Para casos complexos, deve chamar tambem o agente critico.
- Deve revisar arquitetura, bugs, codigo, testes e riscos de alteracao.

### Modo Visao

- Usa `qwen3-vl:32b`.
- Analisa prints, imagens, telas, documentos visuais e interfaces.
- Deve ser acionado quando houver anexo visual ou pedido explicito de analise visual.

### Modo Auditor

- Usa `mistral-small3.2:24b` ou `deepseek-r1:32b`.
- Critica respostas, decisoes, codigo e planos.
- Deve apontar riscos, erros, suposicoes, contradicoes e alternativas melhores.

### Modo Vigia

- Monitora apenas coisas autorizadas pelo usuario.
- Pode acompanhar emails, logs, servicos, projetos, agenda e alertas.
- Nunca deve executar acoes destrutivas sem confirmacao explicita.

## Regras de decisao do orquestrador

Se a pergunta for simples:

- responder com `qwen3.6:27b`, `mistral:7b` ou outro modelo leve configurado.

Se for programacao:

- chamar `qwen3-coder:30b`;
- se for complexo, chamar tambem `devstral-small-2:latest` e agente critico.

Se envolver imagem ou print:

- chamar `qwen3-vl:32b`.

Se for decisao importante:

- chamar Conselheiro Geral, Raciocinio Profundo e Critico.

Se for negocio, marketing, vendas ou estrategia:

- chamar Conselheiro Geral, agente de negocio/estrategia e Critico.

Se depender de informacao atual:

- chamar Pesquisador Web antes de responder;
- nunca fingir que pesquisou se nao pesquisou.

Se for comando perigoso:

- explicar o risco;
- pedir confirmacao antes de executar.

## Fluxo multiagente recomendado

1. Analise inicial

O Orquestrador entende a pergunta, classifica complexidade, identifica riscos e escolhe agentes.

2. Respostas individuais

Cada agente responde separadamente, com sua especialidade. Nessa etapa, os agentes nao devem ver a resposta dos outros para evitar contaminacao.

3. Debate

Os agentes recebem os resumos uns dos outros e podem concordar, discordar ou complementar.

4. Auditoria

O Critico revisa tudo e aponta:

- erros;
- riscos;
- suposicoes;
- contradicoes;
- pontos fracos;
- informacao inventada;
- alternativas melhores.

5. Sintese final

O Orquestrador consolida as melhores ideias em uma resposta clara para o usuario.

## O que o usuario deve ver por padrao

Por padrao, o usuario nao precisa ver todo o debate interno. A resposta deve mostrar:

- resposta final;
- agentes usados;
- recomendacao principal;
- riscos;
- proximos passos;
- nivel de confianca, quando fizer sentido.

Formato exemplo:

```text
Agentes usados:
- Conselheiro Geral: qwen3.6:27b
- Programador: qwen3-coder:30b
- Critico: mistral-small3.2:24b
- Raciocinio: deepseek-r1:32b

Modo: Profundo
Confianca: Alta
```

O usuario deve poder pedir:

```text
Jarvis, mostre o debate interno.
```

## Logs e transparencia

Para cada resposta complexa, registrar internamente:

- pergunta do usuario;
- data e hora;
- modo escolhido;
- agentes participantes;
- modelo usado por cada agente;
- se houve pesquisa web;
- se houve visao;
- se houve auditoria;
- tempo aproximado;
- resumo da decisao do orquestrador;
- resposta final;
- debate interno, quando houver.

## Regras de seguranca

O Jarvis nunca deve fazer sem confirmacao:

- apagar arquivos;
- apagar emails;
- enviar emails;
- postar em redes sociais;
- alterar banco de dados;
- executar comandos destrutivos;
- alterar configuracoes criticas;
- mover arquivos em massa;
- fazer operacao financeira ou trade;
- acessar dados sensiveis fora do escopo autorizado.

O Jarvis tambem nunca deve:

- inventar informacao;
- esconder incerteza;
- fingir que pesquisou quando nao pesquisou;
- dizer que executou algo quando nao executou.

Formato ideal para confirmacao:

```text
Essa acao pode alterar arquivos permanentemente.

Acao proposta:
Apagar a pasta X.

Risco:
Perda irreversivel de dados.

Deseja confirmar?
```

## Fases de implementacao

### Fase 0: Diagnostico do projeto atual

Antes de alterar codigo, mapear:

- onde fica o chat principal;
- onde o Ollama e chamado;
- como o historico da conversa e salvo;
- se ja existem ferramentas;
- como comandos sao executados;
- onde ficam configuracoes;
- como a interface exibe respostas;
- se existe backend separado da interface.

Entrega:

- relatorio curto do funcionamento atual;
- mapa dos arquivos principais;
- ponto ideal para encaixar o orquestrador;
- riscos de alteracao;
- primeira implementacao segura.

### Fase 1: Configuracao de modelos e agentes

Criar configuracao central para agentes e modelos, com:

- nome do agente;
- papel;
- modelo Ollama;
- temperatura;
- limite de tokens;
- prompt base;
- prioridade;
- quando deve ser usado;
- se pode usar ferramentas;
- se pode executar acoes.

Possiveis arquivos:

- `src/agents/agentsConfig.js`
- `src/agents/modelsConfig.js`
- `src/agents/prompts/*.md`

### Fase 2: Classificador de tarefa

Criar um classificador que recebe a mensagem do usuario e retorna uma decisao estruturada:

```json
{
  "complexidade": "alta",
  "modo": "profundo",
  "precisa_codigo": false,
  "precisa_web": false,
  "precisa_visao": false,
  "precisa_auditoria": true,
  "precisa_confirmacao": false,
  "agentes": ["conselheiro", "raciocinio", "critico"]
}
```

Categorias principais:

- `simples`
- `profundo`
- `codigo`
- `visao`
- `negocio`
- `risco`
- `pesquisa_web`
- `acao_perigosa`
- `modo_vigia`
- `auditoria`

### Fase 3: Orquestrador principal

Criar o modulo central do novo Jarvis.

Responsabilidades:

- receber mensagem do usuario;
- consultar classificador;
- escolher modo e agentes;
- chamar modelos certos;
- controlar ordem do debate;
- guardar logs;
- pedir confirmacao se houver risco;
- gerar resposta final consolidada.

Fluxo:

```text
Usuario
  -> Orquestrador
  -> Classificador de tarefa
  -> Escolha dos agentes
  -> Execucao individual
  -> Debate, se necessario
  -> Auditoria
  -> Sintese final
  -> Resposta ao usuario
```

### Fase 4: Modo rapido e modo profundo

Implementar primeiro:

- modo rapido com modelo unico;
- modo profundo com multiplos agentes, ainda sem debate completo;
- exibicao simples dos agentes usados.

### Fase 5: Debate multiagente real

Adicionar:

- respostas individuais;
- rodada de debate;
- consolidacao das discordancias;
- resumo interno armazenado em log.

### Fase 6: Agente critico/auditor

Implementar auditor com saida estruturada:

```json
{
  "erros_possiveis": [],
  "riscos": [],
  "suposicoes": [],
  "contradicoes": [],
  "informacao_incerta": [],
  "melhorias": [],
  "veredito": "aprovado_com_ressalvas"
}
```

O auditor deve ser obrigatorio em tarefas importantes.

### Fase 7: Logs e debate interno

Salvar:

- agentes usados;
- modelos usados;
- decisoes do orquestrador;
- auditoria;
- resposta final;
- debate interno.

Adicionar comando:

```text
Jarvis, mostre o debate interno.
```

### Fase 8: Web, visao e modo vigia

Adicionar por ultimo:

- pesquisador web para informacao atual;
- agente de visao para imagens;
- modo vigia com autorizacoes explicitas.

## Ordem ideal de implementacao

1. Diagnosticar projeto atual.
2. Criar configuracao de agentes/modelos.
3. Criar classificador de tarefa.
4. Criar orquestrador basico.
5. Implementar modo rapido.
6. Implementar modo profundo sem debate completo.
7. Adicionar agente critico.
8. Adicionar debate multiagente.
9. Adicionar logs e comando para mostrar debate interno.
10. Adicionar camada de seguranca.
11. Adicionar visao.
12. Adicionar web.
13. Adicionar modo vigia.
14. Testar tudo com casos reais.

## Testes reais obrigatorios

Criar testes com:

- pergunta simples;
- pedido de codigo;
- decisao de negocio;
- analise de risco;
- analise de print;
- pedido perigoso;
- pedido que exige web;
- pedido que deve ativar debate;
- pedido que deve ficar no modo rapido.

Cada teste deve validar:

- modo escolhido;
- agentes chamados;
- resposta final;
- logs gerados;
- seguranca;
- tempo de resposta.

## Recomendacao principal

Nao comecar pelo debate. Comecar por:

1. diagnostico do projeto atual;
2. configuracao de agentes/modelos;
3. classificador de tarefa;
4. orquestrador basico;
5. logs dos agentes usados.

Esse nucleo vira a fundacao. Depois disso, cada agente novo encaixa de forma limpa e testavel.

## Primeira etapa recomendada

Gerar um relatorio tecnico curto do projeto atual com:

- como funciona hoje;
- onde o Ollama e chamado;
- onde entra o chat;
- onde entra o historico;
- onde entram ferramentas;
- onde encaixar o orquestrador;
- quais arquivos devem ser alterados;
- quais riscos existem;
- qual MVP implementar primeiro.

Depois disso, implementar em etapas pequenas e testar cada uma.
