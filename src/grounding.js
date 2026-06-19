// Helpers puros de "grounding": normalizacao de texto, versoes semanticas,
// limpeza de afirmacoes sem suporte nas fontes e deteccao de vazamento interno.
// Sem I/O e sem dependencia de estado: faceis de testar isoladamente.

function normalizeForGrounding(value) {
  // NFD + remocao de marcas combinantes (acentos) => texto "sem acento" minusculo.
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase();
}

function removeUnsupportedBrazilRegionClaims(answer, sources) {
  const sourceText = normalizeForGrounding((sources || [])
    .map((source) => `${source.title} ${source.snippet} ${source.url}`)
    .join(" "));

  const unsupportedRegions = [
    "norte do brasil",
    "nordeste do brasil",
    "centro-oeste do brasil",
    "sudeste do brasil",
    "sul do brasil"
  ].filter((phrase) => !sourceText.includes(phrase));

  let cleaned = answer;

  for (const phrase of unsupportedRegions) {
    const escapedPhrase = phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&").replace(/\s+/g, "\\s+");
    const regionPattern = new RegExp(`,?\\s*(?:na\\s+regiao\\s+|no\\s+|na\\s+)?${escapedPhrase}`, "gi");
    cleaned = cleaned.replace(regionPattern, "");
  }

  return cleaned.replace(/\s+,/g, ",").replace(/[ \t]{2,}/g, " ").trim();
}

function isOllamaReleaseQuery(userMessage) {
  const text = normalizeForGrounding(userMessage);

  return text.includes("ollama")
    && /(versao|version|release|lancamento|mais recente|latest|atual)/.test(text);
}

function formatBrazilDate(isoDate) {
  if (!isoDate) {
    return "";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function extractSemanticVersions(text) {
  const matches = String(text || "").match(/\bv?\d+\.\d+(?:\.\d+)?(?:[-+][0-9a-z.-]+)?\b/gi) || [];
  return [...new Set(matches.map((version) => version.replace(/^v/i, "").toLowerCase()))];
}

function officialVersionMismatch(previousAnswer, sources) {
  const official = (sources || []).find((source) => source && source.officialLatestVersion);
  if (!official) {
    return false;
  }

  const officialVersion = String(official.officialLatestVersion).replace(/^v/i, "").toLowerCase();
  const previousVersions = extractSemanticVersions(previousAnswer);

  if (previousVersions.length === 0) {
    return false;
  }

  return previousVersions.some((version) => version !== officialVersion);
}

function containsInternalLeak(answer) {
  const text = normalizeForGrounding(answer);

  return text.includes("critica do mistral")
    || text.includes("veredito")
    || text.includes("nivel_confianca")
    || text.includes("draftanswer")
    || text.includes("criticreview")
    || text.includes("\"raw\"")
    || text.includes("resposta inicial do qwen");
}

module.exports = {
  normalizeForGrounding,
  removeUnsupportedBrazilRegionClaims,
  isOllamaReleaseQuery,
  formatBrazilDate,
  extractSemanticVersions,
  officialVersionMismatch,
  containsInternalLeak
};
