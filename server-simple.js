// Servidor simple en JavaScript puro - sin TypeScript, sin build
const express = require('express');
const cors = require('cors');
const pg = require('pg');

const PORT = process.env.PORT || 8080;
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:6715320@79.143.187.160:5433/tecnovariedades?sslmode=disable';

const app = express();
const pool = new pg.Pool({ connectionString: DATABASE_URL });

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json({ products: result.rows });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error fetching products' });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Error fetching product' });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const { name, description, price, category, inStock, imageUrl, featured, tags } = req.body;
    const id = require('crypto').randomUUID();
    
    const result = await pool.query(
      `INSERT INTO products (id, name, description, price, category, in_stock, image_url, featured, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, name, description, price, category, inStock !== false, imageUrl, featured || false, tags]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Error creating product' });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, description, price, category, inStock, imageUrl, featured, tags } = req.body;
    
    const result = await pool.query(
      `UPDATE products 
       SET name = $1, description = $2, price = $3, category = $4, 
           in_stock = $5, image_url = $6, featured = $7, tags = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [name, description, price, category, inStock, imageUrl, featured, tags, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Error updating product' });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Error deleting product' });
  }
});

// Get bot config
app.get('/api/bot-config', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bot_config WHERE id = $1', ['default']);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bot config not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching bot config:', error);
    res.status(500).json({ error: 'Error fetching bot config' });
  }
});

// Update bot config
app.put('/api/bot-config/:id', async (req, res) => {
  try {
    const updates = req.body;
    const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = Object.values(updates);
    values.push(req.params.id);
    
    const result = await pool.query(
      `UPDATE bot_config SET ${fields}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bot config not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating bot config:', error);
    res.status(500).json({ error: 'Error updating bot config' });
  }
});

// Get contacts
app.get('/api/contacts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json({ contacts: result.rows });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Error fetching contacts' });
  }
});

// Get conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, co.name as contact_name, co.phone as contact_phone
      FROM conversations c
      LEFT JOIN contacts co ON c.contact_id = co.id
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
    `);
    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Error fetching conversations' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[VentaFlow] ✅ Servidor iniciado en puerto ${PORT}`);
  console.log(`[VentaFlow] 📊 API: http://localhost:${PORT}/api`);
  console.log(`[VentaFlow] 🗄️  Base de datos: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`[VentaFlow] 🚀 Listo para recibir peticiones`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[VentaFlow] Cerrando servidor...');
  await pool.end();
  process.exit(0);
});
