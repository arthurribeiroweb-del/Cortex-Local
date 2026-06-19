const fs = require("fs/promises");
const path = require("path");

const BRAIN_DIR = path.join(__dirname, "..", "memory", "brain");
const CORRECTIONS_PATH = path.join(BRAIN_DIR, "corrections.md");
const VERIFIED_FACTS_PATH = path.join(BRAIN_DIR, "verified-facts.md");
const WEB_RESEARCH_DIR = path.join(BRAIN_DIR, "web-research");

function timestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dateSlug(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function slugify(value) {
  return String(value || "pesquisa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "pesquisa";
}

function temporalSensitivityFromText(text) {
  const normalized = String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/(preco|estoque|lei|legislacao|versao|noticia|politica|agenda|disponibilidade|compatibilidade recente|atual)/.test(normalized)) {
    return "alta";
  }

  if (/(software|modelo|driver|api|compatibilidade)/.test(normalized)) {
    return "media";
  }

  return "baixa";
}

function sourceLines(sources, includeSnippet = false) {
  const validSources = Array.isArray(sources) ? sources.filter((source) => source && source.url) : [];

  if (validSources.length === 0) {
    return "- Nenhuma fonte com URL registrada.";
  }

  return validSources.map((source, index) => {
    const lines = [
      `${index + 1}. ${source.title || "Sem título"}`,
      `${source.url || ""}`
    ];

    if (includeSnippet && source.snippet) {
      lines.push(`Trecho: ${source.snippet}`);
    }

    return lines.join("\n");
  }).join("\n\n");
}

async function ensureBrain() {
  await fs.mkdir(WEB_RESEARCH_DIR, { recursive: true });

  try {
    await fs.access(CORRECTIONS_PATH);
  } catch (error) {
    await fs.writeFile(CORRECTIONS_PATH, "# Correções do Brain\n", "utf8");
  }

  try {
    await fs.access(VERIFIED_FACTS_PATH);
  } catch (error) {
    await fs.writeFile(VERIFIED_FACTS_PATH, "# Fatos verificados\n", "utf8");
  }
}

async function getCorrections() {
  await ensureBrain();
  return fs.readFile(CORRECTIONS_PATH, "utf8");
}

async function getVerifiedFacts() {
  await ensureBrain();
  return fs.readFile(VERIFIED_FACTS_PATH, "utf8");
}

async function saveCorrection({ subject, previousAnswer, correction, futureRule, sources, temporalSensitivity }) {
  await ensureBrain();

  const sensitivity = temporalSensitivity || temporalSensitivityFromText(`${subject}\n${correction}`);
  const block = [
    "",
    `## Correção registrada em ${timestamp()}`,
    "",
    "### Assunto",
    subject || "Assunto não informado",
    "",
    "### Erro anterior",
    previousAnswer || "Não informado.",
    "",
    "### Correção",
    correction || "Não informada.",
    "",
    "### Regra futura",
    futureRule || "Consultar esta correção antes de responder novamente sobre o assunto.",
    "",
    "### Fontes consultadas",
    sourceLines(sources),
    "",
    "### Sensibilidade temporal",
    sensitivity === "alta" ? "Alta. Verificar novamente antes de usar." : sensitivity === "media" ? "Média. Pode exigir nova verificação." : "Baixa. Regra técnica relativamente estável.",
    ""
  ].join("\n");

  await fs.appendFile(CORRECTIONS_PATH, `${block}\n`, "utf8");

  return {
    path: "memory/brain/corrections.md",
    temporalSensitivity: sensitivity
  };
}

async function saveVerifiedFact({ subject, fact, sources, temporalSensitivity }) {
  await ensureBrain();

  const sensitivity = temporalSensitivity || temporalSensitivityFromText(`${subject}\n${fact}`);
  const block = [
    "",
    `## Fato verificado em ${timestamp()}`,
    "",
    "### Assunto",
    subject || "Assunto não informado",
    "",
    "### Fato",
    fact || "Não informado.",
    "",
    "### Fontes",
    sourceLines(sources),
    "",
    "### Sensibilidade temporal",
    sensitivity === "alta" ? "Alta. Verificar novamente antes de usar." : sensitivity === "media" ? "Média." : "Baixa.",
    ""
  ].join("\n");

  await fs.appendFile(VERIFIED_FACTS_PATH, `${block}\n`, "utf8");

  return {
    path: "memory/brain/verified-facts.md",
    temporalSensitivity: sensitivity
  };
}

async function saveWebResearch({ subject, question, previousAnswer, correctedAnswer, sources, temporalSensitivity }) {
  await ensureBrain();

  const sensitivity = temporalSensitivity || temporalSensitivityFromText(`${subject}\n${question}\n${correctedAnswer}`);
  const fileName = `${dateSlug()}-${slugify(subject || question)}.md`;
  const absolutePath = path.join(WEB_RESEARCH_DIR, fileName);
  const content = [
    `# Pesquisa web: ${subject || question || "assunto"}`,
    "",
    `Data: ${timestamp()}`,
    "",
    "## Pergunta original",
    question || "Não informada.",
    "",
    "## Resposta anterior",
    previousAnswer || "Não informada.",
    "",
    "## Resposta corrigida",
    correctedAnswer || "Não informada.",
    "",
    "## Fontes consultadas",
    sourceLines(sources, true),
    "",
    "## Observações",
    `- Informação sensível ao tempo: ${sensitivity === "alta" ? "sim" : "não"}.`,
    `- Deve verificar novamente no futuro: ${sensitivity === "alta" ? "sim" : "não"}.`,
    ""
  ].join("\n");

  await fs.writeFile(absolutePath, content, "utf8");

  return {
    path: `memory/brain/web-research/${fileName}`,
    temporalSensitivity: sensitivity
  };
}

function shouldAutoSaveCorrection({ saveCorrection, answer, question }) {
  if (!saveCorrection) {
    return false;
  }

  const text = `${answer || ""}\n${question || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const saysWrong = /(estava errad|resposta anterior estava errad|incorreta|corrigindo|correcao)/.test(text);
  const temporalHigh = temporalSensitivityFromText(text) === "alta";

  return saysWrong && !temporalHigh;
}

module.exports = {
  ensureBrain,
  getCorrections,
  getVerifiedFacts,
  saveCorrection,
  saveVerifiedFact,
  saveWebResearch,
  shouldAutoSaveCorrection,
  temporalSensitivityFromText
};
