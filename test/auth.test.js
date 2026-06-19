const test = require("node:test");
const assert = require("node:assert/strict");

const { isAuthorized, extractRequestToken, timingSafeEqualStr } = require("../src/auth");

test("isAuthorized: sem token configurado libera o acesso", () => {
  assert.equal(isAuthorized("", ""), true);
  assert.equal(isAuthorized("qualquer", ""), true);
  assert.equal(isAuthorized(undefined, ""), true);
});

test("isAuthorized: com token configurado exige o token exato", () => {
  assert.equal(isAuthorized("segredo", "segredo"), true);
  assert.equal(isAuthorized("errado", "segredo"), false);
  assert.equal(isAuthorized("", "segredo"), false);
  assert.equal(isAuthorized(undefined, "segredo"), false);
});

test("isAuthorized: tokens de tamanhos diferentes nao batem", () => {
  assert.equal(isAuthorized("segred", "segredo"), false);
  assert.equal(isAuthorized("segredoo", "segredo"), false);
});

test("timingSafeEqualStr: igual e diferente", () => {
  assert.equal(timingSafeEqualStr("abc", "abc"), true);
  assert.equal(timingSafeEqualStr("abc", "abd"), false);
  assert.equal(timingSafeEqualStr("abc", "abcd"), false);
});

test("extractRequestToken: header x-auth-token tem prioridade", () => {
  const req = { headers: { "x-auth-token": "viaheader" }, query: { token: "viaquery" } };
  assert.equal(extractRequestToken(req), "viaheader");
});

test("extractRequestToken: aceita Authorization Bearer", () => {
  const req = { headers: { authorization: "Bearer abc123" } };
  assert.equal(extractRequestToken(req), "abc123");
});

test("extractRequestToken: cai para query ?token=", () => {
  const req = { headers: {}, query: { token: "viaquery" } };
  assert.equal(extractRequestToken(req), "viaquery");
});

test("extractRequestToken: sem token retorna string vazia", () => {
  assert.equal(extractRequestToken({ headers: {} }), "");
  assert.equal(extractRequestToken({}), "");
});
