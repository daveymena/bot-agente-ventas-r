import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
// Ruta absoluta al .env en la raíz del proyecto (4 niveles arriba desde src/routes)
const envPath = path.resolve(__dirname, "../../../../.env");

// GET: Leer configuración actual
router.get("/", (req, res) => {
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    const settings: Record<string, string> = {};
    
    content.split("\n").forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...values] = trimmed.split("=");
        if (key) {
          settings[key.trim()] = values.join("=").trim();
        }
      }
    });
    
    res.json(settings);
  } catch (e) {
    console.error("Error leyendo .env:", e);
    res.status(500).json({ error: "No se pudo leer el archivo de configuración maestra" });
  }
});

// POST: Actualizar configuración
router.post("/", (req, res) => {
  try {
    const updates = req.body;
    let content = fs.readFileSync(envPath, "utf-8");
    
    for (const [key, value] of Object.entries(updates)) {
      // Expresión regular para encontrar la variable y reemplazarla
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        // Si no existe, la añade al final
        content += `\n${key}=${value}`;
      }
    }
    
    // Guardar los cambios físicos en el .env
    fs.writeFileSync(envPath, content);
    res.json({ success: true, message: "Ajustes guardados correctamente. Algunos cambios (como el correo o el proveedor de IA) requieren reiniciar el contenedor para aplicarse al 100%." });
  } catch (e) {
    console.error("Error escribiendo en .env:", e);
    res.status(500).json({ error: "No se pudieron guardar los ajustes" });
  }
});

export default router;
