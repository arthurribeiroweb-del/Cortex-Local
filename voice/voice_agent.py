import json
import math
import re
import subprocess
import sys
import time
import wave
import winsound
from dataclasses import dataclass
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"


@dataclass
class VoiceConfig:
    backend_url: str
    wake_word: str
    wakeword_model_path: Path
    wakeword_threshold: float
    whisper_exe_path: Path
    whisper_model_path: Path
    whisper_language: str
    piper_exe_path: Path
    piper_model_path: Path
    sample_rate: int
    wakeword_chunk_samples: int
    silence_threshold: int
    silence_seconds: float
    max_record_seconds: float
    temporary_audio_dir: Path
    backend_timeout_seconds: float
    whisper_timeout_seconds: float
    piper_timeout_seconds: float


def resolve_path(value):
    path = Path(value)
    if path.is_absolute():
        return path
    return BASE_DIR / path


def load_config():
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            "Arquivo voice/config.json não encontrado. Copie config.example.json para config.json e ajuste os caminhos."
        )

    with CONFIG_PATH.open("r", encoding="utf-8") as file:
        data = json.load(file)

    return VoiceConfig(
        backend_url=data.get("backend_url", "http://localhost:3000/api/chat"),
        wake_word=data.get("wake_word", "jarvis").lower(),
        wakeword_model_path=resolve_path(data.get("wakeword_model_path", "models/jarvis.tflite")),
        wakeword_threshold=float(data.get("wakeword_threshold", 0.5)),
        whisper_exe_path=resolve_path(data["whisper_exe_path"]),
        whisper_model_path=resolve_path(data["whisper_model_path"]),
        whisper_language=data.get("whisper_language", "pt"),
        piper_exe_path=resolve_path(data["piper_exe_path"]),
        piper_model_path=resolve_path(data["piper_model_path"]),
        sample_rate=int(data.get("sample_rate", 16000)),
        wakeword_chunk_samples=int(data.get("wakeword_chunk_samples", 1280)),
        silence_threshold=int(data.get("silence_threshold", 450)),
        silence_seconds=float(data.get("silence_seconds", 1.2)),
        max_record_seconds=float(data.get("max_record_seconds", 20)),
        temporary_audio_dir=resolve_path(data.get("temporary_audio_dir", "audio")),
        backend_timeout_seconds=float(data.get("backend_timeout_seconds", 120)),
        whisper_timeout_seconds=float(data.get("whisper_timeout_seconds", 120)),
        piper_timeout_seconds=float(data.get("piper_timeout_seconds", 120)),
    )


def require_file(path, label):
    if not path.exists():
        raise FileNotFoundError(f"{label} não encontrado: {path}")


def ensure_runtime_files(config):
    require_file(config.wakeword_model_path, "Modelo de wake word")
    require_file(config.whisper_exe_path, "Executável do Whisper")
    require_file(config.whisper_model_path, "Modelo do Whisper")
    require_file(config.piper_exe_path, "Executável do Piper")
    require_file(config.piper_model_path, "Modelo de voz do Piper")
    config.temporary_audio_dir.mkdir(parents=True, exist_ok=True)


def import_sounddevice():
    try:
        import sounddevice as sd
    except Exception as error:
        raise RuntimeError(
            "Não consegui carregar sounddevice. Instale as dependências com pip install -r requirements.txt "
            "e verifique o driver de áudio/microfone do Windows."
        ) from error

    return sd


def import_numpy():
    try:
        import numpy as np
    except Exception as error:
        raise RuntimeError("Não consegui carregar numpy. Instale as dependências com pip install -r requirements.txt.") from error

    return np


def create_wakeword_model(config):
    try:
        from openwakeword.model import Model
    except Exception as error:
        raise RuntimeError(
            "Não consegui carregar openWakeWord. Instale as dependências com pip install -r requirements.txt."
        ) from error

    return Model(wakeword_models=[str(config.wakeword_model_path)])


def prediction_score(prediction, wake_word):
    if not prediction:
        return 0.0

    if wake_word in prediction:
        return float(prediction[wake_word])

    return max(float(value) for value in prediction.values())


def wait_for_wake_word(config, model):
    sd = import_sounddevice()
    np = import_numpy()
    print("Aguardando Jarvis...")

    try:
        with sd.InputStream(
            channels=1,
            samplerate=config.sample_rate,
            dtype="int16",
            blocksize=config.wakeword_chunk_samples,
        ) as stream:
            while True:
                audio, overflowed = stream.read(config.wakeword_chunk_samples)
                if overflowed:
                    print("Aviso: buffer do microfone estourou; continuando.")

                chunk = np.squeeze(audio).astype(np.int16)
                prediction = model.predict(chunk)
                score = prediction_score(prediction, config.wake_word)

                if score >= config.wakeword_threshold:
                    print("Wake word detectada")
                    return
    except Exception as error:
        raise RuntimeError(f"Erro ao acessar o microfone: {error}") from error


def audio_rms(samples):
    if samples.size == 0:
        return 0

    values = samples.astype("float32")
    return math.sqrt(float((values * values).mean()))


def write_wav(path, chunks, sample_rate):
    np = import_numpy()
    audio = np.concatenate(chunks).astype(np.int16)

    with wave.open(str(path), "wb") as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(sample_rate)
        file.writeframes(audio.tobytes())


def record_question(config):
    sd = import_sounddevice()
    np = import_numpy()
    block_seconds = 0.2
    block_samples = int(config.sample_rate * block_seconds)
    chunks = []
    has_voice = False
    silence_elapsed = 0.0
    started_at = time.monotonic()

    print("Gravando pergunta...")

    try:
        with sd.InputStream(
            channels=1,
            samplerate=config.sample_rate,
            dtype="int16",
            blocksize=block_samples,
        ) as stream:
            while True:
                audio, overflowed = stream.read(block_samples)
                if overflowed:
                    print("Aviso: buffer do microfone estourou; continuando.")

                chunk = np.squeeze(audio).astype(np.int16)
                chunks.append(chunk)

                if audio_rms(chunk) >= config.silence_threshold:
                    has_voice = True
                    silence_elapsed = 0.0
                elif has_voice:
                    silence_elapsed += block_seconds

                elapsed = time.monotonic() - started_at
                if has_voice and silence_elapsed >= config.silence_seconds:
                    break

                if elapsed >= config.max_record_seconds:
                    break
    except Exception as error:
        raise RuntimeError(f"Erro ao gravar áudio do microfone: {error}") from error

    if not has_voice:
        raise RuntimeError("Nenhuma fala detectada depois da ativação.")

    output_path = config.temporary_audio_dir / f"question_{int(time.time())}.wav"
    write_wav(output_path, chunks, config.sample_rate)
    return output_path


def clean_transcript(text):
    text = re.sub(r"\[[^\]]+\]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def transcribe_with_whisper(config, audio_path):
    transcript_base = audio_path.with_suffix("")
    transcript_path = transcript_base.with_suffix(".txt")
    command = [
        str(config.whisper_exe_path),
        "-m",
        str(config.whisper_model_path),
        "-f",
        str(audio_path),
        "-l",
        config.whisper_language,
        "-otxt",
        "-of",
        str(transcript_base),
    ]

    print("Transcrevendo...")
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=config.whisper_timeout_seconds,
    )

    if result.returncode != 0:
        details = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"Whisper falhou: {details}")

    if transcript_path.exists():
        text = transcript_path.read_text(encoding="utf-8", errors="replace")
    else:
        text = result.stdout

    transcript = clean_transcript(text)
    if not transcript:
        raise RuntimeError("Whisper não retornou texto útil.")

    print(f"Pergunta: {transcript}")
    return transcript


def ask_backend(config, question):
    print("Pensando...")

    try:
        import requests
    except Exception as error:
        raise RuntimeError("Não consegui carregar requests. Instale as dependências com pip install -r requirements.txt.") from error

    try:
        response = requests.post(
            config.backend_url,
            json={"message": question, "mode": "default"},
            timeout=config.backend_timeout_seconds,
        )
    except requests.RequestException as error:
        raise RuntimeError(f"Backend offline ou inacessível: {error}") from error

    try:
        data = response.json()
    except ValueError as error:
        raise RuntimeError(f"Backend retornou resposta inválida: HTTP {response.status_code}") from error

    if not response.ok or not data.get("ok"):
        raise RuntimeError(data.get("error") or f"Backend retornou HTTP {response.status_code}")

    answer = str(data.get("answer", "")).strip()
    if not answer:
        raise RuntimeError("Backend respondeu sem texto.")

    print(f"Resposta: {answer}")
    return answer


def synthesize_with_piper(config, answer):
    output_path = config.temporary_audio_dir / f"answer_{int(time.time())}.wav"
    command = [
        str(config.piper_exe_path),
        "--model",
        str(config.piper_model_path),
        "--output_file",
        str(output_path),
    ]

    result = subprocess.run(
        command,
        input=answer,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=config.piper_timeout_seconds,
    )

    if result.returncode != 0:
        details = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"Piper falhou: {details}")

    if not output_path.exists():
        raise RuntimeError("Piper não gerou o arquivo WAV de resposta.")

    return output_path


def play_audio(path):
    print("Falando...")
    winsound.PlaySound(str(path), winsound.SND_FILENAME)


def run_loop(config):
    ensure_runtime_files(config)
    model = create_wakeword_model(config)

    while True:
        try:
            wait_for_wake_word(config, model)
            audio_path = record_question(config)
            question = transcribe_with_whisper(config, audio_path)
            answer = ask_backend(config, question)
            answer_audio = synthesize_with_piper(config, answer)
            play_audio(answer_audio)
            print("Voltando a escutar...")
        except KeyboardInterrupt:
            print("\nEncerrado pelo usuário.")
            return
        except Exception as error:
            print(f"Erro: {error}")
            print("Voltando a escutar...")
            time.sleep(1)


def main():
    try:
        config = load_config()
        run_loop(config)
    except KeyboardInterrupt:
        print("\nEncerrado pelo usuário.")
    except Exception as error:
        print(f"Erro fatal: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()
