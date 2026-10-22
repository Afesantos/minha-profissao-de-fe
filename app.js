// =========================================================
// MINHA PROFISSÃO DE FÉ — CLIENT-SIDE JAVASCRIPT (JSON & LOCALSTORAGE)
// Não necessita de servidor externo — 100% autônomo e portátil!
// =========================================================

// Initial Default Dataset (Only Habakkuk with 0 amens)
const INITIAL_DECLARATIONS = [
  {
    id: 1,
    name: "Profeta Habacuque",
    declaration: "Ainda que a figueira não floresça, nem haja fruto na vide; ainda que decepcione o produto da oliveira, e os campos não produzam mantimento; todavia eu me alegrarei no SENHOR e exultarei no Deus da minha salvação.",
    color_theme: "amarelo-suave",
    rotation: 0,
    amen_count: 0,
    is_pinned: 1,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString()
  }
];

const STORAGE_KEY = 'minha_profissao_de_fe_json_db';

// Old placeholder names to clean if present in localStorage
const OLD_PLACEHOLDERS = [
  "Mateus Ribeiro",
  "Priscila & Família",
  "Gabriel Santos",
  "Helena Carvalho",
  "Daniel Oliveira"
];

// Data Management Service (JSON / LocalStorage)
const FaithStorage = {
  getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        this.saveAll(INITIAL_DECLARATIONS);
        return [...INITIAL_DECLARATIONS];
      }
      let parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.saveAll(INITIAL_DECLARATIONS);
        return [...INITIAL_DECLARATIONS];
      }

      // Filter out legacy dummy placeholder names automatically
      const filtered = parsed.filter(item => !OLD_PLACEHOLDERS.includes(item.name));
      if (filtered.length !== parsed.length) {
        this.saveAll(filtered);
        parsed = filtered;
      }

      // Ensure Habakkuk is present and if it has previous seed count 52/48, reset to 0
      const habakkuk = parsed.find(item => item.name && item.name.includes("Habacuque"));
      if (!habakkuk) {
        parsed.unshift(INITIAL_DECLARATIONS[0]);
        this.saveAll(parsed);
      } else if (habakkuk.amen_count === 52 || habakkuk.amen_count === 48) {
        habakkuk.amen_count = 0;
        this.saveAll(parsed);
      }

      return parsed;
    } catch (e) {
      console.warn('Erro ao ler localStorage, utilizando dados iniciais:', e);
      return [...INITIAL_DECLARATIONS];
    }
  },

  saveAll(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Erro ao gravar no localStorage:', e);
    }
  },

  query({ search = '', color = 'all', sort = 'recent' }) {
    let items = this.getAll();

    // Text Search
    if (search) {
      const term = search.toLowerCase();
      items = items.filter(item =>
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.declaration && item.declaration.toLowerCase().includes(term))
      );
    }

    // Color filter
    if (color && color !== 'all') {
      items = items.filter(item => item.color_theme === color);
    }

    // Sort: Pinned Habakkuk ALWAYS first, then by chosen criteria
    items.sort((a, b) => {
      const pinA = a.is_pinned ? 1 : 0;
      const pinB = b.is_pinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;

      if (sort === 'amen') {
        return (b.amen_count || 0) - (a.amen_count || 0);
      }
      // 'recent' by created_at or id
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return items;
  },

  add({ name, declaration, color_theme }) {
    const list = this.getAll();
    const cleanName = sanitizeText(name);
    const cleanDeclaration = sanitizeText(declaration);

    const COLOR_THEMES = [
      'amarelo-suave', 'azul-claro', 'verde-suave',
      'coral', 'lilas', 'azul-petroleo', 'creme', 'rosa-suave'
    ];

    let selectedTheme = color_theme;
    if (!COLOR_THEMES.includes(selectedTheme)) {
      selectedTheme = COLOR_THEMES[Math.floor(Math.random() * COLOR_THEMES.length)];
    }

    const newId = list.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
    const rotation = generateRandomRotation();

    const newItem = {
      id: newId,
      name: cleanName,
      declaration: cleanDeclaration,
      color_theme: selectedTheme,
      rotation: rotation,
      amen_count: 0,
      is_pinned: 0,
      created_at: new Date().toISOString(),
      delete_token: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)
    };

    list.unshift(newItem);
    this.saveAll(list);
    return newItem;
  },

  addAmen(id) {
    const list = this.getAll();
    const item = list.find(i => i.id === Number(id));
    if (item) {
      item.amen_count = (item.amen_count || 0) + 1;
      this.saveAll(list);
      return item.amen_count;
    }
    return 0;
  },

  getStats() {
    const list = this.getAll();
    const total_declarations = list.length;
    const total_amens = list.reduce((acc, curr) => acc + (curr.amen_count || 0), 0);
    return { total_declarations, total_amens };
  },

  exportJSON() {
    const dataStr = JSON.stringify(this.getAll(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minha_profissao_de_fe_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importJSON(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.saveAll(parsed);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
};

// Sanitize helper
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateRandomRotation() {
  const min = 0.5;
  const max = 1.5;
  const val = (Math.random() * (max - min) + min).toFixed(2);
  return Math.random() > 0.5 ? parseFloat(val) : -parseFloat(val);
}

// =========================================================
// APPLICATION LOGIC & UI
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // DOM Elements
  const form = document.getElementById('faith-form');
  const declarationInput = document.getElementById('declaration-input');
  const nameInput = document.getElementById('name-input');
  const charCounter = document.getElementById('char-counter');
  const btnSubmit = document.getElementById('btn-submit');
  const muralGrid = document.getElementById('mural-grid');
  const emptyState = document.getElementById('mural-empty-state');

  const statDeclarations = document.getElementById('stat-declarations');
  const statAmens = document.getElementById('stat-amens');
  const successModal = document.getElementById('success-modal');
  const btnModalClose = document.getElementById('btn-modal-close');
  const btnModalShare = document.getElementById('btn-modal-share');
  const modalCardPreview = document.getElementById('modal-card-preview');
  const btnReadVerse = document.getElementById('btn-read-verse');
  const btnAmbientSound = document.getElementById('btn-ambient-sound');
  const toastContainer = document.getElementById('toast-container');
  let currentNewDeclaration = null;
  let isSpeaking = false;
  let isAmbientPlaying = false;
  const ambientAudio = new Audio(encodeURI('OraçãoHabacuque-Grupo-Águas.mp3'));
  ambientAudio.loop = true;
  ambientAudio.volume = 0.55;

  // Set Year
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const DECOR_ICONS = ['🕊️', '✨', '🌿', '🌾', '📖', '🕯️', '🌸', '⚓'];

  const THEME_LABELS = {
    'amarelo-suave': 'Dourado',
    'azul-claro': 'Celeste',
    'verde-suave': 'Esperança',
    'coral': 'Coral',
    'lilas': 'Lilás',
    'azul-petroleo': 'Petróleo',
    'creme': 'Creme',
    'rosa-suave': 'Rosa'
  };

  // 1. CHARACTER COUNTERS
  declarationInput.addEventListener('input', () => {
    const len = declarationInput.value.length;
    charCounter.textContent = `${len.toLocaleString('pt-BR')} / 1.000`;
    if (len >= 950) {
      charCounter.style.color = '#dc2626';
    } else if (len >= 800) {
      charCounter.style.color = '#d97706';
    } else {
      charCounter.style.color = 'var(--color-text-subtle)';
    }
    clearError('declaration');
  });

  nameInput.addEventListener('input', () => {
    clearError('name');
  });

  // 2. ERROR FEEDBACK
  function showError(field, message) {
    const errorEl = document.getElementById(`${field}-error`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('active');
    }
    const inputEl = document.getElementById(`${field}-input`);
    if (inputEl) {
      inputEl.style.borderColor = '#dc2626';
    }
  }

  function clearError(field) {
    const errorEl = document.getElementById(`${field}-error`);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('active');
    }
    const inputEl = document.getElementById(`${field}-input`);
    if (inputEl) {
      inputEl.style.borderColor = '';
    }
  }

  function showToast(message, icon = '✨') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // 3. LOAD & RENDER DECLARATIONS (WEB SERVER + OFFLINE LOCALSTORAGE)
  async function loadDeclarations() {
    let items = null;
    try {
      const res = await fetch('/api/declarations');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.declarations)) {
          items = data.declarations;
          // Merge delete_token from local storage if present
          const localItems = FaithStorage.getAll();
          items = items.map(item => {
            const local = localItems.find(l => l.id === item.id);
            if (local && local.delete_token) {
              item.delete_token = local.delete_token;
            }
            return item;
          });
          FaithStorage.saveAll(items);
        }
      }
    } catch (e) {
      console.info('Modo local ou sem servidor web ativo:', e);
    }

    if (!items) {
      items = FaithStorage.query({ search: '', color: 'all', sort: 'recent' });
    }
    renderCards(items);
    updateStatsDisplay();
  }

  async function updateStatsDisplay() {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          if (statDeclarations) statDeclarations.textContent = data.stats.total_declarations;
          if (statAmens) statAmens.textContent = data.stats.total_amens;
          return;
        }
      }
    } catch (e) {
      // fallback
    }
    const stats = FaithStorage.getStats();
    if (statDeclarations) statDeclarations.textContent = stats.total_declarations;
    if (statAmens) statAmens.textContent = stats.total_amens;
  }

  function getInitials(name) {
    if (!name) return 'FÉ';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Recentemente';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 2) return 'Agora mesmo';
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch (e) {
      return 'Recentemente';
    }
  }

  function createCardElement(item, isNew = false) {
    const card = document.createElement('article');
    const theme = item.color_theme || 'amarelo-suave';
    const isHabakkuk = item.is_pinned === 1 || (item.name && item.name.toLowerCase().includes('habacuque'));

    card.className = `faith-card theme-${theme} ${isHabakkuk ? 'card-pinned-habacuque' : ''} ${isNew ? 'card-new-entrance' : ''}`;
    card.dataset.id = item.id;

    const rotation = isHabakkuk ? 0 : (typeof item.rotation === 'number' ? item.rotation : 0);
    card.style.transform = `rotate(${rotation}deg)`;

    const randomDecor = isHabakkuk ? '📜' : DECOR_ICONS[item.id % DECOR_ICONS.length];
    const themeLabel = isHabakkuk ? '🌟 PROFISSÃO DE FÉ DE HABACUQUE' : 'Ministério 50+ 2026';
    const initials = isHabakkuk ? 'HB' : getInitials(item.name);
    const dateFormatted = isHabakkuk ? 'Cerca de 620 a.C.' : formatDate(item.created_at);

    card.innerHTML = `
      <div class="card-header-row">
        <span class="card-tag ${isHabakkuk ? 'tag-inaugural' : ''}">
          <i data-lucide="${isHabakkuk ? 'crown' : 'sparkle'}"></i> ${themeLabel}
        </span>
        <span class="card-decor-icon">${randomDecor}</span>
      </div>

      <div class="card-quote-icon">“</div>

      <p class="card-body-text ${isHabakkuk ? 'text-habacuque' : ''}">${item.declaration}</p>

      <div class="card-footer-row">
        <div class="card-author-info">
          <div class="card-avatar-initials ${isHabakkuk ? 'avatar-habacuque' : ''}">${initials}</div>
          <div class="card-author-meta">
            <span class="card-author-name">${item.name}</span>
            <span class="card-date">${dateFormatted}</span>
          </div>
        </div>

        <div class="card-actions-group">
          <button class="btn-amen ${isHabakkuk ? 'btn-amen-habacuque' : ''}" data-id="${item.id}" title="Dizer Amém a esta declaração">
            <span class="amen-heart">🙏</span>
            <span class="amen-count">${item.amen_count || 0}</span>
          </button>
          <button class="btn-card-share" data-id="${item.id}" title="Compartilhar no WhatsApp">
            <i data-lucide="share-2"></i>
          </button>
          ${item.delete_token ? `<button class="btn-card-delete" data-id="${item.id}" data-token="${item.delete_token}" title="Excluir sua declaração">
            <i data-lucide="trash-2"></i>
          </button>` : ''}
          </button>
        </div>
      </div>
    `;

    // Amen button action
    const btnAmen = card.querySelector('.btn-amen');
    btnAmen.addEventListener('click', () => handleAmen(item.id, btnAmen));

    // Share button action
    const btnShare = card.querySelector('.btn-card-share');
    btnShare.addEventListener('click', () => handleShare(item));

    // Delete button action (author only)
    const btnDelete = card.querySelector('.btn-card-delete');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => handleDelete(item.id, btnDelete.dataset.token));
    }

    return card;
  }

  function renderCards(declarations) {
    muralGrid.innerHTML = '';

    if (!declarations || declarations.length === 0) {
      emptyState.style.display = 'block';
      muralGrid.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    muralGrid.style.display = 'grid';

    declarations.forEach(item => {
      const cardEl = createCardElement(item);
      muralGrid.appendChild(cardEl);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // 4. AMEN & SHARE
  async function handleAmen(id, buttonEl) {
        // existing code unchanged
    buttonEl.classList.add('clicked');
    let newCount = FaithStorage.addAmen(id);

    const countEl = buttonEl.querySelector('.amen-count');
    if (countEl) countEl.textContent = newCount;

    // Sincroniza com servidor web
    try {
      const res = await fetch(`/api/declarations/${id}/amen`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.amen_count === 'number') {
          newCount = data.amen_count;
          if (countEl) countEl.textContent = newCount;
          const list = FaithStorage.getAll();
          const item = list.find(i => i.id === Number(id));
          if (item) {
            item.amen_count = newCount;
            FaithStorage.saveAll(list);
          }
        }
      }
    } catch (e) {
      // LocalStorage já atualizado
    }

    // Small confetti burst
    const rect = buttonEl.getBoundingClientRect();
    if (window.confetti) {
      window.confetti({
        particleCount: 15,
        spread: 40,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight
        },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899']
      });
    }

    showToast('Amém! Sua bênção foi registrada no mural. 🙏', '❤️');
    updateStatsDisplay();
  }

  async function handleShare(item) {
    // Tenta encontrar o card no mural ou no modal
    const cardEl = document.querySelector(
      `.faith-card[data-id="${item.id}"]`
    );

    // Se html2canvas disponível e card encontrado, tenta capturar imagem
    if (window.html2canvas && cardEl) {
      showToast('Preparando imagem do card… 🖼️', '⏳');
      try {
        const canvas = await window.html2canvas(cardEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false
        });

        canvas.toBlob(async (blob) => {
          if (!blob) throw new Error('Falha ao gerar imagem');

          const file = new File([blob], 'profissao-de-fe.png', { type: 'image/png' });

          // Web Share API com arquivo (funciona no celular — abre WhatsApp, etc.)
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file] });
              return;
            } catch (err) {
              if (err.name === 'AbortError') return; // Usuário cancelou
            }
          }

          // Fallback desktop: apenas baixa a imagem
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'profissao-de-fe.png';
          a.click();
          URL.revokeObjectURL(url);
          showToast('Imagem salva! Agora envie pelo WhatsApp 📲', '✅');
        }, 'image/png');

        return;
      } catch (e) {
        console.warn('html2canvas falhou, usando compartilhamento por texto:', e);
      }
    }

    showToast('Não foi possível capturar a imagem do card.', '⚠️');
  }

  async function handleDelete(id, token) {
    if (!confirm('Deseja excluir sua declaração?')) return;
    try {
      const res = await fetch(`/api/declarations/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Delete-Token': token
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Remove from local storage
          const updated = FaithStorage.getAll().filter(item => item.id !== Number(id));
          FaithStorage.saveAll(updated);
          renderCards(updated);
          updateStatsDisplay();
          showToast('Declaração excluída.', '🗑️');
        }
      }
    } catch (e) {
      console.warn('Erro ao deletar declaração:', e);
    }
  }


  // 5. FORM SUBMISSION (SAVES TO WEB SERVER & LOCALSTORAGE)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const declaration = declarationInput.value.trim();
    const name = nameInput.value.trim();

    let valid = true;

    if (!declaration) {
      showError('declaration', 'Por favor, escreva a sua profissão de fé antes de publicar.');
      declarationInput.focus();
      valid = false;
    } else if (declaration.length < 5) {
      showError('declaration', 'Sua declaração precisa ter pelo menos 5 caracteres.');
      declarationInput.focus();
      valid = false;
    } else if (declaration.length > 1000) {
      showError('declaration', 'A declaração não pode ultrapassar 1.000 caracteres.');
      declarationInput.focus();
      valid = false;
    }

    if (!name) {
      showError('name', 'Por favor, informe seu nome para assinar sua declaração.');
      if (valid) nameInput.focus();
      valid = false;
    } else if (name.length < 2) {
      showError('name', 'O nome deve ter pelo menos 2 caracteres.');
      if (valid) nameInput.focus();
      valid = false;
    } else if (name.length > 100) {
      showError('name', 'O nome deve ter no máximo 100 caracteres.');
      if (valid) nameInput.focus();
      valid = false;
    }

    if (!valid) return;

    const selectedColorInput = document.querySelector('input[name="card-color"]:checked');
    const colorTheme = selectedColorInput ? selectedColorInput.value : 'random';

    // Estado visual do botão durante o envio
    const btnContent = btnSubmit.querySelector('.btn-content');
    const btnLoader = btnSubmit.querySelector('.btn-loader');
    if (btnContent) btnContent.style.display = 'none';
    if (btnLoader) btnLoader.style.display = 'inline-flex';
    btnSubmit.disabled = true;

    let newItem = null;

    // 1. Envia para o servidor web (persistência no banco SQLite central na web)
    try {
      const res = await fetch('/api/declarations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          declaration,
          color_theme: colorTheme
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.declaration) {
          newItem = data.declaration;
          newItem.delete_token = data.delete_token;
          // Atualiza cache local
          const list = FaithStorage.getAll();
          const exists = list.some(i => i.id === newItem.id);
          if (!exists) {
            list.unshift(newItem);
            FaithStorage.saveAll(list);
          }
        }
      }
    } catch (err) {
      console.warn('Servidor web offline ou inacessível, gravando localmente:', err);
    }

    // 2. Se o servidor não respondeu, grava no localStorage como contingência
    if (!newItem) {
      newItem = FaithStorage.add({
        name,
        declaration,
        color_theme: colorTheme
      });
    }

    currentNewDeclaration = newItem;

    // Restaura botão
    if (btnContent) btnContent.style.display = 'inline-flex';
    if (btnLoader) btnLoader.style.display = 'none';
    btnSubmit.disabled = false;

    // Reset Form
    form.reset();
    charCounter.textContent = '0 / 1.000';
    const randomRadio = document.querySelector('input[name="card-color"][value="random"]');
    if (randomRadio) randomRadio.checked = true;

    // Reload and animate
    loadDeclarations();

    // Trigger celebration
    triggerCelebration();

    // Show Success Modal
    showSuccessModal(newItem);
  });

  function triggerCelebration() {
    if (!window.confetti) return;
    const count = 180;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio, opts) {
      window.confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55, colors: ['#f59e0b', '#3b82f6', '#10b981'] });
    fire(0.2, { spread: 60, colors: ['#fbbf24', '#60a5fa', '#f472b6'] });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  }

  function showSuccessModal(declaration) {
    modalCardPreview.innerHTML = '';
    const previewEl = createCardElement(declaration, false);
    previewEl.style.transform = 'none';
    modalCardPreview.appendChild(previewEl);

    if (window.lucide) {
      window.lucide.createIcons();
    }

    successModal.classList.add('active');
    successModal.setAttribute('aria-hidden', 'false');
  }

  btnModalClose.addEventListener('click', () => {
    successModal.classList.remove('active');
    successModal.setAttribute('aria-hidden', 'true');
    const muralSec = document.getElementById('mural');
    if (muralSec) {
      muralSec.scrollIntoView({ behavior: 'smooth' });
    }
  });

  btnModalShare.addEventListener('click', () => {
    if (currentNewDeclaration) {
      handleShare(currentNewDeclaration);
    }
  });

  successModal.addEventListener('click', (e) => {
    if (e.target === successModal) {
      btnModalClose.click();
    }
  });



  // 7. SCRIPTURE SPEECH SYNTHESIS & AMBIENT PEACE CHORDS
  btnReadVerse.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) {
      showToast('Seu navegador não suporta leitura de voz.', '⚠️');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
      btnReadVerse.innerHTML = `<i data-lucide="volume-2"></i> <span>Ouvir passagem</span>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const scriptureText = `Habacuque capítulo três, versículos dezessete e dezoito. Ainda que a figueira não floresça, nem haja fruto na vide; ainda que decepcione o produto da oliveira, e os campos não produzam mantimento; ainda que as ovelhas da malhada sejam arrebatadas, e nos currais não haja gado; todavia eu me alegrarei no Senhor e exultarei no Deus da minha salvação.`;

    const utterance = new SpeechSynthesisUtterance(scriptureText);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      isSpeaking = true;
      if (isAmbientPlaying) {
        ambientAudio.volume = 0.2;
      }
      btnReadVerse.innerHTML = `<i data-lucide="square"></i> <span>Parar leitura</span>`;
      if (window.lucide) window.lucide.createIcons();
    };

    utterance.onend = utterance.onerror = () => {
      isSpeaking = false;
      if (isAmbientPlaying) {
        ambientAudio.volume = 0.55;
      }
      btnReadVerse.innerHTML = `<i data-lucide="volume-2"></i> <span>Ouvir passagem</span>`;
      if (window.lucide) window.lucide.createIcons();
    };

    window.speechSynthesis.speak(utterance);
  });

  // Eventos do áudio da Oração de Habacuque
  ambientAudio.addEventListener('ended', () => {
    isAmbientPlaying = false;
    btnAmbientSound.classList.remove('active');
    btnAmbientSound.innerHTML = `<i data-lucide="volume-2"></i> <span class="sound-label">Oração de Habacuque</span>`;
    btnAmbientSound.setAttribute('title', 'Tocar Oração de Habacuque');
    if (window.lucide) window.lucide.createIcons();
  });

  ambientAudio.addEventListener('error', (e) => {
    console.warn('Erro ao carregar o áudio:', e);
    showToast('Não foi possível carregar o arquivo de áudio.', '⚠️');
    isAmbientPlaying = false;
    btnAmbientSound.classList.remove('active');
    btnAmbientSound.innerHTML = `<i data-lucide="volume-2"></i> <span class="sound-label">Oração de Habacuque</span>`;
    btnAmbientSound.setAttribute('title', 'Tocar Oração de Habacuque');
    if (window.lucide) window.lucide.createIcons();
  });

  btnAmbientSound.addEventListener('click', () => {
    if (!isAmbientPlaying) {
      ambientAudio.play().then(() => {
        isAmbientPlaying = true;
        btnAmbientSound.classList.add('active');
        btnAmbientSound.innerHTML = `<i data-lucide="volume-x"></i> <span class="sound-label">Pausar Música</span>`;
        btnAmbientSound.setAttribute('title', 'Pausar Oração de Habacuque');
        showToast('Tocando: Oração de Habacuque - Grupo Águas 🕊️', '🎶');
        if (window.lucide) window.lucide.createIcons();
      }).catch((err) => {
        console.warn('Reprodução bloqueada pelo navegador:', err);
        showToast('Clique novamente para autorizar a reprodução de áudio.', '⚠️');
      });
    } else {
      ambientAudio.pause();
      isAmbientPlaying = false;
      btnAmbientSound.classList.remove('active');
      btnAmbientSound.innerHTML = `<i data-lucide="volume-2"></i> <span class="sound-label">Oração de Habacuque</span>`;
      btnAmbientSound.setAttribute('title', 'Tocar Oração de Habacuque');
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Initial render
  loadDeclarations();
});
