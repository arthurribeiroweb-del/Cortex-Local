const crypto = require("crypto");

const authorizations = new Map();
let authorizationSink = null;

function nowMs() {
  return Date.now();
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeTargetValue(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeActions(actions) {
  return Array.from(new Set(actions || [])).sort();
}

function scopeKeyFromPlan(watchPlan) {
  const target = watchPlan && watchPlan.target ? watchPlan.target : {};
  const actions = normalizeActions(watchPlan && watchPlan.actions);
  return [
    target.type || "unknown",
    normalizeTargetValue(target.value),
    actions.join(",")
  ].join("|");
}

function computeStatus(authorization, atMs = nowMs()) {
  if (!authorization) {
    return "missing";
  }

  if (authorization.revokedAt) {
    return "revoked";
  }

  if (Date.parse(authorization.expiresAt) <= atMs) {
    return "expired";
  }

  return "active";
}

function emitAuthorization(entry) {
  if (!authorizationSink) {
    return;
  }

  try {
    authorizationSink(entry);
  } catch (error) {
    // Autorizacao em memoria continua valida mesmo se o historico falhar.
  }
}

function summarizeAuthorization(authorization) {
  return {
    ...authorization,
    status: computeStatus(authorization)
  };
}

function createWatchAuthorization(watchPlan, options = {}) {
  if (!watchPlan || watchPlan.status !== "authorized_plan") {
    throw new Error("Plano do vigia precisa estar autorizado.");
  }

  if (!watchPlan.target || watchPlan.target.type === "unknown") {
    throw new Error("Autorizacao do vigia precisa de alvo definido.");
  }

  const durationMinutes = Math.max(1, Math.min(240, Number(watchPlan.durationMinutes) || 60));
  const createdAtMs = nowMs();
  const authorization = {
    id: crypto.randomUUID(),
    scopeKey: scopeKeyFromPlan(watchPlan),
    target: watchPlan.target,
    actions: normalizeActions(watchPlan.actions),
    intervalSeconds: Math.max(60, Number(watchPlan.intervalSeconds) || 300),
    durationMinutes,
    createdAt: new Date(createdAtMs).toISOString(),
    expiresAt: new Date(createdAtMs + durationMinutes * 60 * 1000).toISOString(),
    revokedAt: null,
    sourceQuestion: String(options.sourceQuestion || ""),
    source: options.source || "watch_plan"
  };

  authorizations.set(authorization.id, authorization);
  emitAuthorization({
    kind: "authorization_created",
    timestamp: nowIso(),
    authorization: summarizeAuthorization(authorization)
  });

  return summarizeAuthorization(authorization);
}

function listWatchAuthorizations(options = {}) {
  const includeExpired = options.includeExpired !== false;
  const items = Array.from(authorizations.values()).map(summarizeAuthorization);

  return items
    .filter((authorization) => includeExpired || authorization.status === "active")
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function findValidWatchAuthorization(watchPlan, atMs = nowMs()) {
  const scopeKey = scopeKeyFromPlan(watchPlan);
  const requiredActions = normalizeActions(watchPlan && watchPlan.actions);

  return Array.from(authorizations.values())
    .map(summarizeAuthorization)
    .find((authorization) => (
      authorization.scopeKey === scopeKey
      && computeStatus(authorization, atMs) === "active"
      && requiredActions.every((action) => authorization.actions.includes(action))
    )) || null;
}

function hasActiveWatchAuthorization(id, atMs = nowMs()) {
  const authorization = authorizations.get(id);
  return computeStatus(authorization, atMs) === "active";
}

function applyWatchAuthorization(watchPlan) {
  const authorization = findValidWatchAuthorization(watchPlan);

  if (!authorization) {
    return watchPlan;
  }

  return {
    ...watchPlan,
    status: "authorized_plan",
    authorized: true,
    authorizationId: authorization.id,
    authorizationExpiresAt: authorization.expiresAt,
    missingScope: []
  };
}

function revokeWatchAuthorization(id) {
  const authorization = authorizations.get(id);
  if (!authorization) {
    return null;
  }

  if (!authorization.revokedAt) {
    authorization.revokedAt = nowIso();
    emitAuthorization({
      kind: "authorization_revoked",
      timestamp: nowIso(),
      authorization: summarizeAuthorization(authorization)
    });
  }

  return summarizeAuthorization(authorization);
}

function restoreWatchAuthorizations(entries = []) {
  authorizations.clear();

  for (const entry of entries) {
    const authorization = entry && entry.authorization ? entry.authorization : entry;
    if (!authorization || !authorization.id) {
      continue;
    }

    authorizations.set(authorization.id, {
      ...authorization,
      actions: normalizeActions(authorization.actions),
      scopeKey: authorization.scopeKey || scopeKeyFromPlan(authorization)
    });
  }
}

function resetWatchAuthorizationsForTests() {
  authorizations.clear();
  authorizationSink = null;
}

function setWatchAuthorizationSink(sink) {
  authorizationSink = typeof sink === "function" ? sink : null;
}

module.exports = {
  applyWatchAuthorization,
  createWatchAuthorization,
  findValidWatchAuthorization,
  hasActiveWatchAuthorization,
  listWatchAuthorizations,
  resetWatchAuthorizationsForTests,
  restoreWatchAuthorizations,
  revokeWatchAuthorization,
  scopeKeyFromPlan,
  setWatchAuthorizationSink
};
