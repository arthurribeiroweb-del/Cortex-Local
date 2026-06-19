const { normalizeForGrounding } = require("../grounding");
const { AGENT_MODES, TASK_FLAGS, AGENTS } = require("./agentsConfig");

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function hasCodeSignal(text) {
  return includesAny(text, [
    "codigo",
    "programacao",
    "programar",
    "bug",
    "erro",
    "stack trace",
    "api",
    "endpoint",
    "refator",
    "arquitetura",
    "node",
    "python",
    "javascript",
    "typescript",
    "react",
    "express",
    "banco de dados",
    "sql",
    "git",
    "teste",
    "implemente",
    "implementar",
    "corrija",
    "corrigir"
  ]);
}

function hasVisionSignal(text) {
  return includesAny(text, [
    "imagem",
    "print",
    "screenshot",
    "foto",
    "tela",
    "layout",
    "interface",
    "documento visual",
    "ocr",
    "anexo"
  ]);
}

function hasCurrentInfoSignal(text) {
  return includesAny(text, [
    "hoje",
    "atual",
    "mais recente",
    "ultima versao",
    "versao mais recente",
    "preco",
    "estoque",
    "noticia",
    "lei",
    "legislacao",
    "compatibilidade recente",
    "pesquisa",
    "internet",
    "fonte oficial",
    "site oficial"
  ]);
}

function hasDangerousActionSignal(text) {
  return includesAny(text, [
    "apague",
    "apagar",
    "delete",
    "deletar",
    "remova todos",
    "remove-item",
    "rm -rf",
    "formatar",
    "limpar banco",
    "drop table",
    "truncate",
    "enviar email",
    "mande email",
    "postar",
    "publique",
    "executar trade",
    "comprar agora",
    "vender agora",
    "alterar banco",
    "mover tudo"
  ]);
}

function hasBusinessSignal(text) {
  return includesAny(text, [
    "negocio",
    "empresa",
    "vendas",
    "marketing",
    "cliente",
    "proposta",
    "preco",
    "estrategia",
    "campanha",
    "funil",
    "produto",
    "mercado",
    "concorrente"
  ]);
}

function hasRiskSignal(text) {
  return includesAny(text, [
    "risco",
    "decisao",
    "decidir",
    "vale a pena",
    "melhor caminho",
    "plano",
    "critique",
    "audite",
    "auditoria",
    "seguranca",
    "perigo",
    "impacto",
    "prioridade"
  ]);
}

function hasAuditSignal(text) {
  return includesAny(text, [
    "modo auditor",
    "modo audit",
    "audite",
    "auditoria",
    "revise criticamente",
    "critique essa resposta",
    "critique este plano",
    "procure falhas",
    "encontre riscos",
    "valide essa decisao"
  ]);
}

function explicitModeFromMessage(text) {
  if (includesAny(text, ["modo rapido", "modo quick", "resposta rapida"])) {
    return "quick";
  }

  if (includesAny(text, ["modo profundo", "modo deep", "modo deliberado"])) {
    return "deep";
  }

  if (includesAny(text, ["modo codigo", "modo programador", "modo code"])) {
    return "code";
  }

  if (includesAny(text, ["modo visao", "modo imagem", "modo visual"])) {
    return "vision";
  }

  if (includesAny(text, ["modo vigia", "modo watch", "modo monitoramento"])) {
    return "watch";
  }

  if (includesAny(text, ["modo auditor", "modo audit", "modo critico"])) {
    return "audit";
  }

  return "";
}

function hasWatchSignal(text) {
  return includesAny(text, [
    "vigia",
    "monitore",
    "monitorar",
    "acompanhe",
    "avise quando",
    "alerta",
    "logs",
    "agenda",
    "emails"
  ]);
}

function classifyComplexity(message, flags) {
  const trimmed = String(message || "").trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  if (flags.has(TASK_FLAGS.DANGEROUS_ACTION)) {
    return "alta";
  }

  if (
    flags.has(TASK_FLAGS.CODE)
    || flags.has(TASK_FLAGS.VISION)
    || flags.has(TASK_FLAGS.WEB)
    || flags.has(TASK_FLAGS.BUSINESS)
    || flags.has(TASK_FLAGS.RISK)
    || flags.has(TASK_FLAGS.WATCH)
  ) {
    return "media";
  }

  if (wordCount > 45 || trimmed.length > 260) {
    return "media";
  }

  return "baixa";
}

function chooseMode(flags, complexity, requestedMode = "auto") {
  const requested = normalizeForGrounding(requestedMode || "auto");

  if (flags.has(TASK_FLAGS.DANGEROUS_ACTION)) {
    return AGENT_MODES.DEEP;
  }

  if (flags.has(TASK_FLAGS.VISION)) {
    return AGENT_MODES.VISION;
  }

  if (requested === "simple" || requested === "rapido" || requested === "quick") {
    return AGENT_MODES.QUICK;
  }

  if (requested === "critical" || requested === "critico" || requested === "audit") {
    return AGENT_MODES.AUDIT;
  }

  if (requested === "deliberate" || requested === "profundo" || requested === "deep") {
    return AGENT_MODES.DEEP;
  }

  if (requested === "code" || requested === "codigo" || requested === "programador") {
    return AGENT_MODES.CODE;
  }

  if (requested === "vision" || requested === "visao" || requested === "visual") {
    return AGENT_MODES.VISION;
  }

  if (requested === "watch" || requested === "vigia" || requested === "monitoramento") {
    return AGENT_MODES.WATCH;
  }

  if (flags.has(TASK_FLAGS.WATCH)) {
    return AGENT_MODES.WATCH;
  }

  if (flags.has(TASK_FLAGS.CODE)) {
    return AGENT_MODES.CODE;
  }

  if (flags.has(TASK_FLAGS.AUDIT)) {
    return AGENT_MODES.AUDIT;
  }

  if (
    flags.has(TASK_FLAGS.WEB)
    || flags.has(TASK_FLAGS.BUSINESS)
    || flags.has(TASK_FLAGS.RISK)
    || complexity !== "baixa"
  ) {
    return AGENT_MODES.DEEP;
  }

  return AGENT_MODES.QUICK;
}

function chooseAgents(mode, flags) {
  const agents = [AGENTS.orchestrator];

  if (mode === AGENT_MODES.QUICK) {
    return agents;
  }

  if (mode === AGENT_MODES.CODE) {
    agents.push(AGENTS.programmer);
    if (flags.has(TASK_FLAGS.RISK) || flags.has(TASK_FLAGS.DANGEROUS_ACTION)) {
      agents.push(AGENTS.automationSpecialist);
    }
    agents.push(AGENTS.critic);
    return agents;
  }

  if (mode === AGENT_MODES.VISION) {
    agents.push(AGENTS.visionSpecialist);
    if (flags.has(TASK_FLAGS.RISK)) {
      agents.push(AGENTS.critic);
    }
    return agents;
  }

  if (mode === AGENT_MODES.AUDIT) {
    agents.push(AGENTS.deepReasoner, AGENTS.critic);
    return agents;
  }

  if (mode === AGENT_MODES.WATCH) {
    agents.push(AGENTS.watcher, AGENTS.automationSpecialist, AGENTS.critic);
    return agents;
  }

  agents.push(AGENTS.generalCounselor);

  if (flags.has(TASK_FLAGS.CODE)) {
    agents.push(AGENTS.programmer);
  }

  if (flags.has(TASK_FLAGS.WEB)) {
    agents.push(AGENTS.webResearcher);
  }

  if (flags.has(TASK_FLAGS.RISK) || flags.has(TASK_FLAGS.BUSINESS) || flags.has(TASK_FLAGS.DANGEROUS_ACTION)) {
    agents.push(AGENTS.deepReasoner);
  }

  agents.push(AGENTS.critic);

  return Array.from(new Map(agents.map((agent) => [agent.id, agent])).values());
}

function classifyTask(message, options = {}) {
  const rawMessage = String(message || "");
  const text = normalizeForGrounding(rawMessage);
  const flags = new Set();
  const explicitMode = explicitModeFromMessage(text);

  if (hasCodeSignal(text)) flags.add(TASK_FLAGS.CODE);
  if (hasVisionSignal(text) || options.hasAttachment === true) flags.add(TASK_FLAGS.VISION);
  if (hasCurrentInfoSignal(text)) flags.add(TASK_FLAGS.WEB);
  if (hasDangerousActionSignal(text)) flags.add(TASK_FLAGS.DANGEROUS_ACTION);
  if (hasBusinessSignal(text)) flags.add(TASK_FLAGS.BUSINESS);
  if (hasRiskSignal(text)) flags.add(TASK_FLAGS.RISK);
  if (hasAuditSignal(text)) flags.add(TASK_FLAGS.AUDIT);
  if (hasWatchSignal(text)) flags.add(TASK_FLAGS.WATCH);

  if (explicitMode === "code") flags.add(TASK_FLAGS.CODE);
  if (explicitMode === "vision") flags.add(TASK_FLAGS.VISION);
  if (explicitMode === "watch") flags.add(TASK_FLAGS.WATCH);
  if (explicitMode === "audit") flags.add(TASK_FLAGS.AUDIT);

  if (flags.has(TASK_FLAGS.DANGEROUS_ACTION)) {
    flags.add(TASK_FLAGS.AUDIT);
  }

  const complexity = classifyComplexity(rawMessage, flags);
  const requestedMode = explicitMode || options.requestedMode;
  const mode = chooseMode(flags, complexity, requestedMode);
  const agents = chooseAgents(mode, flags);

  return {
    mode,
    complexity,
    flags: Array.from(flags).sort(),
    needs: {
      code: flags.has(TASK_FLAGS.CODE),
      vision: flags.has(TASK_FLAGS.VISION),
      web: flags.has(TASK_FLAGS.WEB),
      audit: mode !== AGENT_MODES.QUICK || flags.has(TASK_FLAGS.AUDIT),
      confirmation: flags.has(TASK_FLAGS.DANGEROUS_ACTION),
      watch: flags.has(TASK_FLAGS.WATCH)
    },
    agents: agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      model: agent.model,
      role: agent.role
    })),
    reason: buildReason(mode, complexity, flags),
    explicitMode,
    confidence: flags.size > 0 || rawMessage.trim().length > 0 ? "alta" : "baixa"
  };
}

function buildReason(mode, complexity, flags) {
  if (flags.has(TASK_FLAGS.DANGEROUS_ACTION)) {
    return "Pedido contem acao sensivel e exige confirmacao antes de executar.";
  }

  if (mode === AGENT_MODES.QUICK) {
    return "Pergunta simples; resposta direta e suficiente.";
  }

  if (mode === AGENT_MODES.CODE) {
    return "Pedido tecnico ou de programacao; usar especialista de codigo e auditor.";
  }

  if (mode === AGENT_MODES.VISION) {
    return "Pedido envolve imagem, tela, print ou analise visual.";
  }

  if (mode === AGENT_MODES.WATCH) {
    return "Pedido envolve monitoramento autorizado; usar modo vigia com seguranca.";
  }

  if (mode === AGENT_MODES.AUDIT) {
    return "Pedido exige revisao critica e raciocinio cuidadoso.";
  }

  return complexity === "alta"
    ? "Tarefa importante ou arriscada; ativar fluxo profundo."
    : "Tarefa merece analise alem de resposta rapida.";
}

module.exports = {
  classifyTask,
  hasCodeSignal,
  hasVisionSignal,
  hasCurrentInfoSignal,
  hasDangerousActionSignal,
  hasAuditSignal,
  explicitModeFromMessage
};
