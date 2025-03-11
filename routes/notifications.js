const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    db.all("SELECT * FROM notifications WHERE user_id = ? AND read = 0", [req.session.user.id], (err, notifications) => {
      res.render('notifications', { notifications });
    });
  });

  return router;
};