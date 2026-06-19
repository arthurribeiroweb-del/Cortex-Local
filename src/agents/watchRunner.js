const crypto = require("crypto");
const { inspectWatchTarget } = require("./watchProbe");

const jobs = new Map();
const events = [];
let eventSink = null;

function nowIso() {
  return new Date().toISOString();
}

function createEvent(job, type, message, details = {}) {
  const event = {
    id: crypto.randomUUID(),
    jobId: job.id,
    timestamp: nowIso(),
    type,
    message,
    details
  };

  events.push(event);
  while (events.length > 500) {
    events.shift();
  }

  job.events.push(event);
  while (job.events.length > 100) {
    job.events.shift();
  }

  if (eventSink) {
    try {
      eventSink({
        kind: "event",
        event,
        job: summarizeJob(job)
      });
    } catch (error) {
      // O vigia nao deve parar se a persistencia de historico falhar.
    }
  }

  return event;
}

function summarizeJob(job) {
  return {
    id: job.id,
    status: job.status,
    question: job.question,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    stoppedAt: job.stoppedAt,
    tickCount: job.tickCount,
    lastTickAt: job.lastTickAt,
    nextTickAt: job.nextTickAt,
    watchPlan: job.watchPlan,
    lastSnapshot: job.lastSnapshot || null,
    lastEvent: job.events[job.events.length - 1] || null
  };
}

function assertStartablePlan(watchPlan) {
  if (!watchPlan || typeof watchPlan !== "object") {
    throw new Error("Plano do vigia ausente.");
  }

  if (watchPlan.status !== "authorized_plan") {
    throw new Error("Plano do vigia ainda nao esta autorizado.");
  }

  if (!watchPlan.target || watchPlan.target.type === "unknown") {
    throw new Error("Plano do vigia precisa de alvo definido.");
  }

  if (!Array.isArray(watchPlan.actions) || !watchPlan.actions.includes("notify_only")) {
    throw new Error("Plano do vigia precisa manter aviso como acao padrao.");
  }
}

function buildTickMessage(job) {
  const target = job.watchPlan.target || {};

  if (target.type === "logs") {
    return "Tick do vigia: logs locais observados em modo somente leitura.";
  }

  if (target.type === "path") {
    return "Tick do vigia: caminho local marcado para observacao somente leitura.";
  }

  if (target.type === "status") {
    return "Tick do vigia: status local marcado para observacao.";
  }

  if (target.type === "web") {
    return "Tick do vigia: alvo web registrado; checagem externa automatica ainda bloqueada.";
  }

  if (target.type === "email") {
    return "Tick do vigia: alvo de email registrado; leitura automatica ainda bloqueada.";
  }

  return "Tick do vigia registrado.";
}

function tickJob(jobId) {
  const job = jobs.get(jobId);
  if (!job || job.status !== "running") {
    return null;
  }

  job.tickCount += 1;
  job.lastTickAt = nowIso();
  job.nextTickAt = new Date(Date.now() + job.intervalMs).toISOString();
  const probe = inspectWatchTarget(job.watchPlan, job.lastSnapshot);
  job.lastSnapshot = probe.snapshot || job.lastSnapshot || null;

  return createEvent(job, probe.changed ? "changed" : "tick", probe.supported ? probe.message : buildTickMessage(job), {
    tickCount: job.tickCount,
    target: job.watchPlan.target,
    actions: job.watchPlan.actions,
    probe
  });
}

function startWatchJob({ watchPlan, question = "" }) {
  assertStartablePlan(watchPlan);

  const intervalSeconds = Math.max(60, Number(watchPlan.intervalSeconds) || 300);
  const durationMinutes = Math.max(1, Math.min(240, Number(watchPlan.durationMinutes) || 60));
  const id = crypto.randomUUID();
  const job = {
    id,
    status: "running",
    question: String(question || ""),
    createdAt: nowIso(),
    startedAt: nowIso(),
    stoppedAt: null,
    tickCount: 0,
    lastTickAt: null,
    nextTickAt: new Date(Date.now() + intervalSeconds * 1000).toISOString(),
    intervalMs: intervalSeconds * 1000,
    durationMs: durationMinutes * 60 * 1000,
    watchPlan,
    lastSnapshot: null,
    events: [],
    intervalHandle: null,
    timeoutHandle: null
  };

  jobs.set(id, job);
  createEvent(job, "started", "Worker do vigia iniciado em modo seguro.", {
    target: watchPlan.target,
    intervalSeconds,
    durationMinutes
  });
  tickJob(id);

  job.intervalHandle = setInterval(() => tickJob(id), job.intervalMs);
  job.timeoutHandle = setTimeout(() => stopWatchJob(id, "completed"), job.durationMs);

  if (typeof job.intervalHandle.unref === "function") {
    job.intervalHandle.unref();
  }

  if (typeof job.timeoutHandle.unref === "function") {
    job.timeoutHandle.unref();
  }

  return summarizeJob(job);
}

function stopWatchJob(jobId, status = "cancelled") {
  const job = jobs.get(jobId);
  if (!job) {
    return null;
  }

  if (job.intervalHandle) {
    clearInterval(job.intervalHandle);
  }

  if (job.timeoutHandle) {
    clearTimeout(job.timeoutHandle);
  }

  job.status = status;
  job.stoppedAt = nowIso();
  job.nextTickAt = null;
  createEvent(job, status, status === "completed" ? "Worker do vigia finalizado pelo limite de duracao." : "Worker do vigia cancelado.", {
    tickCount: job.tickCount
  });

  return summarizeJob(job);
}

function listWatchJobs() {
  return Array.from(jobs.values()).map(summarizeJob).reverse();
}

function listWatchEvents(limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
  return events.slice(-safeLimit).reverse();
}

function resetWatchRunnerForTests() {
  for (const job of jobs.values()) {
    if (job.intervalHandle) {
      clearInterval(job.intervalHandle);
    }
    if (job.timeoutHandle) {
      clearTimeout(job.timeoutHandle);
    }
  }

  jobs.clear();
  events.splice(0, events.length);
}

function setWatchEventSink(sink) {
  eventSink = typeof sink === "function" ? sink : null;
}

function restoreWatchHistory({ jobs: restoredJobs = [], events: restoredEvents = [] } = {}) {
  resetWatchRunnerForTests();

  for (const event of restoredEvents.slice(-500)) {
    if (event && event.id && event.jobId) {
      events.push(event);
    }
  }

  for (const snapshot of restoredJobs.slice(-100)) {
    if (!snapshot || !snapshot.id) {
      continue;
    }

    const restoredJobEvents = events.filter((event) => event.jobId === snapshot.id).slice(-100);
    const job = {
      id: snapshot.id,
      status: snapshot.status === "running" ? "restored" : (snapshot.status || "restored"),
      question: snapshot.question || "",
      createdAt: snapshot.createdAt || nowIso(),
      startedAt: snapshot.startedAt || null,
      stoppedAt: snapshot.stoppedAt || null,
      tickCount: Number(snapshot.tickCount) || 0,
      lastTickAt: snapshot.lastTickAt || null,
      nextTickAt: null,
      intervalMs: 0,
      durationMs: 0,
      watchPlan: snapshot.watchPlan || null,
      lastSnapshot: snapshot.lastSnapshot || null,
      events: restoredJobEvents,
      intervalHandle: null,
      timeoutHandle: null
    };

    jobs.set(job.id, job);
  }
}

module.exports = {
  listWatchEvents,
  listWatchJobs,
  resetWatchRunnerForTests,
  restoreWatchHistory,
  setWatchEventSink,
  startWatchJob,
  stopWatchJob,
  tickJob
};
