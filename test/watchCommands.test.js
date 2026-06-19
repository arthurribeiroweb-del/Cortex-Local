const test = require("node:test");
const assert = require("node:assert/strict");

const {
  authorizationMatchesHint,
  detectWatchCommand,
  formatWatchJobsAnswer
} = require("../src/agents/watchCommands");

test("detectWatchCommand: reconhece comandos naturais principais", () => {
  assert.equal(detectWatchCommand("Jarvis, mostre vigias ativos").type, "list_jobs");
  assert.equal(detectWatchCommand("Jarvis, pare o vigia").type, "stop_jobs");
  assert.equal(detectWatchCommand("Jarvis, mostre autorizacoes do vigia").type, "list_authorizations");

  const revoke = detectWatchCommand("Jarvis, revogue autorizacao dos logs");
  assert.equal(revoke.type, "revoke_authorization");
  assert.equal(revoke.targetHint, "logs");
});

test("detectWatchCommand: ignora pedidos que nao sao do vigia", () => {
  assert.equal(detectWatchCommand("quanto e 2 + 2?"), null);
});

test("authorizationMatchesHint: encontra autorizacao por alvo logs", () => {
  const authorization = {
    target: { type: "logs", value: "logs locais" }
  };

  assert.equal(authorizationMatchesHint(authorization, "logs"), true);
  assert.equal(authorizationMatchesHint(authorization, "email"), false);
});

test("formatWatchJobsAnswer: lista apenas vigias ativos", () => {
  const answer = formatWatchJobsAnswer([
    {
      id: "1",
      status: "running",
      tickCount: 2,
      nextTickAt: "amanha",
      watchPlan: { target: { value: "logs locais" } }
    },
    {
      id: "2",
      status: "cancelled",
      watchPlan: { target: { value: "outro" } }
    }
  ]);

  assert.match(answer, /Vigias ativos: 1/);
  assert.match(answer, /logs locais/);
  assert.doesNotMatch(answer, /outro/);
});
