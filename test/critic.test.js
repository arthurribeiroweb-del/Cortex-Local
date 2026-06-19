const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseJsonObject,
  normalizeCriticReview,
  userMessageNeedsCurrentInfo,
  criticMentionsWebNeed,
  shouldTriggerWebCheck,
  getWebCheckReason,
  webCheckReasonLabel
} = require("../src/critic");

test("parseJsonObject: extrai JSON puro, com cerca e com texto ao redor", () => {
  assert.deepEqual(parseJsonObject('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJsonObject('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonObject('lixo antes {"a":1} lixo depois'), { a: 1 });
  assert.equal(parseJsonObject("sem chaves"), null);
  assert.equal(parseJsonObject("{quebrado"), null);
});

test("normalizeCriticReview: aplica defaults e clamps", () => {
  const r = normalizeCriticReview({ veredito: "XPTO", nivel_confianca: "altissimo" });
  assert.equal(r.veredito, "incompleta", "veredito invalido => incompleta");
  assert.equal(r.nivel_confianca, "medio", "confianca invalida => medio");
  assert.equal(r.precisa_internet, false);
  assert.deepEqual(r.problemas, []);
});

test("normalizeCriticReview: preserva valores validos e limita problemas a 8", () => {
  const r = normalizeCriticReview({
    veredito: "errada",
    nivel_confianca: "baixo",
    precisa_internet: true,
    problemas: Array.from({ length: 20 }, (_, i) => `p${i}`)
  });
  assert.equal(r.veredito, "errada");
  assert.equal(r.nivel_confianca, "baixo");
  assert.equal(r.precisa_internet, true);
  assert.equal(r.problemas.length, 8);
});

test("userMessageNeedsCurrentInfo: detecta termos sensiveis ao tempo", () => {
  assert.equal(userMessageNeedsCurrentInfo("qual o preco hoje?"), true);
  assert.equal(userMessageNeedsCurrentInfo("tem certeza disso?"), true);
  assert.equal(userMessageNeedsCurrentInfo("como faco um for em python"), false);
});

test("shouldTriggerWebCheck: aprovada+alta+estavel nao aciona", () => {
  const review = { veredito: "aprovada", nivel_confianca: "alto", precisa_internet: false };
  assert.equal(shouldTriggerWebCheck(review, "como faco um loop", "deliberate", "duckduckgo"), false);
});

test("shouldTriggerWebCheck: veredito errada sempre aciona", () => {
  const review = { veredito: "errada", nivel_confianca: "alto" };
  assert.equal(shouldTriggerWebCheck(review, "qualquer", "deliberate", "duckduckgo"), true);
});

test("shouldTriggerWebCheck: precisa_internet aciona", () => {
  const review = { veredito: "incompleta", nivel_confianca: "medio", precisa_internet: true };
  assert.equal(shouldTriggerWebCheck(review, "qualquer", "deliberate", "duckduckgo"), true);
});

test("shouldTriggerWebCheck: provider injetado evita ler config real", () => {
  // mesmo em modo critico e confianca media, provider 'none' nao deve forcar a regra final
  const review = { veredito: "aprovada", nivel_confianca: "medio", precisa_internet: false };
  assert.equal(shouldTriggerWebCheck(review, "como faco um loop", "critical", "none"), false);
  assert.equal(shouldTriggerWebCheck(review, "como faco um loop", "critical", "duckduckgo"), true);
});

test("getWebCheckReason: mapeia motivo conforme prioridade", () => {
  assert.equal(getWebCheckReason({ veredito: "errada" }, "x", "deliberate"), "critic_wrong");
  assert.equal(getWebCheckReason({ veredito: "arriscada" }, "x", "deliberate"), "critic_risky");
  assert.equal(getWebCheckReason({ veredito: "incompleta", precisa_internet: true }, "x", "deliberate"), "critic_needs_current_info");
  assert.equal(getWebCheckReason({ veredito: "incompleta", nivel_confianca: "baixo" }, "x", "deliberate"), "critic_low_confidence");
  assert.equal(getWebCheckReason({ veredito: "aprovada", nivel_confianca: "alto" }, "como faco isso hoje", "deliberate"), "user_current_info");
  assert.equal(getWebCheckReason({ veredito: "aprovada", nivel_confianca: "alto" }, "loop", "deliberate"), "not_needed");
});

test("webCheckReasonLabel: rotulos conhecidos e fallback", () => {
  assert.equal(webCheckReasonLabel("critic_wrong"), "Acionado por divergencia entre modelos");
  assert.equal(webCheckReasonLabel("not_needed"), "Nao acionado");
  assert.equal(webCheckReasonLabel("inexistente"), "Acionado por baixa confianca");
});

test("criticMentionsWebNeed: detecta termos de necessidade web no review", () => {
  assert.equal(criticMentionsWebNeed({ resumo: "precisa verificar a versao" }, "x"), true);
  assert.equal(criticMentionsWebNeed({ resumo: "resposta estavel" }, "como faco um loop"), false);
});
