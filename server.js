const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer  = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'super_secret_jwt_key_design_showcase'; // in production, use process.env

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads dir if not exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|png|jpeg|jpg|svg/i;
    const extMatch = allowed.test(path.extname(file.originalname));
    if (extMatch) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PNG, JPG, JPEG, and SVG are allowed.'));
    }
  }
});

// DB setup
const db = new sqlite3.Database(path.join(__dirname, 'db.sqlite'), (err) => {
  if (err) {
    console.error('Error connecting to DB', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDb();
  }
});

function initDb() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`, () => {
    // Setup new admin
    const defaultUsername = 'Raviteja873';
    const defaultPassword = 'Raviteja@123';
    db.get(`SELECT * FROM users WHERE username = ?`, [defaultUsername], (err, row) => {
      if (!row) {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(defaultPassword, salt);
        // Clear the old admin if they exist
        db.run(`DELETE FROM users WHERE username = 'admin'`);
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [defaultUsername, hash]);
        console.log(`Admin user initialized -> username: ${defaultUsername}`);
      }
    });
  });

  db.run(`CREATE TABLE IF NOT EXISTS designs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    image_url TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// --- API ROUTES ---

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '12h' });
    res.cookie('token', token, { httpOnly: true });
    res.json({ message: 'Logged in successfully' });
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// Check auth status
app.get('/api/auth/status', authenticateToken, (req, res) => {
  res.json({ loggedIn: true, user: req.user.username });
});

// Get all designs
app.get('/api/designs', (req, res) => {
  const { category, search } = req.query;
  let query = 'SELECT * FROM designs';
  let params = [];
  let conditions = [];

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (search) {
    conditions.push('(title LIKE ? OR description LIKE ?)');
    params.push('%' + search + '%', '%' + search + '%');
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get specific design
app.get('/api/designs/:id', (req, res) => {
  db.get('SELECT * FROM designs WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

// Create design
app.post('/api/designs', authenticateToken, upload.single('image'), (req, res) => {
  const { title, description, category } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ error: 'Image is required' });
  }
  
  const imageUrl = '/uploads/' + req.file.filename;

  db.run(`INSERT INTO designs (title, description, image_url, category) VALUES (?, ?, ?, ?)`,
    [title, description, imageUrl, category],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, title, description, image_url: imageUrl, category });
    }
  );
});

// Update design
app.put('/api/designs/:id', authenticateToken, upload.single('image'), (req, res) => {
  const id = req.params.id;
  const { title, description, category } = req.body;
  
  db.get('SELECT image_url FROM designs WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Design not found' });
    
    let imageUrl = row.image_url;
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename;
      // Optional: Delete old image completely here if desired, skipping for simplicity
    }
    
    db.run(`UPDATE designs SET title = ?, description = ?, image_url = ?, category = ? WHERE id = ?`,
      [title, description, imageUrl, category, id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, title, description, image_url: imageUrl, category });
      }
    );
  });
});

// Delete design
app.delete('/api/designs/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  db.get('SELECT image_url FROM designs WHERE id = ?', [id], (err, row) => {
    if (err || !row) {
      console.log('Delete error: No design found with id', id);
      return res.status(404).json({ error: 'Design not found' });
    }
    
    db.run(`DELETE FROM designs WHERE id = ?`, [id], function(err) {
      if (err) {
        console.error('Delete DB error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      try {
        // Delete the associated file
        const filepath = path.join(__dirname, 'public', row.image_url);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      } catch (fileErr) {
        console.error('Failed to unlink file (ignoring):', fileErr.message);
      }
      
      res.json({ message: 'Deleted successfully' });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
