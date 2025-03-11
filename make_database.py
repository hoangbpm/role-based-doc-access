import sqlite3
import bcrypt

def create_database():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    # Tạo bảng users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
    )
    """)

    # Tạo bảng documents
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        file_path TEXT,
        created_by INTEGER,
        FOREIGN KEY(created_by) REFERENCES users(id)
    )
    """)

    # Tạo bảng edit_requests
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS edit_requests (
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
    )
    """)

    # Tạo bảng notifications
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        message TEXT,
        read BOOLEAN DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    # Kiểm tra và thêm dữ liệu mẫu vào bảng users
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        users = [
            ("giamdoc", bcrypt.hashpw("giamdoc@".encode(), bcrypt.gensalt()).decode(), "director"),
            ("truongphong1", bcrypt.hashpw("truongphong".encode(), bcrypt.gensalt()).decode(), "manager"),
            ("truongphong2", bcrypt.hashpw("truongphong".encode(), bcrypt.gensalt()).decode(), "manager"),
            ("nhanvien1", bcrypt.hashpw("nhanvien1@".encode(), bcrypt.gensalt()).decode(), "employee"),
            ("nhanvien2", bcrypt.hashpw("nhanvien2@".encode(), bcrypt.gensalt()).decode(), "employee"),
            ("nhanvien3", bcrypt.hashpw("nhanvien3@".encode(), bcrypt.gensalt()).decode(), "employee")
        ]
        cursor.executemany("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", users)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    create_database()
    print("Database created successfully!")
