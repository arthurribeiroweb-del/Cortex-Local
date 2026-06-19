const { normalizeForGrounding } = require("../grounding");

function isWatchCommandCandidate(text) {
  return text.includes("vigia")
    || text.includes("monitoramento")
    || text.includes("autorizacao")
    || text.includes("autorizacoes");
}

function detectWatchCommand(message) {
  const text = normalizeForGrounding(message);

  if (!isWatchCommandCandidate(text)) {
    return null;
  }

  if (
    text.includes("mostre vigias ativos")
    || text.includes("mostrar vigias ativos")
    || text.includes("vigias ativos")
    || text.includes("jobs do vigia")
    || text.includes("status do vigia")
  ) {
    return { type: "list_jobs" };
  }

  if (
    text.includes("mostre autorizacoes")
    || text.includes("mostrar autorizacoes")
    || text.includes("autorizacoes do vigia")
    || text.includes("autorizacao do vigia")
  ) {
    return { type: "list_authorizations" };
  }

  if (
    text.includes("pare o vigia")
    || text.includes("parar o vigia")
    || text.includes("cancele o vigia")
    || text.includes("cancelar o vigia")
    || text.includes("pare vigia")
  ) {
    return { type: "stop_jobs" };
  }

  if (
    text.includes("revogue autorizacao")
    || text.includes("revogar autorizacao")
    || text.includes("revogue a autorizacao")
    || text.includes("revogar a autorizacao")
  ) {
    return {
      type: "revoke_authorization",
      targetHint: extractTargetHint(text)
    };
  }

  return null;
}

function extractTargetHint(text) {
  if (text.includes("logs") || text.includes("log")) {
    return "logs";
  }

  if (text.includes("email") || text.includes("emails")) {
    return "email";
  }

  if (text.includes("site") || text.includes("web") || text.includes("url")) {
    return "web";
  }

  const pathMatch = text.match(/([a-z]:\\[^\r\n"'<>|]+|\.{1,2}\\[^\r\n"'<>|]+|\/[^\s"'<>|]+)/i);
  if (pathMatch) {
    return pathMatch[1].trim();
  }

  return "";
}

function formatWatchJobsAnswer(jobs) {
  const running = (jobs || []).filter((job) => job.status === "running");

  if (running.length === 0) {
    return "Nao ha vigias ativos no momento.";
  }

  return [
    `Vigias ativos: ${running.length}`,
    "",
    ...running.map((job) => {
      const target = job.watchPlan && job.watchPlan.target ? job.watchPlan.target : {};
      return `- ${target.value || job.question || job.id} | ticks: ${job.tickCount || 0} | proximo: ${job.nextTickAt || "-"}`;
    })
  ].join("\n");
}

function formatStoppedWatchJobsAnswer(stoppedJobs) {
  if (!Array.isArray(stoppedJobs) || stoppedJobs.length === 0) {
    return "Nao havia vigia ativo para parar.";
  }

  return [
    `Parei ${stoppedJobs.length} vigia${stoppedJobs.length === 1 ? "" : "s"} ativo${stoppedJobs.length === 1 ? "" : "s"}.`,
    "",
    ...stoppedJobs.map((job) => {
      const target = job.watchPlan && job.watchPlan.target ? job.watchPlan.target : {};
      return `- ${target.value || job.question || job.id}`;
    })
  ].join("\n");
}

function formatWatchAuthorizationsAnswer(authorizations) {
  if (!Array.isArray(authorizations) || authorizations.length === 0) {
    return "Nao ha autorizacoes do vigia salvas.";
  }

  return [
    `Autorizacoes do vigia: ${authorizations.length}`,
    "",
    ...authorizations.slice(0, 12).map((authorization) => {
      const target = authorization.target || {};
      return `- ${target.value || "-"} | ${authorization.status || "-"} | expira: ${authorization.expiresAt || "-"}`;
    })
  ].join("\n");
}

function formatRevokedWatchAuthorizationAnswer(revoked, targetHint = "") {
  if (!Array.isArray(revoked) || revoked.length === 0) {
    return targetHint
      ? `Nao encontrei autorizacao ativa do vigia para "${targetHint}".`
      : "Nao encontrei autorizacao ativa do vigia para revogar.";
  }

  return [
    `Revoguei ${revoked.length} autorizacao${revoked.length === 1 ? "" : "es"} do vigia.`,
    "",
    ...revoked.map((authorization) => {
      const target = authorization.target || {};
      return `- ${target.value || authorization.id}`;
    })
  ].join("\n");
}

function authorizationMatchesHint(authorization, targetHint = "") {
  if (!targetHint) {
    return false;
  }

  const hint = normalizeForGrounding(targetHint);
  const target = authorization.target || {};
  const value = normalizeForGrounding(target.value || "");
  const type = normalizeForGrounding(target.type || "");

  return value.includes(hint)
    || type.includes(hint)
    || (hint === "logs" && (type === "logs" || value.includes("log")));
}

module.exports = {
  authorizationMatchesHint,
  detectWatchCommand,
  formatRevokedWatchAuthorizationAnswer,
  formatStoppedWatchJobsAnswer,
  formatWatchAuthorizationsAnswer,
  formatWatchJobsAnswer
};
