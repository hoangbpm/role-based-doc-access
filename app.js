const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./database.db');

// Cấu hình Express
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: false }));
app.use(express.static('public'));

// Khởi tạo cơ sở dữ liệu
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      file_path TEXT,
      created_by INTEGER,
      FOREIGN KEY(created_by) REFERENCES users(id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS edit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER,
      requested_by INTEGER,
      section_to_edit TEXT,
      status TEXT DEFAULT 'pending',
      approved_by INTEGER,
      assigned_to INTEGER,
      FOREIGN KEY(document_id) REFERENCES documents(id),
      FOREIGN KEY(requested_by) REFERENCES users(id),
      FOREIGN KEY(approved_by) REFERENCES users(id),
      FOREIGN KEY(assigned_to) REFERENCES users(id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      message TEXT,
      read BOOLEAN DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
  });
  // Thêm dữ liệu mẫu nếu chưa có
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (row.count === 0) {
      const hashedPassword = bcrypt.hashSync('password123', 10);
      db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
        ['director', hashedPassword, 'director']);
      db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
        ['manager', hashedPassword, 'manager']);
      db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
        ['employee', hashedPassword, 'employee']);
    }
  });


// Middleware kiểm tra đăng nhập
function ensureAuthenticated(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login');
  next();
}

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/documents', ensureAuthenticated, require('./routes/documents')(db));
app.use('/edit_requests', ensureAuthenticated, require('./routes/edit_requests')(db));
app.use('/notifications', ensureAuthenticated, require('./routes/notifications')(db));

app.listen(3000, () => console.log('Server chạy trên cổng 3000'));