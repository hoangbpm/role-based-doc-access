const express = require('express');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');


module.exports = express.Router()
  .get('/login', (req, res) => res.render('login', { error: null }))
  .post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
      if (user && bcrypt.compareSync(password, user.password)) {
        req.session.user = { id: user.id, username: user.username, role: user.role };
        res.redirect('/documents');
      } else {
        res.render('login', { error: 'Thông tin đăng nhập không đúng' });
      }
    });
  })
  .get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
  });