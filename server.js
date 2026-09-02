const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const { promisify } = require('util');

const app = express();
const PORT = 3000;

// ===== Middleware =====
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ===== Database Setup (sqlite3 with promise wrappers for async/await) =====
const dbPath = path.join(__dirname, 'cozzy.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ DB connection error:', err.message);
    else console.log('💖 SQL Database connected (cozzy.db)');
});

// Promisify sqlite3 callbacks so we can use async/await
const dbRun = promisify(db.run).bind(db);
const dbGet = promisify(db.get).bind(db);
const dbAll = promisify(db.all).bind(db);
const dbExec = promisify(db.exec).bind(db);

// Create tables if they don't exist (run once on startup)
(async function initTables() {
    try {
        await dbExec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(email),
                UNIQUE(phone)
            );
            CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                favorite_scents TEXT NOT NULL,
                free_time_activities TEXT NOT NULL,
                saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_no TEXT NOT NULL UNIQUE,
                user_id INTEGER,
                total REAL NOT NULL,
                shipping_cost REAL NOT NULL,
                status TEXT DEFAULT 'placed',
                ship_name TEXT NOT NULL,
                ship_email TEXT NOT NULL,
                ship_phone TEXT NOT NULL,
                ship_addr1 TEXT NOT NULL,
                ship_addr2 TEXT,
                ship_city TEXT NOT NULL,
                ship_zip TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                product_scent TEXT NOT NULL,
                unit_price REAL NOT NULL,
                quantity INTEGER NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            );
        `);
    } catch (e) { console.error('Table init error:', e.message); }
})();

// Helpers (same as before - bcrypt is still sync)
const hash = (pw) => bcrypt.hashSync(pw, 10);
const compare = (pw, h) => bcrypt.compareSync(pw, h);

// Helper: get last insert ID after dbRun (sqlite3 puts it on `this`)
function runAndGetId(sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

// =====================================================
// ================== API ENDPOINTS ====================
// =====================================================

// ===== [1] AUTH: SIGNUP =====
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, identifier, password } = req.body;
        if (!name || !identifier || !password) {
            return res.status(400).json({ success: false, message: 'All fields required' });
        }
        if (password.length < 4) {
            return res.status(400).json({ success: false, message: 'Password too short' });
        }
        const isEmail = identifier.includes('@');
        const col = isEmail ? 'email' : 'phone';

        // Check if already exists
        const existing = await dbGet(`SELECT id FROM users WHERE ${col} = ?`, [identifier]);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Account already exists' });
        }

        // Insert into SQL users table and get new user ID
        const newId = await runAndGetId(
            `INSERT INTO users (name, ${col}, password) VALUES (?, ?, ?)`,
            [name, identifier, hash(password)]
        );

        const user = await dbGet(`SELECT id, name, email, phone, created_at FROM users WHERE id = ?`, [newId]);
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===== [2] AUTH: LOGIN =====
app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({ success: false, message: 'All fields required' });
        }
        const isEmail = identifier.includes('@');
        const col = isEmail ? 'email' : 'phone';

        const row = await dbGet(`SELECT * FROM users WHERE ${col} = ?`, [identifier]);
        if (!row || !compare(password, row.password)) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = { id: row.id, name: row.name, email: row.email, phone: row.phone, created_at: row.created_at };
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===== [3] GET USER PREFERENCES (for a user) =====
app.get('/api/preferences/:userId', async (req, res) => {
    try {
        const row = await dbGet(`SELECT * FROM user_preferences WHERE user_id = ?`, [req.params.userId]);
        if (!row) return res.json({ success: true, preferences: null });
        res.json({
            success: true,
            preferences: {
                id: row.id,
                userId: row.user_id,
                favoriteScents: JSON.parse(row.favorite_scents),
                freeTimeActivities: JSON.parse(row.free_time_activities),
                savedAt: row.saved_at
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===== [4] SAVE USER PREFERENCES =====
app.post('/api/preferences', async (req, res) => {
    try {
        const { userId, favoriteScents, freeTimeActivities } = req.body;
        if (!userId || !favoriteScents?.length || !freeTimeActivities?.length) {
            return res.status(400).json({ success: false, message: 'Select at least one from each 💗' });
        }

        const scentsJson = JSON.stringify(favoriteScents);
        const hobbiesJson = JSON.stringify(freeTimeActivities);

        // Upsert: check existing first, then UPDATE or INSERT
        const existing = await dbGet(`SELECT id FROM user_preferences WHERE user_id = ?`, [userId]);
        if (existing) {
            await dbRun(
                `UPDATE user_preferences SET favorite_scents = ?, free_time_activities = ?, saved_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
                [scentsJson, hobbiesJson, userId]
            );
        } else {
            await dbRun(
                `INSERT INTO user_preferences (user_id, favorite_scents, free_time_activities) VALUES (?, ?, ?)`,
                [userId, scentsJson, hobbiesJson]
            );
        }
        res.json({ success: true, message: 'Preferences saved! ✨' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===== [5] CREATE ORDER =====
app.post('/api/orders', async (req, res) => {
    try {
        const { userId, items, total, shippingCost, shipping } = req.body;
        if (!items?.length || !shipping) {
            return res.status(400).json({ success: false, message: 'Cart empty or missing shipping info' });
        }

        const orderNo = 'COZ' + Date.now().toString().slice(-8);

        // SQL transaction using BEGIN / COMMIT / ROLLBACK (sqlite3 async)
        await dbRun('BEGIN');
        try {
            // 1. Insert into orders table
            const orderId = await runAndGetId(`
                INSERT INTO orders (order_no, user_id, total, shipping_cost, ship_name, ship_email, ship_phone, ship_addr1, ship_addr2, ship_city, ship_zip)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                orderNo,
                userId || null,
                total,
                shippingCost,
                shipping.name, shipping.email, shipping.phone,
                shipping.addr1, shipping.addr2 || '', shipping.city, shipping.zip
            ]);

            // 2. Insert each item into order_items (sequentially inside tx)
            for (const it of items) {
                await dbRun(
                    `INSERT INTO order_items (order_id, product_id, product_name, product_scent, unit_price, quantity) VALUES (?, ?, ?, ?, ?, ?)`,
                    [orderId, it.id, it.name, it.scent, it.price, it.qty]
                );
            }

            await dbRun('COMMIT');
            res.json({ success: true, orderNo });
        } catch (txErr) {
            await dbRun('ROLLBACK');
            throw txErr;
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===== [6] GET ALL ORDERS (for a user) =====
app.get('/api/orders/:userId', async (req, res) => {
    try {
        const orders = await dbAll(`
            SELECT o.*,
                (SELECT JSON_GROUP_ARRAY(JSON_OBJECT(
                    'product_id', oi.product_id,
                    'product_name', oi.product_name,
                    'product_scent', oi.product_scent,
                    'unit_price', oi.unit_price,
                    'quantity', oi.quantity
                )) FROM order_items oi WHERE oi.order_id = o.id) AS items
            FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC
        `, [req.params.userId]);

        const parsed = orders.map(o => ({ ...o, items: JSON.parse(o.items || '[]') }));
        res.json({ success: true, orders: parsed });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===== [7] GET EVERYTHING (admin view) =====
app.get('/api/admin/all', async (req, res) => {
    try {
        const users = await dbAll(`SELECT id, name, email, phone, created_at FROM users`);
        const prefs = await dbAll(`SELECT p.*, u.name AS user_name FROM user_preferences p JOIN users u ON p.user_id = u.id`);
        const orders = await dbAll(`
            SELECT o.*,
                (SELECT JSON_GROUP_ARRAY(JSON_OBJECT(
                    'product_name', oi.product_name,
                    'product_scent', oi.product_scent,
                    'unit_price', oi.unit_price,
                    'quantity', oi.quantity
                )) FROM order_items oi WHERE oi.order_id = o.id) AS items
            FROM orders o ORDER BY o.created_at DESC
        `);

        res.json({
            users: users.map(u => {
                const p = prefs.find(pp => pp.user_id === u.id);
                return { ...u, preferences: p ? { favoriteScents: JSON.parse(p.favorite_scents), freeTimeActivities: JSON.parse(p.free_time_activities) } : null };
            }),
            orders: orders.map(o => ({ ...o, items: JSON.parse(o.items || '[]') }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===== Start Server =====
app.listen(PORT, () => {
    console.log(`\n🕯️  Cozzy Creations running on http://localhost:${PORT}\n`);
    console.log(`   🛍️   Shop:     http://localhost:${PORT}`);
    console.log(`   📊   Admin DB: http://localhost:${PORT}/api/admin/all\n`);
});