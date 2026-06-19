# Relatorio de validacao e melhoria - JARVIS Local

Data: 2026-06-16
Ambiente testado: `http://127.0.0.1:3001`

## Direcao de produto validada

O produto agora se comporta mais como um assistente local premium: a home fica focada em conversa, o orb comunica estado, configuracoes e memoria ficam em drawers, e detalhes tecnicos aparecem apenas quando solicitados.

Assinatura visual: console pessoal escuro com orb central de estado e superficies discretas em vidro.

## O que foi testado

- Abertura da home em desktop e mobile.
- Envio manual por texto.
- Pergunta simples: capacidade geral do assistente.
- Pergunta media: rastreador offline no TraccarPro.
- Pergunta dificil: plano de produto para vender o assistente local.
- Resposta longa em 8 topicos.
- Comando confuso: "aquele negocio do servidor la caiu eu acho arruma".
- Envio vazio.
- Cancelamento de uma resposta longa em andamento.
- Botao de voz com permissao de microfone negada pelo navegador.
- Drawer de Ajustes.
- Drawer de Memoria e categorias.
- Status de voz local, Whisper, Piper e wake word.
- Responsividade em viewport mobile 390 x 844.
- Console do navegador.
- Sintaxe de `server.js` e `public/app.js`.

## Resultados praticos

| Cenario | Resultado | Observacao |
| --- | --- | --- |
| Pergunta simples | OK | Resposta em cerca de 1s no modo rapido/auto. |
| Pergunta media TraccarPro | OK | Resposta util, mas ainda pode ficar mais objetiva. |
| Pergunta dificil produto | OK | Modo deliberado levou cerca de 17s, aceitavel para analise. |
| Comando confuso | Corrigido | Agora pede o sistema/IP/erro antes de assumir contexto. |
| Envio vazio | OK | Mostra erro claro no painel de resposta. |
| Cancelamento | Corrigido | Botao vira `Parar`, cancela a requisicao e volta ao estado pronto. |
| Microfone negado | Corrigido | Mensagem amigavel: permitir microfone no navegador. |
| Mobile | Corrigido | Composer nao sobrepoe conteudo; sem overflow lateral. |
| Wake word ausente | OK | Home mostra aviso simples; detalhes ficam em Ajustes > Voz. |

## Problemas encontrados

1. O modo padrao deliberado deixava a primeira experiencia lenta: apos 9s ainda estava em "Revisando resposta...".
2. O botao de voz mostrava erro cru do navegador: `Permission denied`.
3. O modelo assumia contexto em comandos vagos e dizia que iria verificar algo que nao estava realmente verificando.
4. A resposta sobre configurar voz local podia inventar proximo passo errado, mesmo o sistema sabendo que faltava `jarvis.tflite`.
5. No mobile, o composer sticky podia sobrepor conteudo em captura/viewport longo.
6. A home mostrava caminho tecnico demais para o wake word.
7. A API pura ainda deixava passar comando confuso mesmo quando a UI ja tratava melhor.
8. A porta `3000` segue ocupada por uma instancia antiga sem `/api/status`; a versao validada esta em `3001`.

## Melhorias feitas

- Adicionado modo `Auto` como padrao da interface.
- Implementado roteamento local de modo:
  - mensagens curtas usam `simple`;
  - pedidos complexos usam `deliberate`;
  - perguntas atuais/criticas usam `critical`.
- Adicionado cancelamento de requisicao longa:
  - `Enviar` vira `Parar`;
  - o estado informa tempo de processamento;
  - cancelamento mostra `Solicitacao cancelada`.
- Melhorado erro de microfone:
  - permissao negada vira mensagem humana;
  - microfone ausente ou ocupado tambem recebe mensagem clara.
- Adicionado diagnostico local deterministico para voz:
  - perguntas sobre configurar voz local respondem com status real;
  - se faltar wake word, aponta `jarvis.tflite`.
- Melhorado o backend para comandos vagos:
  - `/api/chat` retorna `local-clarification` sem chamar o modelo;
  - evita suposicoes indevidas.
- Ajustado prompt do sistema:
  - pedidos vagos nao devem assumir sistema/servidor;
  - o assistente nao deve dizer que vai executar acao externa se nao estiver executando.
- Voz via audio agora chama `/api/chat` em modo `simple`, reduzindo latencia.
- Simplificada a mensagem da home sobre wake word.
- Ajustado layout mobile:
  - composer fica estatico e logo antes da conversa;
  - sem sobreposicao;
  - sem overflow lateral.
- Mantidos drawers de Configuracoes, Memoria e Detalhes.

## Rodada adicional em modo multi-modelo

Depois da primeira entrega, foi feita uma bateria especifica usando `deliberate` e `critical`, o fluxo que usa rascunho, critica/revisao e resposta final.

Casos testados:

- TraccarPro offline para cliente leigo: `deliberate`, cerca de 26s, acionou web check.
- Comando confuso: `deliberate`, retornou `local-clarification` sem chamar modelo.
- Critica do produto JARVIS Local: `critical`, cerca de 25s.
- Proximo passo de voz local: `deliberate`, retornou status local real em menos de 1s.

Problemas encontrados nessa rodada:

- O modo `critical` podia vazar a critica interna em JSON na resposta final.
- A pergunta sobre voz local, quando feita direto na API, ainda podia receber resposta inventada do modelo.

Correcoes aplicadas:

- O prompt final agora proibe copiar JSON, veredito, critica interna, draft, raw ou nomes internos de modelos.
- Foi adicionado reparo automatico caso uma resposta final venha contaminada por metadados internos.
- `/api/chat` agora responde perguntas de voz/wake word com status real local (`local-status`) antes de chamar o modelo.

Resultado retestado:

```text
voz_local deliberate -> model local-status, 0.07s, sem vazamento
produto_critico critical -> qwen2.5:3b, ~25s, sem JSON interno
```

## Evidencias

Print desktop:

`docs/qa-artifacts/jarvis-home-desktop.png`

Print mobile:

`docs/qa-artifacts/jarvis-home-mobile.png`

Checks executados:

```text
node --check public/app.js
node --check server.js
GET /api/status -> 200
POST /api/chat comando confuso -> model local-clarification
Browser console errors -> []
Mobile overflow -> false
```

## Arquivos alterados

- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `server.js`
- `docs/qa-relatorio-2026-06-16.md`
- `docs/qa-artifacts/jarvis-home-desktop.png`
- `docs/qa-artifacts/jarvis-home-mobile.png`

## Recomendacoes para a proxima etapa

1. Liberar/reiniciar a porta `3000`, que ainda esta presa por um processo Node antigo.
2. Criar um endpoint de streaming ou eventos para exibir etapas reais do backend, nao apenas estados estimados.
3. Adicionar historico persistente da conversa na UI.
4. Criar testes automatizados de UI para: envio, cancelamento, drawers, memoria e mobile.
5. Adicionar um endpoint de "capabilities" com acoes locais reais, para o assistente dizer somente o que consegue executar.
6. Implementar wake word de verdade quando `jarvis.tflite` estiver disponivel.
7. Melhorar respostas de dominio TraccarPro com templates tecnicos mais objetivos e verificacoes guiadas.
8. Adicionar um modo "cliente leigo" e um modo "tecnico" nas configuracoes.
