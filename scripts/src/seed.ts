import { db } from "@workspace/db";
import {
  botConfigTable,
  productsTable,
  automationRulesTable,
} from "@workspace/db/schema";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface RawProduct {
  id: string;
  numero_drive: number;
  nombre_carpeta: string;
  titulo_comercial: string;
  categoria: string;
  precio: number;
  ficha_tecnica: {
    emoji: string;
    descripcion: string;
    secciones: number;
    clases: number | string;
    duracion: string;
    beneficios: string[];
  };
  info_importante: {
    tipo: string;
    certificable: string;
    soporte_en_vivo: string;
    entrega: string;
  };
  imagen_portada: string;
}

const PRODUCTS_JSON_PATH = path.resolve(__dirname, "../data/products.json");

async function seed() {
  console.log("[VentaFlow] Sembrando base de datos con catálogo real...");

  // Bot configuration
  await db.insert(botConfigTable).values({
    id: "default",
    businessName: "VentaFlow",
    welcomeMessage:
      "¡Hola! 👋 Bienvenido a VentaFlow. Soy tu asesor comercial automatizado. Tenemos más de 80 cursos digitales descargables (Diseño, Marketing, Excel, Idiomas, Tech, Música, Oficios y más). ¿Qué te gustaría aprender hoy?",
    systemPrompt:
      "Eres un asesor de ventas profesional de VentaFlow, un sistema automatizado que comercializa cursos digitales descargables (Megapacks). " +
      "Cada curso incluye: contenido virtual y descargable (MP4/PDF), acceso permanente vía Google Drive, sin clases en vivo, estudio autónomo, sin certificación oficial, entrega inmediata. " +
      "Precios: el catálogo principal cuesta $20.000 COP por curso (algunos premium $60.000 COP). " +
      "Métodos de pago: Nequi, Daviplata, Bancolombia, PSE. " +
      "Tu objetivo es: 1) Saludar al prospecto cordialmente, 2) Detectar qué tipo de curso busca, 3) Presentar el curso con su emoji, descripción, número de clases y duración, 4) Manejar objeciones (precio, entrega, certificación), 5) Cerrar la venta confirmando método de pago y enviando link de Google Drive tras pago, 6) Seguimiento post-venta. " +
      "Responde siempre en español, sé amable, profesional y conciso. Usa emojis con moderación.",
    ollamaUrl: "https://n8n-ollama.ginee6.easypanel.host",
    ollamaModel: "qwen2.5:1.5b",
    ollamaTemperature: "0.7",
    ollamaMaxTokens: "512",
    autoReply: true,
    workingHoursStart: "08:00",
    workingHoursEnd: "22:00",
    offHoursMessage:
      "¡Gracias por escribir a VentaFlow! 🌙 Estamos fuera de horario. Te responderemos mañana desde las 8:00 AM. Mientras tanto puedes revisar nuestro catálogo.",
    allowedNumbers: "",
    paymentMethods: "Nequi,Daviplata,Bancolombia,PSE",
    language: "es",
    aiProvider: "ollama",
    aiModel: "qwen2.5:1.5b",
  } as any).onConflictDoNothing();

  // Real product catalog from JSON file
  if (!fs.existsSync(PRODUCTS_JSON_PATH)) {
    console.error(`[VentaFlow] No se encontró ${PRODUCTS_JSON_PATH}`);
    return;
  }

  const raw: RawProduct[] = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, "utf-8"));
  console.log(`[VentaFlow] Cargando ${raw.length} productos...`);

  const products = raw.map((p) => {
    const benefits = p.ficha_tecnica.beneficios.map((b) => `• ${b}`).join("\n");
    const description =
      `${p.ficha_tecnica.emoji} ${p.ficha_tecnica.descripcion}\n\n` +
      `📚 ${p.ficha_tecnica.secciones} secciones · ${p.ficha_tecnica.clases} clases · ${p.ficha_tecnica.duracion}\n\n` +
      `Beneficios:\n${benefits}\n\n` +
      `Tipo: ${p.info_importante.tipo} | Entrega: ${p.info_importante.entrega}`;

    // imagen_portada is "assets/images/X.png" — we serve it from /products/X.png
    const imageFile = p.imagen_portada.split("/").pop() ?? "diseno_megapack.png";
    return {
      name: p.titulo_comercial,
      description,
      price: p.precio,
      category: p.categoria,
      inStock: true,
      imageUrl: `/products/${imageFile}`,
    };
  });

  await db.insert(productsTable).values(products).onConflictDoNothing();
  console.log(`[VentaFlow] ${products.length} productos insertados.`);

  // Automation rules tailored to course catalog
  await db.insert(automationRulesTable).values([
    {
      name: "Bienvenida primer mensaje",
      trigger: "first_message",
      triggerValue: null,
      action: "send_message",
      actionValue:
        "¡Hola! 👋 Bienvenido a VentaFlow. Tenemos más de 80 cursos digitales descargables. ¿Qué te interesa aprender? (Diseño, Marketing, Excel, Inglés, Música, Oficios, Tech...)",
      enabled: true,
      priority: 1,
    },
    {
      name: "Trigger: precio",
      trigger: "keyword",
      triggerValue: "precio|cuanto|costo|cuánto|valor",
      action: "send_message",
      actionValue:
        "💰 Nuestros cursos digitales tienen un precio único de $20.000 COP. El Megapack premium de Diseño Gráfico (Photoshop, Illustrator, InDesign y Corel) está en $60.000 COP. ¿Qué curso te interesa?",
      enabled: true,
      priority: 2,
    },
    {
      name: "Trigger: catálogo",
      trigger: "keyword",
      triggerValue: "catalogo|catálogo|cursos|que tienes|qué tienes|que ofrecen",
      action: "send_catalog",
      actionValue: "products",
      enabled: true,
      priority: 3,
    },
    {
      name: "Trigger: pago",
      trigger: "keyword",
      triggerValue: "pago|pagar|nequi|daviplata|bancolombia|transferencia",
      action: "send_message",
      actionValue:
        "💳 Aceptamos: Nequi, Daviplata, Bancolombia y PSE. Una vez confirmes el pago, te enviamos el link de Google Drive con acceso permanente al curso. ¿Qué método prefieres?",
      enabled: true,
      priority: 4,
    },
    {
      name: "Trigger: comprar",
      trigger: "keyword",
      triggerValue: "comprar|quiero|pedido|orden|me interesa",
      action: "assign_stage",
      actionValue: "prospect",
      enabled: true,
      priority: 5,
    },
    {
      name: "Notificar humano si insatisfecho",
      trigger: "keyword",
      triggerValue: "hablar con humano|persona|vendedor|asesor humano|reclamo",
      action: "notify_human",
      actionValue: "El cliente solicita hablar con un humano",
      enabled: true,
      priority: 6,
    },
  ]).onConflictDoNothing();

  console.log("[VentaFlow] ✅ Seed completado!");
}

seed().catch(console.error).finally(() => process.exit(0));
