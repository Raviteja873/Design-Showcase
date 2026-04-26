const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'super_secret_jwt_key_design_showcase';

// ✅ CORS FIX
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Upload folder
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.random();
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// DB
const db = new Database(path.join(__dirname, 'db.sqlite'));

db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
)`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS designs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  description TEXT,
  image_url TEXT,
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

// Default admin
const user = db.prepare("SELECT * FROM users WHERE username=?").get("Raviteja873");
if (!user) {
  const hash = bcrypt.hashSync("Raviteja@123", 10);
  db.prepare("INSERT INTO users (username,password) VALUES (?,?)")
    .run("Raviteja873", hash);
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const user = jwt.verify(token, SECRET_KEY);
    req.user = user;
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
};

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username=?").get(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(user, SECRET_KEY, { expiresIn: '12h' });

  // ✅ COOKIE FIX
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true
  });

  res.json({ message: "Login success" });
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: "Logged out" });
});

// Auth check
app.get('/api/auth/status', authenticateToken, (req, res) => {
  res.json({ loggedIn: true });
});

// Get designs
app.get('/api/designs', (req, res) => {
  const data = db.prepare("SELECT * FROM designs ORDER BY created_at DESC").all();
  res.json(data);
});

// Create
app.post('/api/designs', authenticateToken, upload.single('image'), (req, res) => {
  const { title, description, category } = req.body;
  const imageUrl = '/uploads/' + req.file.filename;

  const result = db.prepare(`
    INSERT INTO designs (title, description, image_url, category)
    VALUES (?, ?, ?, ?)
  `).run(title, description, imageUrl, category);

  res.json({ id: result.lastInsertRowid });
});

// Delete
app.delete('/api/designs/:id', authenticateToken, (req, res) => {
  db.prepare("DELETE FROM designs WHERE id=?").run(req.params.id);
  res.json({ message: "Deleted" });
});

// Root fix
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log("Server running"));
