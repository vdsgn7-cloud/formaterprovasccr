// api/formatar.js
// =============================================
// SERVERLESS FUNCTION — Proxy para Anthropic Claude
// A API key NUNCA é exposta ao frontend.
// =============================================

module.exports = async function handler(req, res) {
  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model  = process.env.ANTHROPIC_MODEL || 'claude-opus-4-5';

  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY não configurada. Adicione nas variáveis de ambiente do Vercel.',
    });
  }

  const { systemPrompt, userContent, maxTokens } = req.body || {};

  if (!systemPrompt || !userContent) {
    return res.status(400).json({ error: 'systemPrompt e userContent são obrigatórios.' });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens || 8192,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userContent }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.json().catch(() => ({}));
      return res.status(anthropicRes.status).json({
        error: errBody.error?.message || `Erro Anthropic: HTTP ${anthropicRes.status}`,
      });
    }

    const data = await anthropicRes.json();
    const text = data.content?.[0]?.text;

    if (!text) {
      return res.status(502).json({ error: 'Resposta inválida da API Anthropic.' });
    }

    return res.status(200).json({ text });

  } catch (err) {
    console.error('[api/formatar] Erro:', err);
    return res.status(500).json({ error: 'Erro interno ao chamar a API Anthropic: ' + err.message });
  }
};
