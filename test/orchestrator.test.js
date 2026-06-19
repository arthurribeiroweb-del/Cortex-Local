const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildConfirmationRequiredAnswer,
  createChatPlan,
  legacyModeFromTaskMode
} = require("../src/agents/orchestrator");

test("legacyModeFromTaskMode: mapeia modos novos para fluxo atual", () => {
  assert.equal(legacyModeFromTaskMode("quick"), "simple");
  assert.equal(legacyModeFromTaskMode("audit"), "critical");
  assert.equal(legacyModeFromTaskMode("code"), "deliberate");
  assert.equal(legacyModeFromTaskMode("deep"), "deliberate");
});

test("createChatPlan: inclui metadados de orquestracao e agentes", () => {
  const plan = createChatPlan("corrija esse bug em Node", { requestedMode: "auto" });

  assert.equal(plan.requestedMode, "auto");
  assert.equal(plan.orchestration.mode, "code");
  assert.equal(plan.effectiveMode, "deliberate");
  assert.equal(plan.agentsUsed.some((agent) => agent.id === "programmer"), true);
  assert.equal(plan.requiresConfirmation, false);
});

test("createChatPlan: marca acao perigosa como confirmacao obrigatoria", () => {
  const plan = createChatPlan("apague todos os arquivos da pasta", { requestedMode: "simple" });
  const answer = buildConfirmationRequiredAnswer(plan);

  assert.equal(plan.requiresConfirmation, true);
  assert.equal(plan.orchestration.needs.confirmation, true);
  assert.match(answer, /confirmacao explicita/);
  assert.match(answer, /Agentes que analisaram/);
});
