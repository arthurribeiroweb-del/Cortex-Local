const fs = require("fs");
const path = require("path");

const MAX_DIRECTORY_ENTRIES = 200;

function safeStat(targetPath) {
  try {
    return fs.statSync(targetPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function directoryItemCount(targetPath) {
  try {
    return fs.readdirSync(targetPath, { withFileTypes: true }).length;
  } catch (error) {
    return null;
  }
}

function safeDirectoryEntries(targetPath) {
  try {
    return fs.readdirSync(targetPath, { withFileTypes: true })
      .slice(0, MAX_DIRECTORY_ENTRIES)
      .map((entry) => {
        const entryPath = path.join(targetPath, entry.name);
        const stat = safeStat(entryPath);
        return {
          name: entry.name,
          type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other",
          size: stat ? stat.size : 0,
          modifiedAt: stat ? stat.mtime.toISOString() : null,
          signature: stat ? [entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other", stat.size, stat.mtimeMs].join(":") : "missing"
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    return null;
  }
}

function signatureFromEntries(type, stat, itemCount, entries) {
  if (type !== "directory") {
    return [type, stat.size, stat.mtimeMs, itemCount].join(":");
  }

  const entrySignature = Array.isArray(entries)
    ? entries.map((entry) => `${entry.name}:${entry.signature}`).join("|")
    : "";
  return [type, stat.size, stat.mtimeMs, itemCount, entrySignature].join(":");
}

function snapshotFromStat(targetPath, stat) {
  if (!stat) {
    return {
      exists: false,
      path: targetPath,
      type: "missing",
      size: 0,
      modifiedAt: null,
      itemCount: null,
      entries: null,
      signature: "missing"
    };
  }

  const type = stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "other";
  const itemCount = type === "directory" ? directoryItemCount(targetPath) : null;
  const entries = type === "directory" ? safeDirectoryEntries(targetPath) : null;

  return {
    exists: true,
    path: targetPath,
    type,
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    itemCount,
    entries,
    signature: signatureFromEntries(type, stat, itemCount, entries)
  };
}

function indexEntries(entries) {
  const map = new Map();
  for (const entry of entries || []) {
    map.set(entry.name, entry);
  }
  return map;
}

function summarizeEntryNames(entries) {
  return entries.slice(0, 10).map((entry) => entry.name);
}

function compareDirectorySnapshots(previousSnapshot, snapshot) {
  const previousEntries = indexEntries(previousSnapshot.entries);
  const currentEntries = indexEntries(snapshot.entries);
  const added = [];
  const removed = [];
  const modified = [];

  for (const entry of currentEntries.values()) {
    const previous = previousEntries.get(entry.name);
    if (!previous) {
      added.push(entry);
    } else if (previous.signature !== entry.signature) {
      modified.push(entry);
    }
  }

  for (const entry of previousEntries.values()) {
    if (!currentEntries.has(entry.name)) {
      removed.push(entry);
    }
  }

  return {
    kind: "directory",
    itemCountBefore: previousSnapshot.itemCount,
    itemCountAfter: snapshot.itemCount,
    itemCountDelta: Number(snapshot.itemCount || 0) - Number(previousSnapshot.itemCount || 0),
    addedCount: added.length,
    removedCount: removed.length,
    modifiedCount: modified.length,
    added: summarizeEntryNames(added),
    removed: summarizeEntryNames(removed),
    modified: summarizeEntryNames(modified),
    truncated: Boolean((snapshot.itemCount || 0) > MAX_DIRECTORY_ENTRIES || (previousSnapshot.itemCount || 0) > MAX_DIRECTORY_ENTRIES)
  };
}

function compareFileSnapshots(previousSnapshot, snapshot) {
  const sizeBefore = Number(previousSnapshot.size) || 0;
  const sizeAfter = Number(snapshot.size) || 0;
  const sizeDelta = sizeAfter - sizeBefore;

  return {
    kind: "file",
    sizeBefore,
    sizeAfter,
    sizeDelta,
    direction: sizeDelta > 0 ? "grew" : sizeDelta < 0 ? "shrunk" : "touched",
    modifiedAtBefore: previousSnapshot.modifiedAt,
    modifiedAtAfter: snapshot.modifiedAt
  };
}

function compareSnapshots(previousSnapshot, snapshot) {
  if (!previousSnapshot) {
    return null;
  }

  if (previousSnapshot.exists !== snapshot.exists) {
    return {
      kind: "existence",
      before: previousSnapshot.exists,
      after: snapshot.exists
    };
  }

  if (previousSnapshot.type !== snapshot.type) {
    return {
      kind: "type",
      before: previousSnapshot.type,
      after: snapshot.type
    };
  }

  if (snapshot.type === "directory") {
    return compareDirectorySnapshots(previousSnapshot, snapshot);
  }

  if (snapshot.type === "file") {
    return compareFileSnapshots(previousSnapshot, snapshot);
  }

  return {
    kind: snapshot.type || "other",
    modifiedAtBefore: previousSnapshot.modifiedAt,
    modifiedAtAfter: snapshot.modifiedAt
  };
}

function resolveWatchPath(target, options = {}) {
  if (!target || !target.value) {
    return "";
  }

  if (target.type === "logs") {
    return options.logsDir || path.join(process.cwd(), "logs");
  }

  if (target.type !== "path") {
    return "";
  }

  const value = String(target.value || "").trim();
  if (!value) {
    return "";
  }

  return path.isAbsolute(value)
    ? value
    : path.resolve(options.baseDir || process.cwd(), value);
}

function inspectWatchTarget(watchPlan, previousSnapshot = null, options = {}) {
  const target = watchPlan && watchPlan.target ? watchPlan.target : {};
  const targetPath = resolveWatchPath(target, options);

  if (!targetPath) {
    return {
      supported: false,
      changed: false,
      snapshot: null,
      message: "Alvo do vigia sem probe read-only disponivel."
    };
  }

  const snapshot = snapshotFromStat(targetPath, safeStat(targetPath));
  const changed = Boolean(previousSnapshot && previousSnapshot.signature !== snapshot.signature);
  const changes = changed ? compareSnapshots(previousSnapshot, snapshot) : null;

  return {
    supported: true,
    changed,
    snapshot,
    changes,
    message: changed
      ? "Mudanca detectada em alvo monitorado."
      : "Alvo monitorado conferido em modo read-only."
  };
}

module.exports = {
  compareSnapshots,
  inspectWatchTarget,
  resolveWatchPath
};
