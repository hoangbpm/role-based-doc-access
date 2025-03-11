const express = require('express');
const path = require('path');

module.exports = function(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    db.all("SELECT * FROM documents", (err, documents) => {
      res.render('documents', { documents, user: req.session.user });
    });
  });

  router.get('/new', (req, res) => res.render('new_document'));

  router.post('/new', (req, res) => {
    const { title, file_path } = req.body;
    const created_by = req.session.user.id;
    db.run("INSERT INTO documents (title, file_path, created_by) VALUES (?, ?, ?)", 
      [title, file_path, created_by], (err) => {
        if (err) return res.render('new_document', { error: 'Không thể thêm tài liệu' });
        res.redirect('/documents');
      });
  });

  router.get('/view/:id', (req, res) => {
    db.get("SELECT file_path FROM documents WHERE id = ?", [req.params.id], (err, doc) => {
      if (err || !doc) return res.status(404).send('Không tìm thấy tài liệu');
      res.sendFile(path.join(__dirname, '..', doc.file_path));
    });
  });

  return router;
};