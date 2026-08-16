# Tradutor Will

Intérprete automático **PT-BR ↔ EN-GB** para aulas de personal trainer.

O personal trainer fala português; o aluno fala inglês britânico. O app escuta
sozinho, detecta o idioma, traduz para o idioma oposto e fala a tradução em voz
alta — durante uma aula inteira, com um único toque no botão **Iniciar Aula**.

**Não é um chatbot.** Cada fala é independente: uma fala → uma requisição →
uma tradução → contexto descartado. O app nunca responde perguntas, nunca dá
conselhos e nunca usa histórico.

---

## Arquitetura

```
Celular (PWA — React + mic)
   │  captura áudio + VAD local
   ▼
POST /api/translate  (áudio WAV ou texto)
   │
   ▼
Backend Node.js (server.js)  ←  GEMINI_API_KEY só existe aqui
   │  chama Gemini (gemini-3.6-flash) com prompt fixo + glossário + schema JSON
   ▼
JSON validado  { sourceLanguage, targetLanguage, transcription, translatedText, isComplete, shouldSpeak }
   │
   ▼
Frontend mostra a legenda e fala com SpeechSynthesis (half-duplex)
```

- **A chave da API nunca vai para o navegador.** O frontend não tem campo de
  chave, não usa `localStorage` para chave e não contém segredo no bundle.
- **Sem WebSocket, sem sessão contínua.** Cada fala gera uma chamada stateless
  ao modelo `gemini-3.6-flash`, que começa sem contexto.
- O pipeline de áudio mantém **VAD** (detecção de voz por energia/RMS),
  **ring buffer** (pré-roll antes da fala), **half-duplex** (o microfone fica
  bloqueado durante `Traduzindo`, `Falando` e o `cooldown`) — assim a voz do
  próprio app nunca vira uma nova tradução.
- A voz é reproduzida pelo **SpeechSynthesis** do navegador, atrás da interface
  `TextToSpeechProvider` (`tts.js`), pronta para ser trocada por Google Cloud
  Text-to-Speech no futuro (chamando o backend).

---

## Como instalar

Requisitos: **Node.js ≥ 18** (usa apenas módulos nativos — zero dependências).

```bash
npm install
```

## Como configurar

1. Crie uma chave em **https://aistudio.google.com/apikey** (conta Google).
2. Crie o arquivo `.env` na raiz do projeto a partir do modelo abaixo:

   ```env
   GEMINI_API_KEY=sua_chave_aqui
   GEMINI_MODEL=gemini-3.6-flash
   ```

   O arquivo `.env` **nunca deve ser commitado** (já está no `.gitignore`).
   Em plataformas como Railway/Render/Fly/Vercel, defina `GEMINI_API_KEY` como
   variável de ambiente do servidor em vez de usar o `.env`.

> Dica: mantenha o modelo como `gemini-3.6-flash` (sem o prefixo `models/` — o
> servidor adiciona sozinho).

## Como executar

```bash
npm run dev     # inicia o backend (serve o app + a API) em http://localhost:3000
npm start       # idem (produção)
npm run build   # gera a pasta dist/ com apenas os arquivos estáticos do cliente
```

Abra `http://localhost:3000` no Safari/Chrome (**HTTPS** é necessário para o
microfone em produção; em `localhost` o navegador permite).

### Testes rápidos da API

```bash
# Saúde do servidor (informa se a chave está configurada)
curl http://localhost:3000/api/health

# Tradução por texto
curl -X POST http://localhost:3000/api/translate \
  -H 'Content-Type: application/json' \
  -d '{"text": "Agora vamos fazer três séries de doze repetições."}'
```

---

## Deploy no Vercel

O backend roda como **serverless functions** (pasta `api/`) e o frontend é
servido de `dist/` (gerado por `npm run build`). Tudo já configurado no
`vercel.json`.

1. Importe este repositório no Vercel: <https://vercel.com/new>.
2. Em **Environment Variables**, adicione:

   ```env
   GEMINI_API_KEY=sua_chave_aqui
   GEMINI_MODEL=gemini-3.6-flash
   ```

3. Deploy (o build roda sozinho, sem config extra).

> O microfone exige **HTTPS**, que o Vercel já fornece. No iPhone, abra a URL
> no Safari e toque em **Compartilhar → Adicionar à Tela de Início** para virar
> um app em tela cheia.

Teste após o deploy: `https://SEU-APP.vercel.app/api/health` deve retornar
`{"ok":true,"configured":true}`.

---

## Cenários de teste

1. **Abrir sem chave manual** — a tela inicial tem só o botão *Iniciar Aula*.
   Nenhum campo de API key.
2. **Falar português** — *"Agora vamos fazer três séries de doze repetições."*
   → o app fala *"Now we're going to do three sets of twelve reps."*
3. **Falar inglês** — *"Should I keep my back straight?"*
   → o app fala *"Eu devo manter minhas costas retas?"*
4. **Durante a reprodução da voz** — falar/fazer barulho/bater palma. A
   tradução em curso continua; nenhuma tradução nova começa; o app volta a
   *Ouvindo* só depois do cooldown.
5. **Sessão longa simulada** — 100 falas alternando PT/EN. Os painéis são
   limitados a 60 entradas por lado e nenhum contexto acumula entre falas.

---

## Como instalar como app no iPhone

1. Abra a URL no **Safari** (precisa ser Safari).
2. Toque em **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início**.
3. Pronto: vira um app em tela cheia.

## Permissões

- **Microfone** — obrigatório (pedido ao tocar em *Iniciar Aula*).
- **Wake Lock** — automático: mantém a tela acesa durante a sessão.

## Solução de problemas

- **"Serviço indisponível — o servidor não está configurado"** — o `.env` não
  existe ou `GEMINI_API_KEY` está vazia. Configure e reinicie o servidor.
- **"A chave da API do servidor é inválida"** — a chave está errada ou sem
  permissão. Confira em https://aistudio.google.com/apikey.
- **"A cota da API foi atingida"** — aguarde ou aumente a cota no AI Studio.
- **Microfone não capta** — use HTTPS e permita o microfone. Em iPhone, o
  navegador pode capturar em 44.1/48 kHz; o app lê o sample rate real e envia
  o áudio como WAV.
- **Não fala nada em ambiente muito barulhento** — o VAD adapta o piso de ruído;
  fale próximo ao celular e evite música alta colada ao microfone.

## Custo estimado

Com `gemini-3.6-flash`, uma aula de 1 hora (várias falas curtas) custa centavos
— muito menos que uma sessão contínua da Live API. O crédito gratuito do AI
Studio costuma cobrir várias aulas por mês.
