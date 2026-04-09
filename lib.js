// =============================================
// SUPABASE CLIENT
// =============================================

class SupabaseClient {
  constructor() {
    this.url = window.APP_CONFIG.SUPABASE_URL;
    this.key = window.APP_CONFIG.SUPABASE_ANON_KEY;
    this.headers = {
      'Content-Type': 'application/json',
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
    };
  }

  async query(table, options = {}) {
    let url = `${this.url}/rest/v1/${table}`;
    const params = new URLSearchParams();

    if (options.select) params.set('select', options.select);
    if (options.eq) {
      Object.entries(options.eq).forEach(([k, v]) => params.set(k, `eq.${v}`));
    }
    if (options.order) params.set('order', options.order);
    if (options.limit) params.set('limit', options.limit);

    const queryStr = params.toString();
    if (queryStr) url += '?' + queryStr;

    const headers = { ...this.headers };
    if (options.single) headers['Accept'] = 'application/vnd.pgrst.object+json';

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Erro ao buscar dados');
    }
    return response.json();
  }

  async insert(table, data) {
    const response = await fetch(`${this.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...this.headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(Array.isArray(data) ? data : [data]),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Erro ao inserir dados');
    }
    const result = await response.json();
    return Array.isArray(data) ? result : result[0];
  }

  async update(table, id, data) {
    const response = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...this.headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Erro ao atualizar dados');
    }
    const result = await response.json();
    return result[0];
  }

  async delete(table, id) {
    const response = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Erro ao deletar dados');
    }
    return true;
  }

  async uploadFile(bucket, path, file) {
    const response = await fetch(`${this.url}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
      body: file,
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Erro ao fazer upload');
    }
    return `${this.url}/storage/v1/object/public/${bucket}/${path}`;
  }
}

// =============================================
// ANTHROPIC CLIENT — via Serverless Function
// A API key fica no servidor (/api/formatar).
// O frontend NUNCA tem acesso à chave.
// =============================================

class AnthropicClient {
  async message(systemPrompt, userContent, maxTokens = 8192) {
    const response = await fetch('/api/formatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, userContent, maxTokens }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Erro HTTP ${response.status} ao formatar prova`);
    }
    const data = await response.json();
    if (!data.text) throw new Error('Resposta inesperada do servidor de formatacao');
    return data.text;
  }
}

// =============================================
// FETCH SERVER CONFIG — busca config do servidor
// Isso permite manter as credentials no .env do Vercel.
// Fallback: localStorage (para uso local sem servidor)
// =============================================

async function fetchServerConfig() {
  try {
    const response = await fetch('/api/config', { cache: 'no-store' });
    if (!response.ok) return false;

    const cfg = await response.json();
    if (cfg.supabaseUrl)     window.APP_CONFIG.SUPABASE_URL      = cfg.supabaseUrl;
    if (cfg.supabaseAnonKey) window.APP_CONFIG.SUPABASE_ANON_KEY = cfg.supabaseAnonKey;
    if (cfg.colegioNome)     window.APP_CONFIG.COLEGIO_NOME      = cfg.colegioNome;
    if (cfg.colegioCidade)   window.APP_CONFIG.COLEGIO_CIDADE    = cfg.colegioCidade;

    // Recriar Supabase client com novas credenciais
    window.supabase = new SupabaseClient();
    return cfg.configured;
  } catch (_) {
    // Sem servidor (ex: file://) — usa localStorage
    return false;
  }
}
window.fetchServerConfig = fetchServerConfig;

// =============================================
// PDF PARSER (usando PDF.js via CDN)
// =============================================

async function parsePDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map(item => item.str)
            .join(' ');
          fullText += pageText + '\n\n';
        }
        resolve(fullText.trim());
      } catch (err) {
        reject(new Error('Erro ao processar PDF: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo PDF'));
    reader.readAsArrayBuffer(file);
  });
}

// =============================================
// DOCX PARSER (usando Mammoth via CDN)
// =============================================

async function parseDOCX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value.trim());
      } catch (err) {
        reject(new Error('Erro ao processar DOCX: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo DOCX'));
    reader.readAsArrayBuffer(file);
  });
}

// =============================================
// EXPORTADOR DOCX (usando docx.js via CDN)
// =============================================

async function exportarComoDocx(prova, turma) {
  const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, BorderStyle } = docx;

  const cabecalho = turma.cabecalho_template;
  const children = [];

  // Cabeçalho
  children.push(new Paragraph({
    children: [new TextRun({ text: cabecalho.escola || window.APP_CONFIG.COLEGIO_NOME, bold: true, size: 28 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));

  children.push(new Paragraph({
    children: [new TextRun({ text: `Disciplina: ${prova.disciplina}   |   Turma: ${turma.nome}   |   Turno: ${turma.turno}`, size: 22 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));

  children.push(new Paragraph({
    children: [
      new TextRun({ text: `Professor(a): ${turma.professor_responsavel || '_______________'}   |   `, size: 22 }),
      new TextRun({ text: `Data: ${prova.data_aplicacao ? new Date(prova.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR') : '___/___/______'}   |   `, size: 22 }),
      new TextRun({ text: `Valor: ${prova.valor || '___'}`, size: 22 }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  children.push(new Paragraph({
    children: [new TextRun({ text: `Nome: ___________________________________________   Nota: ________`, size: 22 })],
    spacing: { after: 300 },
  }));

  // Título
  children.push(new Paragraph({
    children: [new TextRun({ text: prova.titulo, bold: true, size: 26 })],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 300 },
  }));

  // Conteúdo (texto simples sem HTML)
  const linhas = (prova.conteudo_formatado || '').split('\n');
  for (const linha of linhas) {
    const textoLimpo = linha.replace(/<[^>]+>/g, '').trim();
    if (textoLimpo) {
      children.push(new Paragraph({
        children: [new TextRun({ text: textoLimpo, size: 22 })],
        spacing: { after: 100 },
      }));
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${prova.titulo.replace(/[^a-z0-9]/gi, '_')}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// =============================================
// EXPORTADOR HTML/PRINT
// =============================================

function exportarComoPDF(prova, turma) {
  const win = window.open('', '_blank');
  const cab = turma.cabecalho_template;
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${prova.titulo}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"><\/script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:ital,wght@0,400;0,700;1,400&family=Arial:wght@400;700&display=swap');
    body { font-family: Arial, sans-serif; font-size: 12pt; margin: 2cm; color: #000; }
    .cabecalho { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
    .cabecalho h1 { font-size: 16pt; margin: 0 0 5px 0; }
    .cabecalho .info { font-size: 11pt; margin: 3px 0; }
    .nome-nota { margin: 15px 0; font-size: 12pt; }
    .titulo-prova { text-align: center; font-size: 14pt; font-weight: bold; margin: 20px 0; }
    .questao { margin: 15px 0; }
    .questao-numero { font-weight: bold; }
    .alternativas { margin: 5px 0 5px 20px; }
    .alternativa { margin: 3px 0; }
    @media print { body { margin: 1.5cm; } button { display: none; } }
  </style>
</head>
<body>
  <div class="cabecalho">
    <h1>${cab.escola || window.APP_CONFIG.COLEGIO_NOME}</h1>
    <div class="info">Disciplina: ${prova.disciplina} &nbsp;|&nbsp; Turma: ${turma.nome} &nbsp;|&nbsp; Turno: ${turma.turno}</div>
    <div class="info">Professor(a): ${turma.professor_responsavel || '_______________'} &nbsp;|&nbsp; Data: ${prova.data_aplicacao ? new Date(prova.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR') : '___/___/______'} &nbsp;|&nbsp; Valor: ${prova.valor || '___'}</div>
    ${prova.tempo_duracao ? `<div class="info">Tempo de duração: ${prova.tempo_duracao} minutos</div>` : ''}
  </div>
  <div class="nome-nota">Nome: ___________________________________________________ &nbsp;&nbsp; Nota: ________</div>
  <div class="titulo-prova">${prova.titulo}</div>
  <div class="conteudo">${prova.conteudo_formatado_html || prova.conteudo_formatado || ''}</div>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      renderMathInElement(document.body, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\\\(', right: '\\\\)', display: false},
          {left: '\\\\[', right: '\\\\]', display: true}
        ]
      });
      setTimeout(() => window.print(), 500);
    });
  <\/script>
</body>
</html>`;
  win.document.write(html);
  win.document.close();
}

// =============================================
// FORMATADOR COM CLAUDE
// =============================================

async function formatarProvaComIA(textoOriginal, turma, metadados) {
  const claude = new AnthropicClient();

  const systemPrompt = `Você é um assistente especializado em formatação de provas escolares do ${window.APP_CONFIG.COLEGIO_NOME}.

Sua tarefa é receber o texto bruto de uma prova e devolver um JSON estruturado com o conteúdo formatado seguindo as regras abaixo:

REGRAS DE FORMATAÇÃO:
1. Numere todas as questões sequencialmente (Questão 1, Questão 2, ...)
2. Identificar o tipo de cada questão: multipla_escolha, dissertativa, verdadeiro_falso, lacunas
3. Para questões de múltipla escolha, padronize as alternativas com letras: a) b) c) d) e)
4. FÓRMULAS MATEMÁTICAS: Converta todas as fórmulas para notação LaTeX entre delimitadores:
   - Fórmulas inline: $formula$
   - Fórmulas em bloco: $$formula$$
   Exemplos: x² → $x^2$, √4 → $\\sqrt{4}$, x = (-b ± √(b²-4ac))/2a → $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$
5. Identifique e preserve gabaritos se presentes
6. Corrija erros de ortografia evidentes
7. Mantenha a ordem original das questões

Retorne SOMENTE um JSON válido com esta estrutura exata:
{
  "titulo": "string - título da prova",
  "disciplina": "string",
  "total_questoes": number,
  "questoes": [
    {
      "numero": 1,
      "tipo": "multipla_escolha|dissertativa|verdadeiro_falso|lacunas",
      "enunciado": "string - enunciado completo com fórmulas LaTeX",
      "alternativas": ["a) ...", "b) ...", "c) ...", "d) ...", "e) ..."] ou null,
      "gabarito": "string ou null",
      "valor": number ou null,
      "tem_formula": boolean
    }
  ],
  "instrucoes_gerais": ["instrução 1", "instrução 2"],
  "observacoes": "string - observações livres"
}`;

  const userContent = `Turma: ${turma.nome} (${turma.serie} - ${turma.turno})
Disciplina: ${metadados.disciplina || 'Não especificada'}
Bimestre: ${metadados.bimestre || 'Não especificado'}

TEXTO DA PROVA:
${textoOriginal}`;

  const resultado = await claude.message(systemPrompt, userContent, 8192);

  // Extrair JSON da resposta
  const jsonMatch = resultado.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude não retornou um JSON válido');

  const provaFormatada = JSON.parse(jsonMatch[0]);
  return provaFormatada;
}

// =============================================
// GERAR HTML DA PROVA FORMATADA
// =============================================

function gerarHTMLProva(provaJson) {
  let html = '';

  // Instruções gerais
  if (provaJson.instrucoes_gerais && provaJson.instrucoes_gerais.length > 0) {
    html += `<div class="instrucoes"><strong>Instruções:</strong><ol>`;
    provaJson.instrucoes_gerais.forEach(inst => {
      html += `<li>${escapeHtml(inst)}</li>`;
    });
    html += `</ol></div>`;
  }

  // Questões
  provaJson.questoes.forEach(q => {
    html += `<div class="questao" data-numero="${q.numero}" data-tipo="${q.tipo}">`;
    html += `<div class="questao-header"><span class="questao-numero">Questão ${q.numero}</span>`;
    if (q.valor) html += ` <span class="questao-valor">(${q.valor} pt${q.valor !== 1 ? 's' : ''})</span>`;
    html += `</div>`;
    html += `<div class="questao-enunciado">${q.enunciado}</div>`;

    if (q.alternativas && q.alternativas.length > 0) {
      html += `<div class="alternativas">`;
      q.alternativas.forEach(alt => {
        html += `<div class="alternativa">${escapeHtml(alt)}</div>`;
      });
      html += `</div>`;
    }

    if (q.tipo === 'dissertativa') {
      html += `<div class="espaco-resposta"></div>`;
    }

    html += `</div>`;
  });

  return html;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Exportar instâncias globais
window.supabase = new SupabaseClient();
window.parsePDF = parsePDF;
window.parseDOCX = parseDOCX;
window.formatarProvaComIA = formatarProvaComIA;
window.gerarHTMLProva = gerarHTMLProva;
window.exportarComoPDF = exportarComoPDF;
window.exportarComoDocx = exportarComoDocx;
window.AnthropicClient = AnthropicClient;
window.SupabaseClient = SupabaseClient;
