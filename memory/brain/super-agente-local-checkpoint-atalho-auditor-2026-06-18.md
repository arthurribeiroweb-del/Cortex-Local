# Checkpoint: atalho do modo auditor

Data: 2026-06-18

## Status

O classificador agora reconhece pedidos explicitos de auditoria no texto do usuario.

## O que foi implementado

Frases como estas acionam o modo `audit`:

- `modo auditor`;
- `modo audit`;
- `audite`;
- `auditoria`;
- `revise criticamente`;
- `procure falhas`;
- `encontre riscos`;
- `valide essa decisao`.

## Regra de prioridade

Pedidos perigosos continuam usando modo profundo com confirmacao obrigatoria.

Isso evita que um pedido como apagar arquivos vire apenas auditoria. A trava de seguranca continua mais importante.

## Arquivos alterados

- `src/agents/taskClassifier.js`
- `test/taskClassifier.test.js`

## Testes

Resultado:

```text
npm test
50 testes
50 passando
0 falhas
```

## Proximo passo recomendado

Adicionar comandos explicitos para outros modos no texto do chat, como `modo rapido`, `modo profundo`, `modo codigo`, `modo visao` e `modo vigia`.
