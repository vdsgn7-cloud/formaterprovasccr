// =============================================
// CONFIG.JS — Configurações padrão do frontend
// NÃO coloque API keys aqui. Elas ficam no .env.local
// ou nas variáveis de ambiente do Vercel.
// =============================================

const CONFIG = {
  // Preenchidos automaticamente pelo servidor via /api/config
  // Podem ser sobrescritos manualmente na página de Configurações (localStorage)
  SUPABASE_URL:      '',
  SUPABASE_ANON_KEY: '',

  // Modelo Claude — controlado pelo servidor
  ANTHROPIC_MODEL: 'claude-opus-4-5',

  // Dados do colégio
  COLEGIO_NOME:   'Colégio Cristo Rei',
  COLEGIO_CIDADE: '',
};

window.APP_CONFIG = CONFIG;
