const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    db.run(
        `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
        [name, email, password],
        function (err) {
            if (err) {
                return res.status(400).json({ error: 'Користувач з таким email вже існує' });
            }
            res.status(201).json({ id: this.lastID, name, email });
        }
    );
}
);

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get(
        `SELECT * FROM users WHERE email = ? AND password = ?`,
        [email, password],
        (err, row) => {
        
            if(err) return res.status(500).json({ error: 'Помилка сервера' });
            if (!row) {
                return res.status(401).json({ error: 'Невірний email або пароль' });
                
            }
            res.status(200).json({ id: row.id, name: row.name, email: row.email });
        }
    );
});

app.listen(3001, () => {
    console.log('Сервер запущено на порту 3001');
});