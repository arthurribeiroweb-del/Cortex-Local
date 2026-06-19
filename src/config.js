const fs = require("fs");
const path = require("path");

const ENV_PATH = path.join(__dirname, "..", ".env");

/**
 * Parser puro de conteudo no formato .env.
 * Ignora linhas vazias, comentarios (#) e linhas sem "=".
 * Remove aspas simples/duplas ao redor do valor.
 * Mantido puro (sem I/O) para ser testavel diretamente.
 */
function parseEnv(content) {
  const env = {};

  for (const line of String(content || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = value;
  }

  return env;
}

function loadEnvFile(envPath = ENV_PATH) {
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return parseEnv(fs.readFileSync(envPath, "utf8"));
}

// Le o .env do disco uma unica vez (antes era lido a cada request em webSearch.js).
let fileEnvCache = loadEnvFile();

/**
 * Recarrega o .env do disco. Usado em testes; em producao o cache basta.
 */
function reloadEnv(envPath = ENV_PATH) {
  fileEnvCache = loadEnvFile(envPath);
  return fileEnvCache;
}

/**
 * Resolve uma chave com a mesma precedencia de antes:
 * process.env tem prioridade, depois o .env do disco, depois o fallback.
 */
function env(key, fallback = "") {
  return process.env[key] || fileEnvCache[key] || fallback;
}

function getServerConfig() {
  const defaultModel = env("DEFAULT_MODEL", "qwen2.5:3b");

  return {
    host: env("HOST", "127.0.0.1"),
    port: Number(env("PORT", "3000")),
    ollamaBaseUrl: env("OLLAMA_BASE_URL", "http://localhost:11434"),
    ollamaTimeoutMs: Number(env("OLLAMA_TIMEOUT_MS", "60000")),
    defaultModel,
    draftModel: env("DRAFT_MODEL", defaultModel),
    criticModel: env("CRITIC_MODEL", "mistral:7b"),
    finalModel: env("FINAL_MODEL", defaultModel),
    httpsPort: Number(env("HTTPS_PORT", "3443")),
    certKeyPath: env("CERT_KEY", "certs/key.pem"),
    certFilePath: env("CERT_FILE", "certs/cert.pem")
  };
}

function getVoiceConfig() {
  return {
    whisperExe: env("WHISPER_EXE", "C:/PROJETOS/IA-LOCAL/tools/whisper.cpp/Release/whisper-cli.exe"),
    whisperModel: env("WHISPER_MODEL", "C:/PROJETOS/IA-LOCAL/models/whisper/ggml-base.bin"),
    whisperLanguage: env("WHISPER_LANGUAGE", "pt"),
    piperExe: env("PIPER_EXE", "C:/PROJETOS/IA-LOCAL/tools/piper/piper/piper.exe"),
    piperModel: env("PIPER_MODEL", "C:/PROJETOS/IA-LOCAL/models/piper/pt_BR-faber-medium.onnx")
  };
}

function getWebSearchConfig() {
  return {
    provider: env("WEB_SEARCH_PROVIDER", "duckduckgo").toLowerCase(),
    tavilyApiKey: env("TAVILY_API_KEY"),
    braveApiKey: env("BRAVE_SEARCH_API_KEY"),
    searxngUrl: env("SEARXNG_URL", "http://localhost:8080"),
    maxResults: Math.max(1, Math.min(Number(env("WEB_SEARCH_MAX_RESULTS", "5")) || 5, 10)),
    timeoutMs: Math.max(3000, Number(env("WEB_SEARCH_TIMEOUT_MS", "12000")) || 12000)
  };
}

module.exports = {
  ENV_PATH,
  parseEnv,
  loadEnvFile,
  reloadEnv,
  env,
  getServerConfig,
  getVoiceConfig,
  getWebSearchConfig
};
