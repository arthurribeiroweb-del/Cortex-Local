const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

// Mocka o fetch global ANTES de carregar o server, para o callOllamaChatStream
// receber um corpo NDJSON em streaming sem depender do Ollama real.
const realFetch = global.fetch;
let ollamaStreamCalls = 0;

function fakeOllamaStreamResponse() {
  const lines = [
    '{"message":{"content":"Bom "},"done":false}',
    '{"message":{"content":"dia"},"done":false}',
    '{"message":{"content":"!"},"done":false}',
    '{"done":true,"total_duration":1000000000,"eval_count":3,"eval_duration":500000000,"prompt_eval_count":10}'
  ];
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      // entrega os chunks cortando uma linha no meio de proposito
      const raw = lines.join("\n") + "\n";
      const mid = Math.floor(raw.length / 2);
      controller.enqueue(encoder.encode(raw.slice(0, mid)));
      controller.enqueue(encoder.encode(raw.slice(mid)));
      controller.close();
    }
  });
  return { ok: true, status: 200, body };
}

global.fetch = async (url, options) => {
  if (String(url).includes("/api/chat")) {
    ollamaStreamCalls += 1;
    return fakeOllamaStreamResponse();
  }
  return realFetch(url, options);
};

const { app } = require("../server");

function postSSE(server, path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const { port } = server.address();
    const req = http.request(
      { host: "127.0.0.1", port, path, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function parseSSE(body) {
  const events = [];
  for (const block of body.split("\n\n")) {
    const lines = block.split("\n");
    const eventLine = lines.find((l) => l.startsWith("event: "));
    const dataLine = lines.find((l) => l.startsWith("data: "));
    if (eventLine && dataLine) {
      events.push({ event: eventLine.slice(7), data: JSON.parse(dataLine.slice(6)) });
    }
  }
  return events;
}

test.after(() => { global.fetch = realFetch; });

test("POST /api/chat/stream: emite tokens e um done com a resposta completa", async () => {
  ollamaStreamCalls = 0;
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  try {
    const { status, body } = await postSSE(server, "/api/chat/stream", { message: "oi" });
    assert.equal(status, 200);

    const events = parseSSE(body);
    const tokens = events.filter((e) => e.event === "token").map((e) => e.data.content);
    const done = events.find((e) => e.event === "done");

    assert.equal(tokens.join(""), "Bom dia!", "tokens concatenados formam a resposta");
    assert.ok(done, "deve haver um evento done");
    assert.equal(done.data.answer, "Bom dia!");
    assert.equal(done.data.metrics.eval_count, 3);
    assert.equal(ollamaStreamCalls, 1);
  } finally {
    server.close();
  }
});

test("POST /api/chat/stream: mensagem vazia retorna evento de erro", async () => {
  ollamaStreamCalls = 0;
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  try {
    const { body } = await postSSE(server, "/api/chat/stream", { message: "" });
    const events = parseSSE(body);
    const err = events.find((e) => e.event === "error");
    assert.ok(err, "deve emitir evento error");
    assert.equal(ollamaStreamCalls, 0);
  } finally {
    server.close();
  }
});

test("POST /api/chat/stream: modo vigia retorna plano local sem chamar Ollama", async () => {
  ollamaStreamCalls = 0;
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  try {
    const { status, body } = await postSSE(server, "/api/chat/stream", {
      message: "modo vigia: monitore os logs a cada 2 minutos por 1 hora"
    });
    assert.equal(status, 200);

    const events = parseSSE(body);
    const done = events.find((e) => e.event === "done");

    assert.ok(done, "deve haver um evento done");
    assert.equal(done.data.model, "local-watch-orchestrator");
    assert.equal(done.data.orchestration.mode, "watch");
    assert.equal(done.data.requiresAuthorization, true);
    assert.equal(done.data.watchPlan.target.type, "logs");
    assert.match(done.data.answer, /Plano do modo vigia/);
    assert.equal(ollamaStreamCalls, 0);
  } finally {
    server.close();
  }
});
