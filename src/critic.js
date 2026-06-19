// Helpers puros de avaliacao da critica e decisao de acionar a busca web.
// Sem I/O: o unico acoplamento externo e o provider de busca, injetavel.
const { normalizeForGrounding } = require("./grounding");
const { getWebSearchConfig } = require("./config");

function parseJsonObject(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (error) {
    return null;
  }
}

function normalizeCriticReview(review, rawText = "") {
  const value = review && typeof review === "object" ? review : {};
  const veredito = normalizeForGrounding(value.veredito || "incompleta");
  const confidence = normalizeForGrounding(value.nivel_confianca || value.confianca || "medio");

  return {
    veredito: ["aprovada", "incompleta", "errada", "arriscada"].includes(veredito) ? veredito : "incompleta",
    nivel_confianca: ["alto", "medio", "baixo"].includes(confidence) ? confidence : "medio",
    precisa_internet: Boolean(value.precisa_internet),
    divergencia_relevante: Boolean(value.divergencia_relevante),
    problemas: Array.isArray(value.problemas) ? value.problemas.map(String).slice(0, 8) : [],
    resumo: String(value.resumo || value.justificativa || rawText || "").trim().slice(0, 2000),
    raw: rawText
  };
}

function reviewTextForRules(criticReview, userMessage) {
  return normalizeForGrounding([
    userMessage,
    criticReview && criticReview.veredito,
    criticReview && criticReview.nivel_confianca,
    criticReview && criticReview.resumo,
    criticReview && Array.isArray(criticReview.problemas) ? criticReview.problemas.join(" ") : "",
    criticReview && criticReview.raw
  ].join("\n"));
}

function userMessageNeedsCurrentInfo(userMessage) {
  const text = normalizeForGrounding(userMessage);

  return [
    "hoje",
    "atual",
    "mais recente",
    "preco",
    "link",
    "estoque",
    "compativel",
    "vale a pena comprar",
    "procura",
    "pesquisa",
    "tem certeza",
    "voce esta errado"
  ].some((term) => text.includes(term));
}

function criticMentionsWebNeed(criticReview, userMessage = "") {
  const text = reviewTextForRules(criticReview, userMessage);

  return [
    "precisa verificar",
    "informacao atual",
    "nao e possivel confirmar",
    "fonte externa",
    "compatibilidade recente",
    "preco",
    "estoque",
    "versao",
    "lei",
    "noticia",
    "lancamento",
    "site oficial"
  ].some((term) => text.includes(term));
}

function shouldTriggerWebCheck(criticReview, userMessage, mode, provider = getWebSearchConfig().provider) {
  const review = normalizeCriticReview(criticReview);
  const normalizedMode = normalizeForGrounding(mode || "deliberate");

  if (
    review.veredito === "aprovada" &&
    review.nivel_confianca === "alto" &&
    !review.precisa_internet &&
    !criticMentionsWebNeed(review, userMessage) &&
    !userMessageNeedsCurrentInfo(userMessage)
  ) {
    return false;
  }

  if (review.veredito === "errada" || review.veredito === "arriscada") {
    return true;
  }

  if (review.precisa_internet || review.nivel_confianca === "baixo") {
    return true;
  }

  if (criticMentionsWebNeed(review, userMessage) || userMessageNeedsCurrentInfo(userMessage)) {
    return true;
  }

  if (normalizedMode === "critical" && review.veredito !== "aprovada") {
    return true;
  }

  return provider !== "none" && normalizedMode === "critical" && review.nivel_confianca !== "alto";
}

function getWebCheckReason(criticReview, userMessage, mode) {
  const review = normalizeCriticReview(criticReview);
  const normalizedMode = normalizeForGrounding(mode || "deliberate");

  if (review.veredito === "errada") {
    return "critic_wrong";
  }

  if (review.veredito === "arriscada") {
    return "critic_risky";
  }

  if (review.precisa_internet) {
    return "critic_needs_current_info";
  }

  if (review.nivel_confianca === "baixo") {
    return "critic_low_confidence";
  }

  if (criticMentionsWebNeed(review, userMessage)) {
    return "critic_web_terms";
  }

  if (userMessageNeedsCurrentInfo(userMessage)) {
    return "user_current_info";
  }

  if (normalizedMode === "critical") {
    return "critical_mode_doubt";
  }

  return "not_needed";
}

function webCheckReasonLabel(reason) {
  const labels = {
    critic_wrong: "Acionado por divergencia entre modelos",
    critic_risky: "Acionado por divergencia entre modelos",
    critic_needs_current_info: "Acionado por informacao atual",
    critic_low_confidence: "Acionado por baixa confianca",
    critic_web_terms: "Acionado por informacao atual",
    user_current_info: "Acionado por informacao atual",
    critical_mode_doubt: "Acionado por duvida tecnica/factual no modo critico",
    not_needed: "Nao acionado"
  };

  return labels[reason] || "Acionado por baixa confianca";
}

module.exports = {
  parseJsonObject,
  normalizeCriticReview,
  reviewTextForRules,
  userMessageNeedsCurrentInfo,
  criticMentionsWebNeed,
  shouldTriggerWebCheck,
  getWebCheckReason,
  webCheckReasonLabel
};
