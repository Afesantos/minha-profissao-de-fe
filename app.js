// =========================================================
// MINHA PROFISSÃO DE FÉ — CLIENT-SIDE JAVASCRIPT
// =========================================================

const AUTHOR_TOKENS_KEY = 'minha_profissao_de_fe_author_tokens';

function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getAuthorTokens() {
  try {
    return JSON.parse(localStorage.getItem(AUTHOR_TOKENS_KEY) || '{}');
  } catch {
    return {};
  }
}

const HABAKKUK_DOC_ID = 'habacuque-fixo';
const HABAKKUK_DECLARATION = {
  id: HABAKKUK_DOC_ID,
  name: 'Profeta Habacuque',
  declaration: 'Ainda que a figueira não floresça, nem haja fruto na vide; ainda que decepcione o produto da oliveira, e os campos não produzam mantimento; ainda que as ovelhas da malhada sejam arrebatadas, e nos currais não haja gado; todavia eu me alegrarei no SENHOR e exultarei no Deus da minha salvação.',
  color_theme: 'amarelo-suave',
  rotation: 0,
  amen_count: 0,
  is_pinned: 1,
  created_at: '2026-09-24T18:20:59.000Z'
};

const FaithStorage = {
  listenToDeclarations(callback) {
    const { db, collection, query, orderBy, onSnapshot } = window.FirebaseDB;
    const q = query(collection(db, "declarations"), orderBy("created_at", "desc"));

    // Tenta sincronizar a profissão de fé de Habacuque no Firestore se não existir
    this.ensureHabakkuk();

    return onSnapshot(q, (snapshot) => {
      let items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Garante que a profissão de fé de Habacuque esteja sempre presente
      const hasHabakkuk = items.some(item =>
        item.id === HABAKKUK_DOC_ID ||
        item.is_pinned === 1 ||
        (item.name && item.name.toLowerCase().includes('habacuque'))
      );

      if (!hasHabakkuk) {
        items.unshift({ ...HABAKKUK_DECLARATION });
      }

      // Ordena garantindo que itens fixados (como Habacuque) fiquem sempre no topo
      items.sort((a, b) => {
        const pinA = (a.is_pinned || a.id === HABAKKUK_DOC_ID || (a.name && a.name.toLowerCase().includes('habacuque'))) ? 1 : 0;
        const pinB = (b.is_pinned || b.id === HABAKKUK_DOC_ID || (b.name && b.name.toLowerCase().includes('habacuque'))) ? 1 : 0;
        return pinB - pinA;
      });

      callback(items);
    }, (error) => console.error("Erro ao escutar declarações:", error));
  },

  async ensureHabakkuk() {
    try {
      const { db, doc, getDoc, setDoc } = window.FirebaseDB;
      if (!getDoc || !setDoc) return;
      const docRef = doc(db, "declarations", HABAKKUK_DOC_ID);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const { id, ...data } = HABAKKUK_DECLARATION;
        await setDoc(docRef, data);
      }
    } catch (e) {
      // Ignora silenciosamente caso o Firestore esteja inacessível no momento
    }
  },

  async add({ name, declaration, color_theme }) {
    const { db, collection, addDoc } = window.FirebaseDB;
    const themes = ['amarelo-suave', 'azul-claro', 'verde-suave', 'coral', 'lilas', 'azul-petroleo', 'creme', 'rosa-suave'];
    const selectedTheme = themes.includes(color_theme) ? color_theme : themes[Math.floor(Math.random() * themes.length)];

    const newItem = {
      name: sanitizeText(name),
      declaration: sanitizeText(declaration),
      color_theme: selectedTheme,
      rotation: Number((Math.random() * 2 - 1).toFixed(2)),
      amen_count: 0,
      is_pinned: 0,
      created_at: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, "declarations"), newItem);
    const tokens = getAuthorTokens();
    tokens[docRef.id] = true;
    localStorage.setItem(AUTHOR_TOKENS_KEY, JSON.stringify(tokens));

    return { id: docRef.id, ...newItem };
  },

  async addAmen(id) {
    const { db, doc, updateDoc, increment, setDoc } = window.FirebaseDB;
    const docRef = doc(db, "declarations", id);
    try {
      await updateDoc(docRef, {
        amen_count: increment(1)
      });
    } catch (err) {
      if (id === HABAKKUK_DOC_ID && setDoc) {
        const { id: _, ...data } = HABAKKUK_DECLARATION;
        await setDoc(docRef, {
          ...data,
          amen_count: increment(1)
        }, { merge: true });
      } else {
        throw err;
      }
    }
  },

  async delete(id) {
    if (id === HABAKKUK_DOC_ID) {
      throw new Error('A profissão de fé de Habacuque permanece sempre fixa no mural e não pode ser excluída.');
    }
    const tokens = getAuthorTokens();
    if (!tokens[id]) throw new Error('Este navegador não possui autorização para excluir esta declaração.');
    const { db, doc, deleteDoc } = window.FirebaseDB;
    await deleteDoc(doc(db, "declarations", id));
    delete tokens[id];
    localStorage.setItem(AUTHOR_TOKENS_KEY, JSON.stringify(tokens));
  },

  async getStats(items = []) {
    return {
      total_declarations: items.length,
      total_amens: items.reduce((total, item) => total + (item.amen_count || 0), 0)
    };
  }
};

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
    const isHabakkuk = item.is_pinned === 1 || item.id === HABAKKUK_DOC_ID || (item.name && item.name.toLowerCase().includes('habacuque'));

    card.className = `faith-card theme-${theme} ${isHabakkuk ? 'card-pinned-habacuque' : ''} ${isNew ? 'card-new-entrance' : ''}`;
    card.dataset.id = item.id;

    const rotation = isHabakkuk ? 0 : (typeof item.rotation === 'number' ? item.rotation : 0);
    card.style.transform = `rotate(${rotation}deg)`;

    const iconIndex = typeof item.id === 'number'
      ? item.id
      : Math.abs(String(item.id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
    const randomDecor = isHabakkuk ? '📜' : DECOR_ICONS[iconIndex % DECOR_ICONS.length];
    const themeLabel = isHabakkuk ? '🌟 PROFISSÃO DE FÉ DE HABACUQUE' : 'Ministério 50+ 2026';
    const initials = isHabakkuk ? 'HB' : getInitials(item.name);
    const dateFormatted = isHabakkuk ? 'Cerca de 620 a.C.' : formatDate(item.created_at);
    const canDelete = !isHabakkuk && Boolean(getAuthorTokens()[item.id]);

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
          ${canDelete ? `<button class="btn-card-delete" data-id="${item.id}" title="Excluir minha profissão de fé" aria-label="Excluir minha profissão de fé"><i data-lucide="trash-2"></i></button>` : ''}
        </div>
      </div>
    `;

    // Amen button action
    const btnAmen = card.querySelector('.btn-amen');
    btnAmen.addEventListener('click', () => handleAmen(item.id, btnAmen));

    // Share button action
    const btnShare = card.querySelector('.btn-card-share');
    btnShare.addEventListener('click', () => handleShare(item));

    const btnDelete = card.querySelector('.btn-card-delete');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => handleDelete(item.id, btnDelete));
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
  async function handleDelete(id, buttonEl) {
    if (!window.confirm('Deseja excluir permanentemente sua profissão de fé?')) return;
    buttonEl.disabled = true;
    try {
      await FaithStorage.delete(id);
      showToast('Sua profissão de fé foi excluída.', '✅');
    } catch (error) {
      buttonEl.disabled = false;
      showToast(error.message || 'Não foi possível excluir a declaração.', '⚠️');
    }
  }

  async function handleAmen(id, buttonEl) {
    buttonEl.classList.add('clicked');
    let newCount;
    try {
      newCount = await FaithStorage.addAmen(id);
    } catch (error) {
      buttonEl.classList.remove('clicked');
      showToast(error.message || 'Não foi possível registrar o amém.', '⚠️');
      return;
    }

    const countEl = buttonEl.querySelector('.amen-count');
    if (countEl) countEl.textContent = newCount;

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

    showToast('Amém! Sua votação foi registrada. 🙏', '❤️');
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


  // 5. FORM SUBMISSION
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

    let newItem;
    try {
      newItem = await FaithStorage.add({ name, declaration, color_theme: colorTheme });
    } catch (error) {
      if (btnContent) btnContent.style.display = 'inline-flex';
      if (btnLoader) btnLoader.style.display = 'none';
      btnSubmit.disabled = false;
      showToast(error.message || 'Não foi possível salvar sua declaração. Tente novamente.', '⚠️');
      return;
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

  // Initial render & real-time updates
  FaithStorage.listenToDeclarations(async (declarations) => {
    renderCards(declarations);
    const stats = await FaithStorage.getStats(declarations);
    if (statDeclarations) statDeclarations.textContent = stats.total_declarations;
    if (statAmens) statAmens.textContent = stats.total_amens;
  });
});
