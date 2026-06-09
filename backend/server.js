// Import required modules
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// DATABASE CONNECTION
// ============================================

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'food_order_db',
    port: process.env.DB_PORT || 3306, 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// Test database connection
async function testConnection() {
    try {
        const connection = await db.getConnection();
        console.log('✅ Successfully connected to MySQL database');
        connection.release();
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
}

testConnection();

// ============================================
// API ROUTES
// ============================================

// Root endpoint - Health check
app.get('/', (req, res) => {
    res.json({ 
        message: 'Food Ordering API is running!',
        version: '1.0.0',
        endpoints: {
            menu: 'GET /api/menu',
            orders: 'POST /api/orders',
            orderById: 'GET /api/orders/:id'
        }
    });
});

// GET /api/menu - Retrieve all menu items
app.get('/api/menu', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM menu_items ORDER BY id');
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error fetching menu items:', err);
        res.status(500).json({ 
            error: 'Failed to fetch menu items',
            message: err.message 
        });
    }
});

// POST /api/orders - Create a new order
app.post('/api/orders', async (req, res) => {
    const { customer_name, items } = req.body;

    // Validation
    if (!customer_name || !customer_name.trim()) {
        return res.status(400).json({ error: 'Customer name is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'At least one item is required' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Calculate total price from database
        let totalPrice = 0;
        const itemIds = items.map(item => item.id);
        
        const [menuItems] = await connection.query(
            'SELECT id, price FROM menu_items WHERE id IN (?)', 
            [itemIds]
        );

        const priceMap = {};
        menuItems.forEach(item => {
            priceMap[item.id] = parseFloat(item.price);
        });

        for (const item of items) {
            if (!priceMap[item.id]) {
                throw new Error(`Item with ID ${item.id} not found in menu`);
            }
            totalPrice += priceMap[item.id] * item.quantity;
        }

        // Insert into orders table
        const [orderResult] = await connection.query(
            'INSERT INTO orders (customer_name, total_price) VALUES (?, ?)',
            [customer_name.trim(), totalPrice]
        );
        
        const newOrderId = orderResult.insertId;

        // Insert into order_items table
        const orderItemsData = items.map(item => [
            newOrderId,
            item.id,
            item.quantity
        ]);

        await connection.query(
            'INSERT INTO order_items (order_id, item_id, quantity) VALUES ?',
            [orderItemsData]
        );

        await connection.commit();

        res.status(201).json({ 
            message: 'Order placed successfully!',
            orderId: newOrderId,
            totalPrice: totalPrice.toFixed(2),
            itemCount: items.length
        });

    } catch (err) {
        await connection.rollback();
        console.error('Error placing order:', err);
        res.status(500).json({ 
            error: 'Failed to place order',
            message: err.message 
        });
    } finally {
        connection.release();
    }
});

// GET /api/orders/:id - Retrieve a specific order
app.get('/api/orders/:id', async (req, res) => {
    const orderId = parseInt(req.params.id);

    if (isNaN(orderId)) {
        return res.status(400).json({ error: 'Invalid order ID' });
    }

    try {
        const [orders] = await db.query(
            'SELECT * FROM orders WHERE id = ?',
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const [orderItems] = await db.query(
            `SELECT oi.quantity, mi.name, mi.price, mi.description
             FROM order_items oi
             JOIN menu_items mi ON oi.item_id = mi.id
             WHERE oi.order_id = ?`,
            [orderId]
        );

        res.status(200).json({
            order: orders[0],
            items: orderItems
        });

    } catch (err) {
        console.error('Error fetching order:', err);
        res.status(500).json({ 
            error: 'Failed to fetch order',
            message: err.message 
        });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.path 
    });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║   🚀 Server is running successfully   ║
    ║   📍 Port: ${PORT}                        ║
    ║   🌐 URL: http://localhost:${PORT}        ║
    ╚════════════════════════════════════════╝
    `);
});

process.on('SIGINT', async () => {
    console.log('\n⏳ Shutting down gracefully...');
    await db.end();
    console.log('✅ Database connection closed');
    process.exit(0);
});
