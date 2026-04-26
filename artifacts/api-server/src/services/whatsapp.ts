import {
  default as makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
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

  setMessageHandler(handler: IncomingMessageHandler) {
    this.messageHandler = handler;
  }

  async connect(): Promise<void> {
    if (this.state.status === "connecting" || this.state.status === "qr_pending") {
      return;
    }
    this.state.status = "connecting";
    this.state.qrCode = null;
    this.state.lastError = null;

    try {
      const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      this.sock = makeWASocket({
        auth: authState,
        printQRInTerminal: false,
        browser: ["VentaFlow", "Chrome", "1.0.0"],
        markOnlineOnConnect: false,
        syncFullHistory: false,
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
          this.state.connected = true;
          this.state.status = "connected";
          this.state.startTime = Date.now();
          this.state.qrCode = null;
          this.state.phone = this.sock?.user?.id?.split(":")[0]?.split("@")[0] ?? null;
          this.state.name = this.sock?.user?.name ?? null;
          console.log(`[VentaFlow] Conectado como ${this.state.name} (${this.state.phone})`);
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          console.log(`[VentaFlow] Conexión cerrada (code=${statusCode}), reconectar=${shouldReconnect}`);
          this.state.connected = false;
          this.state.qrCode = null;

          if (shouldReconnect) {
            this.state.status = "connecting";
            setTimeout(() => this.connect().catch(console.error), 3000);
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
          if (msg.key.fromMe || !msg.message) continue;
          const from = msg.key.remoteJid;
          if (!from || from.endsWith("@g.us") || from === "status@broadcast") continue;

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            "";

          if (!text || !this.messageHandler) continue;

          this.state.messagesHandled += 1;
          const phone = from.split("@")[0];

          try {
            const reply = await this.messageHandler({
              from: phone,
              text,
              pushName: msg.pushName ?? null,
              messageId: msg.key.id ?? "",
            });

            if (reply && this.sock) {
              await this.sock.sendMessage(from, { text: reply });
            }
          } catch (err) {
            console.error("[VentaFlow] Error procesando mensaje:", err);
          }
        }
      });
    } catch (err: any) {
      this.state.status = "disconnected";
      this.state.lastError = err?.message ?? String(err);
      console.error("[VentaFlow] Error conectando:", err);
      throw err;
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
}

export const whatsappService = new WhatsAppService();
