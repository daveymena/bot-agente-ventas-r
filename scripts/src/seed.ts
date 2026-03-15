import { db } from "@workspace/db";
import {
  botConfigTable,
  contactsTable,
  conversationsTable,
  messagesTable,
  productsTable,
  automationRulesTable,
} from "@workspace/db/schema";

async function seed() {
  console.log("Seeding database...");

  await db.insert(botConfigTable).values({
    id: "default",
    businessName: "TechStore MX",
    welcomeMessage: "¡Hola! 👋 Bienvenido a TechStore MX. Soy tu asistente de ventas. ¿En qué puedo ayudarte hoy? Puedes preguntarme por nuestros productos, precios o hacer un pedido.",
    systemPrompt: "Eres un asistente de ventas experto de TechStore MX, una tienda de tecnología. Eres amable, profesional y conoces todos nuestros productos. Tu objetivo es ayudar a los clientes a encontrar lo que necesitan y cerrar ventas. Cuando menciones productos, incluye precio y características clave. Usa emojis moderadamente. Si el cliente pregunta por algo que no tenemos, sugiere alternativas. Responde siempre en español.",
    ollamaUrl: "https://n8n-ollama.ginee6.easypanel.host",
    ollamaModel: "qwen2.5:1.5b",
    ollamaTemperature: "0.7",
    ollamaMaxTokens: "512",
    autoReply: true,
    workingHoursStart: "09:00",
    workingHoursEnd: "20:00",
    offHoursMessage: "¡Gracias por escribirnos! 🌙 Estamos fuera de horario pero te responderemos mañana desde las 9:00 AM. Tu mensaje es importante para nosotros.",
    allowedNumbers: "",
  }).onConflictDoNothing();

  const products = [
    { name: "iPhone 15 Pro 256GB", description: "El iPhone más avanzado con chip A17 Pro, cámara de titanio y acción directa.", price: 24999, category: "Smartphones", inStock: true },
    { name: "Samsung Galaxy S24 Ultra", description: "Con S-Pen integrado, cámara 200MP y AI Galaxy.", price: 22999, category: "Smartphones", inStock: true },
    { name: "MacBook Air M3 13\"", description: "Ultradelgada, potente y con 18 horas de batería.", price: 29999, category: "Laptops", inStock: true },
    { name: "AirPods Pro 2da Gen", description: "Cancelación activa de ruido, audio espacial, resistente al agua.", price: 5999, category: "Audio", inStock: true },
    { name: "iPad Air 11\" M2", description: "Perfecta para trabajo y entretenimiento con chip M2.", price: 14999, category: "Tablets", inStock: false },
    { name: "Apple Watch Series 9", description: "Monitoreo de salud avanzado, ECG y oxígeno en sangre.", price: 9999, category: "Wearables", inStock: true },
  ];

  await db.insert(productsTable).values(products).onConflictDoNothing();

  const contacts = [
    { phone: "5215512345678", name: "Carlos Hernández", email: "carlos@gmail.com", tags: "cliente,recurrente", stage: "customer" as const, totalPurchases: 3 },
    { phone: "5215587654321", name: "María González", email: "maria@email.com", tags: "prospecto,interesada-iphone", stage: "prospect" as const, totalPurchases: 0 },
    { phone: "5215599887766", name: "Roberto Silva", tags: "lead,precio-sensible", stage: "lead" as const, totalPurchases: 0 },
    { phone: "5215511223344", name: "Ana Martínez", email: "ana.m@empresa.com", tags: "vip,empresa", stage: "vip" as const, totalPurchases: 8 },
  ];

  await db.insert(contactsTable).values(contacts).onConflictDoNothing();

  const conv1Id = crypto.randomUUID();
  const conv2Id = crypto.randomUUID();
  const conv3Id = crypto.randomUUID();

  await db.insert(conversationsTable).values([
    {
      id: conv1Id,
      contactPhone: "5215512345678",
      contactName: "Carlos Hernández",
      lastMessage: "¿Tienen el MacBook Air M3 disponible?",
      lastMessageAt: new Date(Date.now() - 5 * 60 * 1000),
      status: "active",
      unreadCount: 1,
      aiHandled: true,
      totalMessages: 8,
    },
    {
      id: conv2Id,
      contactPhone: "5215587654321",
      contactName: "María González",
      lastMessage: "Perfecto, muchas gracias por la info 😊",
      lastMessageAt: new Date(Date.now() - 30 * 60 * 1000),
      status: "active",
      unreadCount: 0,
      aiHandled: true,
      totalMessages: 12,
    },
    {
      id: conv3Id,
      contactPhone: "5215599887766",
      contactName: "Roberto Silva",
      lastMessage: "¿Tienen alguna promoción vigente?",
      lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: "active",
      unreadCount: 2,
      aiHandled: false,
      totalMessages: 4,
    },
  ]).onConflictDoNothing();

  const now = new Date();
  await db.insert(messagesTable).values([
    { conversationId: conv1Id, content: "Hola, ¿tienen el MacBook Air M3?", direction: "inbound", aiGenerated: false, status: "read", timestamp: new Date(now.getTime() - 15 * 60000) },
    { conversationId: conv1Id, content: "¡Hola Carlos! 👋 Sí, tenemos el MacBook Air M3 de 13\" con chip M2 a $29,999 MXN. Es ultradelgado con 18h de batería. ¿Te interesa alguna configuración específica?", direction: "outbound", aiGenerated: true, status: "read", timestamp: new Date(now.getTime() - 14 * 60000) },
    { conversationId: conv1Id, content: "¿Tiene el de 16GB RAM?", direction: "inbound", aiGenerated: false, status: "read", timestamp: new Date(now.getTime() - 10 * 60000) },
    { conversationId: conv1Id, content: "Actualmente tenemos el modelo base de 8GB RAM. El de 16GB puede tardar 3-5 días hábiles en llegar. ¿Te gustaría que lo apartemos? 🙌", direction: "outbound", aiGenerated: true, status: "read", timestamp: new Date(now.getTime() - 9 * 60000) },
    { conversationId: conv1Id, content: "¿Tienen el MacBook Air M3 disponible?", direction: "inbound", aiGenerated: false, status: "delivered", timestamp: new Date(now.getTime() - 5 * 60000) },
    { conversationId: conv2Id, content: "Buenos días, me interesa el iPhone 15 Pro", direction: "inbound", aiGenerated: false, status: "read", timestamp: new Date(now.getTime() - 60 * 60000) },
    { conversationId: conv2Id, content: "¡Buenos días María! 📱 El iPhone 15 Pro de 256GB está a $24,999 MXN. Tiene chip A17 Pro, cámara de titanio y el nuevo botón de acción. ¿Quieres saber más sobre alguna característica?", direction: "outbound", aiGenerated: true, status: "read", timestamp: new Date(now.getTime() - 59 * 60000) },
    { conversationId: conv2Id, content: "Perfecto, muchas gracias por la info 😊", direction: "inbound", aiGenerated: false, status: "read", timestamp: new Date(now.getTime() - 30 * 60000) },
    { conversationId: conv3Id, content: "¿Tienen alguna promoción vigente?", direction: "inbound", aiGenerated: false, status: "delivered", timestamp: new Date(now.getTime() - 2 * 60 * 60000) },
  ]).onConflictDoNothing();

  await db.insert(automationRulesTable).values([
    {
      name: "Bienvenida primer mensaje",
      trigger: "first_message",
      triggerValue: null,
      action: "send_message",
      actionValue: "¡Hola! 👋 Bienvenido a TechStore MX. Soy tu asistente virtual. ¿Buscas smartphones, laptops, accesorios o wearables? Escríbeme lo que necesitas.",
      enabled: true,
      priority: 1,
    },
    {
      name: "Trigger: precio",
      trigger: "keyword",
      triggerValue: "precio|cuanto|costo|cuánto",
      action: "send_catalog",
      actionValue: "products",
      enabled: true,
      priority: 2,
    },
    {
      name: "Trigger: iPhone",
      trigger: "keyword",
      triggerValue: "iphone",
      action: "send_message",
      actionValue: "📱 Tenemos iPhone 15 Pro 256GB a $24,999 MXN. Chip A17 Pro, cámara profesional en titanio. ¿Te gustaría más información o hacer un pedido?",
      enabled: true,
      priority: 3,
    },
    {
      name: "Trigger: comprar",
      trigger: "keyword",
      triggerValue: "comprar|quiero|pedido|orden",
      action: "assign_stage",
      actionValue: "prospect",
      enabled: true,
      priority: 4,
    },
    {
      name: "Notificar humano si insatisfecho",
      trigger: "keyword",
      triggerValue: "hablar con humano|persona|vendedor|soporte",
      action: "notify_human",
      actionValue: "El cliente solicita hablar con un humano",
      enabled: true,
      priority: 5,
    },
  ]).onConflictDoNothing();

  console.log("✅ Seed completado!");
}

seed().catch(console.error).finally(() => process.exit(0));
