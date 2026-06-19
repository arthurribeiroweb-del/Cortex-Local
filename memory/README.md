# Memória Local

A memória local é um vault em Markdown, estilo Obsidian, usado pelo JARVIS para guardar fatos importantes e consultar uma base de conhecimento antes de responder.

Tudo fica em arquivos `.md` dentro da pasta `memory/`. Não há banco de dados, embeddings ou serviço externo nesta versão.

## Onde Ficam Os Arquivos

```text
memory/
  profile.md
  instructions.md
  vault/
  index/
```

`profile.md` guarda fatos permanentes sobre o usuário. A pasta `vault/` guarda conhecimento por assunto.

## Como Editar

Você pode editar pelo navegador na área `Memória`, ou abrir a pasta `memory/` diretamente no Obsidian, VS Code ou qualquer editor Markdown.

## Comandos De Memória

No chat ou por voz, use frases como:

- `lembre que meu servidor TraccarPro é 192.0.2.10`
- `memorize que prefiro respostas curtas`
- `guarde que a porta do rastreador X é 5023`
- `salve na memória que ...`
- `anote que ...`

Essas informações são adicionadas ao final de `memory/profile.md` com data e hora.

## Como A Memória Entra Na Resposta

Antes de responder, o backend busca trechos relevantes nos arquivos Markdown usando palavras-chave. Ele envia no máximo 5 trechos para o Ollama como contexto extra.

O JARVIS deve usar esses trechos apenas se forem relevantes. Se não forem, ele ignora.

## Limitações Da Versão 2.1

- A busca é simples por palavra-chave.
- Ainda não usa embeddings.
- Pode não encontrar informações escritas com sinônimos.
- Trechos muito genéricos podem pontuar menos que o ideal.

## Próxima Versão

A versão 2.2 pode usar embeddings locais com `nomic-embed-text` no Ollama para busca semântica, mantendo tudo local.
