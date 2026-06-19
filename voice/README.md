# Voz Local

Camada de voz 100% local para o Assistente Local. Ela fica escutando o microfone, detecta a wake word, grava a pergunta, transcreve com Whisper local, envia para o backend Node/Ollama e responde em voz com Piper.

O jeito recomendado agora é controlar tudo pelo navegador em `http://localhost:3000`, no painel `Modo voz local`. A execução manual por terminal continua disponível só para diagnóstico.

## Pré-requisitos

- Python instalado no Windows.
- Backend Node rodando em `http://localhost:3000`.
- Ollama rodando com o modelo `qwen2.5:3b`.
- Whisper local configurado, por exemplo `whisper-cli.exe` do whisper.cpp.
- Modelo Whisper local, preferencialmente multilíngue para português.
- Piper local configurado.
- Modelo de voz pt-BR do Piper.
- Modelo de wake word para "Jarvis" em `.tflite`.

Importante: este projeto não inclui o modelo de wake word `Jarvis`. Você precisa fornecer ou treinar esse modelo e colocar em `voice/models/jarvis.tflite`, ou ajustar `config.json` para outro wake word/modelo disponível. Não finja que o modelo existe; se o arquivo não estiver lá, o agente avisa e não inicia.

## Instalar Dependências

```bash
cd C:\PROJETOS\IA-LOCAL\assistant-local-pc\voice
pip install -r requirements.txt
```

Se `sounddevice` falhar no Windows, verifique o driver do microfone e as dependências de áudio do Python/PortAudio.

## Configurar

Copie o exemplo:

```bash
copy config.example.json config.json
```

Edite `config.json` e ajuste:

- `wakeword_model_path`: caminho para o modelo `.tflite` da wake word.
- `whisper_exe_path`: caminho para `whisper-cli.exe`.
- `whisper_model_path`: caminho para o modelo `.bin` do Whisper.
- `piper_exe_path`: caminho para `piper.exe`.
- `piper_model_path`: caminho para o modelo `.onnx` pt-BR do Piper.
- `silence_threshold`: sensibilidade de silêncio do microfone.
- `wakeword_threshold`: confiança mínima para ativar o "Jarvis".

## Rodar o Backend

```bash
cd C:\PROJETOS\IA-LOCAL\assistant-local-pc
npm start
```

Teste no navegador:

```text
http://localhost:3000/api/health
```

## Rodar Pelo Navegador

1. Rode o backend com `npm start`.
2. Abra `http://localhost:3000`.
3. No painel `Modo voz local`, clique em `Configurar`.
4. Ajuste e salve `voice/config.json`.
5. Clique em `Iniciar voz`.
6. Acompanhe os logs na tela.

## Rodar Manualmente Para Diagnóstico

```bash
cd C:\PROJETOS\IA-LOCAL\assistant-local-pc\voice
python voice_agent.py
```

## Como Usar

1. Deixe o backend Node e o Ollama rodando.
2. Rode `python voice_agent.py`.
3. Diga "Jarvis".
4. Aguarde a mensagem "Wake word detectada".
5. Fale a pergunta.
6. Espere transcrever, pensar e falar a resposta.

## Limitações

- Wake word "Jarvis" exige modelo específico ou treinamento.
- Qualidade depende muito do microfone e do ruído do ambiente.
- Whisper pode demorar dependendo do modelo e do processador.
- Piper precisa de voz pt-BR configurada.
- Tudo roda localmente, mas os modelos precisam ser baixados antes.
- O detector de silêncio é simples; ajuste `silence_threshold` se cortar cedo demais ou demorar para parar.

## Checklist de Teste

1. Teste backend: abra `http://localhost:3000/api/health`.
2. Teste microfone: rode o agente e veja se não há erro de dispositivo.
3. Teste wake word: diga "Jarvis" e confirme "Wake word detectada".
4. Teste Whisper: confira se aparece `Pergunta: ...`.
5. Teste Ollama: confira se aparece `Pensando...` e `Resposta: ...`.
6. Teste Piper: confira se o WAV é gerado e reproduzido.
7. Teste fluxo completo: diga "Jarvis", faça uma pergunta curta e aguarde a resposta em voz.
