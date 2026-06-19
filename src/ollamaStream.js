// Helpers puros para consumir o streaming NDJSON do Ollama (/api/chat com stream:true).
// O Ollama envia uma sequencia de objetos JSON separados por "\n". Como os chunks
// da rede podem cortar uma linha no meio, precisamos acumular o resto entre chunks.

/**
 * Separa um buffer em linhas completas + o resto incompleto.
 * Ex.: takeCompleteLines('a\nb\nc') => { lines: ['a','b'], rest: 'c' }
 */
function takeCompleteLines(buffer) {
  const parts = String(buffer || "").split("\n");
  const rest = parts.pop(); // ultimo pedaco pode estar incompleto (ou vazio)
  const lines = parts.map((line) => line.trim()).filter(Boolean);
  return { lines, rest: rest || "" };
}

/**
 * Faz parse de uma linha NDJSON do Ollama.
 * Retorna { content, done, data } ou null se a linha nao for JSON valido.
 */
function parseStreamLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) {
    return null;
  }

  let data;
  try {
    data = JSON.parse(trimmed);
  } catch (error) {
    return null;
  }

  const content = data.message && typeof data.message.content === "string"
    ? data.message.content
    : "";

  return {
    content,
    done: Boolean(data.done),
    data
  };
}

/**
 * Acumulador com estado para uso dentro do loop de leitura do stream.
 * push(chunkText) => array de eventos { content, done, data } prontos.
 * O resto incompleto fica guardado para o proximo push.
 */
function createStreamAccumulator() {
  let buffer = "";

  return {
    push(chunkText) {
      buffer += String(chunkText || "");
      const { lines, rest } = takeCompleteLines(buffer);
      buffer = rest;
      return lines.map(parseStreamLine).filter(Boolean);
    },
    // chama no fim para processar qualquer resto que tenha sobrado sem "\n"
    flush() {
      const event = parseStreamLine(buffer);
      buffer = "";
      return event ? [event] : [];
    }
  };
}

module.exports = {
  takeCompleteLines,
  parseStreamLine,
  createStreamAccumulator
};
