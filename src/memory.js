const fs = require("fs/promises");
const path = require("path");

const MEMORY_DIR = path.join(__dirname, "..", "memory");
const MAX_CHUNKS = 5;
const MAX_CHUNK_LENGTH = 900;

const STOP_WORDS = new Set([
  "o",
  "a",
  "os",
  "as",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "que",
  "como",
  "para",
  "por",
  "um",
  "uma",
  "uns",
  "umas",
  "me",
  "meu",
  "minha",
  "qual",
  "quais",
  "e",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "com",
  "se",
  "eu",
  "voce",
  "você",
  "jarvis"
]);

const MEMORY_PREFIXES = [
  "lembre que",
  "memorize que",
  "guarde que",
  "salve na memoria que",
  "salve na memória que",
  "anote que"
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9_.:-]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function normalizeMemoryPath(inputPath) {
  const rawPath = String(inputPath || "").replace(/\\/g, "/").trim();

  if (!rawPath) {
    throw new Error("Caminho da memória não informado.");
  }

  if (path.isAbsolute(rawPath) || rawPath.includes("\0")) {
    throw new Error("Caminho de memória inválido.");
  }

  const parts = rawPath.split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) {
    throw new Error("Caminho de memória inválido.");
  }

  const normalized = parts.join("/");
  if (!normalized.endsWith(".md")) {
    throw new Error("A memória permite apenas arquivos .md.");
  }

  return normalized;
}

function resolveMemoryPath(inputPath) {
  const safePath = normalizeMemoryPath(inputPath);
  const absolutePath = path.resolve(MEMORY_DIR, safePath);
  const memoryRoot = path.resolve(MEMORY_DIR);

  if (absolutePath !== memoryRoot && !absolutePath.startsWith(`${memoryRoot}${path.sep}`)) {
    throw new Error("Acesso fora da pasta memory bloqueado.");
  }

  return {
    safePath,
    absolutePath
  };
}

async function ensureMemoryDir() {
  await fs.mkdir(MEMORY_DIR, { recursive: true });
}

async function walkMarkdownFiles(directory = MEMORY_DIR, prefix = "") {
  await ensureMemoryDir();
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walkMarkdownFiles(absolutePath, relativePath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relativePath.replace(/\\/g, "/"));
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function listMemoryFiles() {
  return walkMarkdownFiles();
}

function filePriority(filePath) {
  if (filePath === "brain/corrections.md") {
    return 0;
  }

  if (filePath === "brain/verified-facts.md") {
    return 1;
  }

  if (filePath === "profile.md") {
    return 2;
  }

  if (filePath.startsWith("vault/")) {
    return 3;
  }

  return 4;
}

async function readMemoryFile(inputPath) {
  const { safePath, absolutePath } = resolveMemoryPath(inputPath);

  try {
    const content = await fs.readFile(absolutePath, "utf8");
    return {
      path: safePath,
      content
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("Arquivo de memória não encontrado.");
    }

    throw error;
  }
}

async function saveMemoryFile(inputPath, content) {
  const { safePath, absolutePath } = resolveMemoryPath(inputPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, String(content || ""), "utf8");

  return {
    path: safePath
  };
}

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    " ",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes())
  ].join("");
}

async function rememberText(text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    throw new Error("Texto da memória não informado.");
  }

  const profilePath = "profile.md";
  const { absolutePath } = resolveMemoryPath(profilePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  const punctuation = /[.!?]$/.test(cleanText) ? "" : ".";
  const block = `\n\n## Memória adicionada em ${formatTimestamp()}\n\n- ${cleanText}${punctuation}\n`;
  await fs.appendFile(absolutePath, block, "utf8");

  return {
    path: profilePath,
    text: cleanText
  };
}

function stripAssistantAddress(message) {
  return String(message || "")
    .trim()
    .replace(/^jarvis[,:\s]+/i, "")
    .trim();
}

function detectMemoryCommand(message) {
  const cleanMessage = stripAssistantAddress(message);
  const normalized = normalizeText(cleanMessage);

  for (const prefix of MEMORY_PREFIXES) {
    const normalizedPrefix = normalizeText(prefix);
    if (normalized.startsWith(normalizedPrefix)) {
      return cleanMessage.slice(prefix.length).trim();
    }
  }

  return null;
}

function splitIntoChunks(content) {
  const blocks = String(content || "")
    .split(/\n(?=#{1,6}\s)|\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const chunks = [];

  for (const block of blocks) {
    if (block.length <= MAX_CHUNK_LENGTH) {
      chunks.push(block);
      continue;
    }

    for (let index = 0; index < block.length; index += MAX_CHUNK_LENGTH) {
      chunks.push(block.slice(index, index + MAX_CHUNK_LENGTH).trim());
    }
  }

  return chunks;
}

function scoreChunk(chunk, filePath, keywords) {
  const normalizedChunk = normalizeText(chunk);
  const normalizedPath = normalizeText(filePath.replace(/[/-]/g, " "));
  let score = 0;

  for (const keyword of keywords) {
    if (normalizedChunk.includes(keyword)) {
      score += 2;
    }

    if (normalizedPath.includes(keyword)) {
      score += 3;
    }
  }

  return score;
}

async function searchMemory(question, limit = MAX_CHUNKS) {
  const keywords = tokenize(question);
  if (keywords.length === 0) {
    return [];
  }

  const files = await listMemoryFiles();
  const matches = [];

  for (const filePath of files) {
    const { content } = await readMemoryFile(filePath);
    const chunks = splitIntoChunks(content);

    for (const chunk of chunks) {
      const score = scoreChunk(chunk, filePath, keywords);
      if (score > 0) {
        matches.push({
          file: filePath,
          chunk,
          score
        });
      }
    }
  }

  return matches
    .sort((a, b) => {
      const priorityDiff = filePriority(a.file) - filePriority(b.file);
      if (priorityDiff !== 0 && Math.abs(a.score - b.score) <= 2) {
        return priorityDiff;
      }

      return b.score - a.score || priorityDiff || a.file.localeCompare(b.file);
    })
    .slice(0, limit)
    .map(({ file, chunk }) => ({ file, chunk }));
}

function buildMemoryContext(matches) {
  if (!matches || matches.length === 0) {
    return "";
  }

  const sections = matches.map((match) => [
    `Arquivo: memory/${match.file}`,
    "Trecho:",
    match.chunk
  ].join("\n"));

  return [
    "MEMÓRIA LOCAL RELEVANTE:",
    "",
    sections.join("\n\n---\n\n"),
    "",
    "Use a memória acima apenas se for relevante para responder.",
    "Se a memória não for relevante, ignore."
  ].join("\n");
}

module.exports = {
  buildMemoryContext,
  detectMemoryCommand,
  listMemoryFiles,
  readMemoryFile,
  rememberText,
  saveMemoryFile,
  searchMemory
};
