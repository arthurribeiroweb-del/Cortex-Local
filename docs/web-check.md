# Verificação Na Internet

O modo de verificação permite conferir uma resposta usando fontes da internet sob demanda. Ele não substitui o modo local: se nenhum provedor estiver configurado, o JARVIS continua funcionando normalmente com Ollama e memória local.

## Quando Usar

Use frases como:

- `tem certeza?`
- `acho que você está errado`
- `confere isso na internet`
- `pesquisa antes`
- `verifica essa resposta`
- `corrige sua memória`
- `salva essa correção`
- `não erre mais isso`

Por voz funciona igual, porque o agente de voz envia a transcrição para `/api/chat`.

## Configuração

Crie ou edite `.env` na raiz do projeto:

```env
WEB_SEARCH_PROVIDER=duckduckgo
TAVILY_API_KEY=
BRAVE_SEARCH_API_KEY=
SEARXNG_URL=http://localhost:8080
WEB_SEARCH_MAX_RESULTS=5
WEB_SEARCH_TIMEOUT_MS=12000
```

Depois reinicie o backend com `npm start`.

`duckduckgo` funciona sem chave de API e ja vem como padrao. Ele usa a pagina HTML publica do DuckDuckGo, entao e um fallback pratico para deixar o bot verificando fontes imediatamente. Para uso mais estavel em producao, configure Tavily, Brave ou SearXNG.

## Provedor Tavily

```env
WEB_SEARCH_PROVIDER=tavily
TAVILY_API_KEY=tvly-SUA_CHAVE
```

O backend usa `POST https://api.tavily.com/search` com autenticação Bearer.

## Provedor Brave

```env
WEB_SEARCH_PROVIDER=brave
BRAVE_SEARCH_API_KEY=SUA_CHAVE
```

O backend usa `GET https://api.search.brave.com/res/v1/web/search` com o header `X-Subscription-Token`.

## Provedor SearXNG

```env
WEB_SEARCH_PROVIDER=searxng
SEARXNG_URL=http://localhost:8080
```

O backend chama `/search?q=...&format=json`. No SearXNG, o formato JSON precisa estar habilitado nas configurações da instância.

## Como Testar Sem Chave

Com `WEB_SEARCH_PROVIDER=duckduckgo`, pergunte algo no chat e depois diga:

```text
tem certeza?
```

O JARVIS deve pesquisar, responder com base nos resultados e mostrar fontes.

## Como Testar Com Provedor

1. Configure `.env`.
2. Reinicie `npm start`.
3. Faça uma pergunta.
4. Clique em `Verificar na internet` ou digite `tem certeza?`.
5. Confira a resposta corrigida e as fontes.

## Brain De Correções

Arquivos usados:

```text
memory/brain/corrections.md
memory/brain/verified-facts.md
memory/brain/web-research/
```

Diferença:

- Memória comum: fatos e preferências editáveis.
- Correção verificada: aprendizado confirmado por fontes, com data e regra futura.
- Pesquisa web: histórico de uma consulta específica, com fontes e observações.

## Limitações

- O provedor `duckduckgo` funciona sem chave, mas pode ser bloqueado/limitado pelo site em alguns momentos.
- A internet pode trazer fontes ruins.
- Informações atuais precisam ser revalidadas.
- O sistema não deve fingir certeza quando a fonte for fraca.
- Esta versão usa título, URL e snippet; não baixa páginas completas.
