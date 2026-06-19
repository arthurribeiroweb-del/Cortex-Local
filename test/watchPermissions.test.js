const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createWatchPlan,
  formatWatchPlanAnswer,
  hasExplicitWatchAuthorization
} = require("../src/agents/watchPermissions");

test("createWatchPlan: monta plano seguro e exige autorizacao quando falta confirmacao", () => {
  const plan = createWatchPlan("modo vigia: monitore os logs a cada 2 minutos por 1 hora");

  assert.equal(plan.status, "needs_authorization");
  assert.equal(plan.authorized, false);
  assert.equal(plan.target.type, "logs");
  assert.equal(plan.intervalSeconds, 120);
  assert.equal(plan.durationMinutes, 60);
  assert.equal(plan.actions.includes("notify_only"), true);
  assert.equal(plan.actions.includes("read_logs"), true);
  assert.equal(plan.safety.executesDestructiveActions, false);
});

test("createWatchPlan: autorizacao explicita libera somente o plano local", () => {
  const plan = createWatchPlan("autorizo o modo vigia: monitore C:\\temp\\app.log a cada 30 segundos por 15 minutos");
  const answer = formatWatchPlanAnswer(plan);

  assert.equal(hasExplicitWatchAuthorization("autorizo o modo vigia"), true);
  assert.equal(plan.status, "authorized_plan");
  assert.equal(plan.intervalSeconds, 60);
  assert.equal(plan.durationMinutes, 15);
  assert.equal(plan.target.type, "path");
  assert.match(answer, /Autorizacao registrada para este escopo/);
});

test("createWatchPlan: pede escopo quando alvo, intervalo ou duracao nao estao claros", () => {
  const plan = createWatchPlan("modo vigia: monitore isso");
  const answer = formatWatchPlanAnswer(plan);

  assert.deepEqual(plan.missingScope, ["alvo", "intervalo", "duracao"]);
  assert.match(answer, /Falta definir: alvo, intervalo, duracao/);
});
