const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { inspectWatchTarget, resolveWatchPath } = require("../src/agents/watchProbe");

test("resolveWatchPath: resolve caminho relativo contra baseDir", () => {
  const resolved = resolveWatchPath(
    { type: "path", value: "app.log" },
    { baseDir: "C:\\tmp\\vigia" }
  );

  assert.equal(resolved, path.resolve("C:\\tmp\\vigia", "app.log"));
});

test("inspectWatchTarget: le apenas metadados e detecta mudanca", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-watch-"));
  const file = path.join(dir, "app.log");
  fs.writeFileSync(file, "a", "utf8");

  try {
    const watchPlan = {
      target: { type: "path", value: file }
    };
    const first = inspectWatchTarget(watchPlan);
    fs.appendFileSync(file, "b", "utf8");
    const second = inspectWatchTarget(watchPlan, first.snapshot);

    assert.equal(first.supported, true);
    assert.equal(first.snapshot.exists, true);
    assert.equal(first.snapshot.type, "file");
    assert.equal(second.changed, true);
    assert.equal(second.snapshot.size, 2);
    assert.equal(second.changes.kind, "file");
    assert.equal(second.changes.direction, "grew");
    assert.equal(second.changes.sizeDelta, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("inspectWatchTarget: resume mudancas em pasta por metadados sem ler conteudo", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-watch-dir-"));
  const firstFile = path.join(dir, "a.log");
  const secondFile = path.join(dir, "b.log");
  fs.writeFileSync(firstFile, "primeiro", "utf8");

  try {
    const watchPlan = {
      target: { type: "path", value: dir }
    };
    const first = inspectWatchTarget(watchPlan);
    fs.appendFileSync(firstFile, "x", "utf8");
    fs.writeFileSync(secondFile, "segundo", "utf8");
    const second = inspectWatchTarget(watchPlan, first.snapshot);

    assert.equal(second.changed, true);
    assert.equal(second.changes.kind, "directory");
    assert.equal(second.changes.addedCount, 1);
    assert.equal(second.changes.modifiedCount, 1);
    assert.deepEqual(second.changes.added, ["b.log"]);
    assert.deepEqual(second.changes.modified, ["a.log"]);
    assert.equal(second.snapshot.entries.some((entry) => entry.name === "a.log" && !("content" in entry)), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("inspectWatchTarget: resolve alvo logs para diretorio de logs configurado", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-watch-logs-"));
  fs.writeFileSync(path.join(dir, "agent.log"), "x", "utf8");

  try {
    const first = inspectWatchTarget({ target: { type: "logs", value: "logs locais" } }, null, { logsDir: dir });

    assert.equal(first.supported, true);
    assert.equal(first.snapshot.path, dir);
    assert.equal(first.snapshot.type, "directory");
    assert.equal(first.snapshot.entries[0].name, "agent.log");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
