const express = require("express");
const fs = require("fs/promises");
const fsSync = require("fs");
const https = require("https");
const path = require("path");
const { spawn } = require("child_process");
const {
  buildMemoryContext,
  detectMemoryCommand,
  listMemoryFiles,
  readMemoryFile,
  rememberText,
  saveMemoryFile,
  searchMemory
} = require("./src/memory");
const voiceService = require("./src/voiceService");
const localVoice = require("./src/localVoice");
const { getConfig: getWebSearchConfig, searchWeb } = require("./src/webSearch");
const {
  getCorrections,
  getVerifiedFacts,
  saveCorrection,
  saveWebResearch,
  shouldAutoSaveCorrection,
  temporalSensitivityFromText
} = require("./src/brainCorrections");

const { getServerConfig } = require("./src/config");
const { isAuthorized, extractRequestToken } = require("./src/auth");
const {
  normalizeForGrounding,
  removeUnsupportedBrazilRegionClaims,
  isOllamaReleaseQuery,
  formatBrazilDate,
  officialVersionMismatch,
  containsInternalLeak
} = require("./src/grounding");
const {
  parseJsonObject,
  normalizeCriticReview,
  userMessageNeedsCurrentInfo,
  shouldTriggerWebCheck,
  getWebCheckReason,
  webCheckReasonLabel
} = require("./src/critic");
const { createStreamAccumulator } = require("./src/ollamaStream");
const {
  buildConfirmationRequiredAnswer,
  createChatPlan
} = require("./src/agents/orchestrator");
const { listAgents } = require("./src/agents/agentsConfig");
const {
  createWatchPlan,
  formatWatchPlanAnswer
} = require("./src/agents/watchPermissions");
const {
  authorizationMatchesHint,
  detectWatchCommand,
  formatRevokedWatchAuthorizationAnswer,
  formatStoppedWatchJobsAnswer,
  formatWatchAuthorizationsAnswer,
  formatWatchJobsAnswer
} = require("./src/agents/watchCommands");
const {
  applyWatchAuthorization,
  createWatchAuthorization,
  hasActiveWatchAuthorization,
  listWatchAuthorizations,
  restoreWatchAuthorizations,
  revokeWatchAuthorization,
  setWatchAuthorizationSink
} = require("./src/agents/watchAuthorizations");
const {
  listWatchEvents,
  listWatchJobs,
  restoreWatchHistory,
  setWatchEventSink,
  startWatchJob,
  stopWatchJob
} = require("./src/agents/watchRunner");

const {
  defaultModel: DEFAULT_MODEL,
  draftModel: DRAFT_MODEL,
  criticModel: CRITIC_MODEL,
  finalModel: FINAL_MODEL,
  ollamaBaseUrl: OLLAMA_BASE_URL,
  host: HOST,
  port: PORT,
  ollamaTimeoutMs: OLLAMA_TIMEOUT_MS,
  httpsPort: HTTPS_PORT,
  certKeyPath: CERT_KEY,
  certFilePath: CERT_FILE,
  authToken: AUTH_TOKEN
} = getServerConfig();

const SYSTEM_PROMPT = `Você é o JARVIS, um assistente local generalista em português do Brasil.

<personalidade>
- Seja direto, firme, útil e sincero.
- Não bajule o usuário.
- Não tente agradar só para parecer simpático.
- Se a ideia, lógica ou decisão do usuário estiver ruim, diga claramente, mas com respeito.
- Aja como um amigo verdadeiro: ajuda, alerta, corrige e pode fazer uma piada curta quando combinar.
- Use humor leve, natural e sem exagero.
- Não use emojis, a menos que o usuário peça.
- Evite formalidade excessiva.
- Evite tom robótico.
- Não invente dados, links, preços, leis, compatibilidades ou informações atuais.
- Se não souber, diga que não tem certeza.
- Se precisar de dados atuais ou internet, diga claramente que precisa consultar fontes atualizadas.
- Não explique seu raciocínio interno.
- Dê apenas a resposta final.
</personalidade>

<estilo_de_resposta>
- Responda sempre em português do Brasil.
- Para perguntas simples, responda curto, de preferência em até 2 frases.
- Para assuntos técnicos, explique de forma prática e passo a passo quando necessário.
- Para decisões e comparações, tome um lado, diga qual escolheria e explique o motivo.
- Para cálculos, monte a conta de forma simples, confira o resultado e só então responda.
- Para programação, entregue comandos ou código prontos para copiar. Explique pouco, apenas o necessário.
- Para erros técnicos, diga a causa provável e o próximo teste prático.
- Para pedidos vagos ou confusos, não assuma o sistema, servidor ou cliente. Diga o que entendeu em uma frase e faça no máximo 2 perguntas objetivas antes de agir.
- Nunca diga "vou verificar", "vou acessar" ou "vou fazer" uma ação externa se você não está realmente executando essa ação. Se for apenas uma orientação, diga "verifique" ou "o próximo teste é".
- Para textos e mensagens, escreva de forma natural, objetiva e pronta para uso.
- Para assuntos perigosos, ilegais ou arriscados, recuse de forma clara e ofereça alternativa segura.
- Se faltar contexto, faça uma pergunta curta ou dê a melhor resposta possível deixando a suposição clara.
</estilo_de_resposta>

<escopo_de_conhecimento>
- Você é generalista: tecnologia, Windows, hardware, IA local, programação, negócios, produtividade, veículos, eletrônica, automação e dúvidas do dia a dia.
- Quando o assunto for rastreamento veicular, Traccar, TraccarPro, GPS, chip M2M, APN, GSM, porta TCP, porta UDP, comandos SMS ou instalação de rastreadores, responda como especialista técnico.
- Quando o assunto for IA local, Ollama, modelos, GPU, VRAM, Python, Node.js, servidores locais ou automação, responda como assistente técnico prático.
- Quando o assunto depender de informação atualizada, como preço, link, estoque, legislação, versão de software ou compatibilidade recente, avise que precisa consultar a internet.
</escopo_de_conhecimento>

<regras_de_ouro>
- Resolva o problema do jeito mais prático possível.
- Sem enrolação.
- Sem bajulação.
- Sem rodeios.
- Sem inventar.
- Se a resposta curta resolver, seja curto.
- Se a resposta completa for necessária, organize em passos.
</regras_de_ouro>

<verificacao_e_memoria>
- Se o usuário disser que você está errado, pedir para conferir, perguntar "tem certeza?" ou solicitar pesquisa, use o modo de verificação na internet quando estiver disponível.
- Ao corrigir uma resposta com base em fontes, diga claramente se a resposta anterior estava correta, incompleta ou errada.
- Não tenha orgulho de resposta errada. Corrija rápido.
- Quando uma correção técnica for confirmada por fontes confiáveis, ela pode ser salva no brain.
- Informações com preço, estoque, lei, versão, notícia, política, disponibilidade ou compatibilidade recente devem ser marcadas como sensíveis ao tempo.
- Antes de usar uma informação sensível ao tempo salva na memória, avise que pode estar desatualizada.
</verificacao_e_memoria>`;

const app = express();
const publicDir = path.join(__dirname, "public");
const logsDir = path.join(__dirname, "logs");
const memoryDir = path.join(__dirname, "memory");
const conversationsLog = path.join(logsDir, "conversations.jsonl");
const agentDebatesLog = path.join(logsDir, "agent-debates.jsonl");
const agentWatchPlansLog = path.join(logsDir, "agent-watch-plans.jsonl");
const agentWatchEventsLog = path.join(logsDir, "agent-watch-events.jsonl");
const agentWatchAuthorizationsLog = path.join(logsDir, "agent-watch-authorizations.jsonl");
const chatHistory = [];
let lastWebCheck = null;
let lastAgentDebate = null;

app.use(express.json({ limit: "20mb" }));

// Autenticacao opcional por token. Quando AUTH_TOKEN esta definido no .env,
// todas as rotas /api (exceto /api/health, util para diagnostico) exigem o token.
// Sem AUTH_TOKEN o comportamento e o de antes (acesso local aberto).
app.use("/api", (req, res, next) => {
  if (!AUTH_TOKEN || req.path === "/health") {
    return next();
  }

  if (isAuthorized(extractRequestToken(req), AUTH_TOKEN)) {
    return next();
  }

  return res.status(401).json({
    ok: false,
    error: "Nao autorizado. Configure o token de acesso do Cortex-Local."
  });
});

app.use(express.static(publicDir));

function normalizeRequestImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => {
      if (typeof image === "string") {
        return image;
      }

      if (image && typeof image.data === "string") {
        return image.data;
      }

      return "";
    })
    .map((image) => image.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "").trim())
    .filter((image) => /^[a-z0-9+/]+={0,2}$/i.test(image))
    .slice(0, 3);
}

function secondsFromNanoseconds(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Number((value / 1_000_000_000).toFixed(3));
}

function tokensPerSecond(evalCount, evalDuration) {
  if (!Number.isFinite(evalCount) || !Number.isFinite(evalDuration) || evalCount <= 0 || evalDuration <= 0) {
    return 0;
  }

  return Number((evalCount / (evalDuration / 1_000_000_000)).toFixed(2));
}

function friendlyOllamaError(error) {
  if (error.name === "AbortError") {
    return "O Ollama demorou demais para responder. Tente novamente ou use uma pergunta menor.";
  }

  if (error.cause && error.cause.code === "ECONNREFUSED") {
    return "Ollama está offline ou inacessível. Abra o Ollama e tente novamente.";
  }

  if (error.message && error.message.includes("fetch failed")) {
    return "Não foi possível conectar ao Ollama. Verifique se ele está rodando em http://localhost:11434.";
  }

  return error.message || "Erro inesperado ao falar com o Ollama.";
}

async function fetchWithTimeout(url, options = {}, timeoutMs = OLLAMA_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function getOllamaModels() {
  const response = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, {}, 8000);

  if (!response.ok) {
    throw new Error(`Ollama respondeu com HTTP ${response.status}.`);
  }

  const data = await response.json();
  return Array.isArray(data.models) ? data.models : [];
}

async function appendConversationLog(entry) {
  await fs.mkdir(logsDir, { recursive: true });
  await fs.appendFile(conversationsLog, `${JSON.stringify(entry)}\n`, "utf8");
}

async function appendAgentDebateLog(entry) {
  await fs.mkdir(logsDir, { recursive: true });
  await fs.appendFile(agentDebatesLog, `${JSON.stringify(entry)}\n`, "utf8");
}

async function appendAgentWatchPlanLog(entry) {
  await fs.mkdir(logsDir, { recursive: true });
  await fs.appendFile(agentWatchPlansLog, `${JSON.stringify(entry)}\n`, "utf8");
}

async function appendAgentWatchEventLog(entry) {
  await fs.mkdir(logsDir, { recursive: true });
  await fs.appendFile(agentWatchEventsLog, `${JSON.stringify(entry)}\n`, "utf8");
}

async function appendAgentWatchAuthorizationLog(entry) {
  await fs.mkdir(logsDir, { recursive: true });
  await fs.appendFile(agentWatchAuthorizationsLog, `${JSON.stringify(entry)}\n`, "utf8");
}

async function readLastAgentDebateLog() {
  try {
    const content = await fs.readFile(agentDebatesLog, "utf8");
    const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      return null;
    }

    return JSON.parse(lines[lines.length - 1]);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function listAgentDebateLogs(limit = 10) {
  try {
    const content = await fs.readFile(agentDebatesLog, "utf8");
    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-safeLimit)
      .map((line) => JSON.parse(line))
      .reverse();
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function listAgentWatchPlanLogs(limit = 10) {
  try {
    const content = await fs.readFile(agentWatchPlansLog, "utf8");
    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-safeLimit)
      .map((line) => JSON.parse(line))
      .reverse();
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function parseAgentWatchHistory(content, limit = 500) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 500, 2000));
  const lines = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-safeLimit);
  const entries = lines.map((line) => JSON.parse(line));
  const jobsById = new Map();
  const events = [];

  for (const entry of entries) {
    if (entry.event && entry.event.id) {
      events.push(entry.event);
    }

    if (entry.job && entry.job.id) {
      jobsById.set(entry.job.id, entry.job);
    }
  }

  return {
    jobs: Array.from(jobsById.values()),
    events
  };
}

async function readAgentWatchHistory(limit = 500) {
  try {
    const content = await fs.readFile(agentWatchEventsLog, "utf8");
    return parseAgentWatchHistory(content, limit);
  } catch (error) {
    if (error.code === "ENOENT") {
      return { jobs: [], events: [] };
    }

    throw error;
  }
}

function parseAgentWatchAuthorizations(content, limit = 500) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 500, 2000));
  const lines = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-safeLimit);
  const byId = new Map();

  for (const line of lines) {
    const entry = JSON.parse(line);
    if (entry.authorization && entry.authorization.id) {
      byId.set(entry.authorization.id, entry.authorization);
    }
  }

  return Array.from(byId.values());
}

function initializeWatchAuthorizations() {
  try {
    const authorizations = fsSync.existsSync(agentWatchAuthorizationsLog)
      ? parseAgentWatchAuthorizations(fsSync.readFileSync(agentWatchAuthorizationsLog, "utf8"))
      : [];
    restoreWatchAuthorizations(authorizations);
  } catch (error) {
    console.warn(`Nao foi possivel restaurar autorizacoes do vigia: ${error.message}`);
  }

  setWatchAuthorizationSink((entry) => {
    appendAgentWatchAuthorizationLog(entry).catch((error) => {
      console.warn(`Nao foi possivel salvar autorizacao do vigia: ${error.message}`);
    });
  });
}

function prepareWatchPlanAuthorization(watchPlan, message) {
  let prepared = applyWatchAuthorization(watchPlan);

  if (prepared.status === "authorized_plan" && !prepared.authorizationId) {
    const authorization = createWatchAuthorization(prepared, {
      sourceQuestion: message,
      source: "explicit_user_authorization"
    });
    prepared = {
      ...prepared,
      authorizationId: authorization.id,
      authorizationExpiresAt: authorization.expiresAt
    };
  }

  return prepared;
}

function initializeWatchHistory() {
  try {
    const history = fsSync.existsSync(agentWatchEventsLog)
      ? parseAgentWatchHistory(fsSync.readFileSync(agentWatchEventsLog, "utf8"))
      : { jobs: [], events: [] };
    restoreWatchHistory(history);
  } catch (error) {
    console.warn(`Nao foi possivel restaurar historico do vigia: ${error.message}`);
  }

  setWatchEventSink((entry) => {
    appendAgentWatchEventLog({
      timestamp: new Date().toISOString(),
      ...entry
    }).catch((error) => {
      console.warn(`Nao foi possivel salvar evento do vigia: ${error.message}`);
    });
  });
}

function summarizeAgentDebate(debate) {
  return {
    timestamp: debate.timestamp,
    question: debate.question,
    mode: debate.orchestration && debate.orchestration.mode,
    reason: debate.orchestration && debate.orchestration.reason,
    agents: (debate.agents || []).map((agent) => ({
      id: agent.id,
      name: agent.name,
      modelUsed: agent.modelUsed,
      fallback: Boolean(agent.fallback)
    })),
    critic: debate.criticReview ? {
      veredito: debate.criticReview.veredito,
      nivel_confianca: debate.criticReview.nivel_confianca,
      precisa_internet: debate.criticReview.precisa_internet
    } : null,
    finalAnswerPreview: String(debate.finalAnswer || "").slice(0, 500)
  };
}

initializeWatchAuthorizations();
initializeWatchHistory();

function rememberChatTurn(question, answer) {
  chatHistory.push({
    question,
    answer,
    timestamp: new Date().toISOString()
  });

  while (chatHistory.length > 20) {
    chatHistory.shift();
  }
}

function getLastChatTurn() {
  return chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
}

function isShowDebateRequest(message) {
  const text = normalizeForGrounding(message);
  return [
    "mostre o debate interno",
    "mostrar debate interno",
    "ver debate interno",
    "mostra o debate dos agentes",
    "mostre o debate dos agentes",
    "debate dos agentes",
    "debate interno"
  ].some((phrase) => text.includes(phrase));
}

function isMissingAgentModelsRequest(message) {
  const text = normalizeForGrounding(message);
  return [
    "modelos faltantes dos agentes",
    "modelos dos agentes faltando",
    "quais modelos faltam",
    "modelos faltantes",
    "agentes faltando",
    "ollama pull dos agentes"
  ].some((phrase) => text.includes(phrase));
}

function buildAgentModelAvailability(models) {
  const availableNames = models.map((model) => model.name);
  return listAgents().map((agent) => ({
    id: agent.id,
    name: agent.name,
    model: agent.model,
    available: availableNames.includes(agent.model),
    hint: availableNames.includes(agent.model) ? null : `ollama pull ${agent.model}`
  }));
}

function formatMissingAgentModelsAnswer(agentModels) {
  const missing = agentModels.filter((agent) => !agent.available);

  if (missing.length === 0) {
    return "Todos os modelos dos agentes estao disponiveis no Ollama.";
  }

  return [
    "Modelos de agentes que ainda faltam no Ollama:",
    "",
    ...missing.map((agent) => `- ${agent.name}: ${agent.hint}`)
  ].join("\n");
}

async function runWatchCommandIfAny(message, streamTypePrefix = "") {
  const command = detectWatchCommand(message);
  if (!command) {
    return null;
  }

  let answer = "";
  let payload = {};

  if (command.type === "list_jobs") {
    const jobs = listWatchJobs();
    answer = formatWatchJobsAnswer(jobs);
    payload = { jobs };
  }

  if (command.type === "stop_jobs") {
    const runningJobs = listWatchJobs().filter((job) => job.status === "running");
    const stoppedJobs = runningJobs
      .map((job) => stopWatchJob(job.id, "cancelled"))
      .filter(Boolean);
    answer = formatStoppedWatchJobsAnswer(stoppedJobs);
    payload = { stoppedJobs };
  }

  if (command.type === "list_authorizations") {
    const authorizations = listWatchAuthorizations();
    answer = formatWatchAuthorizationsAnswer(authorizations);
    payload = { authorizations };
  }

  if (command.type === "revoke_authorization") {
    const activeAuthorizations = listWatchAuthorizations({ includeExpired: false });
    const matching = activeAuthorizations.filter((authorization) => authorizationMatchesHint(authorization, command.targetHint));
    const revoked = matching.map((authorization) => revokeWatchAuthorization(authorization.id)).filter(Boolean);
    answer = formatRevokedWatchAuthorizationAnswer(revoked, command.targetHint);
    payload = { revokedAuthorizations: revoked, targetHint: command.targetHint };
  }

  const result = {
    ok: true,
    model: "local-watch-orchestrator",
    answer,
    metrics: {
      total_duration_seconds: 0,
      eval_tokens_per_second: 0,
      eval_count: 0,
      prompt_eval_count: 0
    },
    watchCommand: {
      type: command.type,
      ...payload
    },
    memory: {
      used: false,
      files: [],
      chunks: 0,
      command: false
    }
  };

  await appendConversationLog({
    timestamp: new Date().toISOString(),
    type: `${streamTypePrefix}watch_command`,
    command,
    question: message,
    answer,
    payload
  });

  rememberChatTurn(message, answer);
  return result;
}

function isVerificationRequest(message) {
  const normalized = String(message || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return [
    "tem certeza",
    "voce tem certeza",
    "acho que voce esta errado",
    "acho que esta errado",
    "confere isso",
    "verifica isso",
    "verifica essa resposta",
    "pesquisa na internet",
    "olha na internet",
    "consulta fontes",
    "isso e atual",
    "corrige sua memoria",
    "salva essa correcao",
    "nao erre mais isso",
    "nao e isso"
  ].some((phrase) => normalized.includes(phrase));
}

function matchesWholeTerm(text, term) {
  // Frases de varias palavras: busca direta por substring.
  // Termos de uma palavra: casa apenas a palavra inteira, para evitar
  // falsos positivos como "la" dentro de "ola", "tela", "bola", "fala".
  if (term.includes(" ")) {
    return text.includes(term);
  }

  return new RegExp(`\\b${term}\\b`, "u").test(text);
}

function ambiguousSupportAnswer(message) {
  const text = normalizeForGrounding(message);
  const vagueTerms = ["aquele", "negocio", "coisa", "la", "arruma", "deu ruim", "caiu eu acho"];
  const actionableTargets = [
    "traccar",
    "ollama",
    "jarvis",
    "whisper",
    "piper",
    "porta ",
    "ip ",
    "dominio",
    "dominio",
    "site ",
    "cliente "
  ];

  if (
    text.length <= 95 &&
    vagueTerms.some((term) => matchesWholeTerm(text, term)) &&
    !actionableTargets.some((term) => text.includes(term))
  ) {
    return [
      "Entendi que algo parece ter caído, mas ainda falta o alvo.",
      "",
      "Qual sistema ou servidor é? Se tiver, me mande também o erro que apareceu ou o IP/domínio."
    ].join("\n");
  }

  return "";
}

async function localVoiceStatusAnswer(message) {
  const text = normalizeForGrounding(message);
  const asksVoiceSetup = text.includes("voz local")
    || text.includes("wake word")
    || text.includes("jarvis.tflite")
    || (text.includes("jarvis") && (text.includes("configurar") || text.includes("proximo passo")));

  if (!asksVoiceSetup) {
    return "";
  }

  const diagnostics = await voiceService.getDiagnostics();
  const wakeWordCheck = (diagnostics.checks || []).find((check) => check.key === "wakeword_model_path");

  if (diagnostics.ready) {
    return 'A voz local está pronta. O próximo passo é abrir Ajustes > Voz e clicar em "Ativar wake word".';
  }

  if (diagnostics.pushToTalkReady && wakeWordCheck && !wakeWordCheck.exists) {
    return [
      "Whisper e Piper já estão prontos. O que falta é o modelo de wake word.",
      "",
      `Coloque o arquivo jarvis.tflite em: ${wakeWordCheck.resolvedPath || wakeWordCheck.path}`,
      "",
      'Depois abra Ajustes > Voz e clique em "Ativar wake word".'
    ].join("\n");
  }

  return "A voz local ainda não está completa. Abra Ajustes > Voz e confira quais itens aparecem como ausentes no diagnóstico.";
}

function formatSourcesForPrompt(sources) {
  if (!sources || sources.length === 0) {
    return "Nenhum resultado com URL foi encontrado.";
  }

  return sources.map((source, index) => [
    `${index + 1}. Título: ${source.title}`,
    `   URL: ${source.url}`,
    `   Trecho: ${source.snippet || "Sem trecho."}`
  ].join("\n")).join("\n\n");
}

async function getOfficialOllamaLatestRelease() {
  const response = await fetchWithTimeout("https://api.github.com/repos/ollama/ollama/releases/latest", {
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "assistant-local-pc"
    }
  }, 12000);

  if (!response.ok) {
    throw new Error(`GitHub Releases retornou HTTP ${response.status}.`);
  }

  const data = await response.json();
  const tag = String(data.tag_name || data.name || "").trim();

  if (!tag) {
    throw new Error("GitHub Releases nao retornou tag de versao.");
  }

  return {
    title: `Ollama ${tag} - GitHub Releases oficial`,
    url: data.html_url || "https://github.com/ollama/ollama/releases",
    snippet: `Fonte oficial GitHub: release ${tag}${data.published_at ? ` publicada em ${formatBrazilDate(data.published_at)}` : ""}.`,
    checked_at: new Date().toISOString(),
    officialLatestVersion: tag,
    published_at: data.published_at || null
  };
}

async function enrichWebResultsForQuestion(userMessage, results) {
  const safeResults = Array.isArray(results) ? results : [];

  if (!isOllamaReleaseQuery(userMessage)) {
    return safeResults;
  }

  try {
    const official = await getOfficialOllamaLatestRelease();
    const withoutDuplicate = safeResults.filter((source) => source.url !== official.url);
    return [official, ...withoutDuplicate].slice(0, Math.max(5, safeResults.length));
  } catch (error) {
    return safeResults;
  }
}

function officialReleaseAnswerIfApplicable(userMessage, answer, sources) {
  if (!isOllamaReleaseQuery(userMessage)) {
    return answer;
  }

  const official = (sources || []).find((source) => source && source.officialLatestVersion);
  if (!official) {
    return answer;
  }

  const dateText = official.published_at ? `, publicada em ${formatBrazilDate(official.published_at)}` : "";
  return [
    `A versão mais recente do Ollama na fonte oficial é ${official.officialLatestVersion}${dateText}.`,
    "",
    "Fonte:",
    `1. ${official.title}`,
    `   URL: ${official.url}`
  ].join("\n");
}

async function readBrainContext() {
  const [corrections, verifiedFacts] = await Promise.all([
    getCorrections().catch(() => ""),
    getVerifiedFacts().catch(() => "")
  ]);

  const compact = [
    corrections ? `Correcoes do brain:\n${corrections.slice(-5000)}` : "",
    verifiedFacts ? `Fatos verificados:\n${verifiedFacts.slice(-3000)}` : ""
  ].filter(Boolean).join("\n\n");

  return compact ? `<brain>\n${compact}\n</brain>` : "";
}

function buildCriticPrompt({ userMessage, draftAnswer, memoryContext }) {
  return [
    "Voce e um critico tecnico rigoroso. Analise a resposta inicial do assistente.",
    "Responda somente JSON valido, sem markdown.",
    "",
    "Campos obrigatorios:",
    "{",
    "  \"veredito\": \"aprovada|incompleta|errada|arriscada\",",
    "  \"nivel_confianca\": \"alto|medio|baixo\",",
    "  \"precisa_internet\": true|false,",
    "  \"divergencia_relevante\": true|false,",
    "  \"problemas\": [\"...\"],",
    "  \"resumo\": \"...\"",
    "}",
    "",
    "Regras:",
    "- Se a resposta depender de informacao atual, preco, estoque, versao, legislacao, compatibilidade recente, noticia, site oficial ou disponibilidade, marque precisa_internet como true.",
    "- Se houver divergencia tecnica relevante, use veredito \"incompleta\" ou \"arriscada\".",
    "- Se nao tiver certeza, marque nivel_confianca como \"baixo\".",
    "- Nao corrija a resposta final; apenas avalie.",
    "",
    memoryContext || "Sem memoria local relevante.",
    "",
    "Pergunta do usuario:",
    userMessage,
    "",
    "Resposta inicial:",
    draftAnswer
  ].join("\n");
}

async function runCriticReview({ userMessage, draftAnswer, memoryContext, mode }) {
  const strictness = mode === "critical"
    ? "Aplique critica muito rigorosa. Qualquer duvida factual relevante deve ser marcada."
    : "Aplique critica objetiva. Nao force problema quando a resposta for simples e estavel.";

  const { answer } = await callOllamaChat([
    {
      role: "system",
      content: `${strictness}\nResponda em JSON valido.`
    },
    {
      role: "user",
      content: buildCriticPrompt({ userMessage, draftAnswer, memoryContext })
    }
  ], {
    model: CRITIC_MODEL,
    temperature: 0,
    numPredict: 260
  });

  return normalizeCriticReview(parseJsonObject(answer), answer);
}

function buildFinalPrompt({
  userMessage,
  draftAnswer,
  criticReview,
  memoryContext,
  brainContext,
  webResults,
  webUnavailableMessage
}) {
  const hasSources = Array.isArray(webResults) && webResults.length > 0;

  return [
    "Gere a resposta final ao usuario.",
    "",
    "Pergunta original:",
    userMessage,
    "",
    memoryContext || "Sem memoria local relevante.",
    "",
    brainContext || "Sem correcoes/fatos do brain relevantes.",
    "",
    "Resposta inicial do qwen2.5:",
    draftAnswer,
    "",
    "Revisao interna estruturada. Use apenas para melhorar a resposta. Nao copie nem mencione este JSON:",
    JSON.stringify(criticReview, null, 2),
    "",
    hasSources
      ? [
        "Fontes da internet:",
        formatSourcesForPrompt(webResults),
        "",
        "Voce recebeu fontes da internet porque houve divergencia ou baixa confianca na resposta inicial.",
        "Use as fontes para corrigir a resposta.",
        "Se as fontes confirmarem que a resposta inicial estava errada, corrija sem rodeios.",
        "Se as fontes forem insuficientes, diga que a pesquisa nao foi conclusiva.",
        "Liste fontes no final somente se elas tiverem URL.",
        "Nao invente fonte.",
        "Nao use fonte sem URL."
      ].join("\n")
      : webUnavailableMessage || "Nenhuma fonte web foi usada nesta resposta.",
    "",
    "Regras finais:",
    "- Entregue apenas a resposta final ao usuario.",
    "- E proibido copiar JSON, veredito, nivel_confianca, raw, draft, critica, ou nomes internos de modelos para a resposta final.",
    "- Nao mencione bastidores, draft, critica ou nomes dos modelos, a menos que seja necessario para explicar incerteza.",
    "- Se a internet era necessaria e nao foi possivel pesquisar, diga isso claramente e responda como melhor esforco local.",
    "- Seja direto, em portugues do Brasil."
  ].join("\n");
}

function agentSystemPrompt(agent) {
  return [
    `Voce e o agente ${agent.name} do conselho interno do JARVIS.`,
    `Papel: ${agent.role}`,
    "Responda em portugues do Brasil.",
    "Nao fale com o usuario diretamente; entregue sua analise interna para o orquestrador.",
    "Seja pratico, claro e objetivo.",
    "Aponte riscos e suposicoes quando existirem.",
    "Nao invente informacao atual. Se depender de dados recentes, sinalize isso."
  ].join("\n");
}

function buildAgentPrompt({ agent, userMessage, memoryContext, brainContext, orchestration }) {
  return [
    "Analise a tarefa abaixo pela sua especialidade.",
    "",
    "Modo escolhido pelo orquestrador:",
    JSON.stringify({
      mode: orchestration.mode,
      complexity: orchestration.complexity,
      flags: orchestration.flags,
      needs: orchestration.needs,
      reason: orchestration.reason
    }, null, 2),
    "",
    memoryContext || "Sem memoria local relevante.",
    "",
    brainContext || "Sem brain relevante.",
    "",
    "Pergunta do usuario:",
    userMessage,
    "",
    `Resposta esperada do agente ${agent.name}:`,
    "- diagnostico curto;",
    "- recomendacao principal;",
    "- riscos ou pontos fracos;",
    "- proximos passos praticos."
  ].join("\n");
}

async function callAgentContribution({ agent, userMessage, memoryContext, brainContext, orchestration, images }) {
  const userPayload = {
    role: "user",
    content: buildAgentPrompt({ agent, userMessage, memoryContext, brainContext, orchestration })
  };

  if (agent.id === "visionSpecialist" && images && images.length > 0) {
    userPayload.images = images;
  }

  const messages = [
    {
      role: "system",
      content: agentSystemPrompt(agent)
    },
    userPayload
  ];

  try {
    const result = await callOllamaChat(messages, {
      model: agent.model,
      temperature: 0.2,
      numPredict: 420
    });

    return {
      agentId: agent.id,
      agentName: agent.name,
      requestedModel: agent.model,
      modelUsed: agent.model,
      answer: result.answer,
      metrics: result.metrics,
      fallback: false
    };
  } catch (error) {
    if (agent.model === DRAFT_MODEL) {
      throw error;
    }

    const result = await callOllamaChat(messages, {
      model: DRAFT_MODEL,
      temperature: 0.2,
      numPredict: 420
    });

    return {
      agentId: agent.id,
      agentName: agent.name,
      requestedModel: agent.model,
      modelUsed: DRAFT_MODEL,
      answer: result.answer,
      metrics: result.metrics,
      fallback: true,
      fallbackReason: friendlyOllamaError(error)
    };
  }
}

function agentsForInternalDebate(orchestration) {
  const ignored = new Set(["orchestrator", "critic", "webResearcher", "watcher"]);
  return (orchestration.agentsUsed || []).filter((agent) => !ignored.has(agent.id));
}

function formatAgentContributions(contributions) {
  if (!contributions || contributions.length === 0) {
    return "";
  }

  return contributions.map((item, index) => [
    `Agente ${index + 1}: ${item.agentName}`,
    `Modelo: ${item.modelUsed}${item.fallback ? ` (fallback de ${item.requestedModel})` : ""}`,
    "Analise:",
    item.answer
  ].join("\n")).join("\n\n---\n\n");
}

function buildDebateSummary({ userMessage, orchestration, contributions, criticReview, finalAnswer, webCheck }) {
  return {
    timestamp: new Date().toISOString(),
    question: userMessage,
    orchestration,
    agents: contributions.map((item) => ({
      id: item.agentId,
      name: item.agentName,
      requestedModel: item.requestedModel,
      modelUsed: item.modelUsed,
      fallback: item.fallback,
      fallbackReason: item.fallbackReason || null,
      answer: item.answer
    })),
    criticReview,
    webCheck,
    finalAnswer
  };
}

function formatDebateForUser(debate) {
  if (!debate) {
    return "Ainda nao existe debate interno salvo nesta sessao.";
  }

  const agentSections = (debate.agents || []).map((agent) => [
    `## ${agent.name}`,
    `Modelo: ${agent.modelUsed}${agent.fallback ? ` (fallback de ${agent.requestedModel})` : ""}`,
    "",
    agent.answer
  ].join("\n"));

  return [
    "Debate interno mais recente:",
    "",
    `Pergunta: ${debate.question}`,
    "",
    `Modo: ${debate.orchestration.mode}`,
    `Motivo: ${debate.orchestration.reason}`,
    "",
    agentSections.join("\n\n---\n\n") || "Nenhuma contribuicao individual foi salva.",
    "",
    "## Critico",
    JSON.stringify(debate.criticReview || {}, null, 2),
    "",
    "## Resposta final",
    debate.finalAnswer || ""
  ].join("\n");
}

async function repairInternalLeak({ userMessage, leakedAnswer, draftAnswer }) {
  const prompt = [
    "Reescreva a resposta abaixo para o usuario final.",
    "Remova qualquer JSON, veredito, critica interna, nomes de modelos, bastidores ou metadados.",
    "Responda em portugues do Brasil, de forma direta e util.",
    "",
    "Pergunta do usuario:",
    userMessage,
    "",
    "Resposta inicial segura como referencia:",
    draftAnswer,
    "",
    "Resposta contaminada a limpar:",
    leakedAnswer
  ].join("\n");

  const repaired = await callOllamaChat([
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    {
      role: "user",
      content: prompt
    }
  ], {
    model: FINAL_MODEL,
    temperature: 0.1,
    numPredict: 700
  });

  return repaired.answer;
}

async function runMultiModelChat({ userMessage, mode, debug, memoryMatches, memoryContext, orchestration, images = [] }) {
  const normalizedMode = mode === "critical" ? "critical" : "deliberate";
  const brainContext = await readBrainContext();
  const debateAgents = orchestration ? agentsForInternalDebate(orchestration) : [];
  const agentContributions = [];

  for (const agent of debateAgents) {
    agentContributions.push(await callAgentContribution({
      agent,
      userMessage,
      memoryContext,
      brainContext,
      orchestration,
      images
    }));
  }

  let draft;
  if (agentContributions.length > 0) {
    draft = {
      answer: formatAgentContributions(agentContributions),
      metrics: {
        total_duration_seconds: Number(agentContributions.reduce((total, item) => total + Number(item.metrics.total_duration_seconds || 0), 0).toFixed(3)),
        eval_tokens_per_second: 0,
        eval_count: agentContributions.reduce((total, item) => total + Number(item.metrics.eval_count || 0), 0),
        prompt_eval_count: agentContributions.reduce((total, item) => total + Number(item.metrics.prompt_eval_count || 0), 0)
      }
    };
  } else {
    const baseMessages = [
      {
        role: "system",
        content: SYSTEM_PROMPT
      }
    ];

    if (memoryContext) {
      baseMessages.push({
        role: "system",
        content: memoryContext
      });
    }

    baseMessages.push({
      role: "user",
      content: userMessage
    });

    draft = await callOllamaChat(baseMessages, {
      model: DRAFT_MODEL,
      temperature: normalizedMode === "critical" ? 0.15 : 0.25,
      numPredict: 360
    });
  }

  let criticReview;
  try {
    criticReview = await runCriticReview({
      userMessage,
      draftAnswer: draft.answer,
      memoryContext,
      mode: normalizedMode
    });
  } catch (error) {
    criticReview = normalizeCriticReview({
      veredito: userMessageNeedsCurrentInfo(userMessage) ? "incompleta" : "aprovada",
      nivel_confianca: userMessageNeedsCurrentInfo(userMessage) ? "baixo" : "medio",
      precisa_internet: userMessageNeedsCurrentInfo(userMessage),
      divergencia_relevante: false,
      problemas: [`Critico indisponivel: ${friendlyOllamaError(error)}`],
      resumo: "O modo multi-modelo continuou com fallback local porque o critico falhou."
    }, error.message || "");
  }

  const triggered = shouldTriggerWebCheck(criticReview, userMessage, normalizedMode);
  const reason = triggered ? getWebCheckReason(criticReview, userMessage, normalizedMode) : "not_needed";
  const webConfig = getWebSearchConfig();
  let webSearchResult = null;
  let webUnavailableMessage = "";
  let webResearchPath = null;
  let correctionSaved = false;
  let correctionMemoryPath = null;

  if (triggered) {
    if (webConfig.provider === "none") {
      webSearchResult = {
        ok: false,
        provider: "none",
        results: [],
        error: "Eu precisaria consultar a internet para confirmar isso, mas a busca web ainda nao esta configurada neste Jarvis."
      };
      webUnavailableMessage = webSearchResult.error;
    } else {
      try {
        webSearchResult = await searchWeb(userMessage);
        if (webSearchResult.ok) {
          webSearchResult.results = await enrichWebResultsForQuestion(userMessage, webSearchResult.results);
        }
        if (!webSearchResult.ok) {
          webUnavailableMessage = webSearchResult.error || "A busca web foi acionada, mas nao retornou fontes.";
        }
      } catch (error) {
        webSearchResult = {
          ok: false,
          provider: webConfig.provider,
          results: [],
          error: error.message || "Erro ao pesquisar na internet."
        };
        webUnavailableMessage = `A busca web foi acionada, mas falhou: ${webSearchResult.error}`;
      }
    }
  }

  const finalPrompt = buildFinalPrompt({
    userMessage,
    draftAnswer: draft.answer,
    criticReview,
    memoryContext,
    brainContext,
    webResults: webSearchResult && webSearchResult.ok ? webSearchResult.results : [],
    webUnavailableMessage
  });

  const final = await callOllamaChat([
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    {
      role: "user",
      content: finalPrompt
    }
  ], {
    model: FINAL_MODEL,
    temperature: 0.15,
    numPredict: 460
  });

  let finalAnswer = webSearchResult && webSearchResult.ok
    ? removeUnsupportedBrazilRegionClaims(final.answer, webSearchResult.results)
    : final.answer;

  if (webSearchResult && webSearchResult.ok) {
    finalAnswer = officialReleaseAnswerIfApplicable(userMessage, finalAnswer, webSearchResult.results);
  }

  if (containsInternalLeak(finalAnswer)) {
    finalAnswer = await repairInternalLeak({
      userMessage,
      leakedAnswer: finalAnswer,
      draftAnswer: draft.answer
    });
  }

  if (webSearchResult && !webSearchResult.ok && webSearchResult.provider === "none") {
    const requiredNotice = "Eu precisaria consultar a internet para confirmar isso, mas a busca web ainda não está configurada neste Jarvis.";
    if (!normalizeForGrounding(finalAnswer).includes(normalizeForGrounding(requiredNotice))) {
      finalAnswer = `${requiredNotice}\n\n${finalAnswer}`;
    }
  }

  if (webSearchResult && webSearchResult.ok) {
    const temporalSensitivity = temporalSensitivityFromText(`${userMessage}\n${finalAnswer}`);
    const research = await saveWebResearch({
      subject: userMessage,
      question: userMessage,
      previousAnswer: draft.answer,
      correctedAnswer: finalAnswer,
      sources: webSearchResult.results,
      temporalSensitivity
    });
    webResearchPath = research.path;

    const text = normalizeForGrounding(`${criticReview.veredito}\n${finalAnswer}\n${criticReview.resumo}`);
    const confirmedImportantError = /(errada|incorreta|resposta inicial estava errada|resposta anterior estava errada|corrig)/.test(text)
      || criticReview.veredito === "errada"
      || officialVersionMismatch(draft.answer, webSearchResult.results);

    if (confirmedImportantError) {
      const saved = await saveCorrection({
        subject: userMessage,
        previousAnswer: draft.answer,
        correction: finalAnswer,
        futureRule: temporalSensitivity === "alta" ? "Verificar novamente antes de usar." : "Consultar esta correcao antes de responder novamente sobre o assunto.",
        sources: webSearchResult.results,
        temporalSensitivity
      });
      correctionSaved = true;
      correctionMemoryPath = saved.path;
    }

    lastWebCheck = {
      question: userMessage,
      previousAnswer: draft.answer,
      answer: finalAnswer,
      sources: webSearchResult.results,
      temporalSensitivity,
      timestamp: new Date().toISOString()
    };
  }

  const webCheck = {
    triggered,
    reason,
    reasonLabel: webCheckReasonLabel(reason),
    provider: webSearchResult ? webSearchResult.provider : webConfig.provider,
    sources: webSearchResult && webSearchResult.ok ? webSearchResult.results : [],
    error: webSearchResult && !webSearchResult.ok ? webSearchResult.error : null,
    webResearchPath,
    correctionSaved,
    memoryPath: correctionMemoryPath
  };

  const result = {
    ok: true,
    mode: normalizedMode,
    model: FINAL_MODEL,
    answer: finalAnswer,
    metrics: final.metrics,
    memory: {
      used: memoryMatches.length > 0,
      files: [...new Set(memoryMatches.map((match) => match.file))],
      chunks: memoryMatches.length,
      command: false
    },
    webCheck,
    models: {
      draft: DRAFT_MODEL,
      critic: CRITIC_MODEL,
      final: FINAL_MODEL,
      agents: agentContributions.map((item) => ({
        agentId: item.agentId,
        name: item.agentName,
        requested: item.requestedModel,
        used: item.modelUsed,
        fallback: item.fallback
      }))
    },
    debate: buildDebateSummary({
      userMessage,
      orchestration: orchestration || null,
      contributions: agentContributions,
      criticReview,
      finalAnswer,
      webCheck
    }),
    log: {
      draftAnswer: draft.answer,
      agentContributions,
      criticReview,
      finalAnswer,
      webResults: webSearchResult && webSearchResult.ok ? webSearchResult.results : []
    }
  };

  if (debug) {
    result.debug = {
      draftAnswer: draft.answer,
      criticReview,
      arbitration: {
        triggered,
        reason,
        reasonLabel: webCheck.reasonLabel,
        provider: webCheck.provider
      },
      webResults: webCheck.sources,
      agentContributions,
      finalAnswer
    };
  }

  return result;
}

async function callOllamaChat(messages, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const temperature = Number.isFinite(options.temperature) ? options.temperature : 0.2;
  const numPredict = Number.isFinite(options.numPredict) ? options.numPredict : 300;

  const response = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages,
      options: {
        temperature,
        num_predict: numPredict
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    const modelHint = errorText.toLowerCase().includes("model") ? ` Rode: ollama pull ${model}` : "";
    throw new Error(`Ollama respondeu com HTTP ${response.status}.${modelHint}`);
  }

  const data = await response.json();
  const answer = data.message && typeof data.message.content === "string" ? data.message.content.trim() : "";

  if (!answer) {
    throw new Error("O modelo respondeu vazio. Tente novamente.");
  }

  const metrics = {
    total_duration_seconds: secondsFromNanoseconds(data.total_duration),
    eval_tokens_per_second: tokensPerSecond(data.eval_count, data.eval_duration),
    eval_count: Number.isFinite(data.eval_count) ? data.eval_count : 0,
    prompt_eval_count: Number.isFinite(data.prompt_eval_count) ? data.prompt_eval_count : 0
  };

  return {
    answer,
    metrics
  };
}

/**
 * Igual a callOllamaChat, mas com stream:true. Chama onToken(texto) a cada
 * pedaco recebido e retorna { answer, metrics } no final. Usa o acumulador
 * puro de ollamaStream.js para lidar com linhas NDJSON cortadas entre chunks.
 */
async function callOllamaChatStream(messages, options = {}, onToken = () => {}) {
  const model = options.model || DEFAULT_MODEL;
  const temperature = Number.isFinite(options.temperature) ? options.temperature : 0.2;
  const numPredict = Number.isFinite(options.numPredict) ? options.numPredict : 300;

  const response = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages,
      options: {
        temperature,
        num_predict: numPredict
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    const modelHint = errorText.toLowerCase().includes("model") ? ` Rode: ollama pull ${model}` : "";
    throw new Error(`Ollama respondeu com HTTP ${response.status}.${modelHint}`);
  }

  const accumulator = createStreamAccumulator();
  const decoder = new TextDecoder();
  let answer = "";
  let finalData = null;

  const handleEvent = (event) => {
    if (event.content) {
      answer += event.content;
      onToken(event.content);
    }
    if (event.done) {
      finalData = event.data;
    }
  };

  for await (const chunk of response.body) {
    const text = typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    for (const event of accumulator.push(text)) {
      handleEvent(event);
    }
  }
  for (const event of accumulator.flush()) {
    handleEvent(event);
  }

  answer = answer.trim();
  if (!answer) {
    throw new Error("O modelo respondeu vazio. Tente novamente.");
  }

  const data = finalData || {};
  const metrics = {
    total_duration_seconds: secondsFromNanoseconds(data.total_duration),
    eval_tokens_per_second: tokensPerSecond(data.eval_count, data.eval_duration),
    eval_count: Number.isFinite(data.eval_count) ? data.eval_count : 0,
    prompt_eval_count: Number.isFinite(data.prompt_eval_count) ? data.prompt_eval_count : 0
  };

  return {
    answer,
    metrics
  };
}

async function runWebCheck({ question, previousAnswer, saveCorrection: shouldSave }) {
  const search = await searchWeb(question);

  if (!search.ok) {
    return {
      ok: false,
      answer: search.error,
      sources: [],
      provider: search.provider,
      correctionSaved: false,
      memoryPath: null,
      webResearchPath: null
    };
  }

  search.results = await enrichWebResultsForQuestion(question, search.results);

  const prompt = [
    "O usuário está questionando ou pedindo verificação da resposta anterior.",
    "",
    "Pergunta original:",
    question,
    "",
    "Resultados encontrados na web:",
    formatSourcesForPrompt(search.results),
    "",
    "Resposta anterior possivelmente errada:",
    previousAnswer || "Não havia resposta anterior registrada.",
    "",
    "Tarefa:",
    "- Responda diretamente a pergunta original usando SOMENTE as fontes acima.",
    "- Comece ja pela resposta certa, em uma ou duas frases.",
    "- NAO use titulos, rotulos nem secoes. E proibido escrever 'Resposta correta', 'Resposta anterior', 'Comparando', 'Fontes utilizadas:' como cabecalho de analise ou qualquer texto explicando seu processo.",
    "- Se a resposta anterior estava errada, acrescente no maximo UMA frase curta dizendo o que muda. Se estava certa, nao comente nada sobre ela.",
    "- Nao carregue detalhes da resposta anterior sem suporte nas fontes.",
    "- Em perguntas de localizacao, informe somente cidade/estado/pais/regiao que aparecam nas fontes.",
    "- Não invente. Se as fontes forem insuficientes, diga que a pesquisa não foi conclusiva.",
    "- Responda em português do Brasil, direto e sem enrolação.",
    "- No final, liste as fontes usadas com URL, uma por linha, sob a linha 'Fontes:'."
  ].join("\n");

  const { answer: rawAnswer, metrics } = await callOllamaChat([
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    {
      role: "user",
      content: prompt
    }
  ]);

  const answer = officialReleaseAnswerIfApplicable(
    question,
    removeUnsupportedBrazilRegionClaims(rawAnswer, search.results),
    search.results
  );
  const temporalSensitivity = temporalSensitivityFromText(`${question}\n${answer}`);
  const research = await saveWebResearch({
    subject: question,
    question,
    previousAnswer,
    correctedAnswer: answer,
    sources: search.results,
    temporalSensitivity
  });

  let correctionSaved = false;
  let memoryPath = null;

  if (shouldAutoSaveCorrection({ saveCorrection: shouldSave, answer, question })) {
    const saved = await saveCorrection({
      subject: question,
      previousAnswer,
      correction: answer,
      futureRule: temporalSensitivity === "alta" ? "Verificar novamente antes de usar." : "Consultar esta correção antes de responder novamente sobre o assunto.",
      sources: search.results,
      temporalSensitivity
    });
    correctionSaved = true;
    memoryPath = saved.path;
  }

  lastWebCheck = {
    question,
    previousAnswer,
    answer,
    sources: search.results,
    temporalSensitivity,
    timestamp: new Date().toISOString()
  };

  return {
    ok: true,
    answer,
    metrics,
    sources: search.results,
    provider: search.provider,
    correctionSaved,
    memoryPath,
    webResearchPath: research.path,
    temporalSensitivity
  };
}

app.get("/api/status", async (req, res) => {
  const voiceStatus = voiceService.getStatus();
  const voiceDiagnostics = await voiceService.getDiagnostics().catch((error) => ({
    configured: voiceStatus.configured,
    ready: false,
    pushToTalkReady: false,
    error: error.message || "Erro ao diagnosticar voz local.",
    checks: []
  }));

  let models = [];
  let ollamaOnline = false;
  let ollamaError = null;

  try {
    models = await getOllamaModels();
    ollamaOnline = true;
  } catch (error) {
    ollamaError = friendlyOllamaError(error);
  }

  const availableNames = models.map((model) => model.name);
  const modelInfo = (name) => ({
    name,
    available: availableNames.includes(name),
    hint: availableNames.includes(name) ? null : `ollama pull ${name}`
  });
  const agentModels = buildAgentModelAvailability(models);
  const wakeWordCheck = (voiceDiagnostics.checks || []).find((check) => check.key === "wakeword_model_path");
  const webConfig = getWebSearchConfig();

  res.status(ollamaOnline ? 200 : 503).json({
    ok: ollamaOnline && availableNames.includes(DEFAULT_MODEL),
    backend: "online",
    ollama: ollamaOnline ? "online" : "offline",
    ollamaError,
    model: DEFAULT_MODEL,
    models: {
      main: modelInfo(DEFAULT_MODEL),
      draft: modelInfo(DRAFT_MODEL),
      critic: modelInfo(CRITIC_MODEL),
      final: modelInfo(FINAL_MODEL),
      agents: agentModels.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: listAgents().find((item) => item.id === agent.id).role,
        model: {
          name: agent.model,
          available: agent.available,
          hint: agent.hint
        }
      }))
    },
    voice: {
      available: Boolean(voiceDiagnostics.pushToTalkReady || voiceDiagnostics.ready),
      running: voiceStatus.running,
      wakeWord: "Jarvis",
      wakeWordConfigured: Boolean(voiceDiagnostics.ready && wakeWordCheck && wakeWordCheck.exists),
      whisperConfigured: Boolean((voiceDiagnostics.checks || []).find((check) => check.key === "whisper_exe_path" && check.exists))
        && Boolean((voiceDiagnostics.checks || []).find((check) => check.key === "whisper_model_path" && check.exists)),
      piperConfigured: Boolean((voiceDiagnostics.checks || []).find((check) => check.key === "piper_exe_path" && check.exists))
        && Boolean((voiceDiagnostics.checks || []).find((check) => check.key === "piper_model_path" && check.exists)),
      microphone: "unknown",
      missingWakeWordPath: wakeWordCheck && !wakeWordCheck.exists ? wakeWordCheck.resolvedPath || wakeWordCheck.path : null,
      diagnostics: voiceDiagnostics,
      checks: voiceDiagnostics.checks || []
    },
    web: {
      provider: webConfig.provider || "none"
    },
    features: {
      memory: true,
      webCheck: webConfig.provider !== "none",
      multiModel: true,
      agentOrchestration: true
    }
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const models = await getOllamaModels();
    const availableNames = models.map((model) => model.name);
    const modelAvailable = availableNames.includes(DEFAULT_MODEL);
    const draftAvailable = availableNames.includes(DRAFT_MODEL);
    const criticAvailable = availableNames.includes(CRITIC_MODEL);
    const finalAvailable = availableNames.includes(FINAL_MODEL);
    const agentModels = buildAgentModelAvailability(models);

    res.json({
      ok: modelAvailable && draftAvailable && criticAvailable && finalAvailable,
      backend: {
        online: true
      },
      ollama: {
        online: true,
        url: OLLAMA_BASE_URL
      },
      model: {
        name: DEFAULT_MODEL,
        available: modelAvailable,
        hint: modelAvailable ? null : `ollama pull ${DEFAULT_MODEL}`
      },
      orchestration: {
        draft: {
          name: DRAFT_MODEL,
          available: draftAvailable,
          hint: draftAvailable ? null : `ollama pull ${DRAFT_MODEL}`
        },
        critic: {
          name: CRITIC_MODEL,
          available: criticAvailable,
          hint: criticAvailable ? null : `ollama pull ${CRITIC_MODEL}`
        },
        final: {
          name: FINAL_MODEL,
          available: finalAvailable,
          hint: finalAvailable ? null : `ollama pull ${FINAL_MODEL}`
        },
        agents: agentModels
      }
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      backend: {
        online: true
      },
      ollama: {
        online: false,
        url: OLLAMA_BASE_URL,
        error: friendlyOllamaError(error)
      },
      model: {
        name: DEFAULT_MODEL,
        available: false,
        hint: `ollama pull ${DEFAULT_MODEL}`
      },
      orchestration: {
        draft: {
          name: DRAFT_MODEL,
          available: false,
          hint: `ollama pull ${DRAFT_MODEL}`
        },
        critic: {
          name: CRITIC_MODEL,
          available: false,
          hint: `ollama pull ${CRITIC_MODEL}`
        },
        final: {
          name: FINAL_MODEL,
          available: false,
          hint: `ollama pull ${FINAL_MODEL}`
        }
      }
    });
  }
});

app.get("/api/agents/debates", async (req, res) => {
  try {
    const debates = await listAgentDebateLogs(req.query.limit);
    const includeFull = req.query.full === "true";

    res.json({
      ok: true,
      count: debates.length,
      debates: includeFull ? debates : debates.map(summarizeAgentDebate)
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message || "Erro ao listar debates internos."
    });
  }
});

app.get("/api/agents/watch/plans", async (req, res) => {
  try {
    const plans = await listAgentWatchPlanLogs(req.query.limit);

    res.json({
      ok: true,
      count: plans.length,
      plans
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message || "Erro ao listar planos do vigia."
    });
  }
});

app.get("/api/agents/watch/jobs", (req, res) => {
  res.json({
    ok: true,
    count: listWatchJobs().length,
    jobs: listWatchJobs()
  });
});

app.get("/api/agents/watch/events", (req, res) => {
  const events = listWatchEvents(req.query.limit);

  res.json({
    ok: true,
    count: events.length,
    events
  });
});

app.get("/api/agents/watch/authorizations", (req, res) => {
  const authorizations = listWatchAuthorizations({
    includeExpired: req.query.activeOnly !== "true"
  });

  res.json({
    ok: true,
    count: authorizations.length,
    authorizations
  });
});

app.post("/api/agents/watch/authorizations/:id/revoke", async (req, res) => {
  const authorization = revokeWatchAuthorization(req.params.id);

  if (!authorization) {
    return res.status(404).json({
      ok: false,
      error: "Autorizacao do vigia nao encontrada."
    });
  }

  await appendConversationLog({
    timestamp: new Date().toISOString(),
    type: "watch_authorization_revoked",
    authorization
  });

  return res.json({
    ok: true,
    authorization
  });
});

app.post("/api/agents/watch/jobs", async (req, res) => {
  try {
    const watchPlan = applyWatchAuthorization(req.body.watchPlan);

    if (!watchPlan.authorizationId || !hasActiveWatchAuthorization(watchPlan.authorizationId)) {
      throw new Error("Plano do vigia precisa de autorizacao persistente ativa.");
    }

    const job = startWatchJob({
      watchPlan,
      question: req.body.question
    });

    await appendConversationLog({
      timestamp: new Date().toISOString(),
      type: "watch_job_started",
      question: req.body.question || "",
      watchPlan,
      job
    });

    res.json({
      ok: true,
      job
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message || "Nao foi possivel iniciar o vigia."
    });
  }
});

app.post("/api/agents/watch/jobs/:id/cancel", async (req, res) => {
  const job = stopWatchJob(req.params.id, "cancelled");

  if (!job) {
    return res.status(404).json({
      ok: false,
      error: "Job do vigia nao encontrado."
    });
  }

  await appendConversationLog({
    timestamp: new Date().toISOString(),
    type: "watch_job_cancelled",
    job
  });

  return res.json({
    ok: true,
    job
  });
});

app.get("/api/agents/models/missing", async (req, res) => {
  try {
    const models = await getOllamaModels();
    const agents = buildAgentModelAvailability(models);
    const missing = agents.filter((agent) => !agent.available);

    res.json({
      ok: true,
      count: missing.length,
      missing,
      agents
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      error: friendlyOllamaError(error)
    });
  }
});

app.get("/api/voice/status", (req, res) => {
  res.json({
    ok: true,
    voice: {
      mode: "external-python",
      wake_word: "jarvis",
      script: "voice/voice_agent.py",
      config: "voice/config.json",
      status: "A camada de voz é controlada pelo navegador e executada localmente pelo backend.",
      service: voiceService.getStatus()
    }
  });
});

app.post("/api/voice/start", (req, res) => {
  try {
    res.json({
      ok: true,
      voice: voiceService.startVoice()
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message || "Erro ao iniciar voz.",
      voice: voiceService.getStatus()
    });
  }
});

app.post("/api/voice/stop", (req, res) => {
  try {
    res.json({
      ok: true,
      voice: voiceService.stopVoice()
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message || "Erro ao parar voz.",
      voice: voiceService.getStatus()
    });
  }
});

app.get("/api/voice/logs", (req, res) => {
  res.json({
    ok: true,
    logs: voiceService.getLogs()
  });
});

app.get("/api/voice/diagnostics", async (req, res) => {
  try {
    res.json({
      ok: true,
      diagnostics: await voiceService.getDiagnostics()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message || "Erro ao diagnosticar voz local."
    });
  }
});

app.get("/api/voice/config", async (req, res) => {
  try {
    const config = await voiceService.getConfigText();

    res.json({
      ok: true,
      config
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message || "Erro ao carregar configuração de voz."
    });
  }
});

app.post("/api/voice/config", async (req, res) => {
  try {
    const saved = await voiceService.saveConfigText(req.body.content);

    res.json({
      ok: true,
      config: saved,
      voice: voiceService.getStatus()
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message || "Erro ao salvar configuração de voz.",
      voice: voiceService.getStatus()
    });
  }
});

app.post("/api/voice/chat-audio", express.raw({ type: ["audio/wav", "application/octet-stream"], limit: "25mb" }), async (req, res) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length < 1000) {
      return res.status(400).json({
        ok: false,
        error: "Áudio vazio ou inválido."
      });
    }

    const wavPath = await localVoice.saveInputWav(req.body);
    const transcript = await localVoice.transcribeWav(wavPath);

    if (!transcript) {
      return res.status(400).json({
        ok: false,
        error: "Não consegui transcrever o áudio. Fale mais perto do microfone e tente de novo."
      });
    }

    const chatResponse = await fetch(`http://${HOST}:${PORT}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: transcript,
        mode: "simple"
      })
    });
    const chatData = await chatResponse.json();

    if (!chatResponse.ok || !chatData.ok) {
      return res.status(502).json({
        ok: false,
        error: chatData.error || "Erro ao consultar o chat depois da transcrição."
      });
    }

    const speech = await localVoice.synthesizeAnswer(chatData.answer);

    return res.json({
      ok: true,
      transcript,
      answer: chatData.answer,
      model: chatData.model,
      metrics: chatData.metrics,
      webCheck: chatData.webCheck,
      models: chatData.models,
      audioUrl: speech.url
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error.message || "Erro no fluxo de voz local."
    });
  }
});

app.get("/api/voice/audio/:file", async (req, res) => {
  try {
    const filePath = localVoice.resolveAudioFile(req.params.file);
    res.type("audio/wav");
    res.sendFile(filePath);
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message || "Arquivo de áudio inválido."
    });
  }
});

app.get("/api/memory", async (req, res) => {
  try {
    const files = await listMemoryFiles();

    res.json({
      ok: true,
      files
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message || "Erro ao listar memória."
    });
  }
});

app.post("/api/memory/open-vault", async (req, res) => {
  try {
    await fs.mkdir(memoryDir, { recursive: true });

    if (process.platform === "win32") {
      const child = spawn("explorer.exe", [memoryDir], {
        detached: true,
        windowsHide: true,
        stdio: "ignore"
      });
      child.unref();
    }

    res.json({
      ok: true,
      path: memoryDir,
      opened: process.platform === "win32"
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message || "Erro ao abrir vault de memória."
    });
  }
});

app.get("/api/memory/file", async (req, res) => {
  try {
    const file = await readMemoryFile(req.query.path);

    res.json({
      ok: true,
      path: file.path,
      content: file.content
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message || "Erro ao ler arquivo de memória."
    });
  }
});

app.post("/api/memory/save", async (req, res) => {
  try {
    const saved = await saveMemoryFile(req.body.path, req.body.content);

    res.json({
      ok: true,
      path: saved.path
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message || "Erro ao salvar arquivo de memória."
    });
  }
});

app.post("/api/memory/remember", async (req, res) => {
  try {
    const remembered = await rememberText(req.body.text);

    res.json({
      ok: true,
      path: remembered.path,
      text: remembered.text,
      answer: "Beleza. Guardei isso na memória."
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message || "Erro ao salvar memória."
    });
  }
});

app.post("/api/web/check", async (req, res) => {
  const question = typeof req.body.question === "string" ? req.body.question.trim() : "";
  const previousAnswer = typeof req.body.previousAnswer === "string" ? req.body.previousAnswer.trim() : "";

  if (!question) {
    return res.status(400).json({
      ok: false,
      error: "Informe a pergunta para verificar."
    });
  }

  try {
    const result = await runWebCheck({
      question,
      previousAnswer,
      saveCorrection: Boolean(req.body.saveCorrection)
    });

    await appendConversationLog({
      timestamp: new Date().toISOString(),
      type: "web_check",
      question,
      previousAnswer,
      correctedAnswer: result.answer,
      sources: result.sources.map((source) => ({
        title: source.title,
        url: source.url
      })),
      correctionSaved: result.correctionSaved,
      memoryPath: result.memoryPath,
      webResearchPath: result.webResearchPath,
      provider: result.provider
    });

    if (!result.ok) {
      return res.status(400).json({
        ok: false,
        error: result.answer,
        sources: result.sources,
        correctionSaved: false,
        memoryPath: null
      });
    }

    return res.json({
      ok: true,
      answer: result.answer,
      sources: result.sources,
      correctionSaved: result.correctionSaved,
      memoryPath: result.memoryPath,
      webResearchPath: result.webResearchPath,
      temporalSensitivity: result.temporalSensitivity
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error.message || "Erro ao verificar na internet."
    });
  }
});

app.post("/api/brain/save-correction", async (req, res) => {
  try {
    const saved = await saveCorrection({
      subject: req.body.subject,
      previousAnswer: req.body.previousAnswer,
      correction: req.body.correction,
      futureRule: req.body.futureRule,
      sources: req.body.sources,
      temporalSensitivity: req.body.temporalSensitivity
    });

    res.json({
      ok: true,
      memoryPath: saved.path,
      temporalSensitivity: saved.temporalSensitivity
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message || "Erro ao salvar correção no brain."
    });
  }
});

app.get("/api/brain/corrections", async (req, res) => {
  try {
    res.json({
      ok: true,
      path: "memory/brain/corrections.md",
      content: await getCorrections()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message || "Erro ao ler correções do brain."
    });
  }
});

app.get("/api/brain/verified-facts", async (req, res) => {
  try {
    res.json({
      ok: true,
      path: "memory/brain/verified-facts.md",
      content: await getVerifiedFacts()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message || "Erro ao ler fatos verificados."
    });
  }
});

// Streaming SSE para o caminho direto (mode simple). Os modos deliberado/critico,
// com pipeline draft->critico->web, continuam no /api/chat (JSON).
app.post("/api/chat/stream", async (req, res) => {
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });

  const send = (event, payload) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  if (!message) {
    send("error", { error: "Digite uma mensagem antes de enviar." });
    return res.end();
  }

  try {
    if (isShowDebateRequest(message)) {
      const debate = lastAgentDebate || await readLastAgentDebateLog();
      const answer = formatDebateForUser(debate);
      send("token", { content: answer });
      send("done", {
        ok: true,
        model: "local-orchestrator",
        answer,
        metrics: {
          total_duration_seconds: 0,
          eval_tokens_per_second: 0,
          eval_count: 0,
          prompt_eval_count: 0
        },
        debate,
        memory: { used: false, files: [], chunks: 0, command: false }
      });
      await appendConversationLog({
        timestamp: new Date().toISOString(),
        type: "stream_show_agent_debate",
        question: message,
        answer,
        hasDebate: Boolean(debate)
      });
      rememberChatTurn(message, answer);
      return res.end();
    }

    if (isMissingAgentModelsRequest(message)) {
      const agentModels = buildAgentModelAvailability(await getOllamaModels());
      const answer = formatMissingAgentModelsAnswer(agentModels);
      send("token", { content: answer });
      send("done", {
        ok: true,
        model: "local-orchestrator",
        answer,
        metrics: {
          total_duration_seconds: 0,
          eval_tokens_per_second: 0,
          eval_count: 0,
          prompt_eval_count: 0
        },
        agentModels,
        memory: { used: false, files: [], chunks: 0, command: false }
      });
      await appendConversationLog({
        timestamp: new Date().toISOString(),
        type: "stream_missing_agent_models",
        question: message,
        answer,
        missingCount: agentModels.filter((agent) => !agent.available).length
      });
      rememberChatTurn(message, answer);
      return res.end();
    }

    const watchCommandResult = await runWatchCommandIfAny(message, "stream_");
    if (watchCommandResult) {
      send("token", { content: watchCommandResult.answer });
      send("done", watchCommandResult);
      return res.end();
    }

    // Comando de memoria: nao faz sentido streamar; responde de uma vez.
    const memoryCommandText = detectMemoryCommand(message);
    if (memoryCommandText) {
      const remembered = await rememberText(memoryCommandText);
      const answer = "Beleza. Guardei isso na memória.";
      send("token", { content: answer });
      send("done", {
        ok: true,
        model: DEFAULT_MODEL,
        answer,
        memory: { command: true, saved: remembered.text, files: [remembered.path], chunks: 0 }
      });
      await appendConversationLog({
        timestamp: new Date().toISOString(),
        model: DEFAULT_MODEL,
        type: "stream_memory_command",
        question: message,
        answer,
        memory: { command: true, files: [remembered.path], saved: remembered.text }
      });
      rememberChatTurn(message, answer);
      return res.end();
    }

    const memoryMatches = await searchMemory(message);
    const memoryContext = buildMemoryContext(memoryMatches);
    const chatPlan = createChatPlan(message, { requestedMode: "simple" });

    if (chatPlan.requiresConfirmation) {
      const answer = buildConfirmationRequiredAnswer(chatPlan);
      const memory = {
        used: memoryMatches.length > 0,
        files: [...new Set(memoryMatches.map((match) => match.file))],
        chunks: memoryMatches.length,
        command: false
      };

      send("token", { content: answer });
      send("done", {
        ok: true,
        model: "local-orchestrator",
        answer,
        metrics: {
          total_duration_seconds: 0,
          eval_tokens_per_second: 0,
          eval_count: 0,
          prompt_eval_count: 0
        },
        mode: chatPlan.effectiveMode,
        orchestration: chatPlan.orchestration,
        agentsUsed: chatPlan.agentsUsed,
        requiresConfirmation: true,
        memory
      });

      await appendConversationLog({
        timestamp: new Date().toISOString(),
        type: "stream_dangerous_action_confirmation_required",
        mode: chatPlan.effectiveMode,
        orchestration: chatPlan.orchestration,
        agentsUsed: chatPlan.agentsUsed,
        question: message,
        answer,
        memory
      });

      rememberChatTurn(message, answer);
      return res.end();
    }

    if (chatPlan.orchestration.mode === "watch") {
      const watchPlan = prepareWatchPlanAuthorization(
        createWatchPlan(message, { confirm: req.body.confirm === true }),
        message
      );
      const answer = formatWatchPlanAnswer(watchPlan);
      const memory = {
        used: memoryMatches.length > 0,
        files: [...new Set(memoryMatches.map((match) => match.file))],
        chunks: memoryMatches.length,
        command: false
      };

      send("token", { content: answer });
      send("done", {
        ok: true,
        model: "local-watch-orchestrator",
        answer,
        metrics: {
          total_duration_seconds: 0,
          eval_tokens_per_second: 0,
          eval_count: 0,
          prompt_eval_count: 0
        },
        mode: chatPlan.effectiveMode,
        orchestration: chatPlan.orchestration,
        agentsUsed: chatPlan.agentsUsed,
        watchPlan,
        requiresAuthorization: watchPlan.status !== "authorized_plan",
        memory
      });

      await appendAgentWatchPlanLog({
        timestamp: new Date().toISOString(),
        question: message,
        orchestration: chatPlan.orchestration,
        agentsUsed: chatPlan.agentsUsed,
        watchPlan
      });

      await appendConversationLog({
        timestamp: new Date().toISOString(),
        type: "stream_watch_plan",
        mode: chatPlan.effectiveMode,
        orchestration: chatPlan.orchestration,
        agentsUsed: chatPlan.agentsUsed,
        question: message,
        answer,
        watchPlan,
        memory
      });

      rememberChatTurn(message, answer);
      return res.end();
    }

    const messages = [{ role: "system", content: SYSTEM_PROMPT }];
    if (memoryContext) {
      messages.push({ role: "system", content: memoryContext });
    }
    messages.push({ role: "user", content: message });

    const { answer, metrics } = await callOllamaChatStream(messages, {}, (token) => {
      send("token", { content: token });
    });

    const memory = {
      used: memoryMatches.length > 0,
      files: [...new Set(memoryMatches.map((match) => match.file))],
      chunks: memoryMatches.length,
      command: false
    };

    send("done", { ok: true, model: DEFAULT_MODEL, answer, metrics, memory });

    await appendConversationLog({
      timestamp: new Date().toISOString(),
      model: DEFAULT_MODEL,
      type: "stream_chat",
      question: message,
      answer,
      total_duration_seconds: metrics.total_duration_seconds,
      eval_tokens_per_second: metrics.eval_tokens_per_second,
      eval_count: metrics.eval_count,
      prompt_eval_count: metrics.prompt_eval_count,
      memory
    });

    rememberChatTurn(message, answer);
    return res.end();
  } catch (error) {
    send("error", { error: friendlyOllamaError(error) });
    return res.end();
  }
});

app.post("/api/chat", async (req, res) => {
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
  const requestedMode = typeof req.body.mode === "string" ? req.body.mode.trim().toLowerCase() : "auto";
  const debug = req.body.debug === true || req.query.debug === "true";
  const requestImages = normalizeRequestImages(req.body.images);

  if (!message) {
    return res.status(400).json({
      ok: false,
      error: "Digite uma mensagem antes de enviar."
    });
  }

  try {
    if (isShowDebateRequest(message)) {
      const debate = lastAgentDebate || await readLastAgentDebateLog();
      const answer = formatDebateForUser(debate);
      const metrics = {
        total_duration_seconds: 0,
        eval_tokens_per_second: 0,
        eval_count: 0,
        prompt_eval_count: 0
      };

      await appendConversationLog({
        timestamp: new Date().toISOString(),
        type: "show_agent_debate",
        question: message,
        answer,
        hasDebate: Boolean(debate)
      });

      rememberChatTurn(message, answer);

      return res.json({
        ok: true,
        model: "local-orchestrator",
        answer,
        metrics,
        debate,
        memory: {
          used: false,
          files: [],
          chunks: 0,
          command: false
        }
      });
    }

    if (isMissingAgentModelsRequest(message)) {
      const agentModels = buildAgentModelAvailability(await getOllamaModels());
      const answer = formatMissingAgentModelsAnswer(agentModels);
      const metrics = {
        total_duration_seconds: 0,
        eval_tokens_per_second: 0,
        eval_count: 0,
        prompt_eval_count: 0
      };

      await appendConversationLog({
        timestamp: new Date().toISOString(),
        type: "missing_agent_models",
        question: message,
        answer,
        missingCount: agentModels.filter((agent) => !agent.available).length
      });

      rememberChatTurn(message, answer);

      return res.json({
        ok: true,
        model: "local-orchestrator",
        answer,
        metrics,
        agentModels,
        memory: {
          used: false,
          files: [],
          chunks: 0,
          command: false
        }
      });
    }

    const watchCommandResult = await runWatchCommandIfAny(message);
    if (watchCommandResult) {
      return res.json(watchCommandResult);
    }

    const voiceStatusAnswer = requestImages.length === 0 ? await localVoiceStatusAnswer(message).catch(() => "") : "";

    if (voiceStatusAnswer) {
      const metrics = {
        total_duration_seconds: 0,
        eval_tokens_per_second: 0,
        eval_count: 0,
        prompt_eval_count: 0
      };

      await appendConversationLog({
        timestamp: new Date().toISOString(),
        type: "local_voice_status",
        question: message,
        answer: voiceStatusAnswer,
        total_duration_seconds: 0,
        eval_tokens_per_second: 0,
        eval_count: 0,
        prompt_eval_count: 0
      });

      rememberChatTurn(message, voiceStatusAnswer);

      return res.json({
        ok: true,
        model: "local-status",
        answer: voiceStatusAnswer,
        metrics,
        memory: {
          used: false,
          files: [],
          chunks: 0,
          command: false
        }
      });
    }

    const clarificationAnswer = requestImages.length === 0 ? ambiguousSupportAnswer(message) : "";

    if (clarificationAnswer) {
      const metrics = {
        total_duration_seconds: 0,
        eval_tokens_per_second: 0,
        eval_count: 0,
        prompt_eval_count: 0
      };

      await appendConversationLog({
        timestamp: new Date().toISOString(),
        type: "clarification_guard",
        question: message,
        answer: clarificationAnswer,
        total_duration_seconds: 0,
        eval_tokens_per_second: 0,
        eval_count: 0,
        prompt_eval_count: 0
      });

      rememberChatTurn(message, clarificationAnswer);

      return res.json({
        ok: true,
        model: "local-clarification",
        answer: clarificationAnswer,
        metrics,
        memory: {
          used: false,
          files: [],
          chunks: 0,
          command: false
        }
      });
    }

    const memoryCommandText = detectMemoryCommand(message);

    if (memoryCommandText) {
      const remembered = await rememberText(memoryCommandText);
      const answer = "Beleza. Guardei isso na memória.";
      const metrics = {
        total_duration_seconds: 0,
        eval_tokens_per_second: 0,
        eval_count: 0,
        prompt_eval_count: 0
      };

      await appendConversationLog({
        timestamp: new Date().toISOString(),
        model: DEFAULT_MODEL,
        question: message,
        answer,
        total_duration_seconds: 0,
        eval_tokens_per_second: 0,
        eval_count: 0,
        prompt_eval_count: 0,
        memory: {
          used: false,
          files: [remembered.path],
          chunks: 0,
          command: true,
          saved: remembered.text
        }
      });

      rememberChatTurn(message, answer);

      return res.json({
        ok: true,
        model: DEFAULT_MODEL,
        answer,
        metrics,
        memory: {
          command: true,
          saved: remembered.text,
          files: [remembered.path],
          chunks: 0
        }
      });
    }

    if (isVerificationRequest(message)) {
      const normalizedVerification = message
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      if (normalizedVerification.includes("salva essa correcao") && lastWebCheck) {
        const saved = await saveCorrection({
          subject: lastWebCheck.question,
          previousAnswer: lastWebCheck.previousAnswer,
          correction: lastWebCheck.answer,
          futureRule: lastWebCheck.temporalSensitivity === "alta" ? "Verificar novamente antes de usar." : "Consultar esta correção antes de responder novamente sobre o assunto.",
          sources: lastWebCheck.sources,
          temporalSensitivity: lastWebCheck.temporalSensitivity
        });
        const answer = "Beleza. Salvei essa correção no brain.";

        await appendConversationLog({
          timestamp: new Date().toISOString(),
          type: "brain_save_correction",
          question: message,
          previousAnswer: lastWebCheck.previousAnswer,
          correctedAnswer: lastWebCheck.answer,
          sources: lastWebCheck.sources.map((source) => ({
            title: source.title,
            url: source.url
          })),
          correctionSaved: true,
          memoryPath: saved.path
        });

        rememberChatTurn(message, answer);

        return res.json({
          ok: true,
          model: DEFAULT_MODEL,
          answer,
          metrics: {
            total_duration_seconds: 0,
            eval_tokens_per_second: 0,
            eval_count: 0,
            prompt_eval_count: 0
          },
          webCheck: {
            correctionSaved: true,
            memoryPath: saved.path
          }
        });
      }

      const previousTurn = getLastChatTurn();
      const questionToCheck = previousTurn ? previousTurn.question : message;
      const previousAnswer = previousTurn ? previousTurn.answer : "";
      const result = await runWebCheck({
        question: questionToCheck,
        previousAnswer,
        saveCorrection: false
      });

      await appendConversationLog({
        timestamp: new Date().toISOString(),
        type: "web_check",
        question: questionToCheck,
        trigger: message,
        previousAnswer,
        correctedAnswer: result.answer,
        sources: result.sources.map((source) => ({
          title: source.title,
          url: source.url
        })),
        correctionSaved: result.correctionSaved,
        memoryPath: result.memoryPath,
        webResearchPath: result.webResearchPath,
        provider: result.provider
      });

      if (!result.ok) {
        rememberChatTurn(message, result.answer);
        return res.json({
          ok: true,
          model: DEFAULT_MODEL,
          answer: result.answer,
          metrics: {
            total_duration_seconds: 0,
            eval_tokens_per_second: 0,
            eval_count: 0,
            prompt_eval_count: 0
          },
          webCheck: {
            used: false,
            sources: [],
            provider: result.provider
          }
        });
      }

      rememberChatTurn(questionToCheck, result.answer);

      return res.json({
        ok: true,
        model: DEFAULT_MODEL,
        answer: result.answer,
        metrics: result.metrics,
        webCheck: {
          used: true,
          sources: result.sources,
          provider: result.provider,
          correctionSaved: result.correctionSaved,
          memoryPath: result.memoryPath,
          webResearchPath: result.webResearchPath,
          temporalSensitivity: result.temporalSensitivity
        }
      });
    }

    const memoryMatches = await searchMemory(message);
    const memoryContext = buildMemoryContext(memoryMatches);
    const chatPlan = createChatPlan(message, { requestedMode, hasAttachment: requestImages.length > 0 });
    const orchestration = chatPlan.orchestration;
    const effectiveMode = chatPlan.effectiveMode;

    if (chatPlan.requiresConfirmation && req.body.confirm !== true) {
      const answer = buildConfirmationRequiredAnswer(chatPlan);
      const metrics = {
        total_duration_seconds: 0,
        eval_tokens_per_second: 0,
        eval_count: 0,
        prompt_eval_count: 0
      };

      await appendConversationLog({
        timestamp: new Date().toISOString(),
        type: "dangerous_action_confirmation_required",
        mode: effectiveMode,
        orchestration,
        agentsUsed: chatPlan.agentsUsed,
        question: message,
        answer,
        memory: {
          used: memoryMatches.length > 0,
          files: [...new Set(memoryMatches.map((match) => match.file))],
          chunks: memoryMatches.length,
          command: false
        },
        images: {
          count: requestImages.length
        }
      });

      rememberChatTurn(message, answer);

      return res.json({
        ok: true,
        model: "local-orchestrator",
        answer,
        metrics,
        mode: effectiveMode,
        orchestration,
        agentsUsed: chatPlan.agentsUsed,
        requiresConfirmation: true,
        memory: {
          used: memoryMatches.length > 0,
          files: [...new Set(memoryMatches.map((match) => match.file))],
          chunks: memoryMatches.length,
          command: false
        },
        images: {
          count: requestImages.length
        }
      });
    }

    if (orchestration.mode === "watch") {
      const watchPlan = prepareWatchPlanAuthorization(
        createWatchPlan(message, { confirm: req.body.confirm === true }),
        message
      );
      const answer = formatWatchPlanAnswer(watchPlan);
      const metrics = {
        total_duration_seconds: 0,
        eval_tokens_per_second: 0,
        eval_count: 0,
        prompt_eval_count: 0
      };
      const memory = {
        used: memoryMatches.length > 0,
        files: [...new Set(memoryMatches.map((match) => match.file))],
        chunks: memoryMatches.length,
        command: false
      };

      await appendAgentWatchPlanLog({
        timestamp: new Date().toISOString(),
        question: message,
        orchestration,
        agentsUsed: chatPlan.agentsUsed,
        watchPlan
      });

      await appendConversationLog({
        timestamp: new Date().toISOString(),
        type: "watch_plan",
        mode: effectiveMode,
        orchestration,
        agentsUsed: chatPlan.agentsUsed,
        question: message,
        answer,
        watchPlan,
        memory,
        images: {
          count: requestImages.length
        }
      });

      rememberChatTurn(message, answer);

      return res.json({
        ok: true,
        model: "local-watch-orchestrator",
        answer,
        metrics,
        mode: effectiveMode,
        orchestration,
        agentsUsed: chatPlan.agentsUsed,
        watchPlan,
        requiresAuthorization: watchPlan.status !== "authorized_plan",
        memory,
        images: {
          count: requestImages.length
        }
      });
    }

    if (effectiveMode !== "simple") {
      const result = await runMultiModelChat({
        userMessage: message,
        mode: effectiveMode === "critical" ? "critical" : "deliberate",
        debug,
        memoryMatches,
        memoryContext,
        orchestration,
        images: requestImages
      });

      result.orchestration = orchestration;
      result.agentsUsed = orchestration.agentsUsed;
      result.images = {
        count: requestImages.length
      };
      lastAgentDebate = result.debate;
      await appendAgentDebateLog(result.debate);
      if (debug) {
        result.debug = {
          orchestration,
          ...(result.debug || {})
        };
      }

      await appendConversationLog({
        timestamp: new Date().toISOString(),
        type: "multi_model_with_web_arbitration",
        mode: result.mode,
        orchestration,
        agentsUsed: orchestration.agentsUsed,
        question: message,
        draftAnswer: result.log.draftAnswer,
        criticReview: result.log.criticReview,
        webCheckTriggered: result.webCheck.triggered,
        webCheckReason: result.webCheck.reason,
        webCheckReasonLabel: result.webCheck.reasonLabel,
        provider: result.webCheck.provider,
        sources: result.webCheck.sources.map((source) => ({
          title: source.title,
          url: source.url
        })),
        webResearchPath: result.webCheck.webResearchPath,
        correctionSaved: result.webCheck.correctionSaved,
        memoryPath: result.webCheck.memoryPath,
        finalAnswer: result.answer,
        debate: result.debate,
        models: result.models,
        memory: result.memory,
        images: {
          count: requestImages.length
        }
      });

      rememberChatTurn(message, result.answer);

      const { log, debate, ...responseBody } = result;
      if (debug) {
        responseBody.debate = debate;
      }
      return res.json(responseBody);
    }

    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT
      }
    ];

    if (memoryContext) {
      messages.push({
        role: "system",
        content: memoryContext
      });
    }

    messages.push({
      role: "user",
      content: message
    });

    const { answer, metrics } = await callOllamaChat(messages);

    await appendConversationLog({
      timestamp: new Date().toISOString(),
      model: DEFAULT_MODEL,
      type: "single_model_chat",
      mode: effectiveMode,
      orchestration,
      agentsUsed: orchestration.agentsUsed,
      question: message,
      answer,
      total_duration_seconds: metrics.total_duration_seconds,
      eval_tokens_per_second: metrics.eval_tokens_per_second,
      eval_count: metrics.eval_count,
      prompt_eval_count: metrics.prompt_eval_count,
      memory: {
        used: memoryMatches.length > 0,
        files: [...new Set(memoryMatches.map((match) => match.file))],
        chunks: memoryMatches.length,
        command: false
      },
      images: {
        count: requestImages.length
      }
    });

    rememberChatTurn(message, answer);

    return res.json({
      ok: true,
      model: DEFAULT_MODEL,
      answer,
      metrics,
      mode: effectiveMode,
      orchestration,
      agentsUsed: orchestration.agentsUsed,
      memory: {
        used: memoryMatches.length > 0,
        files: [...new Set(memoryMatches.map((match) => match.file))],
        chunks: memoryMatches.length,
        command: false
      },
      images: {
        count: requestImages.length
      }
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: friendlyOllamaError(error)
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Rota não encontrada."
  });
});

// Handlers globais: um erro async solto nao deve derrubar o servidor em silencio.
process.on("unhandledRejection", (reason) => {
  console.error("Promise rejeitada sem tratamento:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Excecao nao capturada:", error);
});

// So inicia o servidor quando executado diretamente (node server.js).
// Em testes, o app e importado sem abrir a porta.
if (require.main === module) {
  // Aviso de seguranca: servidor exposto na rede sem token de acesso.
  if ((HOST === "0.0.0.0" || HOST === "::") && !AUTH_TOKEN) {
    console.warn("AVISO DE SEGURANCA: o servidor esta acessivel na rede (HOST=" + HOST + ") SEM token de acesso.");
    console.warn("Qualquer dispositivo na rede pode usar a API. Defina AUTH_TOKEN no .env para exigir login,");
    console.warn("ou use HOST=127.0.0.1 para limitar ao proprio PC.");
  }

  app.listen(PORT, HOST, () => {
    console.log(`Assistente Local (HTTP) em http://localhost:${PORT}`);
  });

  // HTTPS opcional: necessario para o microfone funcionar fora do localhost
  // (iPhone/Android exigem contexto seguro). So liga se o certificado existir.
  const keyPath = path.isAbsolute(CERT_KEY) ? CERT_KEY : path.join(__dirname, CERT_KEY);
  const certPath = path.isAbsolute(CERT_FILE) ? CERT_FILE : path.join(__dirname, CERT_FILE);

  if (fsSync.existsSync(keyPath) && fsSync.existsSync(certPath)) {
    try {
      const credentials = {
        key: fsSync.readFileSync(keyPath, "utf8"),
        cert: fsSync.readFileSync(certPath, "utf8")
      };
      https.createServer(credentials, app).listen(HTTPS_PORT, HOST, () => {
        console.log(`Assistente Local (HTTPS) em https://localhost:${HTTPS_PORT}  (use no celular pelo IP da rede)`);
      });
    } catch (error) {
      console.warn(`Nao foi possivel iniciar HTTPS: ${error.message}`);
    }
  } else {
    console.log("HTTPS desligado (sem certificado em certs/). Microfone so funciona via localhost.");
  }
}

module.exports = { app };
