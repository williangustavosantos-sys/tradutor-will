// Vercel function: POST /api/translate
// Recebe { text } OU { audio: { data, mimeType } } e devolve a tradução
// estruturada. Uma fala -> uma chamada -> descarta contexto.
'use strict';

const { getApiKey, callGemini } = require('../lib/gemini');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  if (!getApiKey()) {
    res.status(503).json({ error: 'Serviço indisponível — o servidor não está configurado (falta a chave da API).' });
    return;
  }

  const payload = req.body && typeof req.body === 'object' ? req.body : {};

  const parts = [];

  if (typeof payload.text === 'string' && payload.text.trim()) {
    parts.push({ text: payload.text.trim().slice(0, 4000) });
  }

  if (payload.audio && payload.audio.data && payload.audio.mimeType) {
    parts.push({
      inlineData: {
        mimeType: String(payload.audio.mimeType),
        data: String(payload.audio.data),
      },
    });
  }

  if (parts.length === 0) {
    res.status(400).json({ error: 'Envie áudio ou texto para traduzir.' });
    return;
  }

  try {
    const out = await callGemini(parts);
    res.status(200).json(out);
  } catch (e) {
    res.status(502).json({ error: e && e.message ? e.message : 'Falha ao traduzir. Tente novamente.' });
  }
};
