const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // Route để hiển thị form yêu cầu chỉnh sửa
  router.get('/request-edit/:doc_id', (req, res) => {
    const doc_id = req.params.doc_id;
    res.render('request_edit', { doc_id, error: null });
  });

  // Route xử lý yêu cầu chỉnh sửa
  router.post('/request-edit', (req, res) => {
    const { doc_id, section_to_edit } = req.body;
    const requested_by = req.session?.user?.id;

    // Kiểm tra dữ liệu đầu vào
    if (!doc_id || !section_to_edit || !requested_by) {
      console.error("Lỗi: Dữ liệu đầu vào không hợp lệ", { doc_id, section_to_edit, requested_by });
      return res.render('request_edit', { doc_id, error: 'Dữ liệu đầu vào không hợp lệ' });
    }

    // Thêm yêu cầu chỉnh sửa vào bảng edit_requests
    db.run(
      "INSERT INTO edit_requests (document_id, requested_by, section_to_edit, status) VALUES (?, ?, ?, 'pending')",
      [doc_id, requested_by, section_to_edit],
      (err) => {
        if (err) {
          console.error("Lỗi khi chèn edit_requests:", err);
          return res.render('request_edit', { doc_id, error: 'Không thể tạo yêu cầu' });
        }

        // Thông báo cho director và manager
        db.all("SELECT id FROM users WHERE role IN ('director', 'manager')", (err, users) => {
          if (err) {
            console.error("Lỗi truy vấn users:", err);
            return res.render('request_edit', { doc_id, error: 'Lỗi truy vấn cơ sở dữ liệu' });
          }

          if (users && users.length > 0) {
            users.forEach(user => {
              db.run(
                "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
                [user.id, `Yêu cầu chỉnh sửa mới cho tài liệu ${doc_id}`],
                (err) => {
                  if (err) console.error("Lỗi khi chèn notifications:", err);
                }
              );
            });
          }
          res.redirect('/documents');
        });
      }
    );
  });

  // Route hiển thị danh sách yêu cầu chỉnh sửa
  router.get('/', (req, res) => {
    const user = req.session?.user;
    if (!user) {
      console.error("Lỗi: Không tìm thấy thông tin user trong session");
      return res.redirect('/auth/login');
    }

    let query;
    let params = [];

    if (user.role === 'director') {
      query = "SELECT er.*, d.title FROM edit_requests er LEFT JOIN documents d ON er.document_id = d.id WHERE status = 'pending'";
    } else if (user.role === 'manager') {
      query = "SELECT er.*, d.title FROM edit_requests er LEFT JOIN documents d ON er.document_id = d.id WHERE assigned_to = ? AND status = 'approved'";
      params = [user.id];
    } else {
      query = "SELECT er.*, d.title FROM edit_requests er LEFT JOIN documents d ON er.document_id = d.id WHERE requested_by = ?";
      params = [user.id];
    }

    db.all(query, params, (err, requests) => {
      if (err) {
        console.error("Lỗi truy vấn danh sách yêu cầu:", err);
        return res.status(500).send('Lỗi truy vấn dữ liệu');
      }
      console.log("Requests for", user.role, ":", requests);
      requests = requests || [];

      if (user.role === 'director') {
        db.all("SELECT id, username FROM users WHERE role = 'manager'", [], (err, managers) => {
          if (err) {
            console.error("Lỗi truy vấn managers:", err);
            return res.status(500).send('Lỗi truy vấn dữ liệu');
          }
          console.log("Managers:", managers);
          managers = managers || [];
          res.render('requests', { requests, managers, user });
        });
      } else {
        res.render('requests', { requests, user });
      }
    });
  });

  // Route phê duyệt yêu cầu chỉnh sửa (chỉ dành cho director)
  router.post('/approve-request/:id', (req, res) => {
    const user = req.session?.user;
    if (!user || user.role !== 'director') {
      console.error("Lỗi: Không có quyền phê duyệt", { user });
      return res.status(403).send('Không có quyền');
    }

    const request_id = req.params.id;
    const { assigned_to } = req.body;
    const approved_by = user.id;

    if (!assigned_to || !request_id) {
      console.error("Lỗi: Dữ liệu đầu vào không hợp lệ", { request_id, assigned_to });
      return res.status(400).send('Dữ liệu không hợp lệ');
    }

    db.run(
      "UPDATE edit_requests SET status = 'approved', assigned_to = ?, approved_by = ? WHERE id = ?",
      [assigned_to, approved_by, request_id],
      (err) => {
        if (err) {
          console.error("Lỗi khi cập nhật edit_requests:", err);
          return res.status(500).send('Lỗi cập nhật yêu cầu');
        }

        db.run(
          "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
          [assigned_to, `Bạn được phân công chỉnh sửa tài liệu cho yêu cầu ${request_id}`],
          (err) => {
            if (err) {
              console.error("Lỗi khi chèn notifications:", err);
            }
            res.redirect('/edit_requests');
          }
        );
      }
    );
  });

  // Route hoàn thành yêu cầu chỉnh sửa (chỉ dành cho manager)
  router.post('/complete-request/:id', (req, res) => {
    const user = req.session?.user;
    if (!user || user.role !== 'manager') {
      console.error("Lỗi: Không có quyền hoàn thành", { user });
      return res.status(403).send('Không có quyền');
    }

    const request_id = req.params.id;

    db.get(
      "SELECT assigned_to FROM edit_requests WHERE id = ?",
      [request_id],
      (err, request) => {
        if (err) {
          console.error("Lỗi truy vấn edit_requests:", err);
          return res.status(500).send('Lỗi truy vấn dữ liệu');
        }

        if (!request) {
          console.error("Lỗi: Không tìm thấy yêu cầu", { request_id });
          return res.status(404).send('Không tìm thấy yêu cầu');
        }

        if (request.assigned_to !== user.id) {
          console.error("Lỗi: Người dùng không được phép hoàn thành yêu cầu", { user_id: user.id, assigned_to: request.assigned_to });
          return res.status(403).send('Không được phép');
        }

        db.run(
          "UPDATE edit_requests SET status = 'completed' WHERE id = ?",
          [request_id],
          (err) => {
            if (err) {
              console.error("Lỗi khi cập nhật trạng thái edit_requests:", err);
              return res.status(500).send('Lỗi cập nhật trạng thái');
            }
            res.redirect('/edit_requests');
          }
        );
      }
    );
  });

  return router;
};