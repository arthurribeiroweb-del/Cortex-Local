const test = require("node:test");
const assert = require("node:assert/strict");

const { createWatchPlan } = require("../src/agents/watchPermissions");
const {
  applyWatchAuthorization,
  createWatchAuthorization,
  findValidWatchAuthorization,
  listWatchAuthorizations,
  resetWatchAuthorizationsForTests,
  restoreWatchAuthorizations,
  revokeWatchAuthorization,
  setWatchAuthorizationSink
} = require("../src/agents/watchAuthorizations");

test.afterEach(() => {
  resetWatchAuthorizationsForTests();
});

test("createWatchAuthorization: persiste escopo ativo com expiracao", () => {
  const plan = createWatchPlan("autorizo o modo vigia: monitore os logs a cada 2 minutos por 1 hora");
  const authorization = createWatchAuthorization(plan, { sourceQuestion: "logs" });

  assert.equal(authorization.status, "active");
  assert.equal(authorization.target.type, "logs");
  assert.equal(authorization.actions.includes("notify_only"), true);
  assert.equal(listWatchAuthorizations().length, 1);
});

test("applyWatchAuthorization: autoriza plano equivalente sem nova frase de autorizacao", () => {
  const authorized = createWatchPlan("autorizo o modo vigia: monitore os logs a cada 2 minutos por 1 hora");
  const authorization = createWatchAuthorization(authorized);
  const later = createWatchPlan("modo vigia: monitore os logs a cada 2 minutos por 1 hora");
  const applied = applyWatchAuthorization(later);

  assert.equal(findValidWatchAuthorization(later).id, authorization.id);
  assert.equal(applied.status, "authorized_plan");
  assert.equal(applied.authorizationId, authorization.id);
  assert.equal(applied.authorizationExpiresAt, authorization.expiresAt);
});

test("revokeWatchAuthorization: revoga e impede reaplicar escopo", () => {
  const authorized = createWatchPlan("autorizo o modo vigia: monitore os logs a cada 2 minutos por 1 hora");
  const authorization = createWatchAuthorization(authorized);
  const revoked = revokeWatchAuthorization(authorization.id);
  const later = createWatchPlan("modo vigia: monitore os logs a cada 2 minutos por 1 hora");

  assert.equal(revoked.status, "revoked");
  assert.equal(applyWatchAuthorization(later).status, "needs_authorization");
});

test("setWatchAuthorizationSink: recebe criacao e revogacao", () => {
  const entries = [];
  setWatchAuthorizationSink((entry) => entries.push(entry));

  const plan = createWatchPlan("autorizo o modo vigia: monitore os logs a cada 2 minutos por 1 hora");
  const authorization = createWatchAuthorization(plan);
  revokeWatchAuthorization(authorization.id);

  assert.deepEqual(entries.map((entry) => entry.kind), ["authorization_created", "authorization_revoked"]);
});

test("restoreWatchAuthorizations: restaura ultimo estado por id", () => {
  const plan = createWatchPlan("autorizo o modo vigia: monitore os logs a cada 2 minutos por 1 hora");
  const authorization = createWatchAuthorization(plan);
  const revoked = revokeWatchAuthorization(authorization.id);

  resetWatchAuthorizationsForTests();
  restoreWatchAuthorizations([authorization, revoked]);

  assert.equal(listWatchAuthorizations()[0].status, "revoked");
});
