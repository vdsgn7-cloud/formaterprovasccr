// =============================================
// APP.JS — LÓGICA PRINCIPAL DO SISTEMA
// =============================================

// Estado global da aplicação
const App = {
  currentPage: 'dashboard',
  turmas: [],
  provas: [],
  selectedTurma: null,
  selectedProva: null,
  uploadStep: 1,
  provaEmProcessamento: null,
  formatacaoJson: null,
};

// =============================================
// TOAST NOTIFICATIONS
// =============================================

function toast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'all 0.3s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px)';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// =============================================
// NAVEGAÇÃO
// =============================================

function navigateTo(page, params = {}) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) {
    pageEl.classList.add('active');
    App.currentPage = page;
  }

  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  // Atualizar topbar title
  const titles = {
    dashboard: 'Dashboard',
    turmas: 'Turmas',
    'turma-detalhe': 'Detalhes da Turma',
    'nova-turma': 'Nova Turma',
    provas: 'Provas',
    'nova-prova': 'Nova Prova',
    'prova-detalhe': 'Visualizar Prova',
    configuracoes: 'Configurações',
  };
  const topbarTitle = document.getElementById('topbar-title');
  if (topbarTitle) topbarTitle.textContent = titles[page] || page;

  // Executar lógica de inicialização da página
  switch (page) {
    case 'dashboard': carregarDashboard(); break;
    case 'turmas': carregarTurmas(); break;
    case 'turma-detalhe': carregarDetalheTurma(params.turmaId); break;
    case 'nova-turma': initNovaTurma(params.turmaId); break;
    case 'provas': carregarProvas(); break;
    case 'nova-prova': initNovaProva(params.turmaId); break;
    case 'prova-detalhe': carregarDetalheProva(params.provaId); break;
    case 'configuracoes': carregarConfiguracoes(); break;
  }

  window.scrollTo(0, 0);
}

// =============================================
// DASHBOARD
// =============================================

async function carregarDashboard() {
  try {
    const [turmas, provas] = await Promise.all([
      window.supabase.query('turmas', { order: 'created_at.desc' }),
      window.supabase.query('provas', { order: 'created_at.desc', limit: 5, select: '*' }),
    ]);

    App.turmas = turmas;
    App.provas = provas;

    document.getElementById('stat-turmas').textContent = turmas.length;
    document.getElementById('stat-provas').textContent = provas.length;
    document.getElementById('stat-formatadas').textContent =
      provas.filter(p => p.status === 'formatado' || p.status === 'publicado').length;

    // Provas recentes
    const listaEl = document.getElementById('provas-recentes-lista');
    if (provas.length === 0) {
      listaEl.innerHTML = `<div class="empty-state" style="padding:32px">
        <div class="empty-icon">📄</div>
        <div class="empty-title">Nenhuma prova ainda</div>
        <div class="empty-text">Crie sua primeira prova clicando em "Nova Prova"</div>
      </div>`;
    } else {
      listaEl.innerHTML = provas.slice(0, 5).map(p => `
        <tr onclick="navigateTo('prova-detalhe', {provaId: '${p.id}'})" style="cursor:pointer">
          <td><strong>${p.titulo}</strong></td>
          <td>${p.disciplina}</td>
          <td>${p.data_aplicacao ? new Date(p.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
          <td><span class="card-badge badge-${p.status}">${traduzirStatus(p.status)}</span></td>
        </tr>
      `).join('');
    }

    // Turmas recentes
    const turmasEl = document.getElementById('turmas-recentes-lista');
    turmasEl.innerHTML = turmas.slice(0, 4).map(t => criarCardTurma(t)).join('');

  } catch (err) {
    console.error(err);
    toast('Erro ao carregar dashboard: ' + err.message, 'error');
  }
}

// =============================================
// TURMAS
// =============================================

async function carregarTurmas() {
  const grid = document.getElementById('turmas-grid');
  grid.innerHTML = `<div class="loading"><div class="spinner"></div>Carregando turmas...</div>`;

  try {
    App.turmas = await window.supabase.query('turmas', { order: 'nome' });
    if (App.turmas.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🎓</div>
          <div class="empty-title">Nenhuma turma cadastrada</div>
          <div class="empty-text">Crie sua primeira turma para começar a formatar provas</div>
          <button class="btn btn-primary" onclick="navigateTo('nova-turma')">➕ Nova Turma</button>
        </div>`;
    } else {
      grid.innerHTML = App.turmas.map(t => criarCardTurma(t)).join('');
    }
  } catch (err) {
    grid.innerHTML = `<div class="alert alert-error">❌ Erro: ${err.message}</div>`;
    toast('Erro ao carregar turmas', 'error');
  }
}

function criarCardTurma(turma) {
  const badgeTurno = `badge-${turma.turno?.toLowerCase().replace('á','a').replace('é','e').replace('ô','o') || 'matutino'}`;
  return `
  <div class="card" onclick="navigateTo('turma-detalhe', {turmaId: '${turma.id}'})">
    <div class="card-header">
      <div class="card-icon">🎓</div>
      <span class="card-badge ${badgeTurno}">${turma.turno}</span>
    </div>
    <div class="card-title">${turma.nome}</div>
    <div class="card-subtitle">${turma.serie} • Ano ${turma.ano_letivo}</div>
    <div class="card-meta">
      ${turma.professor_responsavel ? `<span class="card-meta-item">👨‍🏫 ${turma.professor_responsavel}</span>` : ''}
    </div>
    <div class="card-actions" onclick="event.stopPropagation()">
      <button class="btn btn-ghost btn-sm" onclick="navigateTo('turma-detalhe', {turmaId: '${turma.id}'})">📋 Ver Provas</button>
      <button class="btn btn-ghost btn-sm" onclick="editarTurma('${turma.id}')">✏️ Editar</button>
      <button class="btn btn-danger btn-sm" onclick="confirmarExcluirTurma('${turma.id}', '${turma.nome}')">🗑️</button>
    </div>
  </div>`;
}

function initNovaTurma(turmaId = null) {
  const isEdit = !!turmaId;
  document.getElementById('form-turma-title').textContent = isEdit ? 'Editar Turma' : 'Nova Turma';
  document.getElementById('form-turma').reset();
  document.getElementById('turma-id-hidden').value = turmaId || '';

  if (isEdit) {
    const turma = App.turmas.find(t => t.id === turmaId);
    if (turma) preencherFormTurma(turma);
  }
}

function preencherFormTurma(turma) {
  document.getElementById('turma-nome').value = turma.nome || '';
  document.getElementById('turma-serie').value = turma.serie || '';
  document.getElementById('turma-turno').value = turma.turno || '';
  document.getElementById('turma-ano').value = turma.ano_letivo || new Date().getFullYear();
  document.getElementById('turma-professor').value = turma.professor_responsavel || '';
}

async function salvarTurma(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-salvar-turma');
  const id = document.getElementById('turma-id-hidden').value;

  const dados = {
    nome: document.getElementById('turma-nome').value.trim(),
    serie: document.getElementById('turma-serie').value.trim(),
    turno: document.getElementById('turma-turno').value,
    ano_letivo: parseInt(document.getElementById('turma-ano').value),
    professor_responsavel: document.getElementById('turma-professor').value.trim(),
    cabecalho_template: {
      escola: window.APP_CONFIG.COLEGIO_NOME,
      turma: document.getElementById('turma-nome').value.trim(),
      serie: document.getElementById('turma-serie').value.trim(),
      turno: document.getElementById('turma-turno').value,
      ano_letivo: parseInt(document.getElementById('turma-ano').value),
      professor: document.getElementById('turma-professor').value.trim(),
    },
  };

  if (!dados.nome || !dados.serie || !dados.turno) {
    toast('Preencha nome, série e turno', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<div class="spinner spinner-sm"></div> Salvando...`;

  try {
    if (id) {
      await window.supabase.update('turmas', id, dados);
      toast('Turma atualizada com sucesso!', 'success');
    } else {
      const nova = await window.supabase.insert('turmas', dados);
      toast('Turma criada com sucesso!', 'success');
    }
    navigateTo('turmas');
  } catch (err) {
    toast('Erro ao salvar: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Salvar Turma';
  }
}

async function editarTurma(id) {
  if (App.turmas.length === 0) {
    App.turmas = await window.supabase.query('turmas', {});
  }
  navigateTo('nova-turma', { turmaId: id });
}

function confirmarExcluirTurma(id, nome) {
  document.getElementById('confirm-message').textContent =
    `Tem certeza que deseja excluir a turma "${nome}"? Todas as provas serão excluídas junto.`;
  document.getElementById('confirm-action').onclick = () => excluirTurma(id);
  document.getElementById('modal-confirm').classList.add('open');
}

async function excluirTurma(id) {
  fecharModal('modal-confirm');
  try {
    await window.supabase.delete('turmas', id);
    toast('Turma excluída', 'success');
    carregarTurmas();
  } catch (err) {
    toast('Erro ao excluir: ' + err.message, 'error');
  }
}

// =============================================
// DETALHE DA TURMA
// =============================================

async function carregarDetalheTurma(turmaId) {
  if (!turmaId) { navigateTo('turmas'); return; }

  try {
    const turma = await getTurmaById(turmaId);
    App.selectedTurma = turma;

    document.getElementById('detalhe-turma-nome').textContent = turma.nome;
    document.getElementById('detalhe-turma-info').textContent =
      `${turma.serie} • ${turma.turno} • ${turma.ano_letivo}`;

    document.getElementById('breadcrumb-turma').textContent = turma.nome;

    // Carregar provas da turma
    const provas = await window.supabase.query('provas', {
      eq: { turma_id: turmaId },
      order: 'created_at.desc',
      select: '*',
    });

    App.provas = provas;
    const listaEl = document.getElementById('provas-turma-lista');

    if (provas.length === 0) {
      listaEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-title">Nenhuma prova nesta turma</div>
          <div class="empty-text">Clique em "Nova Prova" para adicionar a primeira prova</div>
        </div>`;
    } else {
      listaEl.innerHTML = provas.map(p => criarCardProva(p, turma)).join('');
    }
  } catch (err) {
    toast('Erro ao carregar turma: ' + err.message, 'error');
  }
}

function criarCardProva(prova, turma) {
  return `
  <div class="card" onclick="navigateTo('prova-detalhe', {provaId: '${prova.id}'})">
    <div class="card-header">
      <div class="card-icon">📝</div>
      <span class="card-badge badge-${prova.status}">${traduzirStatus(prova.status)}</span>
    </div>
    <div class="card-title">${prova.titulo}</div>
    <div class="card-subtitle">${prova.disciplina} • ${prova.bimestre ? prova.bimestre + 'º Bimestre' : ''}</div>
    <div class="card-meta">
      ${prova.data_aplicacao ? `<span class="card-meta-item">📅 ${new Date(prova.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>` : ''}
      ${prova.valor ? `<span class="card-meta-item">💯 ${prova.valor} pts</span>` : ''}
      ${prova.tempo_duracao ? `<span class="card-meta-item">⏱ ${prova.tempo_duracao} min</span>` : ''}
    </div>
    <div class="card-actions" onclick="event.stopPropagation()">
      <button class="btn btn-primary btn-sm" onclick="navigateTo('prova-detalhe', {provaId: '${prova.id}'})">👁️ Ver</button>
      <button class="btn btn-ghost btn-sm" onclick="exportarProva('${prova.id}', 'pdf')">🖨️ PDF</button>
      <button class="btn btn-ghost btn-sm" onclick="exportarProva('${prova.id}', 'docx')">📄 DOCX</button>
      <button class="btn btn-danger btn-sm" onclick="confirmarExcluirProva('${prova.id}', '${prova.titulo}')">🗑️</button>
    </div>
  </div>`;
}

// =============================================
// NOVA PROVA — UPLOAD E FORMATAÇÃO
// =============================================

async function initNovaProva(turmaId = null) {
  App.uploadStep = 1;
  App.provaEmProcessamento = null;
  App.formatacaoJson = null;

  // Resetar formulário
  document.getElementById('form-nova-prova').reset();
  document.getElementById('upload-preview').style.display = 'none';
  document.getElementById('upload-zone').style.display = 'block';
  document.getElementById('step-formatacao').style.display = 'none';
  document.getElementById('step-revisao').style.display = 'none';
  document.getElementById('step-upload').style.display = 'block';
  document.getElementById('btn-formatar').style.display = 'none';
  document.getElementById('btn-salvar-prova-bottom').style.display = 'none';
  const btnLateral = document.getElementById('btn-salvar-lateral');
  if (btnLateral) btnLateral.style.display = 'none';

  atualizarSteps(1);

  // Preencher select de turmas
  if (App.turmas.length === 0) {
    App.turmas = await window.supabase.query('turmas', { order: 'nome' });
  }

  const select = document.getElementById('prova-turma-select');
  select.innerHTML = `<option value="">Selecione uma turma...</option>` +
    App.turmas.map(t => `<option value="${t.id}" ${t.id === turmaId ? 'selected' : ''}>${t.nome} — ${t.serie} (${t.turno})</option>`).join('');
}

function atualizarSteps(step) {
  document.querySelectorAll('.step').forEach((el, i) => {
    el.classList.remove('active', 'completed');
    if (i + 1 === step) el.classList.add('active');
    else if (i + 1 < step) el.classList.add('completed');
  });
  App.uploadStep = step;
}

// Handle upload
document.addEventListener('DOMContentLoaded', () => {
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');

  if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) processarArquivo(file);
    });

    uploadZone.addEventListener('click', () => fileInput?.click());
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) processarArquivo(file);
    });
  }

  // Inicializar configurações
  carregarConfiguracoes();
});

async function processarArquivo(file) {
  const tipos = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!tipos.includes(file.type) && !file.name.match(/\.(pdf|docx)$/i)) {
    toast('Formato inválido. Use PDF ou DOCX.', 'error');
    return;
  }

  const previewEl = document.getElementById('upload-preview');
  const loadingEl = document.getElementById('upload-loading');
  const textareaEl = document.getElementById('texto-extraido');

  document.getElementById('upload-zone').style.display = 'none';
  previewEl.style.display = 'block';
  loadingEl.style.display = 'flex';
  document.getElementById('upload-file-name').textContent = file.name;
  document.getElementById('upload-file-size').textContent = formatFileSize(file.size);

  try {
    let texto = '';
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      texto = await window.parsePDF(file);
    } else {
      texto = await window.parseDOCX(file);
    }

    loadingEl.style.display = 'none';
    document.getElementById('texto-preview-area').style.display = 'block';
    textareaEl.value = texto;
    document.getElementById('btn-formatar').style.display = 'inline-flex';
    App.provaEmProcessamento = { arquivo: file, texto };
    toast('Arquivo processado com sucesso!', 'success');

  } catch (err) {
    loadingEl.style.display = 'none';
    document.getElementById('upload-zone').style.display = 'block';
    previewEl.style.display = 'none';
    toast('Erro ao processar arquivo: ' + err.message, 'error');
  }
}

async function formatarProva() {
  const turmaId = document.getElementById('prova-turma-select').value;
  const disciplina = document.getElementById('prova-disciplina').value.trim();

  if (!turmaId) { toast('Selecione uma turma', 'warning'); return; }
  if (!disciplina) { toast('Informe a disciplina', 'warning'); return; }
  if (!App.provaEmProcessamento?.texto) { toast('Faça o upload de um arquivo primeiro', 'warning'); return; }

  const turma = App.turmas.find(t => t.id === turmaId);
  App.selectedTurma = turma;

  const metadados = {
    disciplina,
    bimestre: document.getElementById('prova-bimestre').value,
  };

  // Exibir painel de formatação
  document.getElementById('step-upload').style.display = 'none';
  document.getElementById('step-formatacao').style.display = 'block';
  document.getElementById('btn-formatar').style.display = 'none';
  atualizarSteps(2);

  const progressEl = document.getElementById('formatacao-progress');
  const statusEl = document.getElementById('formatacao-status');

  const etapas = [
    'Analisando estrutura da prova...',
    'Identificando questões e alternativas...',
    'Convertendo fórmulas matemáticas para LaTeX...',
    'Aplicando padrão de formatação...',
    'Finalizando...',
  ];

  let etapaAtual = 0;
  const interval = setInterval(() => {
    if (etapaAtual < etapas.length - 1) {
      etapaAtual++;
      statusEl.textContent = etapas[etapaAtual];
      progressEl.style.width = `${((etapaAtual + 1) / etapas.length) * 80}%`;
    }
  }, 2000);

  try {
    statusEl.textContent = etapas[0];
    progressEl.style.width = '10%';

    const resultado = await window.formatarProvaComIA(
      App.provaEmProcessamento.texto,
      turma,
      metadados
    );

    clearInterval(interval);
    progressEl.style.width = '100%';
    statusEl.textContent = '✅ Formatação concluída!';

    App.formatacaoJson = resultado;

    // Preencher dados na revisão
    setTimeout(() => exibirRevisao(resultado, turma, metadados), 800);

  } catch (err) {
    clearInterval(interval);
    document.getElementById('step-formatacao').style.display = 'none';
    document.getElementById('step-upload').style.display = 'block';
    document.getElementById('btn-formatar').style.display = 'inline-flex';
    atualizarSteps(1);
    toast('Erro na formatação: ' + err.message, 'error');
  }
}

function exibirRevisao(resultado, turma, metadados) {
  document.getElementById('step-formatacao').style.display = 'none';
  document.getElementById('step-revisao').style.display = 'block';
  atualizarSteps(3);

  document.getElementById('btn-salvar-lateral').style.display = 'flex';
  document.getElementById('btn-salvar-prova-bottom').style.display = 'inline-flex';

  // Preencher campos de metadados
  document.getElementById('prova-titulo-input').value = resultado.titulo || 
    `Prova de ${metadados.disciplina} — ${turma.nome}`;
  document.getElementById('revisao-total-questoes').textContent = resultado.total_questoes || 0;
  document.getElementById('revisao-turma').textContent = turma.nome;

  // Renderizar questões
  const listaEl = document.getElementById('questoes-revisao');
  listaEl.innerHTML = '';

  resultado.questoes.forEach(q => {
    const div = document.createElement('div');
    div.className = 'questao-card';
    div.innerHTML = `
      <div class="questao-card-header">
        <span class="questao-num-badge">Questão ${q.numero}</span>
        <span class="questao-tipo-badge">${traduzirTipoQuestao(q.tipo)}</span>
        ${q.tem_formula ? `<span class="questao-formula-badge">∑ Fórmula</span>` : ''}
        ${q.valor ? `<span style="font-size:12px;color:var(--text-muted);margin-left:auto">${q.valor} pt${q.valor !== 1 ? 's' : ''}</span>` : ''}
      </div>
      <div class="questao-enunciado-text" id="q-enunciado-${q.numero}">${q.enunciado}</div>
      ${q.alternativas ? `
        <div class="questao-alternativas-preview">
          ${q.alternativas.map(a => `<div class="questao-alt">${a}</div>`).join('')}
        </div>` : ''}
    `;
    listaEl.appendChild(div);
  });

  // Renderizar KaTeX
  setTimeout(() => {
    if (window.renderMathInElement) {
      renderMathInElement(listaEl, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
      });
    }
  }, 200);
}

async function salvarProva() {
  const turmaId = document.getElementById('prova-turma-select').value;
  const titulo = document.getElementById('prova-titulo-input').value.trim();
  const disciplina = document.getElementById('prova-disciplina').value.trim();
  const bimestre = document.getElementById('prova-bimestre').value;
  const dataAplicacao = document.getElementById('prova-data').value;
  const valor = document.getElementById('prova-valor').value;
  const tempo = document.getElementById('prova-tempo').value;

  if (!titulo) { toast('Informe o título da prova', 'warning'); return; }

  const btn = document.getElementById('btn-salvar-prova-bottom');
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner spinner-sm"></div> Salvando...`;

  try {
    const conteudoFormatado = JSON.stringify(App.formatacaoJson, null, 2);
    const conteudoHtml = gerarHTMLProva(App.formatacaoJson);

    const prova = {
      turma_id: turmaId,
      titulo,
      disciplina,
      bimestre: bimestre ? parseInt(bimestre) : null,
      data_aplicacao: dataAplicacao || null,
      valor: valor ? parseFloat(valor) : null,
      tempo_duracao: tempo ? parseInt(tempo) : null,
      conteudo_original: App.provaEmProcessamento?.texto || '',
      conteudo_formatado: conteudoFormatado,
      conteudo_formatado_html: conteudoHtml,
      status: 'formatado',
      metadata: { total_questoes: App.formatacaoJson?.total_questoes || 0 },
    };

    const provaSalva = await window.supabase.insert('provas', prova);

    // Salvar questões
    if (App.formatacaoJson?.questoes?.length > 0) {
      const questoes = App.formatacaoJson.questoes.map(q => ({
        prova_id: provaSalva.id,
        numero: q.numero,
        tipo: q.tipo,
        enunciado: q.enunciado,
        alternativas: q.alternativas || null,
        gabarito: q.gabarito || null,
        valor: q.valor || null,
        tem_formula: q.tem_formula || false,
      }));
      await window.supabase.insert('questoes', questoes);
    }

    toast('Prova salva com sucesso!', 'success');
    navigateTo('prova-detalhe', { provaId: provaSalva.id });

  } catch (err) {
    toast('Erro ao salvar prova: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💾 Salvar Prova';
  }
}

// =============================================
// DETALHE DA PROVA
// =============================================

async function carregarDetalheProva(provaId) {
  if (!provaId) { navigateTo('provas'); return; }

  const viewerEl = document.getElementById('prova-viewer-content');
  viewerEl.innerHTML = `<div class="loading"><div class="spinner"></div>Carregando prova...</div>`;

  try {
    const prova = await window.supabase.query('provas', {
      eq: { id: provaId },
      single: true,
      select: '*',
    });

    App.selectedProva = prova;

    const turma = await getTurmaById(prova.turma_id);
    App.selectedTurma = turma;

    document.getElementById('breadcrumb-prova-titulo').textContent = prova.titulo;
    document.getElementById('detalhe-prova-titulo').textContent = prova.titulo;
    document.getElementById('detalhe-prova-info').textContent =
      `${prova.disciplina} • ${turma.nome} • ${prova.status}`;

    // Renderizar prova
    let provaJson = null;
    try { provaJson = JSON.parse(prova.conteudo_formatado); } catch (_) {}

    const cabecalho = turma.cabecalho_template || {};

    let html = `
    <div class="prova-viewer">
      <div class="prova-cabecalho">
        <h1>${cabecalho.escola || window.APP_CONFIG.COLEGIO_NOME}</h1>
        <div class="info-row"><strong>Aluno(a):</strong> _________________________________ 
          &nbsp;&nbsp; <strong>Turma:</strong> ${turma.nome} &nbsp;&nbsp; <strong>Data:</strong> ${prova.data_aplicacao ? new Date(prova.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR') : '___/___/______'}</div>
        <div class="info-row"><strong>Disciplina:</strong> ${prova.disciplina} 
          &nbsp;&nbsp; <strong>Professor(a):</strong> ${turma.professor_responsavel || '_____________'}
          &nbsp;&nbsp; <strong>Valor:</strong> ${prova.valor || '____'} 
          ${prova.tempo_duracao ? `&nbsp;&nbsp; <strong>Duração:</strong> ${prova.tempo_duracao} min` : ''}</div>
        <div class="info-row"><strong>${prova.bimestre ? prova.bimestre + 'º Bimestre' : ''}</strong> 
          &nbsp;&nbsp; <strong>Nota:</strong> ________</div>
      </div>
      <div class="prova-titulo-principal">${prova.titulo}</div>
    `;

    if (provaJson) {
      if (provaJson.instrucoes_gerais?.length > 0) {
        html += `<div class="instrucoes-prova"><strong>Instruções Gerais:</strong><ol>`;
        provaJson.instrucoes_gerais.forEach(i => { html += `<li>${i}</li>`; });
        html += `</ol></div>`;
      }

      provaJson.questoes?.forEach(q => {
        html += `<div class="questao-prova">
          <div class="q-header">Questão ${q.numero}${q.valor ? ` (${q.valor} pt${q.valor !== 1 ? 's' : ''})` : ''}</div>
          <div class="q-enunciado">${q.enunciado}</div>`;

        if (q.alternativas?.length > 0) {
          html += `<div class="q-alternativas">`;
          q.alternativas.forEach(a => { html += `<div class="q-alternativa">${a}</div>`; });
          html += `</div>`;
        }

        if (q.tipo === 'dissertativa') {
          html += `<div class="q-espaco"></div><div class="q-espaco"></div><div class="q-espaco"></div>`;
        }

        html += `</div>`;
      });
    } else if (prova.conteudo_formatado_html) {
      html += prova.conteudo_formatado_html;
    }

    html += `</div>`;
    viewerEl.innerHTML = html;

    // Renderizar KaTeX
    setTimeout(() => {
      if (window.renderMathInElement) {
        renderMathInElement(viewerEl, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true },
          ],
          throwOnError: false,
        });
      }
    }, 200);

  } catch (err) {
    viewerEl.innerHTML = `<div class="alert alert-error">❌ Erro ao carregar prova: ${err.message}</div>`;
  }
}

// =============================================
// PROVAS (LISTA GERAL)
// =============================================

async function carregarProvas() {
  const grid = document.getElementById('provas-lista-grid');
  grid.innerHTML = `<div class="loading"><div class="spinner"></div>Carregando provas...</div>`;

  try {
    const provas = await window.supabase.query('provas', {
      order: 'created_at.desc',
      select: '*',
    });

    // Carregar turmas para lookup
    if (App.turmas.length === 0) {
      App.turmas = await window.supabase.query('turmas', {});
    }

    if (provas.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">📝</div>
          <div class="empty-title">Nenhuma prova cadastrada</div>
          <div class="empty-text">Crie sua primeira prova formatada</div>
          <button class="btn btn-primary" onclick="navigateTo('nova-prova')">➕ Nova Prova</button>
        </div>`;
    } else {
      grid.innerHTML = provas.map(p => {
        const turma = App.turmas.find(t => t.id === p.turma_id);
        return criarCardProva(p, turma || { nome: 'Turma desconhecida' });
      }).join('');
    }
  } catch (err) {
    grid.innerHTML = `<div class="alert alert-error">❌ Erro: ${err.message}</div>`;
  }
}

// =============================================
// EXPORTAÇÃO
// =============================================

async function exportarProva(provaId, formato) {
  try {
    const prova = await window.supabase.query('provas', {
      eq: { id: provaId },
      single: true,
      select: '*',
    });
    const turma = await getTurmaById(prova.turma_id);

    if (formato === 'pdf') {
      window.exportarComoPDF(prova, turma);
    } else if (formato === 'docx') {
      await window.exportarComoDocx(prova, turma);
      toast('DOCX exportado com sucesso!', 'success');
    }
  } catch (err) {
    toast('Erro ao exportar: ' + err.message, 'error');
  }
}

async function exportarProvaAtual(formato) {
  if (!App.selectedProva || !App.selectedTurma) return;
  await exportarProva(App.selectedProva.id, formato);
}

// =============================================
// CONFIRMAR EXCLUSÃO PROVA
// =============================================

async function confirmarExcluirProva(id, titulo) {
  document.getElementById('confirm-message').textContent =
    `Tem certeza que deseja excluir a prova "${titulo}"?`;
  document.getElementById('confirm-action').onclick = () => excluirProva(id);
  document.getElementById('modal-confirm').classList.add('open');
}

async function excluirProva(id) {
  fecharModal('modal-confirm');
  try {
    await window.supabase.delete('provas', id);
    toast('Prova excluída', 'success');
    if (App.selectedTurma) {
      carregarDetalheTurma(App.selectedTurma.id);
      navigateTo('turma-detalhe', { turmaId: App.selectedTurma.id });
    } else {
      navigateTo('provas');
    }
  } catch (err) {
    toast('Erro ao excluir: ' + err.message, 'error');
  }
}

// =============================================
// CONFIGURAÇÕES
// =============================================

function carregarConfiguracoes() {
  // Carregar valores salvos do localStorage
  const chaves = ['supabase-url', 'supabase-key', 'colegio-nome', 'colegio-cidade'];
  chaves.forEach(k => {
    const val = localStorage.getItem(k);
    const el = document.getElementById('config-' + k);
    if (el && val) el.value = val;
  });

  // Aplicar na config
  aplicarConfiguracoes();
}

function salvarConfiguracoes() {
  const dados = {
    'supabase-url': document.getElementById('config-supabase-url')?.value?.trim(),
    'supabase-key': document.getElementById('config-supabase-key')?.value?.trim(),
    'colegio-nome': document.getElementById('config-colegio-nome')?.value?.trim(),
    'colegio-cidade': document.getElementById('config-colegio-cidade')?.value?.trim(),
  };

  Object.entries(dados).forEach(([k, v]) => {
    if (v) localStorage.setItem(k, v);
  });

  aplicarConfiguracoes();
  toast('Configurações salvas!', 'success');
}

function aplicarConfiguracoes() {
  // Carregar do localStorage (override manual pelo usuário)
  const url    = localStorage.getItem('supabase-url');
  const key    = localStorage.getItem('supabase-key');
  const nome   = localStorage.getItem('colegio-nome');
  const cidade = localStorage.getItem('colegio-cidade');

  // localStorage tem prioridade sobre o servidor (permite customização local)
  if (url)    window.APP_CONFIG.SUPABASE_URL      = url;
  if (key)    window.APP_CONFIG.SUPABASE_ANON_KEY = key;
  if (nome)   window.APP_CONFIG.COLEGIO_NOME      = nome;
  if (cidade) window.APP_CONFIG.COLEGIO_CIDADE    = cidade;

  // Recriar supabase client com as credenciais atualizadas
  window.supabase = new SupabaseClient();
}

// =============================================
// MODAIS
// =============================================

function abrirModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function fecharModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// Fechar modal clicando fora
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// =============================================
// HELPERS
// =============================================

function traduzirStatus(status) {
  const map = { rascunho: 'Rascunho', formatado: 'Formatado', publicado: 'Publicado' };
  return map[status] || status;
}

function traduzirTipoQuestao(tipo) {
  const map = {
    multipla_escolha: 'Múltipla Escolha',
    dissertativa: 'Dissertativa',
    verdadeiro_falso: 'V ou F',
    lacunas: 'Lacunas',
  };
  return map[tipo] || tipo;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function getTurmaById(id) {
  const cached = App.turmas.find(t => t.id === id);
  if (cached) return cached;
  const turma = await window.supabase.query('turmas', { eq: { id }, single: true });
  return turma;
}

function removerArquivoUpload() {
  document.getElementById('upload-preview').style.display = 'none';
  document.getElementById('upload-zone').style.display = 'block';
  document.getElementById('btn-formatar').style.display = 'none';
  App.provaEmProcessamento = null;
  document.getElementById('file-input').value = '';
}

// =============================================
// INICIALIZAÇÃO
// =============================================

window.addEventListener('load', async () => {
  // 1. Tentar buscar config do servidor (Vercel env vars)
  const serverConfigured = await fetchServerConfig();

  // 2. Sobrescrever com localStorage se o usuário tiver configurado manualmente
  aplicarConfiguracoes();

  // 3. Iniciar a aplicação
  navigateTo('dashboard');

  // 4. Avisar se nenhuma configuração de banco foi encontrada
  if (!serverConfigured && !window.APP_CONFIG.SUPABASE_URL) {
    setTimeout(() => {
      toast('Configure o Supabase em ⚙️ Configurações para começar.', 'warning', 7000);
    }, 1500);
  }
});

// Tornar funções globais
window.navigateTo = navigateTo;
window.salvarTurma = salvarTurma;
window.editarTurma = editarTurma;
window.exibirRevisao = exibirRevisao;
window.confirmarExcluirTurma = confirmarExcluirTurma;
window.excluirTurma = excluirTurma;
window.formatarProva = formatarProva;
window.salvarProva = salvarProva;
window.exportarProva = exportarProva;
window.exportarProvaAtual = exportarProvaAtual;
window.confirmarExcluirProva = confirmarExcluirProva;
window.excluirProva = excluirProva;
window.removerArquivoUpload = removerArquivoUpload;
window.fecharModal = fecharModal;
window.abrirModal = abrirModal;
window.salvarConfiguracoes = salvarConfiguracoes;
window.toast = toast;
