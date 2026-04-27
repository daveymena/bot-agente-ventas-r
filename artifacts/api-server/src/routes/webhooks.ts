import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { whatsappService } from "../services/whatsapp.js";

const router: IRouter = Router();

// Webhook para Mercado Pago
router.post("/mercadopago", async (req, res) => {
  const { type, data } = req.body;
  
  if (type === "payment") {
    const paymentId = data.id;
    try {
      // Consultar detalles del pago a Mercado Pago
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
        }
      });
      const payment: any = await response.json();
      
      if (payment.status === "approved") {
        const phone = payment.external_reference || payment.metadata?.phone;
        const productName = payment.metadata?.product_name;
        
        console.log(`[Webhook MP] Pago aprobado de ${phone} por ${productName}`);
        
        if (phone && productName) {
          // Buscar link de Drive
          const product = (await db.select().from(productsTable).where(eq(productsTable.name, productName)).limit(1))[0];
          
          if (product && product.driveUrl) {
            const deliveryMsg = `✨ ━━━━━━━━━━━━━━ ✨
  🌟 ¡PAGO CONFIRMADO! 🌟
✨ ━━━━━━━━━━━━━━ ✨

¡Felicidades! 🥳 Tu pago por el **${product.name}** ha sido verificado exitosamente.

Aquí tienes tu acceso inmediato y permanente:
🚀 **Link de Google Drive:** ${product.driveUrl}

*Recuerda:* El acceso es de por vida. ¡Disfruta tu aprendizaje! 💎💎`;
            
            await whatsappService.sendMessage(phone + "@s.whatsapp.net", deliveryMsg);
            console.log(`[Webhook MP] Entrega realizada a ${phone}`);
          }
        }
      }
    } catch (e) {
      console.error("[Webhook MP] Error:", e);
    }
  }
  
  res.sendStatus(200);
});

// Webhook para PayPal
router.post("/paypal", async (req, res) => {
  const event = req.body;
  
  if (event.event_type === "CHECKOUT.ORDER.APPROVED" || event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const resource = event.resource;
    const phone = resource.purchase_units?.[0]?.custom_id;
    const productName = resource.purchase_units?.[0]?.description;
    
    console.log(`[Webhook PayPal] Pago detectado de ${phone} por ${productName}`);
    
    if (phone && productName) {
      const product = (await db.select().from(productsTable).where(eq(productsTable.name, productName)).limit(1))[0];
      
      if (product && product.driveUrl) {
        const deliveryMsg = `✨ ━━━━━━━━━━━━━━ ✨
  🌟 ¡PAGO CONFIRMADO! 🌟
✨ ━━━━━━━━━━━━━━ ✨

¡Felicidades! 🥳 Tu pago vía PayPal por el **${product.name}** ha sido verificado exitosamente.

Aquí tienes tu acceso inmediato y permanente:
🚀 **Link de Google Drive:** ${product.driveUrl}

*Recuerda:* El acceso es de por vida. ¡Disfruta tu aprendizaje! 💎💎`;
        
        await whatsappService.sendMessage(phone + "@s.whatsapp.net", deliveryMsg);
        console.log(`[Webhook PayPal] Entrega realizada a ${phone}`);
      }
    }
  }
  
  res.sendStatus(200);
});

export default router;
