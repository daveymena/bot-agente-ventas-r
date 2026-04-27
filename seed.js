// Script de seed simple sin dependencias de build
const pg = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:6715320@79.143.187.160:5433/tecnovariedades?sslmode=disable";

async function seed() {
  console.log("[VentaFlow] Conectando a la base de datos...");
  
  const client = new pg.Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log("[VentaFlow] ✅ Conectado a PostgreSQL");
    
    // Bot configuration - 24/7
    console.log("[VentaFlow] Configurando bot...");
    await client.query(`
      INSERT INTO bot_config (
        id, business_name, welcome_message, system_prompt,
        ollama_url, ollama_model, ollama_temperature, ollama_max_tokens,
        auto_reply, working_hours_enabled, working_hours_start, working_hours_end,
        off_hours_message, allowed_numbers, payment_methods, language,
        ai_provider, ai_model
      ) VALUES (
        'default',
        'VentaFlow',
        '¡Hola! 👋 Bienvenido a VentaFlow. Soy tu asesor comercial automatizado disponible 24/7. Tenemos más de 80 cursos digitales descargables (Diseño, Marketing, Excel, Idiomas, Tech, Música, Oficios y más). ¿Qué te gustaría aprender hoy?',
        'Eres un asesor de ventas profesional de VentaFlow, un sistema automatizado que comercializa cursos digitales descargables (Megapacks). Cada curso incluye: contenido virtual y descargable (MP4/PDF), acceso permanente vía Google Drive, sin clases en vivo, estudio autónomo, sin certificación oficial, entrega inmediata. Precios: el catálogo principal cuesta $20.000 COP por curso (algunos premium $60.000 COP). Métodos de pago: Nequi, Daviplata, Bancolombia, PSE. Tu objetivo es: 1) Saludar al prospecto cordialmente, 2) Detectar qué tipo de curso busca, 3) Presentar el curso con su emoji, descripción, número de clases y duración, 4) Manejar objeciones (precio, entrega, certificación), 5) Cerrar la venta confirmando método de pago y enviando link de Google Drive tras pago, 6) Seguimiento post-venta. Responde siempre en español, sé amable, profesional y conciso. Usa emojis con moderación. Estás disponible 24/7 para atender a los clientes en cualquier momento.',
        'https://n8n-ollama.ginee6.easypanel.host',
        'qwen2.5:1.5b',
        '0.7',
        '512',
        true,
        false,
        '00:00',
        '23:59',
        '¡Gracias por escribir a VentaFlow! 🌙 Aunque estamos disponibles 24/7, si necesitas atención personalizada, un asesor humano te contactará pronto.',
        '',
        'Nequi,Daviplata,Bancolombia,PSE',
        'es',
        'ollama',
        'qwen2.5:1.5b'
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log("[VentaFlow] ✅ Bot configurado");
    
    // Load products from JSON
    const productsPath = path.join(__dirname, 'scripts', 'data', 'products.json');
    if (!fs.existsSync(productsPath)) {
      console.error(`[VentaFlow] ❌ No se encontró ${productsPath}`);
      process.exit(1);
    }
    
    const rawProducts = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    console.log(`[VentaFlow] Cargando ${rawProducts.length} productos...`);
    
    for (const p of rawProducts) {
      const benefits = p.ficha_tecnica.beneficios.map(b => `• ${b}`).join('\\n');
      const description =
        `${p.ficha_tecnica.emoji} ${p.ficha_tecnica.descripcion}\\n\\n` +
        `📚 ${p.ficha_tecnica.secciones} secciones · ${p.ficha_tecnica.clases} clases · ${p.ficha_tecnica.duracion}\\n\\n` +
        `Beneficios:\\n${benefits}\\n\\n` +
        `Tipo: ${p.info_importante.tipo} | Entrega: ${p.info_importante.entrega}`;
      
      const imageFile = p.imagen_portada.split('/').pop() || 'diseno_megapack.png';
      
      await client.query(`
        INSERT INTO products (id, name, description, price, category, in_stock, image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [
        crypto.randomUUID(),
        p.titulo_comercial,
        description,
        p.precio,
        p.categoria,
        true,
        `/products/${imageFile}`
      ]);
    }
    
    const countResult = await client.query('SELECT COUNT(*) FROM products');
    console.log(`[VentaFlow] ✅ ${countResult.rows[0].count} productos en la base de datos`);
    
    // Automation rules
    console.log("[VentaFlow] Configurando reglas de automatización...");
    const rules = [
      {
        name: 'Bienvenida primer mensaje',
        trigger: 'first_message',
        trigger_value: null,
        action: 'send_message',
        action_value: '¡Hola! 👋 Bienvenido a VentaFlow. Tenemos más de 80 cursos digitales descargables. ¿Qué te interesa aprender? (Diseño, Marketing, Excel, Inglés, Música, Oficios, Tech...)',
        enabled: true,
        priority: 1
      },
      {
        name: 'Trigger: precio',
        trigger: 'keyword',
        trigger_value: 'precio|cuanto|costo|cuánto|valor',
        action: 'send_message',
        action_value: '💰 Nuestros cursos digitales tienen un precio único de $20.000 COP. El Megapack premium de Diseño Gráfico (Photoshop, Illustrator, InDesign y Corel) está en $60.000 COP. ¿Qué curso te interesa?',
        enabled: true,
        priority: 2
      },
      {
        name: 'Trigger: catálogo',
        trigger: 'keyword',
        trigger_value: 'catalogo|catálogo|cursos|que tienes|qué tienes|que ofrecen',
        action: 'send_catalog',
        action_value: 'products',
        enabled: true,
        priority: 3
      },
      {
        name: 'Trigger: pago',
        trigger: 'keyword',
        trigger_value: 'pago|pagar|nequi|daviplata|bancolombia|transferencia',
        action: 'send_message',
        action_value: '💳 Aceptamos: Nequi, Daviplata, Bancolombia y PSE. Una vez confirmes el pago, te enviamos el link de Google Drive con acceso permanente al curso. ¿Qué método prefieres?',
        enabled: true,
        priority: 4
      },
      {
        name: 'Trigger: comprar',
        trigger: 'keyword',
        trigger_value: 'comprar|quiero|pedido|orden|me interesa',
        action: 'assign_stage',
        action_value: 'prospect',
        enabled: true,
        priority: 5
      },
      {
        name: 'Notificar humano si insatisfecho',
        trigger: 'keyword',
        trigger_value: 'hablar con humano|persona|vendedor|asesor humano|reclamo',
        action: 'notify_human',
        action_value: 'El cliente solicita hablar con un humano',
        enabled: true,
        priority: 6
      }
    ];
    
    for (const rule of rules) {
      await client.query(`
        INSERT INTO automation_rules (id, name, trigger, trigger_value, action, action_value, enabled, priority)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `, [
        crypto.randomUUID(),
        rule.name,
        rule.trigger,
        rule.trigger_value,
        rule.action,
        rule.action_value,
        rule.enabled,
        rule.priority
      ]);
    }
    
    console.log("[VentaFlow] ✅ Reglas de automatización configuradas");
    console.log("[VentaFlow] ✅ Seed completado!");
    
    process.exit(0);
  } catch (error) {
    console.error("[VentaFlow] ❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

seed();
