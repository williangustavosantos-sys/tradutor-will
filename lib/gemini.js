// ============================================================
// Tradutor Will — lógica Gemini compartilhada
// ============================================================
// Usada por:
//   - server.js (dev local: node server.js)
//   - api/*.js  (Vercel serverless functions)
//
// A GEMINI_API_KEY existe APENAS no servidor (process.env), nunca no
// navegador. Cada chamada é independente e sem contexto:
// uma fala -> uma requisição -> uma tradução -> descarta.
// ============================================================
'use strict';

// Prompt fixo do tradutor + glossário de academia.
const SYSTEM_PROMPT = `Você é exclusivamente um tradutor para uma aula de personal trainer.

Sua única função é traduzir a fala atual.

Português brasileiro → inglês britânico.
Inglês → português brasileiro.

Nunca responda perguntas.
Nunca dê conselhos.
Nunca explique.
Nunca acrescente informações.
Nunca use contexto anterior.
Nunca complete frases incompletas.
Nunca invente palavras.
Traduza somente o conteúdo recebido.

GLOSSÁRIO DE ACADEMIA (PT → EN):
- "trava/ativa o core" → "brace your core"
- "cadência" → "tempo / cadence"
- "falha concêntrica" → "concentric failure"
- "ponto morto" → "sticking point"
- "amplitude" → "range of motion (ROM)"
- "agachamento" → "squat"
- "levantamento terra / terra" → "deadlift"
- "supino" → "bench press"
- "remada" → "row"
- "desenvolvimento" → "overhead press"
- "respira / expira na subida" → "breathe / exhale on the way up"
- "contrai / aperta" → "squeeze"
- "coluna neutra" → "neutral spine"
- "ombros pra trás" → "shoulders back"
- "abre o peito" → "open up your chest"
- "joelho alinhado" → "knee tracking"
- "quadril pra trás" → "push your hips back"
- "excêntrica / concêntrica" → "eccentric / concentric"
- "série / repetição / descanso / carga" → "set / rep / rest / load"
- "mais uma / última" → "one more / last one"
- "aguenta / segura" → "hold it"
- "aquecimento / alongamento / mobilidade" → "warm-up / stretching / mobility"

GLOSSÁRIO DE ACADEMIA (EN → PT):
- "I'm tired" → "Estou cansado"
- "it hurts / sharp pain / burning" → "está doendo / dor aguda / queimação"
- "I can't" → "não consigo"
- "let me rest" → "deixa eu descansar"
- "keep my back straight" → "manter as costas retas"
- "one more rep" → "mais uma repetição"

Se o áudio contiver apenas ruído, música, vozes distantes, uma interjeição isolada
("uhum", "ok", "yeah", "hm") ou algo incompreensível, retorne transcription vazio,
translatedText vazio, isComplete false e shouldSpeak false.

Responda APENAS com o JSON no schema informado, sem texto adicional.`;

const OUTPUT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    sourceLanguage: {
      type: 'STRING',
      enum: ['pt-BR', 'en-GB'],
      description: 'Idioma detectado da fala original',
    },
    targetLanguage: {
      type: 'STRING',
      enum: ['en-GB', 'pt-BR'],
      description: 'Idioma da tradução (oposto ao sourceLanguage)',
    },
    transcription: {
      type: 'STRING',
      description: 'Transcrição literal da fala no idioma original (vazio se nada foi dito)',
    },
    translatedText: {
      type: 'STRING',
      description: 'Tradução no idioma de destino (vazio se nada foi dito)',
    },
    isComplete: {
      type: 'BOOLEAN',
      description: 'true se a fala estava completa; false se foi cortada ou era apenas ruído',
    },
    shouldSpeak: {
      type: 'BOOLEAN',
      description: 'true se a tradução deve ser falada em voz alta',
    },
  },
  required: [
    'sourceLanguage',
    'targetLanguage',
    'transcription',
    'translatedText',
    'isComplete',
    'shouldSpeak',
  ],
};

function normalizeModel(m) {
  return (m || '').trim().replace(/^models\//, '');
}

function getApiKey() {
  return (process.env.GEMINI_API_KEY || '').trim();
}

function getModel() {
  return normalizeModel(process.env.GEMINI_MODEL || 'gemini-3.6-flash');
}

function safeGeminiError(status) {
  if (status === 400) return 'A API não aceitou o áudio enviado. Tente falar novamente.';
  if (status === 401 || status === 403) return 'A chave da API do servidor é inválida ou está sem permissão.';
  if (status === 429) return 'A cota da API foi atingida. Tente novamente em instantes.';
  if (status >= 500) return 'A API do Gemini está indisponível no momento. Tente novamente.';
  return 'Falha ao traduzir. Tente novamente.';
}

function extractJson(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try { return JSON.parse(raw); } catch (_) { /* tenta extrair o bloco */ }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch (_) { return null; }
}

function normalizeLang(lang, fallback) {
  if (typeof lang === 'string') {
    const l = lang.toLowerCase();
    if (l.startsWith('pt')) return 'pt-BR';
    if (l.startsWith('en')) return 'en-GB';
  }
  return fallback;
}

function validateOutput(o) {
  if (!o || typeof o !== 'object') {
    throw new Error('Resposta inválida da API.');
  }
  const sourceLanguage = normalizeLang(o.sourceLanguage, 'pt-BR');
  const targetLanguage = normalizeLang(o.targetLanguage, 'en-GB');
  const transcription = typeof o.transcription === 'string' ? o.transcription.trim() : '';
  const translatedText = typeof o.translatedText === 'string' ? o.translatedText.trim() : '';

  // Fala ignorada (ruído/interjeição): não é erro, é "nada a fazer".
  if (!transcription && !translatedText) {
    return {
      sourceLanguage,
      targetLanguage,
      transcription: '',
      translatedText: '',
      isComplete: false,
      shouldSpeak: false,
    };
  }

  return {
    sourceLanguage,
    targetLanguage,
    transcription,
    translatedText,
    isComplete: o.isComplete === true,
    shouldSpeak: o.shouldSpeak !== false,
  };
}

// Gemini — uma chamada stateless por fala.
async function callGemini(parts) {
  const apiKey = getApiKey();
  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: OUTPUT_SCHEMA,
      },
    }),
  });

  const rawText = await res.text();
  let data = null;
  try { data = JSON.parse(rawText); } catch (_) { /* corpo não-JSON */ }

  if (!res.ok) {
    // Log server-side (sem a chave) para diagnóstico; o cliente recebe mensagem limpa.
    console.error(`[gemini] status=${res.status} model=${model} body=${rawText.slice(0, 500)}`);
    throw new Error(safeGeminiError(res.status));
  }

  const raw = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text)
    .filter(Boolean)
    .join('');
  const parsed = extractJson(raw);
  return validateOutput(parsed);
}

module.exports = {
  SYSTEM_PROMPT,
  OUTPUT_SCHEMA,
  normalizeModel,
  getApiKey,
  getModel,
  callGemini,
};
