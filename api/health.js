// Vercel function: GET /api/health
// Informa se o servidor está configurado (chave presente) sem expor a chave.
'use strict';

const { getApiKey, getModel } = require('../lib/gemini');

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    model: `models/${getModel()}`,
    configured: !!getApiKey(),
  });
};
