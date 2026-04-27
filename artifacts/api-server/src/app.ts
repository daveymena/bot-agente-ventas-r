import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import path from "path";
import fs from "fs";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Servir Frontend Estático en Producción (Easypanel)
// El Dockerfile compila React en artifacts/whatsapp-bot/dist/public
const frontendPath = path.join(import.meta.dirname, "../../whatsapp-bot/dist/public");

if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  
  // Soporte para React Router (Catch-all)
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("<h1>El Frontend está compilando o no se encuentra...</h1>");
  });
}

export default app;
