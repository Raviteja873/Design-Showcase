const express = require('express');
const Database = require('better-sqlite3'); // ✅ changed
const multer  = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'super_secret_jwt_key_design_showcase';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads dir
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ✅ DB (changed)
const db = new Database(path.join(__dirname, 'db.sqlite'));

function initDb() {
  db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS designs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    image_url TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run();

  const user = db.prepare(`SELECT * FROM users WHERE username = ?`).get('Raviteja873');
  if (!user) {
    const hash = bcrypt.hashSync('Raviteja@123', 10);
    db.prepare(`INSERT INTO users (username, password) VALUES (?, ?)`)
      .run('Raviteja873', hash);
  }
}
initDb();

// Auth middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const user = jwt.verify(token, SECRET_KEY);
    req.user = user;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '12h' });
  res.cookie('token', token, { httpOnly: true });
  res.json({ message: 'Logged in' });
});

// Get designs
app.get('/api/designs', (req, res) => {
  const rows = db.prepare("SELECT * FROM designs ORDER BY created_at DESC").all();
  res.json(rows);
});

// Create design
app.post('/api/designs', authenticateToken, upload.single('image'), (req, res) => {
  const { title, description, category } = req.body;
  const imageUrl = '/uploads/' + req.file.filename;

  const result = db.prepare(`
    INSERT INTO designs (title, description, image_url, category)
    VALUES (?, ?, ?, ?)
  `).run(title, description, imageUrl, category);

  res.json({ id: result.lastInsertRowid });
});

// Delete design
app.delete('/api/designs/:id', authenticateToken, (req, res) => {
  const id = req.params.id;

  const row = db.prepare("SELECT image_url FROM designs WHERE id=?").get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  db.prepare("DELETE FROM designs WHERE id=?").run(id);

  try {
    const filepath = path.join(__dirname, 'public', row.image_url);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  } catch {}

  res.json({ message: 'Deleted' });
});

// Start
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
