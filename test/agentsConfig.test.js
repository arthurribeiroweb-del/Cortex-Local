const test = require("node:test");
const assert = require("node:assert/strict");

function reloadAgentsConfig() {
  const modulePath = require.resolve("../src/agents/agentsConfig");
  delete require.cache[modulePath];
  return require("../src/agents/agentsConfig");
}

test("agentsConfig: permite sobrescrever modelos por env", () => {
  const original = { ...process.env };

  try {
    process.env.AGENT_MODEL_MAIN = "modelo-principal-local";
    process.env.AGENT_MODEL_CODER = "modelo-coder-local";

    const { MODELS, AGENTS } = reloadAgentsConfig();

    assert.equal(MODELS.main, "modelo-principal-local");
    assert.equal(MODELS.coder, "modelo-coder-local");
    assert.equal(AGENTS.orchestrator.model, "modelo-principal-local");
    assert.equal(AGENTS.programmer.model, "modelo-coder-local");
  } finally {
    process.env = original;
    reloadAgentsConfig();
  }
});
