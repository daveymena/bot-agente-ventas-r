import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botRouter from "./bot";
import conversationsRouter from "./conversations";
import contactsRouter from "./contacts";
import productsRouter from "./products";
import automationRouter from "./automation";
import ollamaRouter from "./ollama";
import messagesRouter from "./messages";
import agentRouter from "./agent";
import skillsRouter from "./skills";
import memoryRouter from "./memory";
import aiRouter from "./ai";
import webhooksRouter from "./webhooks";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/bot", botRouter);
router.use("/conversations", conversationsRouter);
router.use("/contacts", contactsRouter);
router.use("/products", productsRouter);
router.use("/automation", automationRouter);
router.use("/ollama", ollamaRouter);
router.use("/messages", messagesRouter);
router.use("/agent", agentRouter);
router.use("/skills", skillsRouter);
router.use("/memory", memoryRouter);
router.use("/ai", aiRouter);
router.use("/webhooks", webhooksRouter);
router.use("/settings", settingsRouter);

export default router;
