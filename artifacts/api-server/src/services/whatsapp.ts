import {
  default as makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";

export interface WhatsAppState {
  connected: boolean;
  phone: string | null;
  name: string | null;
  status: "disconnected" | "connecting" | "connected" | "qr_pending";
  startTime: number | null;
  messagesHandled: number;
  qrCode: string | null;
  lastError: string | null;
}

export type IncomingMessageHandler = (args: {
  from: string;
  text: string;
  pushName: string | null;
  messageId: string;
}) => Promise<string | null>;

const AUTH_DIR = path.resolve(process.cwd(), ".baileys-auth");

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

class WhatsAppService {
  private sock: WASocket | null = null;
  private messageHandler: IncomingMessageHandler | null = null;
  public state: WhatsAppState = {
    connected: false,
    phone: null,
    name: null,
    status: "disconnected",
    startTime: null,
    messagesHandled: 0,
    qrCode: null,
    lastError: null,
  };
  private isConnecting = false;

  setMessageHandler(handler: IncomingMessageHandler) {
    this.messageHandler = handler;
  }

  async connect(): Promise<void> {
    if (this.isConnecting) {
      console.log("[VentaFlow] Ya hay un intento de conexión en curso, ignorando...");
      return;
    }

    // Solo bloquear si ya hay un socket vivo y estable
    if (this.sock && (this.state.status === "qr_pending" || this.state.status === "connected")) {
      return;
    }

    this.isConnecting = true;
    
    // Cerrar socket previo si existe
    if (this.sock) {
      try { 
        this.sock.ev.removeAllListeners("connection.update");
        this.sock.ev.removeAllListeners("creds.update");
        this.sock.ev.removeAllListeners("messages.upsert");
        this.sock.end(undefined); 
      } catch {}
      this.sock = null;
    }

    this.state.status = "connecting";
    this.state.qrCode = null;
    this.state.lastError = null;
    
    const logFile = path.resolve(process.cwd(), "whatsapp.log");
    const log = (msg: string) => {
      const line = `[${new Date().toISOString()}] ${msg}\n`;
      fs.appendFileSync(logFile, line);
      console.log(msg);
    };

    log(`[VentaFlow] Iniciando conexión (Status: ${this.state.status})...`);

    try {
      const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`[VentaFlow] Usando WhatsApp Web v${version.join(".")} (latest=${isLatest})`);

      this.sock = makeWASocket({
        version,
        auth: authState,
        browser: ["VentaFlow", "Chrome", "120.0.0"],
        markOnlineOnConnect: false,
        syncFullHistory: false,
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 60_000,
        keepAliveIntervalMs: 30_000,
        generateHighQualityLinkPreview: false,
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const dataUrl = await QRCode.toDataURL(qr, {
              width: 320,
              margin: 1,
              color: { dark: "#0a0a0a", light: "#ffffff" },
            });
            this.state.qrCode = dataUrl;
            this.state.status = "qr_pending";
            console.log("[VentaFlow] QR generado, esperando escaneo...");
          } catch (e) {
            console.error("[VentaFlow] Error generando QR:", e);
          }
        }

        if (connection === "open") {
          this.isConnecting = false;
          this.state.connected = true;
          this.state.status = "connected";
          this.state.startTime = Date.now();
          this.state.qrCode = null;
          this.state.phone = this.sock?.user?.id?.split(":")[0]?.split("@")[0] ?? null;
          this.state.name = this.sock?.user?.name ?? null;
          log(`[VentaFlow] Conexión ABIERTA exitosamente como ${this.state.name} (${this.state.phone})`);
        }

        if (connection === "close") {
          this.isConnecting = false;
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          log(`[VentaFlow] Conexión CERRADA (code=${statusCode}), reconectar=${shouldReconnect}`);
          this.state.connected = false;
          this.state.qrCode = null;

          if (shouldReconnect) {
            this.state.status = "connecting";
            this.sock = null;
            const delay = statusCode === 515 ? 1500 : 3000;
            setTimeout(() => this.connect().catch(e => log(`[VentaFlow] Reconnect error: ${e.message}`)), delay);
          } else {
            this.state.status = "disconnected";
            this.state.startTime = null;
            this.state.phone = null;
            this.state.name = null;
          }
        }
      });

      this.sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        for (const msg of messages) {
          const from = msg.key.remoteJid;
          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            "";

          console.log(`[VentaFlow] 📩 EVENTO RECIBIDO: de=${from} texto="${text}" deMi=${msg.key.fromMe}`);

          if (!text) continue;
          log(`[VentaFlow] Mensaje RECIBIDO de ${from}: "${text}"`);

          if (!this.messageHandler) {
            log(`[VentaFlow] ERROR: No hay messageHandler configurado.`);
            continue;
          }

          this.state.messagesHandled += 1;
          const phone = from.split("@")[0];

          try {
            log(`[VentaFlow] Procesando respuesta con IA...`);
            const reply = await this.messageHandler({
              from: phone,
              text,
              pushName: msg.pushName ?? null,
              messageId: msg.key.id ?? "",
            });

            if (reply && this.sock) {
              log(`[VentaFlow] Enviando RESPUESTA: "${reply}"`);
              // Anti-ban: simular comportamiento humano
              const readDelay = 500 + Math.random() * 700;
              await new Promise(r => setTimeout(r, readDelay));
              await this.sock.readMessages([msg.key]);

              await this.sock.sendPresenceUpdate("composing", from);
              const typingDelay = 800 + Math.random() * 1500;
              await new Promise(r => setTimeout(r, typingDelay));
              await this.sock.sendPresenceUpdate("paused", from);

              await this.sock.sendMessage(from, { text: reply });
              log(`[VentaFlow] Mensaje ENVIADO exitosamente.`);
            } else {
              log(`[VentaFlow] La IA no generó respuesta o el bot está en modo manual.`);
            }
          } catch (err: any) {
            log(`[VentaFlow] ERROR procesando mensaje: ${err.message}`);
          }
        }
      });
    } catch (err: any) {
      this.isConnecting = false;
      this.state.status = "disconnected";
      this.state.lastError = err?.message ?? String(err);
      console.error("[VentaFlow] Error conectando:", err);
      throw err;
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.sock) {
        await this.sock.logout();
        this.sock = null;
      }
      // Borrar credenciales para forzar QR nuevo en la próxima conexión
      if (fs.existsSync(AUTH_DIR)) {
        for (const file of fs.readdirSync(AUTH_DIR)) {
          fs.unlinkSync(path.join(AUTH_DIR, file));
        }
      }
    } catch (e) {
      console.error("[VentaFlow] Error en logout:", e);
    }
    this.state = {
      connected: false,
      phone: null,
      name: null,
      status: "disconnected",
      startTime: null,
      messagesHandled: 0,
      qrCode: null,
      lastError: null,
    };
  }

  async sendMessage(toPhone: string, text: string): Promise<boolean> {
    if (!this.sock || !this.state.connected) return false;
    const jid = toPhone.includes("@") ? toPhone : `${toPhone}@s.whatsapp.net`;
    try {
      await this.sock.sendMessage(jid, { text });
      return true;
    } catch (e) {
      console.error("[VentaFlow] Error enviando mensaje:", e);
      return false;
    }
  }

  async sendImage(to: string, imageUrl: string, caption?: string) {
    if (!this.sock) throw new Error("WhatsApp not connected");
    
    await this.sock.sendMessage(to, { 
      image: { url: imageUrl },
      caption: caption
    });
  }

  // Métodos para el Dashboard
  getStatus() {
    return this.state;
  }

  getQR() {
    return this.state.qrCode;
  }

  async initialize() {
    return this.connect();
  }

  async logout() {
    return this.disconnect();
  }
}

export const whatsappService = new WhatsAppService();
