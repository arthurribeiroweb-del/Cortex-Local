const crypto = require("crypto");

/**
 * Comparacao de strings em tempo constante, para nao vazar o token por timing.
 */
function timingSafeEqualStr(a, b) {
  const bufferA = Buffer.from(String(a || ""), "utf8");
  const bufferB = Buffer.from(String(b || ""), "utf8");

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Decide se uma requisicao esta autorizada.
 * - Sem token configurado (expected vazio): acesso liberado (modo local aberto).
 * - Com token configurado: exige o token exato.
 * Mantido puro para ser testavel sem HTTP.
 */
function isAuthorized(provided, expected) {
  if (!expected) {
    return true;
  }

  if (!provided) {
    return false;
  }

  return timingSafeEqualStr(provided, expected);
}

/**
 * Extrai o token da requisicao, aceitando:
 * - header `x-auth-token`
 * - header `Authorization: Bearer <token>`
 * - query `?token=` (para GETs diretos do navegador, como audio)
 */
function extractRequestToken(req) {
  const headers = (req && req.headers) || {};
  const headerToken = headers["x-auth-token"];
  if (typeof headerToken === "string" && headerToken) {
    return headerToken;
  }

  const authHeader = headers["authorization"];
  if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  const queryToken = req && req.query && req.query.token;
  if (typeof queryToken === "string" && queryToken) {
    return queryToken;
  }

  return "";
}

module.exports = {
  timingSafeEqualStr,
  isAuthorized,
  extractRequestToken
};
