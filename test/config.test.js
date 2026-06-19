const test = require("node:test");
const assert = require("node:assert/strict");

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { parseEnv, getWebSearchConfig, getServerConfig, reloadEnv } = require("../src/config");

test("parseEnv: pares simples chave=valor", () => {
  const env = parseEnv("PORT=3000\nHOST=127.0.0.1");
  assert.equal(env.PORT, "3000");
  assert.equal(env.HOST, "127.0.0.1");
});

test("parseEnv: ignora comentarios, linhas vazias e linhas sem '='", () => {
  const env = parseEnv("# comentario\n\nDEFAULT_MODEL=qwen2.5:3b\nlixo sem igual\n");
  assert.deepEqual(env, { DEFAULT_MODEL: "qwen2.5:3b" });
});

test("parseEnv: remove aspas ao redor do valor e preserva o resto", () => {
  const env = parseEnv('A="valor"\nB=\'outro\'\nC=meio=fim');
  assert.equal(env.A, "valor");
  assert.equal(env.B, "outro");
  assert.equal(env.C, "meio=fim");
});

test("parseEnv: trim em chave e valor", () => {
  const env = parseEnv("  CHAVE  =  valor  ");
  assert.equal(env.CHAVE, "valor");
});

test("parseEnv: entrada vazia/nula retorna objeto vazio", () => {
  assert.deepEqual(parseEnv(""), {});
  assert.deepEqual(parseEnv(null), {});
  assert.deepEqual(parseEnv(undefined), {});
});

test("getWebSearchConfig: provider em minusculas e clamps", () => {
  const original = { ...process.env };
  try {
    process.env.WEB_SEARCH_PROVIDER = "DuckDuckGo";
    process.env.WEB_SEARCH_MAX_RESULTS = "999";
    process.env.WEB_SEARCH_TIMEOUT_MS = "10";
    const config = getWebSearchConfig();
    assert.equal(config.provider, "duckduckgo");
    assert.equal(config.maxResults, 10, "maxResults limitado a 10");
    assert.equal(config.timeoutMs, 3000, "timeout minimo de 3000ms");
  } finally {
    process.env = original;
  }
});

test("getWebSearchConfig: maxResults invalido cai no default 5", () => {
  const original = { ...process.env };
  try {
    process.env.WEB_SEARCH_MAX_RESULTS = "abc";
    assert.equal(getWebSearchConfig().maxResults, 5);
  } finally {
    process.env = original;
  }
});

test("getServerConfig: draft/final herdam DEFAULT_MODEL quando ausentes", () => {
  const original = { ...process.env };
  // Usa um .env temporario sem DRAFT/FINAL para testar a heranca isoladamente,
  // sem acoplar ao .env real do projeto.
  const tmpEnv = path.join(os.tmpdir(), `config-test-${process.pid}.env`);
  fs.writeFileSync(tmpEnv, "DEFAULT_MODEL=modelo-x\nCRITIC_MODEL=mistral:7b\n");
  try {
    delete process.env.DEFAULT_MODEL;
    delete process.env.DRAFT_MODEL;
    delete process.env.FINAL_MODEL;
    delete process.env.CRITIC_MODEL;
    reloadEnv(tmpEnv);
    const config = getServerConfig();
    assert.equal(config.draftModel, "modelo-x");
    assert.equal(config.finalModel, "modelo-x");
    assert.equal(config.criticModel, "mistral:7b");
  } finally {
    process.env = original;
    reloadEnv(); // restaura o cache para o .env real
    fs.rmSync(tmpEnv, { force: true });
  }
});
