import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { botConfigTable, conversationsTable, messagesTable, productsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { whatsappService } from "../services/whatsapp.js";
import { callAI, PROVIDERS, type AIProvider } from "../services/ai-provider.js";
import { paymentService } from "../services/payment.js";
import fs from "fs";
import crypto from "node:crypto";

const router: IRouter = Router();

// --- LÓGICA DANIEL (ADN ORIGINAL INTEGRADO) ---

whatsappService.setMessageHandler(async ({ from, text }) => {
  try {
    const config = (await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1))[0];
    if (!config || !config.autoReply) return null;

    const existingConv = await db.select().from(conversationsTable).where(eq(conversationsTable.contactPhone, from)).limit(1);
    let conversationId = existingConv[0]?.id || crypto.randomUUID();
    
    if (!existingConv[0]) {
      await db.insert(conversationsTable).values({ id: conversationId, contactPhone: from, contactName: "Cliente", lastMessage: text, lastMessageAt: new Date(), status: "active", unreadCount: 1, aiHandled: true, salesStage: "welcome", totalMessages: 1 });
    } else {
      await db.update(conversationsTable).set({ lastMessage: text, lastMessageAt: new Date(), totalMessages: (existingConv[0].totalMessages || 0) + 1 }).where(eq(conversationsTable.id, conversationId));
    }

    await db.insert(messagesTable).values({ id: crypto.randomUUID(), conversationId, content: text, direction: "inbound", aiGenerated: false, status: "delivered", timestamp: new Date() });

    const history = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, conversationId)).orderBy(messagesTable.timestamp).limit(10);
    const lowerText = text.toLowerCase();

    // 2. DETECCIÓN DE PRODUCTO (Fuzzy matching por palabras clave)
    const products = await db.select().from(productsTable).limit(100);
    const matchedProduct = products.find(p => {
      const productWords = p.name.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3); // Ignorar palabras cortas como "de", "el", "la"
      if (productWords.length === 0) return false;
      const matches = productWords.filter(w => lowerText.includes(w));
      // Coincide si al menos la mitad de las palabras clave están en el mensaje
      return matches.length >= Math.ceil(productWords.length / 2);
    });

    // 3. CONSULTA AL CEREBRO HERMES (Microservicio)
    let finalReply = "";
    const hermesUrl = process.env.HERMES_URL || "http://hermes:5000";
    
    try {
      console.log(`[Daniel] 🧠 Consultando a Hermes Agent...`);
      const hermesRes = await fetch(`${hermesUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          phone: from,
          history: history.map(m => ({ role: m.direction === "inbound" ? "user" : "assistant", content: m.content }))
        })
      });
      const hermesData: any = await hermesRes.json();
      finalReply = hermesData.response;
      
      // Si Hermes decide usar herramientas (ej: buscar producto)
      if (hermesData.tool_calls && matchedProduct) {
        console.log(`[Daniel] 🛠️ Hermes activó herramientas para: ${matchedProduct.name}`);
        // Aquí se dispara la lógica de la Card Maestro que ya tenemos perfeccionada
      }
    } catch (e) {
      console.error("[Daniel] Fallo conexión Hermes, usando IA de respaldo.");
      const provider = ((config as any).aiProvider ?? "github") as AIProvider;
      
      // Inyectar catálogo completo al cerebro del bot
      const productsList = products.map(p => `- ${p.name}`).join("\n");
      const systemPromptWithProducts = `${config.systemPrompt}\n\n[CATÁLOGO DISPONIBLE]:\n${productsList}\n\nREGLAS ESTRICTAS PARA RESPONDER:\n1. Si el cliente pregunta por un producto, responde SOLO con 1 o 2 líneas MUY BREVES (ej. "¡Claro! El producto es excelente, aquí te dejo la información:").\n2. NUNCA escribas el precio o los detalles del producto en tu respuesta, el sistema enviará la tarjeta automáticamente debajo de tu mensaje.\n3. NUNCA uses símbolos como ┌─── o cajas de texto.\n4. Si el historial de conversación indica que ya se saludaron, NO vuelvas a decir Hola.`;

      const aiResp = await callAI(
        [{ role: "system", content: systemPromptWithProducts }, ...history.map(m => ({ role: m.direction === "inbound" ? "user" as const : "assistant" as const, content: m.content })), { role: "user", content: text }],
        { provider, apiKey: (config as any).aiApiKey, model: (config as any).aiModel || "gpt-4o-mini", temperature: 0.5 }
      );
      finalReply = aiResp.content || "";
    }

    if (matchedProduct) {
      // A. IMAGEN
      const imageName = (matchedProduct as any).imageUrl?.split('/').pop() || (matchedProduct as any).image;
      const localImagePath = `c:\\Users\\ADMIN\\Downloads\\Openclaw-Automation\\Openclaw-Automation\\artifacts\\whatsapp-bot\\public\\products\\${imageName}`;
      if (fs.existsSync(localImagePath)) await whatsappService.sendImage(from + "@s.whatsapp.net", localImagePath);

      // B. CARD COMERCIAL DINÁMICA CON ESTÉTICA PREMIUM
      const price = matchedProduct.price.toLocaleString('es-CO');
      const name = matchedProduct.name.toUpperCase();
      
      let emoji = "📦";
      let isDigital = false;
      if (name.includes("CURSO") || name.includes("CLASE") || name.includes("MEGAPACK") || name.includes("GUIA")) { emoji = "🎓"; isDigital = true; }
      else if (name.includes("SOFTWARE") || name.includes("SISTEMA") || name.includes("BOT")) { emoji = "💻"; isDigital = true; }
      else if (name.includes("SERVICIO") || name.includes("ASESORIA")) emoji = "🤝";
      
      const description = matchedProduct.description || "Excelente opción para expandir tus habilidades.";

      let card = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      card += `${emoji} *${name}*\n`;
      card += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      card += `🎯 *DESCRIPCIÓN*\n`;
      card += `${description}\n\n`;

      if (isDigital) {
        card += `✨ *INCLUYE:*\n`;
        card += `✅ Acceso de por vida\n`;
        card += `✅ Actualizaciones constantes\n`;
        card += `✅ Soporte de calidad\n\n`;
        card += `📚 *CONTENIDO:*\n`;
        card += `📖 Múltiples secciones y módulos\n`;
        card += `🎬 Clases y material paso a paso\n`;
        card += `⏱️ Avanza a tu propio ritmo\n\n`;
      } else {
        card += `✨ *CARACTERÍSTICAS:*\n`;
        card += `✅ Producto 100% garantizado\n`;
        card += `✅ Soporte y atención VIP\n\n`;
        card += `📦 *ENTREGA:*\n`;
        card += `🚚 Despacho seguro a tu dirección\n`;
        card += `⏱️ Atención y gestión rápida\n\n`;
      }

      card += `💰 *PRECIO:* $${price} COP\n`;
      card += `⚡ *ACCESO:* ${isDigital ? 'Inmediato (Google Drive)' : 'Inmediato'}\n\n`;
      card += `👉 ¿Te gustaría adquirirlo? 😊`;

      // Limpiamos la respuesta de la IA para que no envíe basura antes de la tarjeta
      finalReply = finalReply.replace(/┌[\s\S]*?┘/g, '').trim();
      finalReply = (finalReply.length > 3 ? finalReply + "\n\n" : "") + card;

      // C. CONFIRMACIÓN DE COMPRA (ADN COPIADO)
      if (lowerText.includes("pago") || lowerText.includes("pagar") || lowerText.includes("link") || lowerText.includes("comprar")) {
        const mpLink = await paymentService.createMercadoPagoLink(matchedProduct.name, matchedProduct.price, from);
        const paypalLink = await paymentService.createPayPalLink(matchedProduct.name, Math.ceil(matchedProduct.price / 4000), from);
        
        let payMsg = `\n\n━━━━━━━━━━━━━━━━━━━━━━\n`;
        payMsg += `🎉 ¡EXCELENTE ELECCIÓN! 🚀\n`;
        payMsg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        payMsg += `📦 *PRODUCTO:* ${matchedProduct.name}\n`;
        payMsg += `💰 *TOTAL A PAGAR:* $${price} COP\n\n`;
        payMsg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        payMsg += `💳 MÉTODOS DE PAGO\n`;
        payMsg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        payMsg += `📱 *NEQUI o DAVIPLATA*\n`;
        payMsg += `• Número: *3136174267*\n`;
        payMsg += `• Titular: *Deiner Mena*\n\n`;
        payMsg += `🌐 *PAGO ONLINE (Link)*\n`;
        payMsg += `• Mercado Pago: ${mpLink}\n`;
        payMsg += `• PayPal: ${paypalLink}\n\n`;
        payMsg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        payMsg += `✅ *INSTRUCCIONES DE ENTREGA:*\n`;
        payMsg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        payMsg += `1️⃣ Realiza el pago por tu medio preferido.\n`;
        payMsg += `2️⃣ Envía el *comprobante* (pantallazo).\n`;
        payMsg += `3️⃣ Pásame tu *Gmail* para el acceso al Drive.\n\n`;
        payMsg += `👉 ¿Por cuál medio deseas pagar? 😊`;
        
        finalReply = payMsg; // En el flujo original, la confirmación de compra suele reemplazar el pitch
      }
    }

    if (!finalReply) finalReply = "¡Hola! 👋 Soy Daniel. ¿Qué curso buscas hoy? ✨";

    await db.insert(messagesTable).values({ id: crypto.randomUUID(), conversationId, content: finalReply, direction: "outbound", aiGenerated: true, status: "sent", timestamp: new Date() });
    await whatsappService.sendMessage(from + "@s.whatsapp.net", finalReply);
    return finalReply;
  } catch (err: any) {
    console.error("[Daniel] Error:", err.message);
    return null;
  }
});

// --- ENDPOINTS RESTAURADOS PARA EL DASHBOARD ---

router.get("/status", (req, res) => {
  res.json(whatsappService.state);
});

router.get("/qr", (req, res) => {
  res.json({ qr: whatsappService.state.qrCode });
});

router.post("/connect", async (req, res) => {
  try {
    await whatsappService.connect();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/disconnect", async (req, res) => {
  try {
    await whatsappService.disconnect();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/config", async (req, res) => {
  try {
    const config = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
    res.json(config[0] || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/config", async (req, res) => {
  try {
    const data = req.body;
    const existing = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
    if (existing.length === 0) {
      await db.insert(botConfigTable).values({ id: "default", ...data });
    } else {
      await db.update(botConfigTable).set(data).where(eq(botConfigTable.id, "default"));
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
