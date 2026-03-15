import { db } from "@workspace/db";
import {
  memoriesTable,
  skillsTable,
  contactsTable,
  productsTable,
  automationRulesTable,
} from "@workspace/db/schema";
import { like, or, eq } from "drizzle-orm";
import { runSkillCode } from "./skillRunner.js";

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required?: string[];
    };
  };
};

export type Tool = {
  definition: ToolDefinition;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

const builtinTools: Record<string, Tool> = {
  web_search: {
    definition: {
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web for current information, news, prices, or any online content. Returns a summary and related results.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query to look up" },
          },
          required: ["query"],
        },
      },
    },
    execute: async ({ query }) => {
      try {
        const encoded = encodeURIComponent(query as string);
        const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const data = await res.json() as {
          AbstractText?: string;
          Answer?: string;
          RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
          Type?: string;
        };
        const results: string[] = [];
        if (data.Answer) results.push(`Direct answer: ${data.Answer}`);
        if (data.AbstractText) results.push(`Summary: ${data.AbstractText}`);
        const topics = (data.RelatedTopics || [])
          .filter(t => t.Text)
          .slice(0, 5)
          .map(t => `- ${t.Text} ${t.FirstURL ? `(${t.FirstURL})` : ""}`);
        if (topics.length) results.push("Related:\n" + topics.join("\n"));
        return results.length ? results.join("\n\n") : "No results found for that query.";
      } catch (e) {
        return `Search failed: ${(e as Error).message}`;
      }
    },
  },

  fetch_url: {
    definition: {
      type: "function",
      function: {
        name: "fetch_url",
        description: "Fetch and read the content of any public URL. Useful for reading documentation, APIs, news articles, or any webpage.",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "The full HTTPS URL to fetch" },
          },
          required: ["url"],
        },
      },
    },
    execute: async ({ url }) => {
      try {
        const res = await fetch(url as string, {
          signal: AbortSignal.timeout(10000),
          headers: { "User-Agent": "OpenClaw/1.0 Bot" },
        });
        const text = await res.text();
        const stripped = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        return stripped.slice(0, 3000) + (stripped.length > 3000 ? "... [truncated]" : "");
      } catch (e) {
        return `Failed to fetch URL: ${(e as Error).message}`;
      }
    },
  },

  http_request: {
    definition: {
      type: "function",
      function: {
        name: "http_request",
        description: "Make an HTTP request (GET/POST/PUT/DELETE) to any API or webhook endpoint. Useful for integrating with external services.",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "The full URL to call" },
            method: { type: "string", description: "HTTP method", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
            body: { type: "string", description: "JSON body for POST/PUT requests (stringify your object)" },
            headers: { type: "string", description: "JSON object of request headers" },
          },
          required: ["url", "method"],
        },
      },
    },
    execute: async ({ url, method, body, headers }) => {
      try {
        const parsedHeaders = headers ? JSON.parse(headers as string) : {};
        const opts: RequestInit = {
          method: method as string,
          headers: { "Content-Type": "application/json", ...parsedHeaders },
          signal: AbortSignal.timeout(10000),
        };
        if (body) opts.body = body as string;
        const res = await fetch(url as string, opts);
        const text = await res.text();
        return `Status: ${res.status}\nResponse: ${text.slice(0, 2000)}`;
      } catch (e) {
        return `HTTP request failed: ${(e as Error).message}`;
      }
    },
  },

  search_contacts: {
    definition: {
      type: "function",
      function: {
        name: "search_contacts",
        description: "Search for customers or contacts in the database by name, phone, stage, or tag.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Name, phone or keyword to search" },
            stage: { type: "string", description: "Filter by sales stage", enum: ["lead", "prospect", "customer", "vip"] },
          },
        },
      },
    },
    execute: async ({ query, stage }) => {
      const conditions = [];
      if (query) {
        const q = `%${query}%`;
        conditions.push(or(like(contactsTable.name, q), like(contactsTable.phone, q), like(contactsTable.tags, q)));
      }
      if (stage) conditions.push(eq(contactsTable.stage, stage as string));
      const rows = await db.select().from(contactsTable).limit(10);
      const filtered = rows.filter(r => {
        if (stage && r.stage !== stage) return false;
        if (query) {
          const q = (query as string).toLowerCase();
          return (r.name || "").toLowerCase().includes(q) ||
            r.phone.includes(q as string) ||
            (r.tags || "").toLowerCase().includes(q);
        }
        return true;
      });
      if (!filtered.length) return "No contacts found.";
      return filtered.map(c => `${c.name || "Unknown"} (${c.phone}) — ${c.stage} — Tags: ${c.tags || "none"} — Purchases: ${c.totalPurchases}`).join("\n");
    },
  },

  search_products: {
    definition: {
      type: "function",
      function: {
        name: "search_products",
        description: "Search the product catalog for products by name, category, or price range.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Product name or category to search" },
            in_stock_only: { type: "string", description: "Set to 'true' to only show in-stock products" },
          },
        },
      },
    },
    execute: async ({ query, in_stock_only }) => {
      const rows = await db.select().from(productsTable).limit(50);
      const filtered = rows.filter(p => {
        if (in_stock_only === "true" && !p.inStock) return false;
        if (query) {
          const q = (query as string).toLowerCase();
          return (p.name || "").toLowerCase().includes(q) ||
            (p.category || "").toLowerCase().includes(q) ||
            (p.description || "").toLowerCase().includes(q);
        }
        return true;
      });
      if (!filtered.length) return "No products found.";
      return filtered.map(p =>
        `${p.name} — $${p.price.toFixed(2)} [${p.inStock ? "In Stock" : "Out of Stock"}] | ${p.category || "No category"} | ${p.description?.slice(0, 60) || ""}...`
      ).join("\n");
    },
  },

  save_memory: {
    definition: {
      type: "function",
      function: {
        name: "save_memory",
        description: "Save a fact, note, or important piece of information to persistent memory for future reference.",
        parameters: {
          type: "object",
          properties: {
            key: { type: "string", description: "A short label or title for the memory (e.g. 'User preference: prefers dark mode')" },
            value: { type: "string", description: "The full content/value to remember" },
            tags: { type: "string", description: "Comma-separated tags to categorize the memory" },
          },
          required: ["key", "value"],
        },
      },
    },
    execute: async ({ key, value, tags }) => {
      const result = await db.insert(memoriesTable).values({
        key: key as string,
        value: value as string,
        tags: (tags as string) || "",
        source: "agent",
      }).returning();
      return `Memory saved: "${key}" (id: ${result[0].id})`;
    },
  },

  recall_memories: {
    definition: {
      type: "function",
      function: {
        name: "recall_memories",
        description: "Search and retrieve stored memories and notes by keyword or tag.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Keyword to search in memories" },
          },
          required: ["query"],
        },
      },
    },
    execute: async ({ query }) => {
      const rows = await db.select().from(memoriesTable).limit(100);
      const q = (query as string).toLowerCase();
      const filtered = rows.filter(m =>
        m.key.toLowerCase().includes(q) ||
        m.value.toLowerCase().includes(q) ||
        (m.tags || "").toLowerCase().includes(q)
      );
      if (!filtered.length) return "No memories found for that query.";
      return filtered.map(m => `[${m.key}] ${m.value} (tags: ${m.tags || "none"})`).join("\n");
    },
  },

  get_time: {
    definition: {
      type: "function",
      function: {
        name: "get_time",
        description: "Get the current date and time.",
        parameters: {
          type: "object",
          properties: {
            timezone: { type: "string", description: "Timezone name e.g. 'America/Mexico_City'" },
          },
        },
      },
    },
    execute: async ({ timezone }) => {
      const tz = (timezone as string) || "UTC";
      try {
        return new Date().toLocaleString("en-US", { timeZone: tz, dateStyle: "full", timeStyle: "long" });
      } catch {
        return new Date().toISOString();
      }
    },
  },

  calculate: {
    definition: {
      type: "function",
      function: {
        name: "calculate",
        description: "Evaluate a mathematical expression and return the result. Safe arithmetic operations only.",
        parameters: {
          type: "object",
          properties: {
            expression: { type: "string", description: "Math expression to evaluate, e.g. '15 * 24 + 100'" },
          },
          required: ["expression"],
        },
      },
    },
    execute: async ({ expression }) => {
      try {
        const expr = (expression as string).replace(/[^0-9+\-*/().,% ]/g, "");
        const fn = new Function(`"use strict"; return (${expr})`);
        const result = fn();
        return `${expression} = ${result}`;
      } catch {
        return `Could not evaluate expression: ${expression}`;
      }
    },
  },

  list_automation_rules: {
    definition: {
      type: "function",
      function: {
        name: "list_automation_rules",
        description: "List all configured automation rules in the system.",
        parameters: {
          type: "object",
          properties: {
            enabled_only: { type: "string", description: "Set to 'true' to only show enabled rules" },
          },
        },
      },
    },
    execute: async ({ enabled_only }) => {
      const rows = await db.select().from(automationRulesTable).limit(50);
      const filtered = enabled_only === "true" ? rows.filter(r => r.enabled) : rows;
      if (!filtered.length) return "No automation rules configured.";
      return filtered.map(r =>
        `[${r.enabled ? "ON" : "OFF"}] ${r.name}: WHEN ${r.trigger}${r.triggerValue ? ` "${r.triggerValue}"` : ""} → ${r.action}${r.actionValue ? ` "${r.actionValue}"` : ""}`
      ).join("\n");
    },
  },

  run_skill: {
    definition: {
      type: "function",
      function: {
        name: "run_skill",
        description: "Execute a custom skill (JavaScript code) stored in the skills library.",
        parameters: {
          type: "object",
          properties: {
            skill_name: { type: "string", description: "The name of the skill to run" },
            params: { type: "string", description: "JSON string of parameters to pass to the skill" },
          },
          required: ["skill_name"],
        },
      },
    },
    execute: async ({ skill_name, params }) => {
      const rows = await db.select().from(skillsTable)
        .where(eq(skillsTable.name, skill_name as string))
        .limit(1);
      if (!rows.length) return `Skill "${skill_name}" not found.`;
      const skill = rows[0];
      if (!skill.enabled) return `Skill "${skill_name}" is disabled.`;
      try {
        const parsedParams = params ? JSON.parse(params as string) : {};
        const result = await runSkillCode(skill.code, parsedParams);
        return `Skill "${skill_name}" output:\n${JSON.stringify(result, null, 2)}`;
      } catch (e) {
        return `Skill error: ${(e as Error).message}`;
      }
    },
  },
};

export async function getAllTools(): Promise<Tool[]> {
  const tools = Object.values(builtinTools);
  const customSkills = await db.select().from(skillsTable).limit(50);
  for (const skill of customSkills.filter(s => s.enabled)) {
    tools.push({
      definition: {
        type: "function",
        function: {
          name: `skill_${skill.name.replace(/[^a-zA-Z0-9_]/g, "_")}`,
          description: skill.description,
          parameters: {
            type: "object",
            properties: skill.parametersSchema !== "{}"
              ? JSON.parse(skill.parametersSchema)
              : { input: { type: "string", description: "Input for the skill" } },
          },
        },
      },
      execute: async (args) => {
        try {
          return await runSkillCode(skill.code, args);
        } catch (e) {
          return `Skill error: ${(e as Error).message}`;
        }
      },
    });
  }
  return tools;
}

export function getBuiltinToolDefinitions(): ToolDefinition[] {
  return Object.values(builtinTools).map(t => t.definition);
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (builtinTools[name]) {
    return builtinTools[name].execute(args);
  }
  const skillName = name.startsWith("skill_") ? name.slice(6).replace(/_/g, " ") : name;
  const rows = await db.select().from(skillsTable).where(eq(skillsTable.name, skillName)).limit(1);
  if (rows.length && rows[0].enabled) {
    return runSkillCode(rows[0].code, args);
  }
  return `Unknown tool: ${name}`;
}
