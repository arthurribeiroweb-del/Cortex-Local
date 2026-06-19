const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createWatchPlan } = require("../src/agents/watchPermissions");
const {
  listWatchEvents,
  listWatchJobs,
  resetWatchRunnerForTests,
  restoreWatchHistory,
  setWatchEventSink,
  startWatchJob,
  stopWatchJob,
  tickJob
} = require("../src/agents/watchRunner");

test.afterEach(() => {
  resetWatchRunnerForTests();
  setWatchEventSink(null);
});

test("startWatchJob: rejeita plano sem autorizacao", () => {
  const watchPlan = createWatchPlan("modo vigia: monitore os logs a cada 2 minutos por 1 hora");

  assert.throws(
    () => startWatchJob({ watchPlan, question: "teste" }),
    /ainda nao esta autorizado/
  );
});

test("startWatchJob: inicia job autorizado com tick inicial e permite cancelar", () => {
  const watchPlan = createWatchPlan("autorizo o modo vigia: monitore os logs a cada 2 minutos por 1 hora");
  const job = startWatchJob({ watchPlan, question: "logs" });

  assert.equal(job.status, "running");
  assert.equal(job.tickCount, 1);
  assert.equal(job.watchPlan.target.type, "logs");
  assert.equal(listWatchJobs().length, 1);
  assert.equal(listWatchEvents().length, 2);

  const cancelled = stopWatchJob(job.id, "cancelled");
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.nextTickAt, null);
});

test("setWatchEventSink: recebe eventos com snapshot do job", () => {
  const persisted = [];
  setWatchEventSink((entry) => persisted.push(entry));

  const watchPlan = createWatchPlan("autorizo o modo vigia: monitore os logs a cada 2 minutos por 1 hora");
  const job = startWatchJob({ watchPlan, question: "logs" });
  stopWatchJob(job.id, "cancelled");

  assert.equal(persisted.length, 3);
  assert.equal(persisted[0].kind, "event");
  assert.equal(persisted[0].job.status, "running");
  assert.equal(persisted[2].job.status, "cancelled");
});

test("restoreWatchHistory: restaura historico sem religar job em execucao", () => {
  const watchPlan = createWatchPlan("autorizo o modo vigia: monitore os logs a cada 2 minutos por 1 hora");
  const job = startWatchJob({ watchPlan, question: "logs" });
  const events = listWatchEvents();
  const snapshot = listWatchJobs()[0];

  resetWatchRunnerForTests();
  restoreWatchHistory({
    jobs: [snapshot],
    events
  });

  const restored = listWatchJobs()[0];
  assert.equal(restored.id, job.id);
  assert.equal(restored.status, "restored");
  assert.equal(restored.nextTickAt, null);
  assert.equal(restored.tickCount, 1);
  assert.equal(listWatchEvents().length, 2);
});

test("tickJob: registra changed quando metadados do caminho mudam", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-watch-runner-"));
  const file = path.join(dir, "app.log");
  fs.writeFileSync(file, "a", "utf8");

  try {
    const watchPlan = createWatchPlan(`autorizo o modo vigia: monitore ${file} a cada 2 minutos por 1 hora`);
    assert.equal(watchPlan.target.value, file);
    const job = startWatchJob({ watchPlan, question: "arquivo" });
    fs.appendFileSync(file, "b", "utf8");

    const event = tickJob(job.id);

    assert.equal(event.type, "changed");
    assert.equal(event.details.probe.snapshot.size, 2);
    assert.equal(event.details.probe.changes.kind, "file");
    assert.equal(event.details.probe.changes.sizeDelta, 1);
    assert.equal(listWatchJobs()[0].lastSnapshot.size, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
