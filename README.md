# Cortex-Local

Cortex-Local é um assistente local multiagente para Windows usando Node.js, Express, Ollama, voz local opcional com Python, memória local em Markdown e verificação web sob demanda.

> A pasta `memory/` guarda dados pessoais (perfil, vault de negócio, IPs de servidor) e por isso é mantida fora do controle de versão pelo `.gitignore`. Cada instalação cria a sua própria memória local.

A versão texto continua rodando em `http://localhost:3000`. A camada de voz usa `voice/voice_agent.py`, mas agora é controlada pelo navegador: a interface inicia, para, mostra logs e permite editar `voice/config.json`. A memória local fica em `memory/`, com arquivos `.md` editáveis no navegador, Obsidian ou VS Code. A verificação web só roda quando você pedir; por padrão ela usa DuckDuckGo sem chave de API. Não há login, banco de dados, PWA, app Android, Web Speech API ou embeddings.

## Requisitos Da Versão Texto

- Windows.
- Node.js 18 ou superior.
- Ollama instalado e rodando.
- Modelo `qwen2.5:3b` baixado no Ollama.

## Instalar

```bash
npm install
```

## Rodar

```bash
npm start
```

Depois abra no navegador:

```text
http://localhost:3000
```

## Acesso E Segurança

Por padrão o servidor sobe em `HOST=127.0.0.1` (só o próprio PC). Para acessar pelo
celular na mesma rede, use `HOST=0.0.0.0` no `.env` — mas aí o servidor fica aberto
para qualquer dispositivo da rede.

Quando expor na rede, defina um token de acesso no `.env`:

```env
HOST=0.0.0.0
AUTH_TOKEN=um-token-bem-grande-e-secreto
```

Com `AUTH_TOKEN` definido, todas as rotas `/api` (exceto `/api/health`) exigem o token.
O navegador pede o token uma vez e o guarda localmente; para GETs diretos (áudio) o token
vai como `?token=`. Sem `AUTH_TOKEN`, o acesso continua aberto e o servidor avisa no boot
quando está exposto na rede sem token.

## Testes

A lógica pura (config, grounding, crítico e parser de streaming) tem testes com o runner nativo do Node, sem dependências extras:

```bash
npm test
```

## Streaming De Tokens

No modo `Simples` (o padrão para perguntas curtas) a resposta é transmitida token a token via SSE pelo endpoint `POST /api/chat/stream`, então o texto aparece conforme é gerado. Os modos `Deliberado` e `Crítico` continuam usando `POST /api/chat` (JSON), pois rodam o pipeline draft → crítico → web antes da resposta final.

## Verificar O Ollama

Liste os modelos instalados:

```bash
ollama list
```

Se o modelo não existir, baixe com:

```bash
ollama pull qwen2.5:3b
```

## Testar APIs

Saúde geral:

```text
http://localhost:3000/api/health
```

Status da camada de voz:

```text
http://localhost:3000/api/voice/status
```

Iniciar voz pela API, quando a configuração já estiver salva:

```text
POST http://localhost:3000/api/voice/start
```

Parar voz:

```text
POST http://localhost:3000/api/voice/stop
```

Verificar resposta na internet:

```text
POST http://localhost:3000/api/web/check
```

Correções do brain:

```text
http://localhost:3000/api/brain/corrections
```

Lista de arquivos da memória:

```text
http://localhost:3000/api/memory
```

## Logs

Cada conversa é salva em UTF-8 no arquivo:

```text
logs/conversations.jsonl
```

Cada linha é um JSON válido com data/hora, modelo, pergunta, resposta, tempo total, tokens por segundo, tokens gerados e tokens do prompt quando disponível.

Quando a memória participa, o log também registra arquivos consultados, quantidade de trechos usados e se a mensagem foi um comando de memória.

## Memória Local 2.1

A memória fica em:

```text
memory/
```

Leia o guia completo:

```text
memory/README.md
```

Ela funciona como um vault estilo Obsidian:

- `memory/profile.md`: fatos permanentes sobre o usuário.
- `memory/instructions.md`: instruções permanentes do JARVIS.
- `memory/vault/`: base de conhecimento por assunto.
- `memory/index/`: metadados simples da memória.

No navegador, use a área `Memória` para abrir, editar e salvar arquivos `.md`.

Você também pode abrir a pasta abaixo no Obsidian:

```text
C:\PROJETOS\IA-LOCAL\assistant-local-pc\memory
```

Comandos aceitos no chat e por voz:

```text
lembre que meu servidor TraccarPro é 192.0.2.10
memorize que prefiro respostas curtas
guarde que a porta do rastreador X é 5023
salve na memória que ...
anote que ...
```

Como a voz envia a transcrição para `/api/chat`, esses comandos também funcionam falando com o JARVIS.

Limitações da 2.1:

- Busca simples por palavra-chave.
- Ainda não usa embeddings.
- Pode não encontrar informações escritas com sinônimos.
- Envia no máximo 5 trechos relevantes para o modelo.

## Verificação Web 2.2

Leia o guia completo:

```text
docs/web-check.md
```

Variáveis novas no `.env`:

```env
DEFAULT_MODEL=qwen2.5:3b
DRAFT_MODEL=qwen2.5:3b
CRITIC_MODEL=mistral:7b
FINAL_MODEL=qwen2.5:3b
WEB_SEARCH_PROVIDER=duckduckgo
TAVILY_API_KEY=
BRAVE_SEARCH_API_KEY=
SEARXNG_URL=http://localhost:8080
WEB_SEARCH_MAX_RESULTS=5
WEB_SEARCH_TIMEOUT_MS=12000
```

Provedores suportados:

- `duckduckgo`: padrao. Pesquisa sem chave usando a pagina HTML publica do DuckDuckGo.
- `none`: nao pesquisa e nao finge que pesquisou.
- `tavily`: usa Tavily Search API.
- `brave`: usa Brave Search API.
- `searxng`: usa uma instância local do SearXNG com JSON habilitado.

Comandos no chat ou por voz:

```text
tem certeza?
acho que você está errado
confere isso na internet
verifica essa resposta
salva essa correção
```

Arquivos do brain:

```text
memory/brain/corrections.md
memory/brain/verified-facts.md
memory/brain/web-research/
```

Toda verificação web salva um histórico em `memory/brain/web-research/`. Correções permanentes só devem ser salvas quando forem úteis e com fonte.

## Árbitro De Divergência 2.5

O modo `Deliberado` usa três etapas:

```text
qwen2.5:3b draft
mistral:7b critic
qwen2.5:3b final
```

Se a crítica indicar resposta errada, arriscada, baixa confiança ou necessidade de informação atual, o backend aciona a busca web automaticamente antes da resposta final.

Modos na interface:

- `Deliberado`: fluxo normal com crítica e web automática quando necessário.
- `Crítico`: crítica mais rigorosa; qualquer dúvida factual/técnica relevante pode acionar web.
- `Simples`: resposta local direta, útil para diagnóstico.
- `Debug`: mostra draft, crítica, decisão do árbitro, fontes e resposta final.

Resposta da API `/api/chat` inclui `webCheck`, `models` e, quando `debug=true`, o bloco `debug`.

Logs da arbitragem entram em:

```text
logs/conversations.jsonl
```

com `type: "multi_model_with_web_arbitration"`.

## Voz Local Integrada

A voz fica em:

```text
voice/
```

### Áudio Que Funciona Pela Página

No navegador, use:

- `Falar agora`: escuta sua fala pelo Chrome/Edge, coloca o texto no chat e envia.
- `Ouvir resposta`: lê a resposta atual em voz alta pelo navegador.

Esse modo é o mais simples para falar com o programa em `http://localhost:3000`. Ele depende do suporte de fala do navegador e da permissão de microfone.

### Voz Local 100% Offline

O painel `Modo voz local` também mostra o diagnóstico do pipeline offline:

- Modelo wake word `Jarvis`.
- Executável Whisper.
- Modelo Whisper.
- Executável Piper.
- Modelo Piper.

Se algum item aparecer como `FALTA`, o modo offline ainda não está pronto. O sistema não deve fingir que está.

Leia o guia completo:

```text
voice/README.md
```

Na interface web, use o painel `Modo voz local`:

1. Clique em `Configurar`.
2. Ajuste os caminhos de Whisper, Piper e wake word.
3. Clique em `Salvar configuração`.
4. Clique em `Iniciar voz`.
5. Diga "Jarvis" e faça a pergunta.

Resumo do fluxo interno:

1. O agente Python escuta o microfone.
2. openWakeWord detecta "Jarvis".
3. O agente grava a pergunta até detectar silêncio.
4. Whisper local transcreve o WAV.
5. O texto vai para `http://localhost:3000/api/chat`.
6. Ollama responde usando `qwen2.5:3b`.
7. Piper local gera o WAV da resposta.
8. O Windows reproduz o áudio.
9. O agente volta a escutar "Jarvis".

## Instalar Voz

```bash
cd C:\PROJETOS\IA-LOCAL\assistant-local-pc\voice
pip install -r requirements.txt
copy config.example.json config.json
```

Depois edite `config.json` com os caminhos reais do Whisper, Piper e modelos.

## Rodar Voz Pelo Navegador

Rode apenas o backend:

```bash
cd C:\PROJETOS\IA-LOCAL\assistant-local-pc
npm start
```

Depois abra:

```text
http://localhost:3000
```

Use o painel `Modo voz local` para configurar, iniciar, parar e ver logs.

Se preferir diagnosticar manualmente, ainda pode rodar `python voice_agent.py` dentro da pasta `voice`, mas isso agora é opcional.

## O Que Precisa Baixar Ou Configurar Manualmente

- Modelo Ollama: `ollama pull qwen2.5:3b`.
- Whisper local, como whisper.cpp compilado para Windows.
- Modelo Whisper multilíngue, por exemplo `ggml-small.bin`.
- Piper local para Windows.
- Modelo de voz pt-BR do Piper em `.onnx`.
- Modelo de wake word "Jarvis" em `.tflite`, ou outro wake word disponível configurado em `config.json`.

O projeto não inclui esses modelos e não afirma que eles existem no seu PC. Se algum caminho estiver errado, o agente mostra erro claro.

## Checklist De Teste

1. Backend: abra `http://localhost:3000/api/health`.
2. Texto: envie uma pergunta pela interface.
3. Logs: confira `logs/conversations.jsonl`.
4. Memória texto: digite `lembre que meu servidor TraccarPro é 192.0.2.10`.
5. Consulta memória: pergunte `qual é o IP do meu servidor TraccarPro?`.
6. Editor: abra a área `Memória`, edite `profile.md` e salve.
7. Web sem chave: digite `tem certeza?` ou clique em `Verificar na internet` e confira fontes.
8. Web com provedor dedicado: configure Tavily, Brave ou SearXNG no `.env`, reinicie e clique em `Verificar na internet`.
9. Brain: confira `memory/brain/web-research/` e `memory/brain/corrections.md`.
10. Voz integrada: abra `Modo voz local`, configure e clique em `Iniciar voz`.
11. Microfone: veja nos logs se não há erro de áudio.
12. Wake word: diga "Jarvis" e espere "Wake word detectada".
13. Whisper: confirme se aparece `Pergunta: ...`.
14. Ollama: confirme se aparece `Pensando...` e `Resposta: ...`.
15. Piper: confirme se o áudio da resposta é gerado e reproduzido.
16. Fluxo completo: diga "Jarvis", fale `tem certeza?` e aguarde a verificação por voz.

## Próximos Passos Possíveis

- Seletor de modelos instalados no Ollama.
- Ajustes de prompt por modo.
- Calibração visual do microfone e silêncio.
- Treinamento/seleção de wake words.
- Embeddings locais com `nomic-embed-text` no Ollama.
- Busca semântica mantendo Markdown como fonte da verdade.
- Histórico exportável.
- PWA.
- Interface para celular.
- Acesso pela rede local com autenticação e cuidados de segurança.
