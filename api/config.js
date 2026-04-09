// api/config.js
// =============================================
// SERVERLESS FUNCTION — Expõe configurações públicas ao frontend
// Apenas credenciais PÚBLICAS são retornadas (Supabase anon key).
// A Anthropic API key NUNCA é retornada aqui.
// =============================================

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const supabaseUrl    = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const colegioNome   = process.env.COLEGIO_NOME    || 'Colégio Cristo Rei';
  const colegioCidade = process.env.COLEGIO_CIDADE  || '';

  // Verificar se as configurações obrigatórias existem
  const configured = !!(supabaseUrl && supabaseAnonKey);

  return res.status(200).json({
    configured,
    supabaseUrl:     supabaseUrl    || null,
    supabaseAnonKey: supabaseAnonKey || null,
    colegioNome,
    colegioCidade,
    // Nunca retorne ANTHROPIC_API_KEY aqui!
  });
};
