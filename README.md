# 📝 ProvaFormat — Sistema de Formatação de Provas

**Sistema de formatação automática de provas com IA para o Colégio Cristo Rei.**

---

## 🚀 Como Usar

### 1. Pré-requisitos

Você precisa de:
- ✅ **Conta no Supabase** (gratuita): [supabase.com](https://supabase.com)
- ✅ **API Key da Anthropic** (Claude): [console.anthropic.com](https://console.anthropic.com)
- ✅ **Navegador moderno** (Chrome, Edge, Firefox)

---

### 2. Configurar o Banco de Dados (Supabase)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um **novo projeto**
3. Vá em **SQL Editor** no painel do projeto
4. Cole e execute o SQL abaixo (ou copie da página de Configurações do sistema):

```sql
CREATE TABLE turmas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  serie TEXT NOT NULL,
  turno TEXT NOT NULL CHECK (turno IN ('Matutino', 'Vespertino', 'Noturno')),
  ano_letivo INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  professor_responsavel TEXT,
  logo_url TEXT,
  cabecalho_template JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE provas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  disciplina TEXT NOT NULL,
  data_aplicacao DATE,
  bimestre INTEGER CHECK (bimestre BETWEEN 1 AND 4),
  valor DECIMAL(5,2),
  tempo_duracao INTEGER,
  arquivo_original_url TEXT,
  conteudo_original TEXT,
  conteudo_formatado TEXT,
  conteudo_formatado_html TEXT,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'formatado', 'publicado')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE questoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prova_id UUID REFERENCES provas(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  tipo TEXT CHECK (tipo IN ('multipla_escolha', 'dissertativa', 'verdadeiro_falso', 'lacunas')),
  enunciado TEXT NOT NULL,
  enunciado_html TEXT,
  alternativas JSONB,
  gabarito TEXT,
  valor DECIMAL(4,2),
  tem_formula BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE provas ENABLE ROW LEVEL SECURITY;
ALTER TABLE questoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_turmas" ON turmas FOR ALL USING (true);
CREATE POLICY "allow_all_provas" ON provas FOR ALL USING (true);
CREATE POLICY "allow_all_questoes" ON questoes FOR ALL USING (true);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_turmas_updated_at BEFORE UPDATE ON turmas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_provas_updated_at BEFORE UPDATE ON provas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### 3. Abrir o Sistema

1. Abra o arquivo `index.html` no seu navegador (clique duplo ou arraste para o Chrome/Edge)
2. Vá em **⚙️ Configurações** no menu lateral
3. Preencha:
   - **URL do Supabase**: `https://xxxxxxxxxx.supabase.co` (em Settings → API do projeto)
   - **Chave Anon**: chave pública `anon` (em Settings → API)
   - **API Key Anthropic**: `sk-ant-api03-...` (em console.anthropic.com → API Keys)
4. Clique **Salvar Configurações**

> ⚠️ As chaves ficam salvas apenas no **localStorage** do seu navegador (não vão para a internet por elas mesmas).

---

### 4. Fluxo de Uso

#### Passo a Passo:

1. **Cadastrar Turmas** → Menu "Turmas" → "Nova Turma"
   - Informe nome (ex: 9ºA), série, turno, professor
   
2. **Criar Prova** → "Nova Prova"
   - Selecione a turma
   - Informe a disciplina, bimestre, data, valor
   - **Faça upload** do PDF ou DOCX da prova original
   - Clique **"Formatar com IA"**
   
3. **Revisar** → Veja as questões formatadas com fórmulas em LaTeX renderizadas

4. **Salvar e Exportar**
   - Salva no Supabase vinculado à turma
   - Exporte como **PDF** (via impressão do navegador) ou **DOCX**

---

## 📂 Estrutura de Arquivos

```
prova-formatador/
├── index.html      # Aplicação principal (abra no navegador)
├── styles.css      # Estilos
├── app.js          # Lógica da aplicação
├── lib.js          # Integrações (Supabase, Claude, PDF, DOCX)
├── config.js       # Configurações padrão
└── README.md       # Este arquivo
```

---

## 🧮 Fórmulas Matemáticas

O sistema converte automaticamente fórmulas para **LaTeX** usando KaTeX:

| Entrada (prova original) | Saída (LaTeX) |
|---|---|
| x² + 2x + 1 | `$x^2 + 2x + 1$` |
| √(b² - 4ac) | `$\sqrt{b^2 - 4ac}$` |
| Bhaskara | `$$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$` |
| ∫ f(x) dx | `$\int f(x)\,dx$` |
| Σ 1/n | `$\sum \frac{1}{n}$` |

---

## 🛡️ Segurança

- As chaves de API são armazenadas no **localStorage** do navegador
- Use apenas em computadores de confiança
- Para uso em rede escolar, considere adicionar autenticação (login)

---

## 🐛 Troubleshooting

| Problema | Solução |
|---|---|
| "Erro ao buscar dados" | Verifique URL e chave do Supabase nas Configurações |
| "Erro na API Anthropic" | Verifique se a API key está correta e tem créditos |
| PDF não extrai texto | PDFs escaneados (imagens) não funcionam — use DOCX |
| Fórmulas não aparecem | Aguarde o KaTeX carregar (conexão com internet necessária) |

---

## 📄 Licença

Sistema desenvolvido para uso interno do Colégio Cristo Rei.
