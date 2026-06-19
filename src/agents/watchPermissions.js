const { normalizeForGrounding } = require("../grounding");

const DEFAULT_WATCH_LIMITS = Object.freeze({
  maxDurationMinutes: 240,
  minIntervalSeconds: 60
});

const WATCH_ACTIONS = Object.freeze({
  READ_LOGS: "read_logs",
  READ_FILES: "read_files",
  CHECK_STATUS: "check_status",
  NOTIFY_ONLY: "notify_only",
  NETWORK_CHECK: "network_check",
  EMAIL_CHECK: "email_check"
});

function detectWatchTarget(message) {
  const text = normalizeForGrounding(message);
  const original = String(message || "").trim();

  const pathMatch = original.match(/([a-z]:\\[^\r\n"'<>|]+|\.{1,2}\\[^\r\n"'<>|]+|\/[^\s"'<>|]+)/i);
  if (pathMatch) {
    const value = pathMatch[1]
      .replace(/\s+(?:a cada|cada|por|durante)\s+.*$/i, "")
      .trim();

    return {
      type: "path",
      value
    };
  }

  if (text.includes("log") || text.includes("logs")) {
    return {
      type: "logs",
      value: "logs locais"
    };
  }

  if (text.includes("site") || text.includes("url") || text.includes("http")) {
    return {
      type: "web",
      value: "endereco web informado"
    };
  }

  if (text.includes("email") || text.includes("emails")) {
    return {
      type: "email",
      value: "caixa de email"
    };
  }

  if (text.includes("processo") || text.includes("servidor") || text.includes("status")) {
    return {
      type: "status",
      value: "status local"
    };
  }

  return {
    type: "unknown",
    value: ""
  };
}

function detectWatchActions(message, target) {
  const text = normalizeForGrounding(message);
  const actions = new Set([WATCH_ACTIONS.NOTIFY_ONLY]);

  if (target.type === "logs" || text.includes("log")) {
    actions.add(WATCH_ACTIONS.READ_LOGS);
  }

  if (target.type === "path") {
    actions.add(WATCH_ACTIONS.READ_FILES);
  }

  if (target.type === "status" || text.includes("status") || text.includes("servidor")) {
    actions.add(WATCH_ACTIONS.CHECK_STATUS);
  }

  if (target.type === "web" || text.includes("site") || text.includes("http")) {
    actions.add(WATCH_ACTIONS.NETWORK_CHECK);
  }

  if (target.type === "email") {
    actions.add(WATCH_ACTIONS.EMAIL_CHECK);
  }

  return Array.from(actions).sort();
}

function detectIntervalSeconds(message) {
  const text = normalizeForGrounding(message);
  const minuteMatch = text.match(/(?:a cada|cada|de)\s+(\d{1,4})\s+(?:minuto|minutos|min|m)\b/);
  if (minuteMatch) {
    return Math.max(DEFAULT_WATCH_LIMITS.minIntervalSeconds, Number(minuteMatch[1]) * 60);
  }

  const secondMatch = text.match(/(?:a cada|cada|de)\s+(\d{1,4})\s+(?:segundo|segundos|seg|s)\b/);
  if (secondMatch) {
    return Math.max(DEFAULT_WATCH_LIMITS.minIntervalSeconds, Number(secondMatch[1]));
  }

  return 300;
}

function detectDurationMinutes(message) {
  const text = normalizeForGrounding(message);
  const hourMatch = text.match(/(?:por|durante)\s+(\d{1,3})\s+(?:hora|horas|h)\b/);
  if (hourMatch) {
    return Math.min(DEFAULT_WATCH_LIMITS.maxDurationMinutes, Number(hourMatch[1]) * 60);
  }

  const minuteMatch = text.match(/(?:por|durante)\s+(\d{1,4})\s+(?:minuto|minutos|min|m)\b/);
  if (minuteMatch) {
    return Math.min(DEFAULT_WATCH_LIMITS.maxDurationMinutes, Number(minuteMatch[1]));
  }

  return 60;
}

function hasExplicitWatchAuthorization(message) {
  const text = normalizeForGrounding(message);
  return [
    "autorizo o modo vigia",
    "autorizo vigia",
    "pode monitorar",
    "confirmo monitoramento",
    "confirmo o monitoramento"
  ].some((phrase) => text.includes(phrase));
}

function findMissingScope(target, message) {
  const text = normalizeForGrounding(message);
  const missing = [];

  if (target.type === "unknown") {
    missing.push("alvo");
  }

  if (!/(cada|a cada|intervalo|de \d{1,4} (minuto|minutos|min|m|segundo|segundos|seg|s))/.test(text)) {
    missing.push("intervalo");
  }

  if (!/(por|durante) \d{1,4} (minuto|minutos|min|m|hora|horas|h)/.test(text)) {
    missing.push("duracao");
  }

  return missing;
}

function createWatchPlan(message, options = {}) {
  const target = detectWatchTarget(message);
  const intervalSeconds = detectIntervalSeconds(message);
  const durationMinutes = detectDurationMinutes(message);
  const actions = detectWatchActions(message, target);
  const missingScope = findMissingScope(target, message);
  const authorized = options.confirm === true || hasExplicitWatchAuthorization(message);
  const status = authorized && missingScope.length === 0 ? "authorized_plan" : "needs_authorization";

  return {
    status,
    authorized,
    target,
    intervalSeconds,
    durationMinutes,
    actions,
    missingScope,
    limits: DEFAULT_WATCH_LIMITS,
    safety: {
      executesDestructiveActions: false,
      requiresExplicitAuthorization: true,
      notifyOnlyByDefault: true
    },
    createdAt: new Date().toISOString()
  };
}

function formatWatchPlanAnswer(plan) {
  const actionLabels = {
    [WATCH_ACTIONS.READ_LOGS]: "ler logs",
    [WATCH_ACTIONS.READ_FILES]: "ler arquivos/pasta",
    [WATCH_ACTIONS.CHECK_STATUS]: "checar status",
    [WATCH_ACTIONS.NOTIFY_ONLY]: "avisar apenas",
    [WATCH_ACTIONS.NETWORK_CHECK]: "checar rede/site",
    [WATCH_ACTIONS.EMAIL_CHECK]: "checar emails"
  };
  const missing = plan.missingScope.length > 0
    ? `\n\nFalta definir: ${plan.missingScope.join(", ")}.`
    : "";
  const authorizationLine = plan.status === "authorized_plan"
    ? `Autorizacao registrada para este escopo${plan.authorizationExpiresAt ? ` ate ${plan.authorizationExpiresAt}` : ""}.`
    : "Para ativar, confirme com: \"autorizo o modo vigia\" e informe alvo, intervalo e duracao.";

  return [
    "Plano do modo vigia:",
    "",
    `- Alvo: ${plan.target.value || "nao definido"} (${plan.target.type})`,
    `- Intervalo: a cada ${plan.intervalSeconds} segundos`,
    `- Duracao maxima: ${plan.durationMinutes} minutos`,
    `- Acoes permitidas: ${plan.actions.map((action) => actionLabels[action] || action).join(", ")}`,
    "- Acoes destrutivas: bloqueadas",
    "- Padrao: observar e avisar, sem apagar, enviar, postar, comprar, vender ou alterar dados",
    missing,
    "",
    authorizationLine
  ].join("\n").replace(/\n{3,}/g, "\n\n");
}

module.exports = {
  WATCH_ACTIONS,
  createWatchPlan,
  formatWatchPlanAnswer,
  hasExplicitWatchAuthorization
};
