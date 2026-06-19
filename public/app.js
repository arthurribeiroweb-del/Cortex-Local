const VoiceState = {
  IDLE: "idle",
  WAITING_WAKE_WORD: "waiting_wake_word",
  WAKE_DETECTED: "wake_detected",
  LISTENING: "listening",
  RECORDING: "recording",
  TRANSCRIBING: "transcribing",
  THINKING: "thinking",
  REVIEWING: "reviewing",
  WEB_CHECKING: "web_checking",
  SPEAKING: "speaking",
  ERROR: "error"
};

const stateContent = {
  [VoiceState.IDLE]: {
    status: "Online",
    title: "Pronto",
    hint: "Digite uma mensagem ou use o microfone para falar agora.",
    eyebrow: "Estado"
  },
  [VoiceState.WAITING_WAKE_WORD]: {
    status: "Ouvindo",
    title: 'Diga "Jarvis" para começar',
    hint: "Wake word configurado. O modo local pode ficar aguardando sua chamada.",
    eyebrow: "Aguardando"
  },
  [VoiceState.WAKE_DETECTED]: {
    status: "Ouvindo",
    title: "Pode falar",
    hint: "Wake word detectado. Estou pronto para ouvir.",
    eyebrow: "Jarvis"
  },
  [VoiceState.LISTENING]: {
    status: "Ouvindo",
    title: "Te ouvindo...",
    hint: "Fale naturalmente. Quando houver silêncio, eu processo automaticamente.",
    eyebrow: "Microfone"
  },
  [VoiceState.RECORDING]: {
    status: "Ouvindo",
    title: "Gravando sua pergunta",
    hint: "Pode parar de falar quando terminar. O silêncio encerra a gravação.",
    eyebrow: "Voz"
  },
  [VoiceState.TRANSCRIBING]: {
    status: "Processando",
    title: "Entendi, processando...",
    hint: "Transcrevendo com Whisper local.",
    eyebrow: "Whisper"
  },
  [VoiceState.THINKING]: {
    status: "Processando",
    title: "Processando sua pergunta...",
    hint: "Consultando o modelo local e preparando a resposta.",
    eyebrow: "Pensando"
  },
  [VoiceState.REVIEWING]: {
    status: "Processando",
    title: "Revisando resposta...",
    hint: "Conferindo a resposta com o modo deliberado ou crítico.",
    eyebrow: "Revisão"
  },
  [VoiceState.WEB_CHECKING]: {
    status: "Processando",
    title: "Verificando fontes...",
    hint: "A resposta pediu checagem externa.",
    eyebrow: "Web check"
  },
  [VoiceState.SPEAKING]: {
    status: "Falando",
    title: "Respondendo...",
    hint: "A resposta está na tela e pode ser falada.",
    eyebrow: "Resposta"
  },
  [VoiceState.ERROR]: {
    status: "Erro",
    title: "Algo precisa de atenção",
    hint: "Confira os ajustes ou tente novamente.",
    eyebrow: "Atenção"
  }
};

const timelineOrder = [
  VoiceState.LISTENING,
  VoiceState.TRANSCRIBING,
  VoiceState.THINKING,
  VoiceState.REVIEWING,
  VoiceState.WEB_CHECKING,
  VoiceState.SPEAKING
];

const memoryCategories = [
  { title: "Perfil", match: (file) => /(^|\/)profile\.md$/i.test(file) },
  { title: "Pesquisas Web", match: (file) => /web-research|pesquisas-web/i.test(file) },
  { title: "Brain / Correções", match: (file) => /brain|corrections|verified-facts/i.test(file) },
  { title: "TraccarPro", match: (file) => /traccar/i.test(file) },
  { title: "IA Local", match: (file) => /ia-local|ollama|modelos|voz-local/i.test(file) },
  { title: "Hardware", match: (file) => /hardware|gpu|cpu|placa/i.test(file) },
  { title: "Negócios", match: (file) => /negocios|clientes|cobranca/i.test(file) },
  { title: "Outros", match: () => true }
];

function ensureWatchSettingsPanel() {
  const tabs = document.querySelector(".drawer-tabs");
  const debugTab = document.querySelector('[data-settings-tab="debug"]');
  const debugPanel = document.querySelector('[data-settings-panel="debug"]');

  if (tabs && debugTab && !document.querySelector('[data-settings-tab="watch"]')) {
    const watchTab = document.createElement("button");
    watchTab.type = "button";
    watchTab.dataset.settingsTab = "watch";
    watchTab.textContent = "Vigia";
    tabs.insertBefore(watchTab, debugTab);
  }

  if (debugPanel && !document.querySelector('[data-settings-panel="watch"]')) {
    const watchPanel = document.createElement("section");
    watchPanel.className = "settings-panel";
    watchPanel.dataset.settingsPanel = "watch";
    watchPanel.innerHTML = [
      '<div class="button-row">',
      '  <button id="refreshWatchPlansButton" class="secondary-button" type="button">Atualizar vigia</button>',
      '</div>',
      '<div id="watchPlansStatus" class="soft-note">Planos recentes do modo vigia aparecerao aqui.</div>',
      '<div id="watchPlansList" class="watch-plan-list empty">Nenhum plano carregado.</div>',
      '<div class="watch-authorization-toolbar">',
      '  <button id="refreshWatchAuthorizationsButton" class="secondary-button" type="button">Atualizar autorizacoes</button>',
      '  <label for="watchAuthorizationFilter">Filtro</label>',
      '  <select id="watchAuthorizationFilter">',
      '    <option value="all" selected>Todas</option>',
      '    <option value="active">Ativas</option>',
      '    <option value="expired">Expiradas</option>',
      '    <option value="revoked">Revogadas</option>',
      '  </select>',
      '</div>',
      '<div id="watchAuthorizationsStatus" class="soft-note">Autorizacoes do modo vigia aparecerao aqui.</div>',
      '<div id="watchAuthorizationsList" class="watch-authorization-list empty">Nenhuma autorizacao carregada.</div>',
      '<div id="watchJobsStatus" class="soft-note">Jobs ativos aparecerao aqui.</div>',
      '<div id="watchJobsList" class="watch-job-list empty">Nenhum job carregado.</div>',
      '<div id="watchEventsStatus" class="soft-note">Eventos recentes aparecerao aqui.</div>',
      '<div class="watch-event-toolbar">',
      '  <label for="watchEventFilter">Filtro</label>',
      '  <select id="watchEventFilter">',
      '    <option value="all" selected>Todos</option>',
      '    <option value="changed">Mudancas</option>',
      '    <option value="tick">Ticks</option>',
      '    <option value="started">Iniciados</option>',
      '    <option value="cancelled">Cancelados</option>',
      '  </select>',
      '</div>',
      '<div id="watchEventsList" class="watch-event-list empty">Nenhum evento carregado.</div>'
    ].join("");
    debugPanel.parentNode.insertBefore(watchPanel, debugPanel);
  }
}

function ensureWatchSettingsStyles() {
  if (document.querySelector("#watchSettingsStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "watchSettingsStyles";
  style.textContent = `
    .watch-plan-list {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }
    .watch-job-list,
    .watch-event-list,
    .watch-authorization-list {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }
    .watch-plan-list.empty,
    .watch-job-list.empty,
    .watch-event-list.empty,
    .watch-authorization-list.empty {
      color: var(--muted);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 12px;
      background: rgba(255, 255, 255, 0.04);
    }
    .watch-plan-item,
    .watch-job-item,
    .watch-event-item,
    .watch-authorization-item {
      display: grid;
      gap: 10px;
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: rgba(255, 255, 255, 0.04);
      padding: 12px;
    }
    .watch-plan-item.authorized {
      border-left: 3px solid var(--accent);
    }
    .watch-plan-item.pending {
      border-left: 3px solid var(--warning);
    }
    .watch-job-item.running {
      border-left: 3px solid var(--accent);
    }
    .watch-job-item.cancelled,
    .watch-job-item.completed {
      border-left: 3px solid var(--muted);
    }
    .watch-event-item.changed {
      border-left: 3px solid var(--warning);
    }
    .watch-event-item.tick {
      border-left: 3px solid var(--accent);
    }
    .watch-authorization-item.active {
      border-left: 3px solid var(--accent);
    }
    .watch-authorization-item.expired {
      border-left: 3px solid var(--warning);
    }
    .watch-authorization-item.revoked {
      border-left: 3px solid var(--muted);
    }
    .watch-event-toolbar {
      display: grid;
      grid-template-columns: auto minmax(160px, 1fr);
      gap: 8px;
      align-items: center;
      margin-top: 10px;
    }
    .watch-event-toolbar label {
      color: var(--muted);
      font-size: 0.86rem;
    }
    .watch-authorization-toolbar {
      display: grid;
      grid-template-columns: auto auto minmax(160px, 1fr);
      gap: 8px;
      align-items: center;
      margin-top: 14px;
    }
    .watch-authorization-toolbar label {
      color: var(--muted);
      font-size: 0.86rem;
    }
    .watch-plan-header,
    .watch-job-header,
    .watch-event-header,
    .watch-authorization-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
    }
    .watch-plan-header strong,
    .watch-job-header strong,
    .watch-event-header strong,
    .watch-authorization-header strong {
      overflow-wrap: anywhere;
    }
    .watch-plan-header span,
    .watch-job-header span,
    .watch-event-header span,
    .watch-authorization-header span {
      color: var(--muted);
      font-size: 0.84rem;
      text-transform: uppercase;
    }
    .watch-plan-meta,
    .watch-plan-actions,
    .watch-job-meta,
    .watch-authorization-meta,
    .watch-authorization-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .watch-plan-meta span,
    .watch-plan-actions span,
    .watch-job-meta span,
    .watch-authorization-meta span,
    .watch-authorization-actions span {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 4px 8px;
      color: var(--muted);
      font-size: 0.82rem;
      overflow-wrap: anywhere;
    }
    .watch-plan-note,
    .watch-job-note,
    .watch-event-note,
    .watch-authorization-note {
      margin: 0;
      color: var(--muted);
      line-height: 1.45;
    }
    .watch-event-badge {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 4px 8px;
      color: var(--muted);
      font-size: 0.82rem;
      text-transform: uppercase;
    }
    .watch-event-badge.changed {
      color: var(--warning);
      border-color: var(--warning);
    }
    .watch-event-summary {
      margin: 0;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
  `;
  document.head.appendChild(style);
}

ensureWatchSettingsPanel();
ensureWatchSettingsStyles();

function ensureWatchMainAlert() {
  if (document.querySelector("#watchMainAlert")) {
    return;
  }

  const topbar = document.querySelector(".topbar");
  if (!topbar || !topbar.parentNode) {
    return;
  }

  const alert = document.createElement("section");
  alert.id = "watchMainAlert";
  alert.className = "watch-main-alert";
  alert.hidden = true;
  alert.setAttribute("aria-live", "polite");
  alert.innerHTML = [
    '<div class="watch-main-alert-copy">',
    '  <span id="watchMainAlertCount" class="watch-main-alert-count">0</span>',
    '  <div>',
    '    <strong>Vigia detectou mudanca</strong>',
    '    <p id="watchMainAlertText">Eventos pendentes aparecerao aqui.</p>',
    '  </div>',
    '</div>',
    '<div class="watch-main-alert-actions">',
    '  <button id="watchMainAlertSoundButton" class="watch-main-alert-toggle" type="button" aria-pressed="false" title="Som do alerta">Som: off</button>',
    '  <button id="watchMainAlertDesktopButton" class="watch-main-alert-toggle" type="button" aria-pressed="false" title="Notificacao do sistema">Sistema: off</button>',
    '  <button id="watchMainAlertOpenButton" class="secondary-button" type="button">Abrir Vigia</button>',
    '  <button id="watchMainAlertClearButton" class="text-button" type="button">Marcar visto</button>',
    '</div>'
  ].join("");
  topbar.parentNode.insertBefore(alert, topbar.nextSibling);
}

function ensureWatchMainAlertStyles() {
  if (document.querySelector("#watchMainAlertStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "watchMainAlertStyles";
  style.textContent = `
    .watch-main-alert {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      border: 1px solid rgba(245, 184, 91, 0.46);
      border-radius: var(--radius);
      background: rgba(245, 184, 91, 0.09);
      box-shadow: var(--shadow);
      padding: 12px 14px;
    }
    .watch-main-alert[hidden] {
      display: none;
    }
    .watch-main-alert-copy {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      min-width: 0;
    }
    .watch-main-alert-count {
      display: inline-grid;
      place-items: center;
      min-width: 34px;
      height: 34px;
      border: 1px solid rgba(245, 184, 91, 0.58);
      border-radius: 999px;
      color: var(--warning);
      font-weight: 800;
    }
    .watch-main-alert-copy strong,
    .watch-main-alert-copy p {
      overflow-wrap: anywhere;
    }
    .watch-main-alert-copy p {
      margin-top: 3px;
      color: var(--soft);
      line-height: 1.4;
    }
    .watch-main-alert-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      align-items: center;
    }
    .watch-main-alert-toggle {
      border: 1px solid rgba(245, 184, 91, 0.5);
      border-radius: 999px;
      background: transparent;
      color: var(--soft);
      font-size: 12px;
      font-weight: 700;
      padding: 5px 10px;
      cursor: pointer;
    }
    .watch-main-alert-toggle[aria-pressed="true"] {
      background: rgba(245, 184, 91, 0.18);
      border-color: rgba(245, 184, 91, 0.85);
      color: var(--warning);
    }
    .watch-main-alert.is-flashing {
      animation: watchAlertFlash 900ms ease-out 2;
    }
    @keyframes watchAlertFlash {
      0% {
        border-color: rgba(245, 184, 91, 0.46);
        box-shadow: var(--shadow);
      }
      35% {
        border-color: rgba(245, 184, 91, 1);
        box-shadow: 0 0 0 4px rgba(245, 184, 91, 0.35), var(--shadow);
      }
      100% {
        border-color: rgba(245, 184, 91, 0.46);
        box-shadow: var(--shadow);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .watch-main-alert.is-flashing {
        animation: none;
      }
    }
    @media (max-width: 720px) {
      .watch-main-alert {
        grid-template-columns: 1fr;
      }
      .watch-main-alert-actions {
        justify-content: flex-start;
      }
      .watch-authorization-toolbar {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

ensureWatchMainAlert();
ensureWatchMainAlertStyles();

const elements = {
  app: document.querySelector(".app-shell"),
  statusBadge: document.querySelector("#statusBadge"),
  headerSubtitle: document.querySelector("#headerSubtitle"),
  voiceEyebrow: document.querySelector("#voiceEyebrow"),
  voiceTitle: document.querySelector("#voiceTitle"),
  voiceHint: document.querySelector("#voiceHint"),
  progressSteps: document.querySelectorAll(".progress-timeline span"),
  lastTranscript: document.querySelector("#lastTranscript"),
  currentAnswer: document.querySelector("#currentAnswer"),
  answerMeta: document.querySelector("#answerMeta"),
  detailsButton: document.querySelector("#detailsButton"),
  historyList: document.querySelector("#historyList"),
  form: document.querySelector("#chatForm"),
  messageInput: document.querySelector("#messageInput"),
  imageInput: document.querySelector("#imageInput"),
  attachImageButton: document.querySelector("#attachImageButton"),
  imageAttachmentPreview: document.querySelector("#imageAttachmentPreview"),
  talkButton: document.querySelector("#talkButton"),
  sendButton: document.querySelector("#sendButton"),
  clearButton: document.querySelector("#clearButton"),
  drawerBackdrop: document.querySelector("#drawerBackdrop"),
  settingsDrawer: document.querySelector("#settingsDrawer"),
  memoryDrawer: document.querySelector("#memoryDrawer"),
  detailsDrawer: document.querySelector("#detailsDrawer"),
  openSettingsButton: document.querySelector("#openSettingsButton"),
  openMemoryButton: document.querySelector("#openMemoryButton"),
  openDebugButton: document.querySelector("#openDebugButton"),
  openMemoryFromSettingsButton: document.querySelector("#openMemoryFromSettingsButton"),
  settingsTabs: document.querySelectorAll("[data-settings-tab]"),
  settingsPanels: document.querySelectorAll("[data-settings-panel]"),
  backendStatus: document.querySelector("#backendStatus"),
  ollamaStatus: document.querySelector("#ollamaStatus"),
  modelStatus: document.querySelector("#modelStatus"),
  criticModelStatus: document.querySelector("#criticModelStatus"),
  agentModelStatus: document.querySelector("#agentModelStatus"),
  checkMissingAgentModelsButton: document.querySelector("#checkMissingAgentModelsButton"),
  missingAgentModelsPanel: document.querySelector("#missingAgentModelsPanel"),
  microphoneStatus: document.querySelector("#microphoneStatus"),
  whisperStatus: document.querySelector("#whisperStatus"),
  piperStatus: document.querySelector("#piperStatus"),
  wakeWordStatus: document.querySelector("#wakeWordStatus"),
  webProviderStatus: document.querySelector("#webProviderStatus"),
  webFeatureStatus: document.querySelector("#webFeatureStatus"),
  memoryFeatureStatus: document.querySelector("#memoryFeatureStatus"),
  memoryCountStatus: document.querySelector("#memoryCountStatus"),
  micSelect: document.querySelector("#micSelect"),
  startVoiceButton: document.querySelector("#startVoiceButton"),
  stopVoiceButton: document.querySelector("#stopVoiceButton"),
  testMicButton: document.querySelector("#testMicButton"),
  speakAnswerButton: document.querySelector("#speakAnswerButton"),
  loadVoiceConfigButton: document.querySelector("#loadVoiceConfigButton"),
  saveVoiceConfigButton: document.querySelector("#saveVoiceConfigButton"),
  voiceConfigInput: document.querySelector("#voiceConfigInput"),
  voiceDiagnostics: document.querySelector("#voiceDiagnostics"),
  modeSelect: document.querySelector("#modeSelect"),
  debugToggle: document.querySelector("#debugToggle"),
  metricsToggle: document.querySelector("#metricsToggle"),
  logsToggle: document.querySelector("#logsToggle"),
  verifyButton: document.querySelector("#verifyButton"),
  saveCorrectionButton: document.querySelector("#saveCorrectionButton"),
  refreshDebatesButton: document.querySelector("#refreshDebatesButton"),
  debateHistoryStatus: document.querySelector("#debateHistoryStatus"),
  debateHistoryList: document.querySelector("#debateHistoryList"),
  refreshWatchPlansButton: document.querySelector("#refreshWatchPlansButton"),
  watchPlansStatus: document.querySelector("#watchPlansStatus"),
  watchPlansList: document.querySelector("#watchPlansList"),
  refreshWatchAuthorizationsButton: document.querySelector("#refreshWatchAuthorizationsButton"),
  watchAuthorizationFilter: document.querySelector("#watchAuthorizationFilter"),
  watchAuthorizationsStatus: document.querySelector("#watchAuthorizationsStatus"),
  watchAuthorizationsList: document.querySelector("#watchAuthorizationsList"),
  watchJobsStatus: document.querySelector("#watchJobsStatus"),
  watchJobsList: document.querySelector("#watchJobsList"),
  watchEventsStatus: document.querySelector("#watchEventsStatus"),
  watchEventFilter: document.querySelector("#watchEventFilter"),
  watchEventsList: document.querySelector("#watchEventsList"),
  watchMainAlert: document.querySelector("#watchMainAlert"),
  watchMainAlertCount: document.querySelector("#watchMainAlertCount"),
  watchMainAlertText: document.querySelector("#watchMainAlertText"),
  watchMainAlertOpenButton: document.querySelector("#watchMainAlertOpenButton"),
  watchMainAlertClearButton: document.querySelector("#watchMainAlertClearButton"),
  watchMainAlertSoundButton: document.querySelector("#watchMainAlertSoundButton"),
  watchMainAlertDesktopButton: document.querySelector("#watchMainAlertDesktopButton"),
  metricsPanel: document.querySelector("#metricsPanel"),
  metricModel: document.querySelector("#metricModel"),
  metricTime: document.querySelector("#metricTime"),
  metricSpeed: document.querySelector("#metricSpeed"),
  metricTokens: document.querySelector("#metricTokens"),
  verificationPanel: document.querySelector("#verificationPanel"),
  verificationStatus: document.querySelector("#verificationStatus"),
  verificationSources: document.querySelector("#verificationSources"),
  debugPanel: document.querySelector("#debugPanel"),
  voiceLogs: document.querySelector("#voiceLogs"),
  memorySearchInput: document.querySelector("#memorySearchInput"),
  refreshMemoryButton: document.querySelector("#refreshMemoryButton"),
  openVaultButton: document.querySelector("#openVaultButton"),
  memoryFiles: document.querySelector("#memoryFiles"),
  rememberInput: document.querySelector("#rememberInput"),
  rememberButton: document.querySelector("#rememberButton"),
  memoryMessage: document.querySelector("#memoryMessage"),
  memoryEditorModal: document.querySelector("#memoryEditorModal"),
  closeMemoryEditorButton: document.querySelector("#closeMemoryEditorButton"),
  cancelMemoryEditorButton: document.querySelector("#cancelMemoryEditorButton"),
  memoryPathInput: document.querySelector("#memoryPathInput"),
  memoryContentInput: document.querySelector("#memoryContentInput"),
  saveMemoryButton: document.querySelector("#saveMemoryButton")
};

let sessionHistory = [];
let transientAnswer = "";
let transientAnswerIsError = false;
let pendingQuestion = "";
let memoryFiles = [];
let selectedMemoryPath = "";
let currentVoiceState = VoiceState.IDLE;
let currentStatus = null;
let lastQuestion = "";
let lastAnswer = "";
let lastResponseDetails = null;
let lastVerification = null;
let voiceLogTimer = null;
let processingTimers = [];
let loadingTicker = null;
let loadingStartedAt = 0;
let isSendingMessage = false;
let currentChatController = null;
let lastWatchEvents = [];
let lastWatchAuthorizations = [];
let pendingWatchChanges = [];
let seenWatchChangeIds = new Set(readSeenWatchChangeIds());
let watchAlertTimer = null;
let watchNotifyPrefs = readWatchNotifyPrefs();
let lastNotifiedWatchChangeId = null;
let watchAlertInitialized = false;
let watchAudioContext = null;
let isRecordingAudio = false;
let recordingContext = null;
let recordingStream = null;
let recordingSource = null;
let recordingProcessor = null;
let recordingSilentGain = null;
let recordingChunks = [];
let recordingSampleRate = 48000;
let recordingStartedAt = 0;
let selectedImages = [];
let lastVoiceAt = 0;
let hasDetectedSpeech = false;
let recordingStopRequested = false;

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function setStatusBadge(kind, text) {
  elements.statusBadge.className = `status-badge ${kind}`;
  setText(elements.statusBadge, text);
}

function setVoiceState(nextState, customHint) {
  currentVoiceState = nextState;
  const content = stateContent[nextState] || stateContent[VoiceState.IDLE];

  elements.app.dataset.voiceState = nextState;
  setText(elements.voiceEyebrow, content.eyebrow);
  setText(elements.voiceTitle, content.title);
  setText(elements.voiceHint, customHint || content.hint);

  if (nextState === VoiceState.ERROR) {
    setStatusBadge("status-error", content.status);
  } else if ([VoiceState.THINKING, VoiceState.TRANSCRIBING, VoiceState.REVIEWING, VoiceState.WEB_CHECKING].includes(nextState)) {
    setStatusBadge("status-checking", content.status);
  } else {
    setStatusBadge("status-ok", content.status);
  }

  const currentIndex = timelineOrder.indexOf(nextState);
  elements.progressSteps.forEach((step) => {
    const stepState = step.dataset.step;
    const stepIndex = timelineOrder.indexOf(stepState);
    step.classList.toggle("active", stepState === nextState);
    step.classList.toggle("done", currentIndex > -1 && stepIndex > -1 && stepIndex < currentIndex);
  });
}

function clearProcessingTimers() {
  processingTimers.forEach((timer) => window.clearTimeout(timer));
  processingTimers = [];
}

function clearLoadingTicker() {
  if (loadingTicker) {
    window.clearInterval(loadingTicker);
    loadingTicker = null;
  }
}

function updateLoadingHint() {
  if (!isSendingMessage || !loadingStartedAt) {
    return;
  }

  const elapsed = Math.max(1, Math.round((Date.now() - loadingStartedAt) / 1000));
  const base = currentVoiceState === VoiceState.REVIEWING
    ? "Revisando com o modo local. Você pode parar se quiser."
    : "Processando no modelo local. Você pode parar se quiser.";
  setText(elements.voiceHint, `${base} ${elapsed}s.`);
}

function resolveChatMode(message, selectedMode) {
  return selectedMode || "auto";

  if (selectedMode !== "auto") {
    return selectedMode || "simple";
  }

  const text = String(message || "").toLowerCase();
  const deliberateSignals = [
    "plano",
    "analise",
    "analisa",
    "critique",
    "compare",
    "decida",
    "estratégia",
    "estrategia",
    "risco",
    "arquitetura",
    "projeto"
  ];
  const currentSignals = ["hoje", "atual", "preço", "preco", "notícia", "noticia", "versão", "versao", "internet"];

  if (currentSignals.some((signal) => text.includes(signal))) {
    return "critical";
  }

  if (text.length > 220 || deliberateSignals.some((signal) => text.includes(signal))) {
    return "deliberate";
  }

  return "simple";
}

function friendlyMicrophoneError(error) {
  const raw = String(error && (error.name || error.message) || "").toLowerCase();

  if (raw.includes("denied") || raw.includes("notallowed") || raw.includes("permission")) {
    return "Permita o microfone no navegador e tente novamente.";
  }

  if (raw.includes("notfound") || raw.includes("device")) {
    return "Não encontrei um microfone disponível. Confira o dispositivo de entrada.";
  }

  if (raw.includes("notreadable")) {
    return "O microfone está em uso por outro aplicativo ou indisponível agora.";
  }

  return error && error.message ? error.message : "Não consegui acessar o microfone.";
}

function getClarifyingResponse(message) {
  const text = String(message || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const vagueTerms = ["aquele", "negocio", "coisa", "la", "arruma", "deu ruim", "caiu eu acho"];
  const hasVagueTerm = vagueTerms.some((term) => text.includes(term));
  const hasActionableTarget = [
    "traccar",
    "ollama",
    "jarvis",
    "whisper",
    "piper",
    "porta ",
    "ip ",
    "site ",
    "cliente "
  ].some((term) => text.includes(term));

  if (text.length <= 95 && hasVagueTerm && !hasActionableTarget) {
    return [
      "Entendi que algo parece ter caído, mas ainda falta o alvo.",
      "",
      "Qual sistema ou servidor é? Se tiver, me mande também o erro que apareceu ou o IP/domínio."
    ].join("\n");
  }

  return "";
}

function getLocalStatusResponse(message) {
  const text = String(message || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const asksVoiceSetup = text.includes("voz local")
    || text.includes("wake word")
    || text.includes("jarvis.tflite")
    || (text.includes("jarvis") && (text.includes("configurar") || text.includes("proximo passo")));

  if (!asksVoiceSetup || !currentStatus || !currentStatus.voice) {
    return "";
  }

  const voice = currentStatus.voice;
  if (voice.wakeWordConfigured) {
    return 'A voz local está pronta. O próximo passo é abrir Ajustes > Voz e clicar em "Ativar wake word".';
  }

  if (voice.available && voice.missingWakeWordPath) {
    return [
      "Whisper e Piper já estão prontos. O que falta é o modelo de wake word.",
      "",
      `Coloque o arquivo jarvis.tflite em: ${voice.missingWakeWordPath}`,
      "",
      'Depois abra Ajustes > Voz e clique em "Ativar wake word".'
    ].join("\n");
  }

  return "A voz local ainda não está completa. Abra Ajustes > Voz e confira quais itens aparecem como ausentes no diagnóstico.";
}

function scheduleProcessingStates(mode) {
  clearProcessingTimers();
  setVoiceState(VoiceState.THINKING);

  if (mode !== "simple") {
    processingTimers.push(window.setTimeout(() => {
      if ([VoiceState.THINKING, VoiceState.REVIEWING].includes(currentVoiceState)) {
        setVoiceState(VoiceState.REVIEWING);
      }
    }, 900));
  }
}

function resetToReadyState() {
  if (currentStatus && currentStatus.voice && currentStatus.voice.wakeWordConfigured) {
    setVoiceState(VoiceState.WAITING_WAKE_WORD);
    return;
  }

  const missingPath = currentStatus && currentStatus.voice ? currentStatus.voice.missingWakeWordPath : "";
  setVoiceState(
    VoiceState.IDLE,
    missingPath
      ? 'Falar agora está disponível. Para ativar "Jarvis", abra Ajustes > Voz e veja o modelo wake word pendente.'
      : 'Wake word "Jarvis" ainda não configurado. Use Falar agora ou configure em Ajustes.'
  );
}

function formatMetricSeconds(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  return `${Number(value).toFixed(2)}s`;
}

function renderMetrics(model, metrics) {
  setText(elements.metricModel, model || "-");
  setText(elements.metricTime, metrics ? formatMetricSeconds(metrics.total_duration_seconds) : "-");
  setText(elements.metricSpeed, metrics && Number.isFinite(Number(metrics.eval_tokens_per_second)) ? metrics.eval_tokens_per_second : "-");
  setText(elements.metricTokens, metrics && Number.isFinite(Number(metrics.eval_count)) ? metrics.eval_count : "-");
}

function renderAnswerMeta(data) {
  elements.answerMeta.innerHTML = "";

  if (!data) {
    return;
  }

  const chips = [];
  if (data.memory && data.memory.used) {
    chips.push("Usou memória");
  }
  if (data.webCheck && (data.webCheck.used || data.webCheck.triggered)) {
    chips.push("Usou internet");
  }
  if (data.images && data.images.count > 0) {
    chips.push(`${data.images.count} imagem${data.images.count === 1 ? "" : "s"}`);
  }
  if (data.orchestration && data.orchestration.mode) {
    chips.push(`Modo ${data.orchestration.mode}`);
  }
  if (Array.isArray(data.agentsUsed) && data.agentsUsed.length > 0) {
    chips.push(`${data.agentsUsed.length} agente${data.agentsUsed.length === 1 ? "" : "s"}`);
  }
  if (data.models || data.mode === "deliberate" || data.mode === "critical") {
    chips.push("Multi-modelo");
  }
  if (data.metrics && Number.isFinite(Number(data.metrics.total_duration_seconds))) {
    chips.push(`${Number(data.metrics.total_duration_seconds).toFixed(2)}s`);
  }

  for (const label of chips) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = label;
    elements.answerMeta.appendChild(chip);
  }
}

function showAnswer(text, isError = false) {
  elements.currentAnswer.classList.toggle("empty", !text);
  elements.currentAnswer.classList.toggle("error-text", isError);
  setText(elements.currentAnswer, text);
  transientAnswer = text;
  transientAnswerIsError = isError;
  renderHistory();
}

function commitChatTurn(question, answer) {
  transientAnswer = "";
  transientAnswerIsError = false;
  pendingQuestion = "";
  sessionHistory.push({ question, answer });
  renderHistory();
  scrollToLatest("smooth");
}

function setLoading(isLoading) {
  isSendingMessage = isLoading;
  elements.sendButton.disabled = false;
  elements.talkButton.disabled = isLoading || isRecordingAudio;
  elements.sendButton.classList.toggle("is-busy", isLoading);
  setText(elements.sendButton, isLoading ? "Parar" : "Enviar");

  if (isLoading) {
    loadingStartedAt = Date.now();
    clearLoadingTicker();
    loadingTicker = window.setInterval(updateLoadingHint, 1000);
  } else {
    loadingStartedAt = 0;
    clearLoadingTicker();
  }
}

function autoGrowComposer() {
  const input = elements.messageInput;
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 168)}px`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nao consegui ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function clearImageAttachment(index = null) {
  if (Number.isInteger(index)) {
    selectedImages.splice(index, 1);
  } else {
    selectedImages = [];
  }

  if (elements.imageInput) {
    elements.imageInput.value = "";
  }

  if (elements.imageAttachmentPreview) {
    renderImageAttachmentPreview();
  }
}

function renderImageAttachmentPreview() {
  if (!elements.imageAttachmentPreview) {
    return;
  }

  elements.imageAttachmentPreview.innerHTML = "";

  if (selectedImages.length === 0) {
    elements.imageAttachmentPreview.hidden = true;
    return;
  }

  selectedImages.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "image-attachment-item";

    const label = document.createElement("span");
    label.textContent = `${item.name} - ${(item.size / 1024 / 1024).toFixed(2)} MB`;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "text-button";
    removeButton.textContent = "Remover";
    removeButton.addEventListener("click", () => clearImageAttachment(index));

    row.append(label, removeButton);
    elements.imageAttachmentPreview.appendChild(row);
  });
  elements.imageAttachmentPreview.hidden = false;
}

async function handleImageAttachment(files) {
  const list = Array.from(files || []).slice(0, 3);
  if (list.length === 0) {
    return;
  }

  const nextImages = [];

  for (const file of list) {
    if (!file.type || !file.type.startsWith("image/")) {
      showAnswer("Anexe apenas arquivos de imagem.", true);
      return;
    }

    const maxSize = 6 * 1024 * 1024;
    if (file.size > maxSize) {
      showAnswer("Cada imagem precisa ter no maximo 6 MB.", true);
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    nextImages.push({
      name: file.name || "imagem",
      type: file.type,
      size: file.size,
      data: dataUrl
    });
  }

  selectedImages = nextImages;
  renderImageAttachmentPreview();
}

function addMessage(role, text) {
  const row = document.createElement("article");
  row.className = `message-row ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  const author = document.createElement("span");
  author.className = "message-author";
  author.textContent = role === "user" ? "Você" : "JARVIS";

  const content = document.createElement("div");
  content.textContent = text;

  bubble.append(author, content);
  row.appendChild(bubble);
  return row;
}

// Rola a ultima mensagem para a area visivel, qualquer que seja o container
// que de fato tem scroll (pagina ou painel). Usado ao enviar e durante o streaming.
function scrollToLatest(behavior = "smooth") {
  const rows = elements.historyList.children;
  const last = rows[rows.length - 1];
  if (last && typeof last.scrollIntoView === "function") {
    last.scrollIntoView({ block: "end", behavior });
  }
}

function renderHistory() {
  elements.historyList.innerHTML = "";

  if (sessionHistory.length === 0 && !transientAnswer) {
    elements.historyList.classList.add("empty");
    setText(elements.historyList, "Nenhuma conversa nesta sessão.");
    return;
  }

  elements.historyList.classList.remove("empty");

  for (const item of sessionHistory) {
    elements.historyList.appendChild(addMessage("user", item.question));
    elements.historyList.appendChild(addMessage("assistant", item.answer));
  }

  if (pendingQuestion) {
    elements.historyList.appendChild(addMessage("user", pendingQuestion));
  }

  if (transientAnswer) {
    const row = addMessage("assistant", transientAnswer);
    row.classList.toggle("error-message", transientAnswerIsError);
    elements.historyList.appendChild(row);
  }
}

function openDrawer(drawer) {
  closeDrawers(false);
  elements.drawerBackdrop.hidden = false;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeDrawers(hideBackdrop = true) {
  [elements.settingsDrawer, elements.memoryDrawer, elements.detailsDrawer].forEach((drawer) => {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  });

  if (hideBackdrop) {
    elements.drawerBackdrop.hidden = true;
  }
}

function openMemoryEditor() {
  elements.memoryEditorModal.classList.add("open");
  elements.memoryEditorModal.setAttribute("aria-hidden", "false");
}

function closeMemoryEditor() {
  elements.memoryEditorModal.classList.remove("open");
  elements.memoryEditorModal.setAttribute("aria-hidden", "true");
}

function switchSettingsTab(tabName) {
  elements.settingsTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.settingsTab === tabName);
  });
  elements.settingsPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.settingsPanel === tabName);
  });

  if (tabName === "debates") {
    loadDebateHistory();
  }

  if (tabName === "watch") {
    loadWatchDashboard();
  }
}

function formatDebateDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderDebateHistory(debates) {
  if (!elements.debateHistoryList) {
    return;
  }

  elements.debateHistoryList.innerHTML = "";

  if (!Array.isArray(debates) || debates.length === 0) {
    elements.debateHistoryList.classList.add("empty");
    setText(elements.debateHistoryList, "Nenhum debate salvo ainda.");
    return;
  }

  elements.debateHistoryList.classList.remove("empty");

  for (const debate of debates) {
    const item = document.createElement("article");
    item.className = "debate-history-item";

    const header = document.createElement("div");
    header.className = "debate-history-header";

    const title = document.createElement("strong");
    title.textContent = debate.question || "Pergunta sem titulo";

    const meta = document.createElement("span");
    const agentCount = Array.isArray(debate.agents) ? debate.agents.length : 0;
    meta.textContent = `${formatDebateDate(debate.timestamp)} - ${debate.mode || "-"} - ${agentCount} agente${agentCount === 1 ? "" : "s"}`;

    header.append(title, meta);

    const reason = document.createElement("p");
    reason.className = "debate-history-reason";
    reason.textContent = debate.reason || "Sem motivo registrado.";

    const preview = document.createElement("p");
    preview.className = "debate-history-preview";
    preview.textContent = debate.finalAnswerPreview || "Sem preview da resposta final.";

    const agents = document.createElement("div");
    agents.className = "debate-history-agents";

    for (const agent of debate.agents || []) {
      const chip = document.createElement("span");
      chip.textContent = `${agent.name || agent.id}: ${agent.modelUsed || "-"}`;
      agents.appendChild(chip);
    }

    item.append(header, reason, preview, agents);
    elements.debateHistoryList.appendChild(item);
  }
}

async function loadDebateHistory() {
  if (!elements.debateHistoryList) {
    return;
  }

  setText(elements.debateHistoryStatus, "Carregando debates...");
  elements.debateHistoryList.classList.add("empty");
  setText(elements.debateHistoryList, "Carregando...");

  try {
    const response = await fetch("/api/agents/debates?limit=10");
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao carregar debates.");
    }

    setText(elements.debateHistoryStatus, `${data.count || 0} debate${data.count === 1 ? "" : "s"} encontrado${data.count === 1 ? "" : "s"}.`);
    renderDebateHistory(data.debates || []);
  } catch (error) {
    setText(elements.debateHistoryStatus, error.message || "Erro ao carregar debates.");
    elements.debateHistoryList.classList.add("empty");
    setText(elements.debateHistoryList, "Nao foi possivel carregar os debates.");
  }
}

function formatWatchDuration(minutes) {
  const value = Number(minutes) || 0;
  if (value >= 60 && value % 60 === 0) {
    const hours = value / 60;
    return `${hours} hora${hours === 1 ? "" : "s"}`;
  }

  return `${value} minuto${value === 1 ? "" : "s"}`;
}

function formatWatchInterval(seconds) {
  const value = Number(seconds) || 0;
  if (value >= 60 && value % 60 === 0) {
    const minutes = value / 60;
    return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
  }

  return `${value} segundo${value === 1 ? "" : "s"}`;
}

function formatWatchAction(action) {
  const labels = {
    read_logs: "ler logs",
    read_files: "ler arquivos",
    check_status: "checar status",
    notify_only: "avisar apenas",
    network_check: "checar rede/site",
    email_check: "checar emails"
  };

  return labels[action] || action;
}

function renderWatchPlans(plans) {
  if (!elements.watchPlansList) {
    return;
  }

  elements.watchPlansList.innerHTML = "";

  if (!Array.isArray(plans) || plans.length === 0) {
    elements.watchPlansList.classList.add("empty");
    setText(elements.watchPlansList, "Nenhum plano do vigia salvo ainda.");
    return;
  }

  elements.watchPlansList.classList.remove("empty");

  for (const entry of plans) {
    const plan = entry.watchPlan || entry;
    const target = plan.target || {};
    const item = document.createElement("article");
    item.className = `watch-plan-item ${plan.status === "authorized_plan" ? "authorized" : "pending"}`;

    const header = document.createElement("div");
    header.className = "watch-plan-header";

    const title = document.createElement("strong");
    title.textContent = target.value || entry.question || "Alvo nao definido";

    const status = document.createElement("span");
    status.textContent = plan.status === "authorized_plan" ? "autorizado" : "pendente";

    header.append(title, status);

    const meta = document.createElement("div");
    meta.className = "watch-plan-meta";

    const createdAt = entry.timestamp || plan.createdAt;
    const fields = [
      `Criado: ${formatDebateDate(createdAt)}`,
      `Tipo: ${target.type || "-"}`,
      `Intervalo: ${formatWatchInterval(plan.intervalSeconds)}`,
      `Duracao: ${formatWatchDuration(plan.durationMinutes)}`
    ];

    for (const field of fields) {
      const chip = document.createElement("span");
      chip.textContent = field;
      meta.appendChild(chip);
    }

    const actions = document.createElement("div");
    actions.className = "watch-plan-actions";

    for (const action of plan.actions || []) {
      const chip = document.createElement("span");
      chip.textContent = formatWatchAction(action);
      actions.appendChild(chip);
    }

    const note = document.createElement("p");
    note.className = "watch-plan-note";
    note.textContent = plan.status === "authorized_plan"
      ? "Plano autorizado localmente. Pode iniciar o worker seguro do vigia."
      : `Falta autorizacao${plan.missingScope && plan.missingScope.length ? ` ou escopo: ${plan.missingScope.join(", ")}` : ""}.`;

    item.append(header, meta, actions, note);

    if (plan.status === "authorized_plan") {
      const row = document.createElement("div");
      row.className = "button-row";
      const startButton = document.createElement("button");
      startButton.type = "button";
      startButton.className = "secondary-button";
      startButton.textContent = "Iniciar vigia";
      startButton.addEventListener("click", () => startWatchJobFromPlan(entry));
      row.appendChild(startButton);
      item.appendChild(row);
    }

    elements.watchPlansList.appendChild(item);
  }
}

function formatWatchAuthorizationStatus(status) {
  const labels = {
    active: "ativa",
    expired: "expirada",
    revoked: "revogada"
  };

  return labels[status] || status || "-";
}

function renderWatchAuthorizations(authorizations) {
  if (!elements.watchAuthorizationsList) {
    return;
  }

  const selectedStatus = elements.watchAuthorizationFilter ? elements.watchAuthorizationFilter.value : "all";
  const visible = selectedStatus === "all"
    ? authorizations
    : (authorizations || []).filter((authorization) => authorization.status === selectedStatus);

  elements.watchAuthorizationsList.innerHTML = "";

  if (!Array.isArray(visible) || visible.length === 0) {
    elements.watchAuthorizationsList.classList.add("empty");
    setText(elements.watchAuthorizationsList, selectedStatus === "all" ? "Nenhuma autorizacao salva ainda." : "Nenhuma autorizacao desse tipo.");
    return;
  }

  elements.watchAuthorizationsList.classList.remove("empty");

  for (const authorization of visible) {
    const target = authorization.target || {};
    const item = document.createElement("article");
    item.className = `watch-authorization-item ${authorization.status || ""}`;

    const header = document.createElement("div");
    header.className = "watch-authorization-header";

    const title = document.createElement("strong");
    title.textContent = target.value || "Alvo nao definido";

    const status = document.createElement("span");
    status.textContent = formatWatchAuthorizationStatus(authorization.status);

    header.append(title, status);

    const meta = document.createElement("div");
    meta.className = "watch-authorization-meta";

    for (const field of [
      `Tipo: ${target.type || "-"}`,
      `Criada: ${formatDebateDate(authorization.createdAt)}`,
      `Expira: ${formatDebateDate(authorization.expiresAt)}`,
      authorization.revokedAt ? `Revogada: ${formatDebateDate(authorization.revokedAt)}` : ""
    ].filter(Boolean)) {
      const chip = document.createElement("span");
      chip.textContent = field;
      meta.appendChild(chip);
    }

    const actions = document.createElement("div");
    actions.className = "watch-authorization-actions";

    for (const action of authorization.actions || []) {
      const chip = document.createElement("span");
      chip.textContent = formatWatchAction(action);
      actions.appendChild(chip);
    }

    const note = document.createElement("p");
    note.className = "watch-authorization-note";
    note.textContent = authorization.sourceQuestion || "Autorizacao criada pelo fluxo do modo vigia.";

    item.append(header, meta, actions, note);

    if (authorization.status === "active") {
      const row = document.createElement("div");
      row.className = "button-row";
      const revokeButton = document.createElement("button");
      revokeButton.type = "button";
      revokeButton.className = "secondary-button";
      revokeButton.textContent = "Revogar";
      revokeButton.addEventListener("click", () => revokeWatchAuthorization(authorization.id));
      row.appendChild(revokeButton);
      item.appendChild(row);
    }

    elements.watchAuthorizationsList.appendChild(item);
  }
}

async function loadWatchAuthorizations() {
  if (!elements.watchAuthorizationsList) {
    return;
  }

  setText(elements.watchAuthorizationsStatus, "Carregando autorizacoes...");
  elements.watchAuthorizationsList.classList.add("empty");
  setText(elements.watchAuthorizationsList, "Carregando...");

  try {
    const response = await fetch("/api/agents/watch/authorizations");
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao carregar autorizacoes.");
    }

    lastWatchAuthorizations = data.authorizations || [];
    setText(elements.watchAuthorizationsStatus, `${data.count || 0} autorizacao${data.count === 1 ? "" : "es"} encontrada${data.count === 1 ? "" : "s"}.`);
    renderWatchAuthorizations(lastWatchAuthorizations);
  } catch (error) {
    setText(elements.watchAuthorizationsStatus, error.message || "Erro ao carregar autorizacoes.");
    elements.watchAuthorizationsList.classList.add("empty");
    setText(elements.watchAuthorizationsList, "Nao foi possivel carregar as autorizacoes.");
  }
}

async function revokeWatchAuthorization(authorizationId) {
  try {
    const response = await fetch(`/api/agents/watch/authorizations/${encodeURIComponent(authorizationId)}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao revogar autorizacao.");
    }

    setText(elements.watchAuthorizationsStatus, "Autorizacao revogada.");
    await loadWatchAuthorizations();
  } catch (error) {
    setText(elements.watchAuthorizationsStatus, error.message || "Erro ao revogar autorizacao.");
  }
}

function renderWatchJobs(jobs) {
  if (!elements.watchJobsList) {
    return;
  }

  elements.watchJobsList.innerHTML = "";

  if (!Array.isArray(jobs) || jobs.length === 0) {
    elements.watchJobsList.classList.add("empty");
    setText(elements.watchJobsList, "Nenhum job do vigia ativo ou recente.");
    return;
  }

  elements.watchJobsList.classList.remove("empty");

  for (const job of jobs) {
    const plan = job.watchPlan || {};
    const target = plan.target || {};
    const item = document.createElement("article");
    item.className = `watch-job-item ${job.status || ""}`;

    const header = document.createElement("div");
    header.className = "watch-job-header";

    const title = document.createElement("strong");
    title.textContent = target.value || job.question || job.id;

    const status = document.createElement("span");
    status.textContent = job.status || "-";

    header.append(title, status);

    const meta = document.createElement("div");
    meta.className = "watch-job-meta";

    for (const field of [
      `Ticks: ${job.tickCount || 0}`,
      `Inicio: ${formatDebateDate(job.startedAt)}`,
      `Ultimo: ${formatDebateDate(job.lastTickAt)}`,
      `Proximo: ${formatDebateDate(job.nextTickAt)}`
    ]) {
      const chip = document.createElement("span");
      chip.textContent = field;
      meta.appendChild(chip);
    }

    const note = document.createElement("p");
    note.className = "watch-job-note";
    note.textContent = job.lastEvent ? job.lastEvent.message : "Sem evento registrado.";

    item.append(header, meta, note);

    if (job.status === "running") {
      const row = document.createElement("div");
      row.className = "button-row";
      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "secondary-button";
      cancelButton.textContent = "Cancelar vigia";
      cancelButton.addEventListener("click", () => cancelWatchJob(job.id));
      row.appendChild(cancelButton);
      item.appendChild(row);
    }

    elements.watchJobsList.appendChild(item);
  }
}

function renderWatchEvents(events) {
  if (!elements.watchEventsList) {
    return;
  }

  elements.watchEventsList.innerHTML = "";
  const selectedType = elements.watchEventFilter ? elements.watchEventFilter.value : "all";
  const visibleEvents = selectedType === "all"
    ? events
    : (events || []).filter((event) => event.type === selectedType);

  if (!Array.isArray(visibleEvents) || visibleEvents.length === 0) {
    elements.watchEventsList.classList.add("empty");
    setText(elements.watchEventsList, selectedType === "all" ? "Nenhum evento do vigia registrado." : "Nenhum evento desse tipo.");
    return;
  }

  elements.watchEventsList.classList.remove("empty");

  for (const event of visibleEvents) {
    const item = document.createElement("article");
    item.className = `watch-event-item ${event.type || ""}`;

    const header = document.createElement("div");
    header.className = "watch-event-header";

    const title = document.createElement("strong");
    title.textContent = watchEventTitle(event);

    const when = document.createElement("span");
    when.textContent = formatDebateDate(event.timestamp);

    const badge = document.createElement("span");
    badge.className = `watch-event-badge ${event.type || ""}`;
    badge.textContent = event.type || "evento";

    const summary = document.createElement("p");
    summary.className = "watch-event-summary";
    summary.textContent = summarizeWatchEvent(event);

    const note = document.createElement("p");
    note.className = "watch-event-note";
    note.textContent = event.message || "-";

    header.append(title, when);

    const row = document.createElement("div");
    row.className = "button-row";
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "secondary-button";
    copyButton.textContent = "Copiar resumo";
    copyButton.addEventListener("click", () => copyWatchEventSummary(event));
    row.appendChild(copyButton);

    item.append(header, badge, summary, note, row);
    elements.watchEventsList.appendChild(item);
  }
}

function watchEventTitle(event) {
  if (event.type === "changed") {
    return "Mudanca detectada";
  }

  if (event.type === "tick") {
    return "Checagem concluida";
  }

  if (event.type === "started") {
    return "Vigia iniciado";
  }

  if (event.type === "cancelled") {
    return "Vigia cancelado";
  }

  if (event.type === "completed") {
    return "Vigia finalizado";
  }

  return event.type || "Evento do vigia";
}

function summarizeWatchEvent(event) {
  const probe = event && event.details ? event.details.probe : null;
  const snapshot = probe && probe.snapshot ? probe.snapshot : null;
  const changes = probe && probe.changes ? probe.changes : null;

  if (event.type === "changed" && changes && changes.kind === "directory") {
    const parts = [
      `Mudanca em ${snapshot && snapshot.path ? snapshot.path : "pasta monitorada"}`,
      `${changes.addedCount || 0} adicionado${changes.addedCount === 1 ? "" : "s"}`,
      `${changes.removedCount || 0} removido${changes.removedCount === 1 ? "" : "s"}`,
      `${changes.modifiedCount || 0} modificado${changes.modifiedCount === 1 ? "" : "s"}`
    ];

    if (changes.added && changes.added.length) {
      parts.push(`novos: ${changes.added.join(", ")}`);
    }

    if (changes.removed && changes.removed.length) {
      parts.push(`removidos: ${changes.removed.join(", ")}`);
    }

    if (changes.modified && changes.modified.length) {
      parts.push(`alterados: ${changes.modified.join(", ")}`);
    }

    return `${parts.join("; ")}.`;
  }

  if (event.type === "changed" && changes && changes.kind === "file") {
    const direction = {
      grew: "cresceu",
      shrunk: "diminuiu",
      touched: "foi tocado"
    }[changes.direction] || "mudou";

    return [
      `Mudanca em ${snapshot && snapshot.path ? snapshot.path : "arquivo monitorado"}`,
      `${direction}`,
      `delta ${changes.sizeDelta || 0} bytes`,
      `tamanho atual ${changes.sizeAfter || 0} bytes`
    ].join("; ") + ".";
  }

  if (event.type === "changed" && snapshot) {
    const parts = [
      `Mudanca em ${snapshot.path || "alvo monitorado"}`,
      `tipo ${snapshot.type || "-"}`,
      `tamanho ${snapshot.size || 0} bytes`
    ];

    if (snapshot.modifiedAt) {
      parts.push(`modificado em ${formatDebateDate(snapshot.modifiedAt)}`);
    }

    if (Number.isFinite(snapshot.itemCount)) {
      parts.push(`${snapshot.itemCount} item${snapshot.itemCount === 1 ? "" : "s"}`);
    }

    return `${parts.join("; ")}.`;
  }

  if (snapshot) {
    return `${snapshot.path || "Alvo"} conferido: ${snapshot.exists ? snapshot.type : "ausente"}, ${snapshot.size || 0} bytes.`;
  }

  return event.message || "Evento registrado pelo vigia.";
}

async function copyWatchEventSummary(event) {
  const text = summarizeWatchEvent(event);

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }

    setText(elements.watchEventsStatus, "Resumo copiado.");
  } catch (error) {
    setText(elements.watchEventsStatus, "Nao foi possivel copiar o resumo.");
  }
}

function readSeenWatchChangeIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem("jarvisSeenWatchChangeIds") || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (error) {
    return [];
  }
}

function saveSeenWatchChangeIds() {
  try {
    localStorage.setItem("jarvisSeenWatchChangeIds", JSON.stringify(Array.from(seenWatchChangeIds).slice(-300)));
  } catch (error) {
    // localStorage pode estar indisponivel; o alerta ainda funciona em memoria.
  }
}

function readWatchNotifyPrefs() {
  const fallback = { sound: false, desktop: false };
  try {
    const parsed = JSON.parse(localStorage.getItem("jarvisWatchNotifyPrefs") || "null");
    if (parsed && typeof parsed === "object") {
      return { sound: Boolean(parsed.sound), desktop: Boolean(parsed.desktop) };
    }
  } catch (error) {
    // localStorage indisponivel; usa o padrao.
  }
  return fallback;
}

function saveWatchNotifyPrefs() {
  try {
    localStorage.setItem("jarvisWatchNotifyPrefs", JSON.stringify(watchNotifyPrefs));
  } catch (error) {
    // localStorage indisponivel; preferencia segue apenas em memoria.
  }
}

function updateWatchNotifyButtons() {
  if (elements.watchMainAlertSoundButton) {
    elements.watchMainAlertSoundButton.setAttribute("aria-pressed", watchNotifyPrefs.sound ? "true" : "false");
    setText(elements.watchMainAlertSoundButton, `Som: ${watchNotifyPrefs.sound ? "on" : "off"}`);
  }
  if (elements.watchMainAlertDesktopButton) {
    elements.watchMainAlertDesktopButton.setAttribute("aria-pressed", watchNotifyPrefs.desktop ? "true" : "false");
    setText(elements.watchMainAlertDesktopButton, `Sistema: ${watchNotifyPrefs.desktop ? "on" : "off"}`);
  }
}

function playWatchAlertSound() {
  // Beep curto gerado pela Web Audio API. Evita depender de um arquivo de audio.
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }
    if (!watchAudioContext) {
      watchAudioContext = new AudioCtx();
    }
    if (watchAudioContext.state === "suspended") {
      watchAudioContext.resume();
    }

    const now = watchAudioContext.currentTime;
    const gain = watchAudioContext.createGain();
    gain.connect(watchAudioContext.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    // Duas notas curtas (ding-dong) para chamar atencao sem assustar.
    const tones = [880, 660];
    tones.forEach((frequency, index) => {
      const oscillator = watchAudioContext.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.18);
      oscillator.connect(gain);
      oscillator.start(now + index * 0.18);
      oscillator.stop(now + index * 0.18 + 0.18);
    });
  } catch (error) {
    // Audio bloqueado pelo navegador (sem interacao do usuario ainda); ignora.
  }
}

function flashWatchMainAlert() {
  const node = elements.watchMainAlert;
  if (!node) {
    return;
  }
  node.classList.remove("is-flashing");
  // Forca reflow para reiniciar a animacao quando ja estava aplicada.
  void node.offsetWidth;
  node.classList.add("is-flashing");
  window.setTimeout(() => {
    node.classList.remove("is-flashing");
  }, 2000);
}

function maybeSendDesktopNotification(latest, count) {
  if (!watchNotifyPrefs.desktop || typeof Notification === "undefined") {
    return;
  }
  if (Notification.permission !== "granted") {
    return;
  }
  try {
    const notification = new Notification("Jarvis: Vigia detectou mudanca", {
      body: `${count} pendente${count === 1 ? "" : "s"}. ${summarizeWatchEvent(latest)}`,
      tag: "jarvis-watch-change"
    });
    notification.onclick = () => {
      window.focus();
      openWatchSettingsFromAlert();
      notification.close();
    };
  } catch (error) {
    // Alguns navegadores exigem service worker para Notification; ignora a falha.
  }
}

function triggerWatchAlertNotification(latest, count) {
  flashWatchMainAlert();
  if (watchNotifyPrefs.sound) {
    playWatchAlertSound();
  }
  maybeSendDesktopNotification(latest, count);
}

function toggleWatchAlertSound() {
  watchNotifyPrefs.sound = !watchNotifyPrefs.sound;
  saveWatchNotifyPrefs();
  updateWatchNotifyButtons();
  // Toca um beep de confirmacao ao ligar; tambem destrava o audio no navegador.
  if (watchNotifyPrefs.sound) {
    playWatchAlertSound();
  }
}

async function toggleWatchAlertDesktop() {
  if (typeof Notification === "undefined") {
    setText(elements.watchMainAlertText, "Notificacao do sistema nao suportada neste navegador.");
    return;
  }

  if (!watchNotifyPrefs.desktop) {
    let permission = Notification.permission;
    if (permission === "default") {
      try {
        permission = await Notification.requestPermission();
      } catch (error) {
        permission = Notification.permission;
      }
    }
    if (permission !== "granted") {
      watchNotifyPrefs.desktop = false;
      saveWatchNotifyPrefs();
      updateWatchNotifyButtons();
      setText(elements.watchMainAlertText, "Permissao de notificacao negada pelo navegador.");
      return;
    }
    watchNotifyPrefs.desktop = true;
  } else {
    watchNotifyPrefs.desktop = false;
  }

  saveWatchNotifyPrefs();
  updateWatchNotifyButtons();
}

function updateWatchMainAlert(events = lastWatchEvents) {
  if (!elements.watchMainAlert) {
    return;
  }

  pendingWatchChanges = (events || [])
    .filter((event) => event.type === "changed" && event.id && !seenWatchChangeIds.has(event.id))
    .slice(0, 50);

  if (pendingWatchChanges.length === 0) {
    elements.watchMainAlert.hidden = true;
    setText(elements.watchMainAlertCount, "0");
    setText(elements.watchMainAlertText, "Sem mudancas pendentes.");
    lastNotifiedWatchChangeId = null;
    watchAlertInitialized = true;
    return;
  }

  const latest = pendingWatchChanges[0];
  elements.watchMainAlert.hidden = false;
  setText(elements.watchMainAlertCount, String(pendingWatchChanges.length));
  setText(
    elements.watchMainAlertText,
    `${pendingWatchChanges.length} mudanca${pendingWatchChanges.length === 1 ? "" : "s"} pendente${pendingWatchChanges.length === 1 ? "" : "s"}. ${summarizeWatchEvent(latest)}`
  );

  // Dispara som/realce apenas quando surge uma mudanca realmente nova.
  // No primeiro carregamento apenas memoriza o estado, sem alarmar.
  const isNewChange = latest.id !== lastNotifiedWatchChangeId;
  if (isNewChange) {
    if (watchAlertInitialized) {
      triggerWatchAlertNotification(latest, pendingWatchChanges.length);
    }
    lastNotifiedWatchChangeId = latest.id;
  }
  watchAlertInitialized = true;
}

async function loadWatchMainAlerts() {
  if (!elements.watchMainAlert) {
    return;
  }

  try {
    const response = await fetch("/api/agents/watch/events?limit=50");
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao carregar alertas do vigia.");
    }

    lastWatchEvents = data.events || [];
    updateWatchMainAlert(lastWatchEvents);
  } catch (error) {
    // Alerta principal nao deve interromper o resto da UI.
  }
}

function clearWatchMainAlerts() {
  for (const event of pendingWatchChanges) {
    if (event.id) {
      seenWatchChangeIds.add(event.id);
    }
  }

  saveSeenWatchChangeIds();
  updateWatchMainAlert(lastWatchEvents);
}

function openWatchSettingsFromAlert() {
  openDrawer(elements.settingsDrawer);
  switchSettingsTab("watch");
}

async function loadWatchJobs() {
  if (!elements.watchJobsList) {
    return;
  }

  setText(elements.watchJobsStatus, "Carregando jobs do vigia...");
  elements.watchJobsList.classList.add("empty");
  setText(elements.watchJobsList, "Carregando...");

  try {
    const response = await fetch("/api/agents/watch/jobs");
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao carregar jobs do vigia.");
    }

    setText(elements.watchJobsStatus, `${data.count || 0} job${data.count === 1 ? "" : "s"} encontrado${data.count === 1 ? "" : "s"}.`);
    renderWatchJobs(data.jobs || []);
  } catch (error) {
    setText(elements.watchJobsStatus, error.message || "Erro ao carregar jobs do vigia.");
    elements.watchJobsList.classList.add("empty");
    setText(elements.watchJobsList, "Nao foi possivel carregar os jobs.");
  }
}

async function loadWatchEvents() {
  if (!elements.watchEventsList) {
    return;
  }

  setText(elements.watchEventsStatus, "Carregando eventos do vigia...");
  elements.watchEventsList.classList.add("empty");
  setText(elements.watchEventsList, "Carregando...");

  try {
    const response = await fetch("/api/agents/watch/events?limit=10");
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao carregar eventos do vigia.");
    }

    lastWatchEvents = data.events || [];
    setText(elements.watchEventsStatus, `${data.count || 0} evento${data.count === 1 ? "" : "s"} encontrado${data.count === 1 ? "" : "s"}.`);
    renderWatchEvents(lastWatchEvents);
    updateWatchMainAlert(lastWatchEvents);
  } catch (error) {
    setText(elements.watchEventsStatus, error.message || "Erro ao carregar eventos do vigia.");
    elements.watchEventsList.classList.add("empty");
    setText(elements.watchEventsList, "Nao foi possivel carregar os eventos.");
  }
}

async function loadWatchDashboard() {
  await Promise.all([
    loadWatchPlans(),
    loadWatchAuthorizations(),
    loadWatchJobs(),
    loadWatchEvents()
  ]);
}

async function startWatchJobFromPlan(entry) {
  const plan = entry.watchPlan || entry;

  try {
    const response = await fetch("/api/agents/watch/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: entry.question || "",
        watchPlan: plan
      })
    });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao iniciar vigia.");
    }

    setText(elements.watchJobsStatus, "Vigia iniciado.");
    await Promise.all([loadWatchJobs(), loadWatchEvents()]);
  } catch (error) {
    setText(elements.watchJobsStatus, error.message || "Erro ao iniciar vigia.");
  }
}

async function cancelWatchJob(jobId) {
  try {
    const response = await fetch(`/api/agents/watch/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao cancelar vigia.");
    }

    setText(elements.watchJobsStatus, "Vigia cancelado.");
    await Promise.all([loadWatchJobs(), loadWatchEvents()]);
  } catch (error) {
    setText(elements.watchJobsStatus, error.message || "Erro ao cancelar vigia.");
  }
}

async function loadWatchPlans() {
  if (!elements.watchPlansList) {
    return;
  }

  setText(elements.watchPlansStatus, "Carregando planos do vigia...");
  elements.watchPlansList.classList.add("empty");
  setText(elements.watchPlansList, "Carregando...");

  try {
    const response = await fetch("/api/agents/watch/plans?limit=10");
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao carregar planos do vigia.");
    }

    setText(elements.watchPlansStatus, `${data.count || 0} plano${data.count === 1 ? "" : "s"} encontrado${data.count === 1 ? "" : "s"}.`);
    renderWatchPlans(data.plans || []);
  } catch (error) {
    setText(elements.watchPlansStatus, error.message || "Erro ao carregar planos do vigia.");
    elements.watchPlansList.classList.add("empty");
    setText(elements.watchPlansList, "Nao foi possivel carregar os planos.");
  }
}

function showDetailsDrawer() {
  elements.metricsPanel.hidden = !elements.metricsToggle.checked;
  elements.debugPanel.hidden = !(elements.debugToggle.checked && elements.debugPanel.textContent.trim());
  elements.voiceLogs.hidden = !elements.logsToggle.checked;
  openDrawer(elements.detailsDrawer);
}

function updateDebugAccess() {
  const visible = elements.debugToggle.checked || elements.metricsToggle.checked || elements.logsToggle.checked;
  elements.openDebugButton.hidden = !visible;
  elements.metricsPanel.hidden = !elements.metricsToggle.checked;
  elements.debugPanel.hidden = !(elements.debugToggle.checked && elements.debugPanel.textContent.trim());
  elements.voiceLogs.hidden = !elements.logsToggle.checked;
}

function renderSources(sources) {
  elements.verificationSources.innerHTML = "";

  for (const source of sources || []) {
    const item = document.createElement("div");
    item.className = "verification-source";

    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source.title || source.url;

    const snippet = document.createElement("span");
    snippet.textContent = source.snippet || "";

    item.append(link, snippet);
    elements.verificationSources.appendChild(item);
  }
}

function renderChatWebCheck(data) {
  const webCheck = data && data.webCheck ? data.webCheck : null;
  const debug = data && data.debug ? data.debug : null;

  elements.verificationPanel.hidden = true;
  elements.verificationSources.innerHTML = "";
  setText(elements.verificationStatus, "Nenhuma verificação feita.");

  if (debug) {
    setText(elements.debugPanel, JSON.stringify(debug, null, 2));
  } else {
    setText(elements.debugPanel, "");
  }

  if (!webCheck || !(webCheck.triggered || webCheck.used)) {
    updateDebugAccess();
    return;
  }

  elements.verificationPanel.hidden = false;
  const sourceCount = Array.isArray(webCheck.sources) ? webCheck.sources.length : 0;
  const statusParts = [
    sourceCount > 0 ? "Verificado na internet" : "Web check acionado",
    webCheck.reasonLabel || webCheck.reason || "",
    webCheck.provider ? `Provedor: ${webCheck.provider}` : ""
  ].filter(Boolean);

  if (webCheck.error) {
    statusParts.push(webCheck.error);
  }

  setText(elements.verificationStatus, statusParts.join(" · "));
  renderSources(webCheck.sources || []);
  updateDebugAccess();
}

async function verifyLastAnswer() {
  if (!lastQuestion) {
    showAnswer("Ainda não há uma pergunta anterior para verificar.", true);
    return;
  }

  openDrawer(elements.detailsDrawer);
  elements.verificationPanel.hidden = false;
  elements.verificationSources.innerHTML = "";
  setText(elements.verificationStatus, "Pesquisando fontes...");
  elements.verifyButton.disabled = true;
  setVoiceState(VoiceState.WEB_CHECKING);

  try {
    const response = await fetch("/api/web/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: lastQuestion,
        previousAnswer: lastAnswer,
        saveCorrection: false
      })
    });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao verificar resposta.");
    }

    lastVerification = data;
    lastAnswer = data.answer;
    showAnswer(data.answer);
    setText(elements.verificationStatus, data.correctionSaved ? `Correção salva em ${data.memoryPath || "brain"}.` : "Verificação concluída.");
    renderSources(data.sources || []);
    renderAnswerMeta({
      ...lastResponseDetails,
      webCheck: { used: true, sources: data.sources || [] }
    });
    elements.detailsButton.hidden = false;
    resetToReadyState();
  } catch (error) {
    setText(elements.verificationStatus, error.message || "Erro ao verificar na internet.");
    setVoiceState(VoiceState.ERROR, error.message || "Erro ao verificar na internet.");
  } finally {
    elements.verifyButton.disabled = false;
  }
}

async function saveLastCorrection() {
  if (!lastVerification || !lastVerification.answer) {
    elements.verificationPanel.hidden = false;
    setText(elements.verificationStatus, "Faça uma verificação antes de salvar correção.");
    openDrawer(elements.detailsDrawer);
    return;
  }

  elements.saveCorrectionButton.disabled = true;

  try {
    const response = await fetch("/api/brain/save-correction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: lastQuestion,
        previousAnswer: lastAnswer,
        correction: lastVerification.answer,
        futureRule: "Consultar esta correção antes de responder novamente sobre o assunto.",
        sources: lastVerification.sources || [],
        temporalSensitivity: lastVerification.temporalSensitivity || "media"
      })
    });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao salvar correção.");
    }

    setText(elements.verificationStatus, `Correção salva em ${data.memoryPath}.`);
    await loadMemoryFiles();
  } catch (error) {
    setText(elements.verificationStatus, error.message || "Erro ao salvar correção.");
  } finally {
    elements.saveCorrectionButton.disabled = false;
  }
}

function speakText(text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    setVoiceState(VoiceState.ERROR, "Não há resposta para falar.");
    return;
  }

  if (!("speechSynthesis" in window)) {
    setVoiceState(VoiceState.ERROR, "Este navegador não tem síntese de voz disponível.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = "pt-BR";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.onstart = () => setVoiceState(VoiceState.SPEAKING);
  utterance.onend = resetToReadyState;
  utterance.onerror = () => resetToReadyState();
  window.speechSynthesis.speak(utterance);
}

function mergeAudioChunks(chunks) {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Float32Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

function downsampleAudio(buffer, sourceRate, targetRate) {
  if (sourceRate === targetRate) {
    return buffer;
  }

  const ratio = sourceRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);

  for (let index = 0; index < newLength; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(Math.floor((index + 1) * ratio), buffer.length);
    let sum = 0;
    let count = 0;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      sum += buffer[sampleIndex];
      count += 1;
    }

    result[index] = count > 0 ? sum / count : 0;
  }

  return result;
}

function encodeWav(samples, sampleRate) {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  const writeString = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

function audioPeak(samples) {
  let peak = 0;

  for (const sample of samples) {
    const value = Math.abs(sample);
    if (value > peak) {
      peak = value;
    }
  }

  return peak;
}

async function loadMicrophones() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    setText(elements.microphoneStatus, "Indisponível");
    return;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const microphones = devices.filter((device) => device.kind === "audioinput");
    const selectedValue = elements.micSelect.value;
    elements.micSelect.innerHTML = '<option value="">Microfone padrão do navegador</option>';

    microphones.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `Microfone ${index + 1}`;
      elements.micSelect.appendChild(option);
    });

    if (selectedValue) {
      elements.micSelect.value = selectedValue;
    }

    setText(elements.microphoneStatus, microphones.length > 0 ? `${microphones.length} encontrado(s)` : "Aguardando permissão");
  } catch (error) {
    setText(elements.microphoneStatus, "Sem permissão");
  }
}

function cleanupRecordingNodes() {
  if (recordingProcessor) {
    recordingProcessor.disconnect();
  }
  if (recordingSource) {
    recordingSource.disconnect();
  }
  if (recordingSilentGain) {
    recordingSilentGain.disconnect();
  }
  if (recordingStream) {
    recordingStream.getTracks().forEach((track) => track.stop());
  }
}

async function startLocalAudioRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setVoiceState(VoiceState.ERROR, "Este navegador não liberou microfone. Use Chrome/Edge atualizado.");
    return;
  }

  const audioConfig = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  };

  if (elements.micSelect.value) {
    audioConfig.deviceId = { exact: elements.micSelect.value };
  }

  recordingStream = await navigator.mediaDevices.getUserMedia({ audio: audioConfig });
  await loadMicrophones();

  recordingContext = new AudioContext();
  recordingSampleRate = recordingContext.sampleRate;
  recordingChunks = [];
  recordingStartedAt = Date.now();
  lastVoiceAt = recordingStartedAt;
  hasDetectedSpeech = false;
  recordingStopRequested = false;

  recordingSource = recordingContext.createMediaStreamSource(recordingStream);
  recordingProcessor = recordingContext.createScriptProcessor(4096, 1, 1);
  recordingSilentGain = recordingContext.createGain();
  recordingSilentGain.gain.value = 0;

  recordingProcessor.onaudioprocess = (event) => {
    const samples = new Float32Array(event.inputBuffer.getChannelData(0));
    recordingChunks.push(samples);

    const peak = audioPeak(samples);
    const now = Date.now();
    if (peak > 0.012) {
      hasDetectedSpeech = true;
      lastVoiceAt = now;
    }

    const tooLong = now - recordingStartedAt > 20000;
    const silenceAfterSpeech = hasDetectedSpeech && now - lastVoiceAt > 1200;

    if (!recordingStopRequested && (tooLong || silenceAfterSpeech)) {
      recordingStopRequested = true;
      window.setTimeout(() => stopLocalAudioRecordingAndSend(), 0);
    }
  };

  recordingSource.connect(recordingProcessor);
  recordingProcessor.connect(recordingSilentGain);
  recordingSilentGain.connect(recordingContext.destination);
  isRecordingAudio = true;
  elements.talkButton.disabled = false;
  setText(elements.talkButton, "Parar");
  setVoiceState(VoiceState.RECORDING);
}

async function stopLocalAudioRecordingAndSend() {
  if (!isRecordingAudio) {
    return;
  }

  isRecordingAudio = false;
  elements.talkButton.disabled = true;
  setText(elements.talkButton, "Processando");
  setVoiceState(VoiceState.TRANSCRIBING);

  cleanupRecordingNodes();

  if (recordingContext) {
    await recordingContext.close();
  }

  const merged = mergeAudioChunks(recordingChunks);
  const peak = audioPeak(merged);

  if (merged.length === 0 || peak < 0.002) {
    showAnswer("Não chegou áudio real do microfone. Permita o microfone correto no navegador e tente de novo.", true);
    setVoiceState(VoiceState.ERROR, "O navegador gravou silêncio. Confira a permissão do microfone.");
    resetRecordingState();
    return;
  }

  const downsampled = downsampleAudio(merged, recordingSampleRate, 16000);
  const wavBlob = encodeWav(downsampled, 16000);

  try {
    const response = await fetch("/api/voice/chat-audio", {
      method: "POST",
      headers: { "Content-Type": "audio/wav" },
      body: wavBlob
    });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao processar áudio.");
    }

    elements.messageInput.value = data.transcript;
    autoGrowComposer();
    setText(elements.lastTranscript, data.transcript);
    elements.messageInput.value = "";
    autoGrowComposer();
    setText(elements.currentAnswer, data.answer);
    renderMetrics(data.model, data.metrics);
    renderChatWebCheck(data);
    renderAnswerMeta(data);
    lastQuestion = data.transcript;
    lastAnswer = data.answer;
    lastResponseDetails = data;
    elements.detailsButton.hidden = false;
    commitChatTurn(data.transcript, data.answer);

    if (data.audioUrl) {
      setVoiceState(VoiceState.SPEAKING);
      const audio = new Audio(data.audioUrl);
      audio.onended = resetToReadyState;
      audio.onerror = resetToReadyState;
      audio.play();
    } else {
      resetToReadyState();
    }
  } catch (error) {
    showAnswer(error.message || "Erro ao processar áudio.", true);
    setVoiceState(VoiceState.ERROR, error.message || "Erro ao processar áudio.");
  } finally {
    resetRecordingState();
  }
}

function resetRecordingState() {
  elements.talkButton.disabled = false;
  setText(elements.talkButton, "Falar");
  recordingChunks = [];
  recordingContext = null;
  recordingStream = null;
  recordingSource = null;
  recordingProcessor = null;
  recordingSilentGain = null;
  recordingStartedAt = 0;
  lastVoiceAt = 0;
  hasDetectedSpeech = false;
  recordingStopRequested = false;
}

async function toggleLocalAudioRecording() {
  if (isRecordingAudio) {
    await stopLocalAudioRecordingAndSend();
    return;
  }

  try {
    setVoiceState(VoiceState.LISTENING);
    await startLocalAudioRecording();
  } catch (error) {
    setVoiceState(VoiceState.ERROR, friendlyMicrophoneError(error));
    resetRecordingState();
  }
}

// Le a resposta em streaming (SSE) do endpoint /api/chat/stream.
// Chama onUpdate(textoAcumulado) a cada token e resolve com o payload do "done".
async function requestChatStream(message, signal, onUpdate) {
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ message })
  });

  if (!response.ok || !response.body) {
    throw new Error("Falha ao iniciar o streaming da resposta.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let result = null;
  let errorMessage = null;

  const processEvent = (rawEvent) => {
    let event = "message";
    let dataStr = "";
    for (const line of rawEvent.split("\n")) {
      if (line.startsWith("event: ")) {
        event = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        dataStr += line.slice(6);
      }
    }
    if (!dataStr) {
      return;
    }

    let payload;
    try {
      payload = JSON.parse(dataStr);
    } catch (error) {
      return;
    }

    if (event === "token") {
      full += payload.content || "";
      onUpdate(full);
    } else if (event === "done") {
      result = payload;
    } else if (event === "error") {
      errorMessage = payload.error || "Erro no streaming.";
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    let index;
    while ((index = buffer.indexOf("\n\n")) !== -1) {
      processEvent(buffer.slice(0, index));
      buffer = buffer.slice(index + 2);
    }
  }
  if (buffer.trim()) {
    processEvent(buffer);
  }

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return result || { ok: true, model: null, answer: full };
}

async function sendMessage(shouldSpeak = false) {
  if (isSendingMessage && currentChatController) {
    currentChatController.abort();
    return;
  }

  const message = elements.messageInput.value.trim();
  const mode = resolveChatMode(message, elements.modeSelect.value || "auto");
  const imagesToSend = selectedImages.slice();
  const questionText = message || "Analise a imagem anexada.";
  const displayQuestion = imagesToSend.length > 0 ? `${questionText}\n[Imagem anexada]` : questionText;

  if (!message && imagesToSend.length === 0) {
    showAnswer("Digite uma mensagem ou anexe uma imagem antes de enviar.", true);
    elements.messageInput.focus();
    return;
  }

  elements.messageInput.value = "";
  clearImageAttachment();
  autoGrowComposer();
  pendingQuestion = displayQuestion;
  transientAnswer = "";
  transientAnswerIsError = false;
  renderHistory();
  scrollToLatest("smooth");

  const localStatusAnswer = imagesToSend.length === 0 ? getLocalStatusResponse(message) : "";
  if (localStatusAnswer) {
    setText(elements.lastTranscript, questionText);
    renderAnswerMeta(null);
    lastQuestion = questionText;
    lastAnswer = localStatusAnswer;
    commitChatTurn(displayQuestion, localStatusAnswer);
    elements.detailsButton.hidden = true;
    resetToReadyState();
    return;
  }

  const clarification = imagesToSend.length === 0 ? getClarifyingResponse(message) : "";
  if (clarification) {
    setText(elements.lastTranscript, questionText);
    renderAnswerMeta(null);
    lastQuestion = questionText;
    lastAnswer = clarification;
    commitChatTurn(displayQuestion, clarification);
    elements.detailsButton.hidden = true;
    resetToReadyState();
    return;
  }

  setLoading(true);
  setText(elements.lastTranscript, questionText);
  showAnswer("Processando...");
  renderMetrics(null, null);
  renderAnswerMeta(null);
  elements.detailsButton.hidden = true;
  elements.verificationPanel.hidden = true;
  elements.verificationSources.innerHTML = "";
  setText(elements.debugPanel, "");
  scheduleProcessingStates(mode);
  currentChatController = new AbortController();

  try {
    let data;

    if (mode === "simple" && imagesToSend.length === 0) {
      // Caminho rapido: streaming token a token via SSE.
      let firstToken = true;
      data = await requestChatStream(questionText, currentChatController.signal, (full) => {
        if (firstToken) {
          clearProcessingTimers();
          firstToken = false;
        }
        setText(elements.currentAnswer, full); // sr-only, para leitor de tela
        transientAnswer = full;                // bolha visivel atualizada ao vivo
        renderHistory();
        scrollToLatest("auto");
      });
    } else {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: currentChatController.signal,
        body: JSON.stringify({
          message: questionText,
          mode,
          images: imagesToSend.map((image) => ({ data: image.data, name: image.name, type: image.type })),
          debug: elements.debugToggle.checked
        })
      });
      data = await response.json();
    }

    if (!data.ok) {
      throw new Error(data.error || "Erro ao consultar o assistente.");
    }

    clearProcessingTimers();
    setText(elements.currentAnswer, data.answer);
    renderMetrics(data.model, data.metrics);
    renderChatWebCheck(data);
    renderAnswerMeta(data);
    lastQuestion = questionText;
    lastAnswer = data.answer;
    lastResponseDetails = data;
    elements.detailsButton.hidden = false;
    commitChatTurn(displayQuestion, data.answer);

    if (data.webCheck && data.webCheck.triggered) {
      setVoiceState(VoiceState.WEB_CHECKING);
      window.setTimeout(() => {
        if (currentVoiceState === VoiceState.WEB_CHECKING) {
          resetToReadyState();
        }
      }, 650);
    } else if (shouldSpeak) {
      speakText(data.answer);
    } else {
      resetToReadyState();
    }
  } catch (error) {
    clearProcessingTimers();
    if (error.name === "AbortError") {
      commitChatTurn(displayQuestion, "Solicitação cancelada.");
      resetToReadyState();
      return;
    }

    const errorMessage = error.message || "Erro inesperado. Verifique se o Ollama está aberto.";
    commitChatTurn(displayQuestion, errorMessage);
    renderMetrics(null, null);
    setVoiceState(VoiceState.ERROR, errorMessage);
    await loadStatus();
  } finally {
    currentChatController = null;
    setLoading(false);
  }
}

function renderVoiceDiagnostics(diagnostics) {
  elements.voiceDiagnostics.innerHTML = "";

  const title = document.createElement("strong");
  title.textContent = diagnostics.ready
    ? "Wake word pronto"
    : diagnostics.pushToTalkReady
      ? 'Falar agora pronto. Falta o modelo wake word "Jarvis".'
      : "Voz local ainda incompleta";
  elements.voiceDiagnostics.appendChild(title);

  const summary = document.createElement("p");
  summary.textContent = diagnostics.ready
    ? "Whisper, Piper e wake word foram encontrados."
    : 'Wake word "Jarvis" ainda não configurado. Detalhes técnicos ficam aqui em Ajustes > Voz.';
  elements.voiceDiagnostics.appendChild(summary);

  if (diagnostics.error) {
    const error = document.createElement("div");
    error.className = "error-text";
    error.textContent = diagnostics.error;
    elements.voiceDiagnostics.appendChild(error);
    return;
  }

  const list = document.createElement("ul");
  for (const check of diagnostics.checks || []) {
    const item = document.createElement("li");
    item.className = check.exists ? "ok" : "missing";
    item.textContent = `${check.exists ? "OK" : "Falta"} - ${check.label}: ${check.resolvedPath || check.path}`;
    list.appendChild(item);
  }
  elements.voiceDiagnostics.appendChild(list);
}

function checkExists(checks, key) {
  const check = (checks || []).find((item) => item.key === key);
  return Boolean(check && check.exists);
}

function renderAgentModelStatus(agents) {
  if (!elements.agentModelStatus) {
    return;
  }

  elements.agentModelStatus.innerHTML = "";

  if (!Array.isArray(agents) || agents.length === 0) {
    elements.agentModelStatus.classList.add("empty");
    setText(elements.agentModelStatus, "Agentes ainda nao informados pelo backend.");
    return;
  }

  elements.agentModelStatus.classList.remove("empty");

  const title = document.createElement("h3");
  title.textContent = "Agentes locais";
  elements.agentModelStatus.appendChild(title);

  const list = document.createElement("div");
  list.className = "agent-model-list";

  for (const agent of agents) {
    const model = agent.model || {};
    const item = document.createElement("div");
    item.className = model.available ? "agent-model-item ready" : "agent-model-item missing";

    const name = document.createElement("strong");
    name.textContent = agent.name || agent.id || "Agente";

    const detail = document.createElement("span");
    detail.textContent = `${model.name || "-"} - ${model.available ? "Pronto" : "Instalar"}`;

    item.append(name, detail);
    list.appendChild(item);
  }

  elements.agentModelStatus.appendChild(list);
}

function renderMissingAgentModels(missing) {
  if (!elements.missingAgentModelsPanel) {
    return;
  }

  elements.missingAgentModelsPanel.innerHTML = "";
  elements.missingAgentModelsPanel.hidden = false;

  if (!Array.isArray(missing) || missing.length === 0) {
    const ok = document.createElement("p");
    ok.textContent = "Todos os modelos dos agentes estao disponiveis.";
    elements.missingAgentModelsPanel.appendChild(ok);
    return;
  }

  const title = document.createElement("strong");
  title.textContent = "Comandos para instalar:";
  elements.missingAgentModelsPanel.appendChild(title);

  const list = document.createElement("div");
  list.className = "missing-agent-models-list";

  for (const agent of missing) {
    const item = document.createElement("code");
    item.textContent = agent.hint || `ollama pull ${agent.model}`;
    list.appendChild(item);
  }

  elements.missingAgentModelsPanel.appendChild(list);
}

async function loadMissingAgentModels() {
  if (!elements.missingAgentModelsPanel) {
    return;
  }

  elements.missingAgentModelsPanel.hidden = false;
  setText(elements.missingAgentModelsPanel, "Verificando modelos...");

  try {
    const response = await fetch("/api/agents/models/missing");
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao verificar modelos.");
    }

    renderMissingAgentModels(data.missing || []);
  } catch (error) {
    setText(elements.missingAgentModelsPanel, error.message || "Erro ao verificar modelos.");
  }
}

function renderStatus(status) {
  currentStatus = status;
  const voice = status.voice || {};
  const features = status.features || {};
  const models = status.models || {};
  const checks = voice.checks || [];

  setText(elements.backendStatus, status.backend === "online" ? "Online" : "Offline");
  setText(elements.ollamaStatus, status.ollama === "online" ? "Online" : "Offline");
  setText(elements.modelStatus, models.main ? `${models.main.name}${models.main.available ? "" : " (instalar)"}` : status.model || "-");
  setText(elements.criticModelStatus, models.critic ? `${models.critic.name}${models.critic.available ? "" : " (instalar)"}` : "-");
  renderAgentModelStatus(models.agents || []);
  setText(elements.whisperStatus, checkExists(checks, "whisper_exe_path") && checkExists(checks, "whisper_model_path") ? "Pronto" : "Incompleto");
  setText(elements.piperStatus, checkExists(checks, "piper_exe_path") && checkExists(checks, "piper_model_path") ? "Pronto" : "Incompleto");
  setText(elements.wakeWordStatus, voice.wakeWordConfigured ? "Jarvis configurado" : "jarvis.tflite ausente");
  setText(elements.webProviderStatus, status.web && status.web.provider ? status.web.provider : "none");
  setText(elements.webFeatureStatus, features.webCheck ? "Ativo" : "Não configurado");
  setText(elements.memoryFeatureStatus, features.memory ? "Ativa" : "Indisponível");
  setText(
    elements.headerSubtitle,
    voice.wakeWordConfigured
      ? 'Wake word "Jarvis" ativo · voz local pronta'
      : voice.available
        ? 'Falar agora pronto · falta jarvis.tflite para wake word'
        : "Assistente local rodando neste PC"
  );

  if (status.ok) {
    setStatusBadge("status-ok", voice.wakeWordConfigured ? "Ouvindo" : "Online");
  } else {
    setStatusBadge("status-error", status.ollama === "online" ? "Atenção" : "Offline");
  }

  if (voice.diagnostics) {
    renderVoiceDiagnostics(voice.diagnostics);
  }

  elements.startVoiceButton.disabled = !voice.wakeWordConfigured || Boolean(voice.running);
  elements.stopVoiceButton.disabled = !voice.running;

  resetToReadyState();
}

async function loadStatus() {
  try {
    const response = await fetch("/api/status");
    const status = await response.json();

    if (!status.ok && !status.backend) {
      throw new Error(status.error || "Status indisponível.");
    }

    renderStatus(status);
  } catch (error) {
    setText(elements.backendStatus, "Offline");
    setText(elements.ollamaStatus, "Não verificado");
    setText(elements.modelStatus, "Não verificado");
    setStatusBadge("status-error", "Offline");
    setVoiceState(VoiceState.ERROR, "Não consegui consultar o backend local.");
  }
}

async function loadVoiceConfig() {
  try {
    const response = await fetch("/api/voice/config");
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao carregar configuração.");
    }

    elements.voiceConfigInput.value = data.config.content;
  } catch (error) {
    setVoiceState(VoiceState.ERROR, error.message || "Erro ao carregar configuração de voz.");
  }
}

async function saveVoiceConfig() {
  try {
    const response = await fetch("/api/voice/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: elements.voiceConfigInput.value })
    });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao salvar configuração.");
    }

    setVoiceState(VoiceState.IDLE, "Configuração salva. Conferindo status da voz local...");
    await loadStatus();
  } catch (error) {
    setVoiceState(VoiceState.ERROR, error.message || "Erro ao salvar configuração de voz.");
  }
}

async function startVoice() {
  setVoiceState(VoiceState.WAITING_WAKE_WORD, "Ativando agente local de wake word...");

  try {
    const response = await fetch("/api/voice/start", { method: "POST" });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao iniciar voz.");
    }

    await loadStatus();
  } catch (error) {
    setVoiceState(VoiceState.ERROR, error.message || "Erro ao iniciar voz.");
    await loadStatus();
  }
}

async function stopVoice() {
  setVoiceState(VoiceState.IDLE, "Parando agente de voz local...");

  try {
    const response = await fetch("/api/voice/stop", { method: "POST" });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao parar voz.");
    }

    await loadStatus();
  } catch (error) {
    setVoiceState(VoiceState.ERROR, error.message || "Erro ao parar voz.");
  }
}

function renderVoiceLogs(logs) {
  if (!logs || logs.length === 0) {
    setText(elements.voiceLogs, "Logs da voz aparecerão aqui.");
    return;
  }

  setText(elements.voiceLogs, logs.slice(-90).map((entry) => `[${entry.timestamp}] ${entry.text}`).join("\n"));
}

async function loadVoiceLogs() {
  try {
    const response = await fetch("/api/voice/logs");
    const data = await response.json();
    if (data.ok) {
      renderVoiceLogs(data.logs);
    }
  } catch (error) {
    // Os logs não são críticos para a experiência principal.
  }
}

function setMemoryMessage(text, isError = false) {
  elements.memoryMessage.classList.toggle("error-text", isError);
  setText(elements.memoryMessage, text);
}

function categorizeMemory(files) {
  const buckets = memoryCategories.map((category) => ({ ...category, files: [] }));

  for (const file of files) {
    const bucket = buckets.find((category) => category.match(file));
    bucket.files.push(file);
  }

  return buckets.filter((bucket) => bucket.files.length > 0);
}

function renderMemoryFiles() {
  const query = elements.memorySearchInput.value.trim().toLowerCase();
  const files = query ? memoryFiles.filter((file) => file.toLowerCase().includes(query)) : memoryFiles;
  elements.memoryFiles.innerHTML = "";

  if (files.length === 0) {
    elements.memoryFiles.classList.add("empty");
    setText(elements.memoryFiles, query ? "Nada encontrado nessa busca." : "Nenhum arquivo .md encontrado.");
    return;
  }

  elements.memoryFiles.classList.remove("empty");

  for (const category of categorizeMemory(files)) {
    const section = document.createElement("section");
    section.className = "memory-category";

    const title = document.createElement("h3");
    title.textContent = category.title;

    const grid = document.createElement("div");
    grid.className = "memory-files-grid";

    for (const file of category.files) {
      const button = document.createElement("button");
      button.className = "memory-file-button";
      button.type = "button";
      button.textContent = file;
      button.dataset.path = file;
      button.classList.toggle("active", file === selectedMemoryPath);
      button.addEventListener("click", () => openMemoryFile(file));
      grid.appendChild(button);
    }

    section.append(title, grid);
    elements.memoryFiles.appendChild(section);
  }
}

async function loadMemoryFiles() {
  elements.memoryFiles.classList.add("empty");
  setText(elements.memoryFiles, "Carregando memória...");

  try {
    const response = await fetch("/api/memory");
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao listar memória.");
    }

    memoryFiles = data.files || [];
    setText(elements.memoryCountStatus, String(memoryFiles.length));
    renderMemoryFiles();
  } catch (error) {
    setText(elements.memoryFiles, error.message || "Erro ao carregar memória.");
    setText(elements.memoryCountStatus, "Erro");
  }
}

async function openMemoryFile(filePath) {
  try {
    const response = await fetch(`/api/memory/file?path=${encodeURIComponent(filePath)}`);
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao abrir arquivo.");
    }

    selectedMemoryPath = data.path;
    elements.memoryPathInput.value = data.path;
    elements.memoryContentInput.value = data.content;
    setMemoryMessage(`Arquivo aberto: ${data.path}`);
    renderMemoryFiles();
    openMemoryEditor();
  } catch (error) {
    setMemoryMessage(error.message || "Erro ao abrir memória.", true);
  }
}

async function saveMemoryFile() {
  const filePath = elements.memoryPathInput.value.trim();
  const content = elements.memoryContentInput.value;

  if (!filePath) {
    setMemoryMessage("Informe o caminho do arquivo .md.", true);
    elements.memoryPathInput.focus();
    return;
  }

  try {
    const response = await fetch("/api/memory/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, content })
    });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao salvar arquivo.");
    }

    selectedMemoryPath = data.path;
    setMemoryMessage("Memória salva.");
    await loadMemoryFiles();
    closeMemoryEditor();
  } catch (error) {
    setMemoryMessage(error.message || "Erro ao salvar memória.", true);
  }
}

async function rememberQuickInfo() {
  const text = elements.rememberInput.value.trim();

  if (!text) {
    setMemoryMessage("Digite a informação que quer lembrar.", true);
    elements.rememberInput.focus();
    return;
  }

  try {
    const response = await fetch("/api/memory/remember", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Erro ao salvar memória.");
    }

    elements.rememberInput.value = "";
    setMemoryMessage("Memória salva.");
    await loadMemoryFiles();
  } catch (error) {
    setMemoryMessage(error.message || "Erro ao salvar memória.", true);
  }
}

async function openVault() {
  try {
    const response = await fetch("/api/memory/open-vault", { method: "POST" });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Não consegui abrir o vault.");
    }

    setMemoryMessage(`Vault aberto: ${data.path}`);
  } catch (error) {
    setMemoryMessage("Vault local: assistant-local-pc/memory", true);
  }
}

function clearSession() {
  elements.messageInput.value = "";
  clearImageAttachment();
  autoGrowComposer();
  setText(elements.lastTranscript, "Ainda sem pergunta nesta sessão.");
  elements.currentAnswer.className = "sr-only empty";
  setText(elements.currentAnswer, "A resposta aparecerá aqui.");
  transientAnswer = "";
  transientAnswerIsError = false;
  pendingQuestion = "";
  renderMetrics(null, null);
  renderAnswerMeta(null);
  elements.detailsButton.hidden = true;
  elements.verificationPanel.hidden = true;
  elements.verificationSources.innerHTML = "";
  setText(elements.debugPanel, "");
  sessionHistory = [];
  lastQuestion = "";
  lastAnswer = "";
  lastResponseDetails = null;
  lastVerification = null;
  renderHistory();
  resetToReadyState();
  elements.messageInput.focus();
}

function bindEvents() {
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage();
  });

  elements.messageInput.addEventListener("input", autoGrowComposer);
  elements.messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  elements.talkButton.addEventListener("click", toggleLocalAudioRecording);
  elements.attachImageButton.addEventListener("click", () => elements.imageInput.click());
  elements.imageInput.addEventListener("change", async () => {
    await handleImageAttachment(elements.imageInput.files);
  });
  elements.clearButton.addEventListener("click", clearSession);
  elements.detailsButton.addEventListener("click", showDetailsDrawer);
  elements.openSettingsButton.addEventListener("click", () => openDrawer(elements.settingsDrawer));
  elements.openMemoryButton.addEventListener("click", () => openDrawer(elements.memoryDrawer));
  elements.openDebugButton.addEventListener("click", showDetailsDrawer);
  elements.openMemoryFromSettingsButton.addEventListener("click", () => openDrawer(elements.memoryDrawer));
  elements.drawerBackdrop.addEventListener("click", closeDrawers);
  document.querySelectorAll("[data-close-drawer]").forEach((button) => button.addEventListener("click", () => closeDrawers()));

  elements.settingsTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchSettingsTab(tab.dataset.settingsTab));
  });

  elements.startVoiceButton.addEventListener("click", startVoice);
  elements.stopVoiceButton.addEventListener("click", stopVoice);
  elements.testMicButton.addEventListener("click", async () => {
    await loadMicrophones();
    setVoiceState(VoiceState.IDLE, "Microfone testado. Use o botão Mic na barra inferior para falar.");
  });
  elements.speakAnswerButton.addEventListener("click", () => speakText(lastAnswer || elements.currentAnswer.textContent));
  elements.loadVoiceConfigButton.addEventListener("click", loadVoiceConfig);
  elements.saveVoiceConfigButton.addEventListener("click", saveVoiceConfig);
  elements.checkMissingAgentModelsButton.addEventListener("click", loadMissingAgentModels);
  elements.verifyButton.addEventListener("click", verifyLastAnswer);
  elements.saveCorrectionButton.addEventListener("click", saveLastCorrection);
  elements.refreshDebatesButton.addEventListener("click", loadDebateHistory);
  if (elements.refreshWatchPlansButton) {
    elements.refreshWatchPlansButton.addEventListener("click", loadWatchDashboard);
  }
  if (elements.refreshWatchAuthorizationsButton) {
    elements.refreshWatchAuthorizationsButton.addEventListener("click", loadWatchAuthorizations);
  }
  if (elements.watchAuthorizationFilter) {
    elements.watchAuthorizationFilter.addEventListener("change", () => renderWatchAuthorizations(lastWatchAuthorizations));
  }
  if (elements.watchEventFilter) {
    elements.watchEventFilter.addEventListener("change", () => renderWatchEvents(lastWatchEvents));
  }
  if (elements.watchMainAlertOpenButton) {
    elements.watchMainAlertOpenButton.addEventListener("click", openWatchSettingsFromAlert);
  }
  if (elements.watchMainAlertClearButton) {
    elements.watchMainAlertClearButton.addEventListener("click", clearWatchMainAlerts);
  }
  if (elements.watchMainAlertSoundButton) {
    elements.watchMainAlertSoundButton.addEventListener("click", toggleWatchAlertSound);
  }
  if (elements.watchMainAlertDesktopButton) {
    elements.watchMainAlertDesktopButton.addEventListener("click", toggleWatchAlertDesktop);
  }
  updateWatchNotifyButtons();

  [elements.debugToggle, elements.metricsToggle, elements.logsToggle].forEach((toggle) => {
    toggle.addEventListener("change", updateDebugAccess);
  });

  elements.refreshMemoryButton.addEventListener("click", loadMemoryFiles);
  elements.memorySearchInput.addEventListener("input", renderMemoryFiles);
  elements.rememberButton.addEventListener("click", rememberQuickInfo);
  elements.openVaultButton.addEventListener("click", openVault);
  elements.saveMemoryButton.addEventListener("click", saveMemoryFile);
  elements.closeMemoryEditorButton.addEventListener("click", closeMemoryEditor);
  elements.cancelMemoryEditorButton.addEventListener("click", closeMemoryEditor);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMemoryEditor();
      closeDrawers();
    }
  });
}

async function init() {
  bindEvents();
  renderHistory();
  renderMetrics(null, null);
  updateDebugAccess();
  autoGrowComposer();
  setVoiceState(VoiceState.IDLE);

  await Promise.all([
    loadStatus(),
    loadMicrophones(),
    loadMemoryFiles(),
    loadVoiceConfig(),
    loadVoiceLogs(),
    loadWatchMainAlerts()
  ]);

  voiceLogTimer = window.setInterval(loadVoiceLogs, 2500);
  watchAlertTimer = window.setInterval(loadWatchMainAlerts, 6000);
}

window.addEventListener("beforeunload", () => {
  if (voiceLogTimer) {
    window.clearInterval(voiceLogTimer);
  }
  if (watchAlertTimer) {
    window.clearInterval(watchAlertTimer);
  }
});

init();
