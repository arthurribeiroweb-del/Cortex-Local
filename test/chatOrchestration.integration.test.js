const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const realFetch = global.fetch;
let ollamaCalls = 0;
let ollamaBodies = [];

global.fetch = async (url, options = {}) => {
  if (String(url).includes("/api/tags")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        models: [
          { name: "qwen3.6:27b" },
          { name: "qwen3-coder:30b" },
          { name: "mistral:7b" }
        ]
      })
    };
  }

  if (String(url).includes("/api/chat")) {
    ollamaCalls += 1;
    if (options && options.body) {
      ollamaBodies.push(JSON.parse(options.body));
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        message: { content: "Resposta simples." },
        total_duration: 1000000000,
        eval_count: 4,
        eval_duration: 500000000,
        prompt_eval_count: 12
      })
    };
  }

  return realFetch(url);
};

const { app } = require("../server");
const { resetWatchRunnerForTests } = require("../src/agents/watchRunner");
const agentDebatesLog = path.join(__dirname, "..", "logs", "agent-debates.jsonl");

function postJson(server, path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const { port } = server.address();
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data)
        }
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function getJson(server, path) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request(
      { host: "127.0.0.1", port, path, method: "GET" },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

test.after(() => { global.fetch = realFetch; });
test.afterEach(() => { resetWatchRunnerForTests(); });

test("POST /api/chat: mode auto usa classificador e retorna agentes usados", async () => {
  ollamaCalls = 0;
  ollamaBodies = [];
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const { status, body } = await postJson(server, "/api/chat", {
      message: "quanto e 2 + 2?",
      mode: "auto"
    });

    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.answer, "Resposta simples.");
    assert.equal(body.orchestration.requestedMode, "auto");
    assert.equal(body.orchestration.mode, "quick");
    assert.equal(body.orchestration.legacyMode, "simple");
    assert.deepEqual(body.agentsUsed.map((agent) => agent.id), ["orchestrator"]);
    assert.equal(ollamaCalls, 1);
  } finally {
    server.close();
  }
});

test("POST /api/chat: acao perigosa exige confirmacao antes do Ollama", async () => {
  ollamaCalls = 0;
  ollamaBodies = [];
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const { status, body } = await postJson(server, "/api/chat", {
      message: "apague todos os arquivos antigos da pasta agora",
      mode: "auto"
    });

    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.model, "local-orchestrator");
    assert.equal(body.requiresConfirmation, true);
    assert.equal(body.orchestration.needs.confirmation, true);
    assert.match(body.answer, /confirmacao explicita/);
    assert.equal(ollamaCalls, 0);
  } finally {
    server.close();
  }
});

test("POST /api/chat: modo profundo executa agentes e salva debate interno", async () => {
  ollamaCalls = 0;
  ollamaBodies = [];
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const first = await postJson(server, "/api/chat", {
      message: "qual o melhor caminho para melhorar meu sistema e reduzir risco?",
      mode: "auto"
    });

    assert.equal(first.status, 200);
    assert.equal(first.body.ok, true);
    assert.equal(first.body.orchestration.mode, "deep");
    assert.equal(first.body.models.agents.length >= 2, true);
    assert.equal(first.body.debate, undefined, "debate completo nao deve sair por padrao");
    assert.equal(ollamaCalls, 4, "2 agentes + critico + sintese final");

    const debateLines = fs.readFileSync(agentDebatesLog, "utf8").trim().split(/\r?\n/);
    const persistedDebate = JSON.parse(debateLines[debateLines.length - 1]);
    assert.equal(persistedDebate.question, "qual o melhor caminho para melhorar meu sistema e reduzir risco?");
    assert.equal(persistedDebate.agents.length >= 2, true);

    const debate = await postJson(server, "/api/chat", {
      message: "Jarvis, mostre o debate interno",
      mode: "auto"
    });

    assert.equal(debate.status, 200);
    assert.equal(debate.body.ok, true);
    assert.match(debate.body.answer, /Debate interno mais recente/);
    assert.equal(debate.body.debate.agents.length >= 2, true);

    const list = await getJson(server, "/api/agents/debates?limit=1");
    assert.equal(list.status, 200);
    assert.equal(list.body.ok, true);
    assert.equal(list.body.count, 1);
    assert.equal(list.body.debates[0].question, "qual o melhor caminho para melhorar meu sistema e reduzir risco?");
    assert.equal(list.body.debates[0].agents.length >= 2, true);
    assert.equal(list.body.debates[0].agents[0].answer, undefined, "resumo nao deve expor respostas completas dos agentes");
  } finally {
    server.close();
  }
});

test("POST /api/chat: imagem anexada aciona agente de visao com images", async () => {
  ollamaCalls = 0;
  ollamaBodies = [];
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const { status, body } = await postJson(server, "/api/chat", {
      message: "analise essa tela",
      mode: "auto",
      images: [
        { data: "data:image/png;base64,aW1hZ2Vt" },
        { data: "data:image/png;base64,cHJpbnQ=" }
      ]
    });

    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.orchestration.mode, "vision");
    assert.equal(body.images.count, 2);
    assert.equal(body.agentsUsed.some((agent) => agent.id === "visionSpecialist"), true);
    assert.equal(ollamaCalls, 3, "vision agent + critic + final");
    assert.deepEqual(ollamaBodies[0].messages[1].images, ["aW1hZ2Vt", "cHJpbnQ="]);
  } finally {
    server.close();
  }
});

test("GET /api/status: informa disponibilidade dos modelos de agentes", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const { status, body } = await getJson(server, "/api/status");

    assert.equal(status, 200);
    assert.equal(body.features.agentOrchestration, true);
    assert.equal(Array.isArray(body.models.agents), true);
    assert.equal(body.models.agents.some((agent) => agent.id === "programmer" && agent.model.available), true);
    assert.equal(body.models.agents.some((agent) => agent.id === "visionSpecialist" && !agent.model.available), true);
  } finally {
    server.close();
  }
});

test("GET /api/agents/models/missing: lista modelos ausentes", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const { status, body } = await getJson(server, "/api/agents/models/missing");

    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.missing.some((agent) => agent.model === "qwen3-vl:32b"), true);
    assert.equal(body.missing.every((agent) => agent.hint.startsWith("ollama pull ")), true);
  } finally {
    server.close();
  }
});

test("POST /api/chat: comando de modelos faltantes nao chama /api/chat do Ollama", async () => {
  ollamaCalls = 0;
  ollamaBodies = [];
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const { status, body } = await postJson(server, "/api/chat", {
      message: "Jarvis, modelos faltantes dos agentes",
      mode: "auto"
    });

    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.model, "local-orchestrator");
    assert.match(body.answer, /Modelos de agentes que ainda faltam/);
    assert.equal(ollamaCalls, 0);
  } finally {
    server.close();
  }
});

test("POST /api/chat: modo vigia gera plano local sem chamar Ollama", async () => {
  ollamaCalls = 0;
  ollamaBodies = [];
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const { status, body } = await postJson(server, "/api/chat", {
      message: "modo vigia: monitore os logs a cada 2 minutos por 1 hora",
      mode: "auto"
    });

    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.model, "local-watch-orchestrator");
    assert.equal(body.orchestration.mode, "watch");
    assert.equal(body.requiresAuthorization, true);
    assert.equal(body.watchPlan.target.type, "logs");
    assert.equal(body.watchPlan.intervalSeconds, 120);
    assert.match(body.answer, /Plano do modo vigia/);
    assert.equal(ollamaCalls, 0);

    const list = await getJson(server, "/api/agents/watch/plans?limit=1");
    assert.equal(list.status, 200);
    assert.equal(list.body.ok, true);
    assert.equal(list.body.count, 1);
    assert.equal(list.body.plans[0].watchPlan.target.type, "logs");
  } finally {
    server.close();
  }
});

test("POST /api/agents/watch/jobs: inicia e cancela job autorizado", async () => {
  ollamaCalls = 0;
  ollamaBodies = [];
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const planResponse = await postJson(server, "/api/chat", {
      message: "autorizo o modo vigia: monitore os logs a cada 2 minutos por 1 hora",
      mode: "auto"
    });

    assert.equal(planResponse.status, 200);
    assert.equal(planResponse.body.watchPlan.status, "authorized_plan");
    assert.equal(typeof planResponse.body.watchPlan.authorizationId, "string");

    const authorizations = await getJson(server, "/api/agents/watch/authorizations?activeOnly=true");
    assert.equal(authorizations.status, 200);
    assert.equal(authorizations.body.authorizations.some((authorization) => authorization.id === planResponse.body.watchPlan.authorizationId), true);

    const started = await postJson(server, "/api/agents/watch/jobs", {
      question: "logs",
      watchPlan: planResponse.body.watchPlan
    });

    assert.equal(started.status, 200);
    assert.equal(started.body.ok, true);
    assert.equal(started.body.job.status, "running");
    assert.equal(started.body.job.tickCount, 1);

    const jobs = await getJson(server, "/api/agents/watch/jobs");
    assert.equal(jobs.status, 200);
    assert.equal(jobs.body.jobs.some((job) => job.id === started.body.job.id), true);

    const listedByChat = await postJson(server, "/api/chat", {
      message: "Jarvis, mostre vigias ativos",
      mode: "auto"
    });
    assert.equal(listedByChat.status, 200);
    assert.equal(listedByChat.body.model, "local-watch-orchestrator");
    assert.match(listedByChat.body.answer, /Vigias ativos: 1/);

    const authByChat = await postJson(server, "/api/chat", {
      message: "Jarvis, mostre autorizacoes do vigia",
      mode: "auto"
    });
    assert.equal(authByChat.status, 200);
    assert.match(authByChat.body.answer, /Autorizacoes do vigia/);

    const stopped = await postJson(server, "/api/chat", {
      message: "Jarvis, pare o vigia",
      mode: "auto"
    });
    assert.equal(stopped.status, 200);
    assert.match(stopped.body.answer, /Parei 1 vigia ativo/);

    const stopEmpty = await postJson(server, "/api/chat", {
      message: "Jarvis, pare o vigia",
      mode: "auto"
    });
    assert.equal(stopEmpty.status, 200);
    assert.match(stopEmpty.body.answer, /Nao havia vigia ativo/);

    const revoked = await postJson(server, "/api/chat", {
      message: "Jarvis, revogue autorizacao dos logs",
      mode: "auto"
    });
    assert.equal(revoked.status, 200);
    assert.match(revoked.body.answer, /Revoguei 1 autorizacao/);

    const denied = await postJson(server, "/api/agents/watch/jobs", {
      question: "logs",
      watchPlan: planResponse.body.watchPlan
    });
    assert.equal(denied.status, 400);
    assert.match(denied.body.error, /autorizacao persistente ativa/);
    assert.equal(ollamaCalls, 0);
  } finally {
    server.close();
  }
});
