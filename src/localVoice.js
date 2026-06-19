const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { getVoiceConfig } = require("./config");

const AUDIO_DIR = path.join(__dirname, "..", "voice", "audio");
const {
  whisperExe: DEFAULT_WHISPER_EXE,
  whisperModel: DEFAULT_WHISPER_MODEL,
  whisperLanguage: WHISPER_LANGUAGE,
  piperExe: DEFAULT_PIPER_EXE,
  piperModel: DEFAULT_PIPER_MODEL
} = getVoiceConfig();

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      ...options
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `Processo terminou com código ${code}.`));
        return;
      }

      resolve({
        stdout,
        stderr
      });
    });

    if (options.input) {
      child.stdin.write(options.input);
      child.stdin.end();
    }
  });
}

async function ensureAudioDir() {
  await fs.mkdir(AUDIO_DIR, { recursive: true });
}

async function saveInputWav(buffer) {
  await ensureAudioDir();
  const fileName = `input_${Date.now()}.wav`;
  const filePath = path.join(AUDIO_DIR, fileName);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

async function transcribeWav(filePath) {
  const outputBase = filePath.replace(/\.wav$/i, "");
  const outputTxt = `${outputBase}.txt`;

  await runProcess(DEFAULT_WHISPER_EXE, [
    "-m",
    DEFAULT_WHISPER_MODEL,
    "-f",
    filePath,
    "-l",
    WHISPER_LANGUAGE,
    "-otxt",
    "-of",
    outputBase
  ]);

  const raw = await fs.readFile(outputTxt, "utf8");
  return raw.replace(/\[[^\]]+\]/g, " ").replace(/\s+/g, " ").trim();
}

async function synthesizeAnswer(answer) {
  await ensureAudioDir();
  const fileName = `answer_${Date.now()}.wav`;
  const filePath = path.join(AUDIO_DIR, fileName);

  await runProcess(DEFAULT_PIPER_EXE, [
    "--model",
    DEFAULT_PIPER_MODEL,
    "--output_file",
    filePath
  ], {
    input: answer
  });

  return {
    fileName,
    filePath,
    url: `/api/voice/audio/${fileName}`
  };
}

function resolveAudioFile(fileName) {
  const safeName = path.basename(String(fileName || ""));
  if (!safeName.endsWith(".wav")) {
    throw new Error("Arquivo de áudio inválido.");
  }

  return path.join(AUDIO_DIR, safeName);
}

module.exports = {
  saveInputWav,
  synthesizeAnswer,
  transcribeWav,
  resolveAudioFile,
  paths: {
    whisperExe: DEFAULT_WHISPER_EXE,
    whisperModel: DEFAULT_WHISPER_MODEL,
    piperExe: DEFAULT_PIPER_EXE,
    piperModel: DEFAULT_PIPER_MODEL
  }
};
