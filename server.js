const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname)));

const DB_CONFIG = {
host: process.env.DB_HOST || 'localhost',
user: process.env.DB_USER || 'root',
password: process.env.DB_PASS || 'Suraj@sql21X',
database: process.env.DB_NAME || 'chat_app',
port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
connectionLimit: 10
};

let pool;

async function initDb() {
try {
pool = mysql.createPool(DB_CONFIG);
await pool.query(`
CREATE TABLE IF NOT EXISTS messages (
id INT AUTO_INCREMENT PRIMARY KEY,
sender VARCHAR(100) NOT NULL,
content TEXT NOT NULL,
is_anonymous BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`);
console.log('DB connected and messages table ready');
} catch (err) {
console.error('DB init error', err);
process.exit(1);
}
}

// GET messages 
app.get('/api/messages', async (req, res) => {
try {
const sinceId = req.query.sinceId ? Number(req.query.sinceId) : 0;
// Return last 100 messages newer than sinceId
const [rows] = await pool.query(
'SELECT id, sender, content, is_anonymous, created_at FROM messages WHERE id > ? ORDER BY id ASC LIMIT 500',
[sinceId]
);
res.json({ ok: true, messages: rows });
} catch (err) {
console.error(err);
res.status(500).json({ ok: false, error: 'db error' });
}
});

// POST a message
app.post('/api/messages', async (req, res) => {
try {
const { sender, content, is_anonymous } = req.body;
if (!content || content.trim().length === 0) {
return res.status(400).json({ ok: false, error: 'empty content' });
}
const s = sender && sender.trim().length > 0 ? sender.trim() : 'Anonymous';
const [result] = await pool.query(
'INSERT INTO messages (sender, content, is_anonymous) VALUES (?, ?, ?)',
[s, content.trim(), !!is_anonymous]
);
const insertedId = result.insertId;
const [rows] = await pool.query('SELECT id, sender, content, is_anonymous, created_at FROM messages WHERE id = ?', [insertedId]);
res.json({ ok: true, message: rows[0] });
} catch (err) {
console.error(err);
res.status(500).json({ ok: false, error: 'db error' });
}
});

const PORT = process.env.PORT || 3000;
initDb().then(() => {
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});