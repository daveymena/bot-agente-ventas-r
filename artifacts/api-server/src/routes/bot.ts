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

    // 2. DETECCIÓN DE PRODUCTO (Súper Sensible)
    const products = await db.select().from(productsTable).limit(100);
    const matchedProduct = products.find(p => {
      const name = p.name.toLowerCase();
      return lowerText.includes(name) || (name.includes("piano") && lowerText.includes("piano")) || (name.includes("excel") && lowerText.includes("excel"));
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
      const productsList = products.map(p => `- ${p.name} (Precio: $${p.price.toLocaleString('es-CO')})`).join("\n");
      const systemPromptWithProducts = `${config.systemPrompt}\n\n[CATÁLOGO DISPONIBLE EN BASE DE DATOS]:\n${productsList}\n\nUsa esta información para vender, guiar al cliente y confirmar si tenemos lo que busca.`;

      const aiResp = await callAI(
        [{ role: "system", content: systemPromptWithProducts }, ...history.map(m => ({ role: m.direction === "inbound" ? "user" as const : "assistant" as const, content: m.content })), { role: "user", content: text }],
        { provider, apiKey: (config as any).aiApiKey, model: (config as any).aiModel || "gpt-4o-mini", temperature: 0.7 }
      );
      finalReply = aiResp.content || "¡Hola! Dame un momento para revisar los detalles de lo que buscas. 😊";
    }

    if (matchedProduct) {
      // A. IMAGEN
      const imageName = (matchedProduct as any).imageUrl?.split('/').pop() || (matchedProduct as any).image;
      const localImagePath = `c:\\Users\\ADMIN\\Downloads\\Openclaw-Automation\\Openclaw-Automation\\artifacts\\whatsapp-bot\\public\\products\\${imageName}`;
      if (fs.existsSync(localImagePath)) await whatsappService.sendImage(from + "@s.whatsapp.net", localImagePath);

      // B. CARD COMERCIAL DINÁMICA (SaaS Multi-producto)
      const price = matchedProduct.price.toLocaleString('es-CO');
      const name = matchedProduct.name.toUpperCase();
      
      // Asigna un emoji dinámico basado en la categoría o nombre
      let emoji = "📦";
      if (name.includes("CURSO") || name.includes("CLASE") || name.includes("GUIA")) emoji = "🎓";
      else if (name.includes("SOFTWARE") || name.includes("SISTEMA") || name.includes("BOT")) emoji = "💻";
      else if (name.includes("SERVICIO") || name.includes("ASESORIA")) emoji = "🤝";
      
      const description = matchedProduct.description || "Excelente producto garantizado para ti.";

      let card = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      card += `${emoji} *${name}*\n`;
      card += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      card += `✨ ${description}\n\n`;
      card += `💰 PRECIO: $${price} COP\n\n`;
      card += `👉 ¿Te gustaría adquirirlo? 😊`;

      // Se usa la IA (finalReply) como base amigable, y se adjunta la Tarjeta
      finalReply = (finalReply.length > 5 ? finalReply + "\n\n" : "") + card;

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
