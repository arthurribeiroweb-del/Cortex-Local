const { env } = require("../config");

const AGENT_MODES = Object.freeze({
  QUICK: "quick",
  DEEP: "deep",
  CODE: "code",
  VISION: "vision",
  AUDIT: "audit",
  WATCH: "watch"
});

const TASK_FLAGS = Object.freeze({
  CODE: "code",
  VISION: "vision",
  WEB: "web",
  DANGEROUS_ACTION: "dangerous_action",
  BUSINESS: "business",
  RISK: "risk",
  AUDIT: "audit",
  WATCH: "watch"
});

const MODELS = Object.freeze({
  main: env("AGENT_MODEL_MAIN", "qwen3.6:27b"),
  coder: env("AGENT_MODEL_CODER", "qwen3-coder:30b"),
  vision: env("AGENT_MODEL_VISION", "qwen3-vl:32b"),
  reasoning: env("AGENT_MODEL_REASONING", "deepseek-r1:32b"),
  automation: env("AGENT_MODEL_AUTOMATION", "devstral-small-2:latest"),
  critic: env("AGENT_MODEL_CRITIC", "mistral-small3.2:24b"),
  validator: env("AGENT_MODEL_VALIDATOR", "gemma4:31b"),
  quick: env("AGENT_MODEL_QUICK", "mistral:7b"),
  quickCoder: env("AGENT_MODEL_QUICK_CODER", "qwen2.5-coder:7b")
});

const AGENTS = Object.freeze({
  orchestrator: Object.freeze({
    id: "orchestrator",
    name: "Orquestrador",
    model: MODELS.main,
    modes: [AGENT_MODES.QUICK, AGENT_MODES.DEEP, AGENT_MODES.CODE, AGENT_MODES.VISION, AGENT_MODES.AUDIT, AGENT_MODES.WATCH],
    role: "Classifica a tarefa, escolhe agentes, controla risco, ferramentas e sintese final."
  }),
  generalCounselor: Object.freeze({
    id: "generalCounselor",
    name: "Conselheiro Geral",
    model: MODELS.main,
    modes: [AGENT_MODES.DEEP],
    role: "Analisa contexto geral, estrategia, prioridades e resposta principal."
  }),
  programmer: Object.freeze({
    id: "programmer",
    name: "Programador",
    model: MODELS.coder,
    modes: [AGENT_MODES.CODE, AGENT_MODES.DEEP],
    role: "Revisa arquitetura, bugs, codigo, implementacao e testes."
  }),
  automationSpecialist: Object.freeze({
    id: "automationSpecialist",
    name: "Especialista de Automacao",
    model: MODELS.automation,
    modes: [AGENT_MODES.CODE, AGENT_MODES.DEEP, AGENT_MODES.WATCH],
    role: "Analisa ferramentas, comandos, automacoes, integracoes e execucao local."
  }),
  visionSpecialist: Object.freeze({
    id: "visionSpecialist",
    name: "Especialista de Visao",
    model: MODELS.vision,
    modes: [AGENT_MODES.VISION],
    role: "Interpreta imagens, prints, telas, documentos visuais e layouts."
  }),
  deepReasoner: Object.freeze({
    id: "deepReasoner",
    name: "Raciocinio Profundo",
    model: MODELS.reasoning,
    modes: [AGENT_MODES.DEEP, AGENT_MODES.AUDIT],
    role: "Aprofunda logica, decisoes dificeis, matematica, risco e planejamento."
  }),
  critic: Object.freeze({
    id: "critic",
    name: "Critico",
    model: MODELS.critic,
    modes: [AGENT_MODES.DEEP, AGENT_MODES.CODE, AGENT_MODES.AUDIT],
    role: "Procura erros, riscos, contradicoes, suposicoes fracas e alucinacoes."
  }),
  validator: Object.freeze({
    id: "validator",
    name: "Validador Geral",
    model: MODELS.validator,
    modes: [AGENT_MODES.DEEP],
    role: "Compara ideias e valida a qualidade da resposta final."
  }),
  webResearcher: Object.freeze({
    id: "webResearcher",
    name: "Pesquisador Web",
    model: MODELS.main,
    modes: [AGENT_MODES.DEEP, AGENT_MODES.AUDIT],
    role: "Busca e resume informacao atual quando a tarefa depende de dados recentes."
  }),
  watcher: Object.freeze({
    id: "watcher",
    name: "Vigia",
    model: MODELS.quick,
    modes: [AGENT_MODES.WATCH],
    role: "Monitora somente itens autorizados e exige confirmacao para acoes sensiveis."
  })
});

function getAgent(agentId) {
  return AGENTS[agentId] || null;
}

function listAgents() {
  return Object.values(AGENTS);
}

module.exports = {
  AGENT_MODES,
  TASK_FLAGS,
  MODELS,
  AGENTS,
  getAgent,
  listAgents
};
