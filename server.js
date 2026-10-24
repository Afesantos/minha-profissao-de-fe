import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'profissoes_fe.db');
const db = new DatabaseSync(dbPath);

// Create table with is_pinned support
db.exec(`
  CREATE TABLE IF NOT EXISTS declarations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    declaration TEXT NOT NULL,
    color_theme TEXT NOT NULL,
    rotation REAL NOT NULL,
    amen_count INTEGER DEFAULT 0,
    is_pinned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Ensure is_pinned column exists for existing databases
try {
  db.exec(`ALTER TABLE declarations ADD COLUMN is_pinned INTEGER DEFAULT 0;`);
} catch (e) {
  // Column already exists
}

// Ensure delete_token column exists for existing databases
try {
  db.exec(`ALTER TABLE declarations ADD COLUMN delete_token TEXT;`);
} catch (e) {
  // Column already exists
}

// Ensure Habakkuk is marked as pinned = 1
try {
  db.exec(`UPDATE declarations SET is_pinned = 1 WHERE name LIKE '%Habacuque%';`);
} catch (e) {
  // Ignore
}

// Color themes available
const COLOR_THEMES = [
  'amarelo-suave',
  'azul-claro',
  'verde-suave',
  'coral',
  'lilas',
  'azul-petroleo',
  'creme',
  'rosa-suave'
];

// Seed initial declarations if empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM declarations');
const { count } = countStmt.get();

if (count === 0) {
  const seedDeclarations = [
    {
      name: "Profeta Habacuque",
      declaration: "Ainda que a figueira não floresça, nem haja fruto na vide; ainda que decepcione o produto da oliveira, e os campos não produzam mantimento; todavia eu me alegrarei no SENHOR e exultarei no Deus da minha salvação.",
      color_theme: "amarelo-suave",
      rotation: 0,
      amen_count: 0,
      is_pinned: 1
    }
  ];

  const insertSeed = db.prepare(`
    INSERT INTO declarations (name, declaration, color_theme, rotation, amen_count, is_pinned, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  seedDeclarations.forEach((item) => {
    insertSeed.run(item.name, item.declaration, item.color_theme, item.rotation, item.amen_count, item.is_pinned);
  });
  console.log('✅ Banco de dados SQLite semeado exclusivamente com Habacuque.');
}

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

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

// Random subtle rotation between -1.5deg and +1.5deg (non-zero)
function generateRandomRotation() {
  const min = 0.4;
  const max = 1.6;
  const val = (Math.random() * (max - min) + min).toFixed(2);
  return Math.random() > 0.5 ? parseFloat(val) : -parseFloat(val);
}

// API Routes
app.get('/api/declarations', (req, res) => {
  try {
    const search = req.query.q ? `%${req.query.q.trim()}%` : null;
    const filterColor = req.query.color && req.query.color !== 'all' ? req.query.color : null;
    const sortBy = req.query.sort === 'amen' ? 'amen_count DESC, id DESC' : 'id DESC';

    let query = `SELECT id, name, declaration, color_theme, rotation, amen_count, is_pinned, created_at FROM declarations WHERE 1=1`;
    const params = [];

    if (search) {
      query += ` AND (name LIKE ? OR declaration LIKE ?)`;
      params.push(search, search);
    }

    if (filterColor) {
      query += ` AND color_theme = ?`;
      params.push(filterColor);
    }

    // Always keep Habakkuk (pinned) at the top of the mural
    query += ` ORDER BY is_pinned DESC, ${sortBy}`;

    const stmt = db.prepare(query);
    const declarations = stmt.all(...params);

    res.json({
      success: true,
      total: declarations.length,
      declarations
    });
  } catch (error) {
    console.error('Erro ao buscar declarações:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar o mural de fé.' });
  }
});

app.post('/api/declarations', (req, res) => {
  try {
    let { name, declaration, color_theme } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, message: 'Por favor, informe o seu nome.' });
    }

    if (!declaration || typeof declaration !== 'string') {
      return res.status(400).json({ success: false, message: 'Por favor, escreva a sua profissão de fé.' });
    }

    const cleanName = sanitizeText(name);
    const cleanDeclaration = sanitizeText(declaration);

    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({ success: false, message: 'O nome deve ter entre 2 e 100 caracteres.' });
    }

    if (cleanDeclaration.length < 5 || cleanDeclaration.length > 1000) {
      return res.status(400).json({ success: false, message: 'A declaração de fé deve ter entre 5 e 1.000 caracteres.' });
    }

    // Validate or pick random theme
    let selectedTheme = color_theme;
    if (!COLOR_THEMES.includes(selectedTheme)) {
      selectedTheme = COLOR_THEMES[Math.floor(Math.random() * COLOR_THEMES.length)];
    }

    const rotation = generateRandomRotation();
    const deleteToken = (typeof req.body.delete_token === 'string' && req.body.delete_token.trim())
      ? req.body.delete_token.trim()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);

    const insertStmt = db.prepare(`
      INSERT INTO declarations (name, declaration, color_theme, rotation, amen_count, delete_token, created_at)
      VALUES (?, ?, ?, ?, 0, ?, datetime('now'))
    `);

    const result = insertStmt.run(cleanName, cleanDeclaration, selectedTheme, rotation, deleteToken);
    const newId = result.lastInsertRowid;

    const getStmt = db.prepare('SELECT id, name, declaration, color_theme, rotation, amen_count, is_pinned, created_at FROM declarations WHERE id = ?');
    const newDeclaration = getStmt.get(newId);

    res.status(201).json({
      success: true,
      message: 'Sua profissão de fé foi publicada!',
      subMessage: 'Que sua declaração também fortaleça a fé de outras pessoas. ❤️',
      declaration: newDeclaration,
      delete_token: deleteToken
    });
  } catch (error) {
    console.error('Erro ao salvar declaração:', error);
    res.status(500).json({ success: false, message: 'Não foi possível publicar sua declaração no momento.' });
  }
});

app.post('/api/declarations/:id/amen', (req, res) => {
  try {
    const { id } = req.params;
    const updateStmt = db.prepare('UPDATE declarations SET amen_count = amen_count + 1 WHERE id = ?');
    const result = updateStmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Declaração não encontrada.' });
    }

    const getStmt = db.prepare('SELECT amen_count FROM declarations WHERE id = ?');
    const updated = getStmt.get(id);

    res.json({
      success: true,
      amen_count: updated.amen_count
    });
  } catch (error) {
    console.error('Erro ao adicionar amém:', error);
    res.status(500).json({ success: false, message: 'Erro ao registrar interação.' });
  }
});

app.delete('/api/declarations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const clientToken = req.headers['x-delete-token'] || req.body?.delete_token || req.query?.token;

    const getStmt = db.prepare('SELECT * FROM declarations WHERE id = ?');
    const declaration = getStmt.get(id);

    if (!declaration) {
      return res.status(404).json({ success: false, message: 'Declaração não encontrada.' });
    }

    if (declaration.is_pinned === 1 || (declaration.name && declaration.name.toLowerCase().includes('habacuque'))) {
      return res.status(403).json({ success: false, message: 'A profissão de fé de Habacuque não pode ser excluída.' });
    }

    // Se a declaração tiver token de autor registrado, valida o token
    if (declaration.delete_token && declaration.delete_token !== clientToken) {
      return res.status(403).json({ success: false, message: 'Apenas o autor pode excluir esta declaração.' });
    }

    const deleteStmt = db.prepare('DELETE FROM declarations WHERE id = ?');
    deleteStmt.run(id);

    res.json({
      success: true,
      message: 'Declaração excluída com sucesso.'
    });
  } catch (error) {
    console.error('Erro ao excluir declaração:', error);
    res.status(500).json({ success: false, message: 'Não foi possível excluir a declaração.' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_declarations,
        COALESCE(SUM(amen_count), 0) as total_amens
      FROM declarations
    `);
    const stats = stmt.get();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao obter estatísticas.' });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✨ Servidor "Minha Profissão de Fé" rodando em http://localhost:${PORT}`);
});
