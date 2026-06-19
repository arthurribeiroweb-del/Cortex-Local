const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeForGrounding,
  removeUnsupportedBrazilRegionClaims,
  isOllamaReleaseQuery,
  formatBrazilDate,
  extractSemanticVersions,
  officialVersionMismatch,
  containsInternalLeak
} = require("../src/grounding");

test("normalizeForGrounding: remove acentos e baixa caixa", () => {
  assert.equal(normalizeForGrounding("Ação É Coração"), "acao e coracao");
  assert.equal(normalizeForGrounding(null), "");
  assert.equal(normalizeForGrounding("JÁRVIS"), "jarvis");
});

test("extractSemanticVersions: extrai, deduplica e remove prefixo v", () => {
  assert.deepEqual(extractSemanticVersions("v0.1.32 e 0.1.32 e 1.2"), ["0.1.32", "1.2"]);
  assert.deepEqual(extractSemanticVersions(""), []);
});

test("officialVersionMismatch: detecta divergencia de versao", () => {
  const sources = [{ officialLatestVersion: "v0.1.32" }];
  assert.equal(officialVersionMismatch("a versao atual e 0.1.30", sources), true);
  assert.equal(officialVersionMismatch("a versao atual e 0.1.32", sources), false);
  assert.equal(officialVersionMismatch("sem numeros aqui", sources), false, "sem versao na resposta => sem mismatch");
  assert.equal(officialVersionMismatch("0.1.30", []), false, "sem fonte oficial => sem mismatch");
});

test("isOllamaReleaseQuery: so dispara com ollama + termo de versao", () => {
  assert.equal(isOllamaReleaseQuery("qual a versao mais recente do ollama?"), true);
  assert.equal(isOllamaReleaseQuery("ollama esta lento"), false);
  assert.equal(isOllamaReleaseQuery("ultima versao do windows"), false);
});

test("formatBrazilDate: formata ISO e trata invalido", () => {
  assert.equal(formatBrazilDate("2026-06-16T00:00:00Z"), "16/06/2026");
  assert.equal(formatBrazilDate(""), "");
  assert.equal(formatBrazilDate("data-invalida"), "");
});

test("containsInternalLeak: pega vazamento de bastidores", () => {
  assert.equal(containsInternalLeak("veredito: aprovada"), true);
  assert.equal(containsInternalLeak("Resposta inicial do qwen2.5"), true);
  assert.equal(containsInternalLeak("Resposta normal ao usuario."), false);
});

test("removeUnsupportedBrazilRegionClaims: remove regiao sem suporte nas fontes", () => {
  const out = removeUnsupportedBrazilRegionClaims(
    "A cidade fica no Nordeste do Brasil e tem praias.",
    [{ title: "Cidade X", snippet: "fica no litoral", url: "http://x" }]
  );
  assert.ok(!out.toLowerCase().includes("nordeste do brasil"), `nao deveria conter regiao: ${out}`);
});

test("removeUnsupportedBrazilRegionClaims: mantem regiao quando a fonte confirma", () => {
  const out = removeUnsupportedBrazilRegionClaims(
    "Fica no Nordeste do Brasil.",
    [{ title: "Nordeste do Brasil", snippet: "regiao nordeste do brasil", url: "http://x" }]
  );
  assert.ok(out.toLowerCase().includes("nordeste do brasil"), `deveria manter regiao: ${out}`);
});
