const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const voiceDir = path.join(__dirname, "..", "voice");
const configPath = path.join(voiceDir, "config.json");
const configExamplePath = path.join(voiceDir, "config.example.json");
const scriptPath = path.join(voiceDir, "voice_agent.py");
const MAX_LOG_LINES = 200;

let voiceProcess = null;
let startedAt = null;
let lastExit = null;
const logLines = [];

function addLog(line) {
  const text = String(line || "").trim();
  if (!text) {
    return;
  }

  for (const part of text.split(/\r?\n/)) {
    if (!part.trim()) {
      continue;
    }

    logLines.push({
      timestamp: new Date().toISOString(),
      text: part.trim()
    });
  }

  while (logLines.length > MAX_LOG_LINES) {
    logLines.shift();
  }
}

function isRunning() {
  return Boolean(voiceProcess && !voiceProcess.killed && voiceProcess.exitCode === null);
}

function getStatus() {
  return {
    running: isRunning(),
    pid: isRunning() ? voiceProcess.pid : null,
    started_at: startedAt,
    configured: fs.existsSync(configPath),
    config_path: "voice/config.json",
    script: "voice/voice_agent.py",
    python: process.env.PYTHON_EXE || "python",
    last_exit: lastExit,
    logs: logLines.slice(-30)
  };
}

async function getConfigText() {
  if (fs.existsSync(configPath)) {
    return {
      path: "voice/config.json",
      exists: true,
      content: await fsPromises.readFile(configPath, "utf8")
    };
  }

  return {
    path: "voice/config.json",
    exists: false,
    content: await fsPromises.readFile(configExamplePath, "utf8")
  };
}

function resolveConfigPath(value) {
  const rawPath = String(value || "");
  if (!rawPath) {
    return "";
  }

  const filePath = path.isAbsolute(rawPath) ? rawPath : path.join(voiceDir, rawPath);
  return path.normalize(filePath);
}

async function getDiagnostics() {
  const configInfo = await getConfigText();
  let parsed = null;
  const checks = [];

  try {
    parsed = JSON.parse(configInfo.content);
  } catch (error) {
    return {
      configured: configInfo.exists,
      ready: false,
      error: "Configuração de voz não é JSON válido.",
      checks
    };
  }

  const required = [
    ["wakeword_model_path", "Modelo wake word"],
    ["whisper_exe_path", "Executável Whisper"],
    ["whisper_model_path", "Modelo Whisper"],
    ["piper_exe_path", "Executável Piper"],
    ["piper_model_path", "Modelo Piper"]
  ];

  for (const [key, label] of required) {
    const resolvedPath = resolveConfigPath(parsed[key]);
    checks.push({
      key,
      label,
      path: parsed[key] || "",
      resolvedPath,
      exists: Boolean(resolvedPath && fs.existsSync(resolvedPath))
    });
  }

  const byKey = Object.fromEntries(checks.map((check) => [check.key, check.exists]));
  const pushToTalkReady = Boolean(
    byKey.whisper_exe_path &&
    byKey.whisper_model_path &&
    byKey.piper_exe_path &&
    byKey.piper_model_path
  );

  return {
    configured: configInfo.exists,
    ready: configInfo.exists && checks.every((check) => check.exists),
    pushToTalkReady,
    error: null,
    checks
  };
}

async function saveConfigText(content) {
  let parsed;

  try {
    parsed = JSON.parse(String(content || ""));
  } catch (error) {
    throw new Error("Configuração inválida. O conteúdo precisa ser JSON válido.");
  }

  await fsPromises.writeFile(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  addLog("Configuração de voz salva em voice/config.json.");

  return {
    path: "voice/config.json"
  };
}

function startVoice() {
  if (isRunning()) {
    return getStatus();
  }

  if (!fs.existsSync(configPath)) {
    throw new Error("Voz ainda não configurada. Salve voice/config.json pela interface antes de iniciar.");
  }

  if (!fs.existsSync(scriptPath)) {
    throw new Error("Script de voz não encontrado em voice/voice_agent.py.");
  }

  const pythonExe = process.env.PYTHON_EXE || "python";
  lastExit = null;
  startedAt = new Date().toISOString();
  addLog(`Iniciando voz com ${pythonExe} voice_agent.py`);

  voiceProcess = spawn(pythonExe, ["voice_agent.py"], {
    cwd: voiceDir,
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONIOENCODING: "utf-8",
      PYTHONUNBUFFERED: "1"
    }
  });

  voiceProcess.stdout.on("data", (data) => addLog(data.toString("utf8")));
  voiceProcess.stderr.on("data", (data) => addLog(data.toString("utf8")));
  voiceProcess.on("error", (error) => {
    lastExit = {
      code: null,
      signal: null,
      message: error.message,
      timestamp: new Date().toISOString()
    };
    addLog(`Erro ao iniciar voz: ${error.message}`);
  });
  voiceProcess.on("exit", (code, signal) => {
    lastExit = {
      code,
      signal,
      message: code === 0 ? "Agente de voz encerrado." : "Agente de voz parou com erro.",
      timestamp: new Date().toISOString()
    };
    addLog(`${lastExit.message} Código: ${code ?? "n/a"} Sinal: ${signal ?? "n/a"}`);
    voiceProcess = null;
    startedAt = null;
  });

  return getStatus();
}

function stopVoice() {
  if (!isRunning()) {
    addLog("Voz já estava parada.");
    return getStatus();
  }

  const pid = voiceProcess.pid;
  voiceProcess.kill();
  addLog(`Solicitado parar voz. PID: ${pid}`);

  return getStatus();
}

function getLogs() {
  return logLines.slice();
}

module.exports = {
  getConfigText,
  getDiagnostics,
  getLogs,
  getStatus,
  saveConfigText,
  startVoice,
  stopVoice
};
