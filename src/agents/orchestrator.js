const { classifyTask } = require("./taskClassifier");

function legacyModeFromTaskMode(taskMode) {
  if (taskMode === "quick") {
    return "simple";
  }

  if (taskMode === "audit") {
    return "critical";
  }

  return "deliberate";
}

function buildOrchestrationMeta(taskDecision, requestedMode) {
  const agentsUsed = taskDecision.agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    model: agent.model,
    role: agent.role
  }));

  return {
    requestedMode,
    mode: taskDecision.mode,
    legacyMode: legacyModeFromTaskMode(taskDecision.mode),
    complexity: taskDecision.complexity,
    flags: taskDecision.flags,
    needs: taskDecision.needs,
    reason: taskDecision.reason,
    confidence: taskDecision.confidence,
    agentsUsed
  };
}

function createChatPlan(message, options = {}) {
  const requestedMode = String(options.requestedMode || "auto").trim().toLowerCase();
  const taskDecision = classifyTask(message, {
    requestedMode,
    hasAttachment: options.hasAttachment === true
  });
  const orchestration = buildOrchestrationMeta(taskDecision, requestedMode);

  return {
    requestedMode,
    taskDecision,
    orchestration,
    effectiveMode: orchestration.legacyMode,
    agentsUsed: orchestration.agentsUsed,
    requiresConfirmation: orchestration.needs.confirmation === true
  };
}

function buildConfirmationRequiredAnswer(plan) {
  const agents = plan.agentsUsed.map((agent) => `- ${agent.name}: ${agent.model}`).join("\n");

  return [
    "Essa acao parece sensivel e eu nao vou executar sem confirmacao explicita.",
    "",
    "Risco:",
    plan.orchestration.reason,
    "",
    "Agentes que analisaram o pedido:",
    agents || "- Orquestrador",
    "",
    "Para continuar, confirme exatamente o que deve ser feito e o alvo da acao. Se envolver apagar, enviar, postar, alterar banco, mover arquivos em massa ou operar dinheiro/trade, eu preciso dessa confirmacao antes."
  ].join("\n");
}

module.exports = {
  buildConfirmationRequiredAnswer,
  buildOrchestrationMeta,
  createChatPlan,
  legacyModeFromTaskMode
};
