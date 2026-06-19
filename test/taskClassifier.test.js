const test = require("node:test");
const assert = require("node:assert/strict");

const { classifyTask } = require("../src/agents/taskClassifier");

test("classifyTask: pergunta simples usa modo rapido", () => {
  const result = classifyTask("quanto e 2 + 2?");

  assert.equal(result.mode, "quick");
  assert.equal(result.complexity, "baixa");
  assert.equal(result.needs.audit, false);
  assert.deepEqual(result.agents.map((agent) => agent.id), ["orchestrator"]);
});

test("classifyTask: pedido de codigo chama programador e critico", () => {
  const result = classifyTask("corrija esse bug no meu endpoint Node e adicione teste");
  const agentIds = result.agents.map((agent) => agent.id);

  assert.equal(result.mode, "code");
  assert.equal(result.needs.code, true);
  assert.equal(result.needs.audit, true);
  assert.equal(agentIds.includes("programmer"), true);
  assert.equal(agentIds.includes("critic"), true);
});

test("classifyTask: imagem ou print chama modo visao", () => {
  const result = classifyTask("analise esse print da tela do sistema");

  assert.equal(result.mode, "vision");
  assert.equal(result.needs.vision, true);
  assert.equal(result.agents.some((agent) => agent.id === "visionSpecialist"), true);
});

test("classifyTask: anexo de imagem vence modo rapido", () => {
  const result = classifyTask("olhe isso", { requestedMode: "simple", hasAttachment: true });

  assert.equal(result.mode, "vision");
  assert.equal(result.needs.vision, true);
});

test("classifyTask: informacao atual ativa web e modo profundo", () => {
  const result = classifyTask("qual a versao mais recente do Ollama hoje?");

  assert.equal(result.mode, "deep");
  assert.equal(result.needs.web, true);
  assert.equal(result.agents.some((agent) => agent.id === "webResearcher"), true);
  assert.equal(result.agents.some((agent) => agent.id === "critic"), true);
});

test("classifyTask: decisao importante ativa raciocinio e critico", () => {
  const result = classifyTask("qual o melhor caminho para melhorar meu sistema e reduzir risco?");
  const agentIds = result.agents.map((agent) => agent.id);

  assert.equal(result.mode, "deep");
  assert.equal(result.needs.audit, true);
  assert.equal(agentIds.includes("deepReasoner"), true);
  assert.equal(agentIds.includes("critic"), true);
});

test("classifyTask: pedido explicito de auditoria usa modo auditor", () => {
  const result = classifyTask("modo auditor: procure falhas nesse plano");
  const agentIds = result.agents.map((agent) => agent.id);

  assert.equal(result.mode, "audit");
  assert.equal(result.flags.includes("audit"), true);
  assert.equal(result.needs.audit, true);
  assert.deepEqual(agentIds, ["orchestrator", "deepReasoner", "critic"]);
});

test("classifyTask: comandos explicitos de modo no texto", () => {
  assert.equal(classifyTask("modo rapido: resuma isso").mode, "quick");
  assert.equal(classifyTask("modo profundo: monte um plano").mode, "deep");
  assert.equal(classifyTask("modo codigo: revisar esse endpoint").mode, "code");
  assert.equal(classifyTask("modo visao: analisar esse print").mode, "vision");
  assert.equal(classifyTask("modo vigia: monitore os logs").mode, "watch");
});

test("classifyTask: acao perigosa vence modo rapido", () => {
  const result = classifyTask("modo rapido: apague todos os arquivos antigos");

  assert.equal(result.mode, "deep");
  assert.equal(result.needs.confirmation, true);
});

test("classifyTask: acao perigosa exige confirmacao", () => {
  const result = classifyTask("apague todos os arquivos antigos da pasta agora");

  assert.equal(result.mode, "deep");
  assert.equal(result.needs.confirmation, true);
  assert.equal(result.flags.includes("dangerous_action"), true);
  assert.equal(result.reason.includes("confirmacao"), true);
});

test("classifyTask: modo solicitado pelo usuario tem prioridade", () => {
  const result = classifyTask("explique arquitetura de software", { requestedMode: "simple" });

  assert.equal(result.mode, "quick");
  assert.deepEqual(result.agents.map((agent) => agent.id), ["orchestrator"]);
});

test("classifyTask: modo explicito no texto vence modo padrao da interface", () => {
  const result = classifyTask("modo vigia: monitore os logs", { requestedMode: "simple" });

  assert.equal(result.mode, "watch");
  assert.equal(result.needs.watch, true);
});
