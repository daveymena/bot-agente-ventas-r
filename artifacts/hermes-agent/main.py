from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import os
import json

app = FastAPI(title="Hermes Sales Agent")

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_MODEL = os.getenv("GITHUB_MODEL", "gpt-4o-mini")
BASE_URL = "https://models.inference.ai.azure.com/chat/completions"

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]]
    phone: str
    products: Optional[List[Dict[str, Any]]] = []  # Catálogo recibido desde el bot

class ChatResponse(BaseModel):
    response: str
    matched_product_name: Optional[str] = None  # Nombre del producto detectado
    tool_calls: Optional[List[Dict[str, Any]]] = None

@app.get("/health")
async def health():
    return {"status": "ok", "agent": "hermes"}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not GITHUB_TOKEN:
        raise HTTPException(status_code=500, detail="GITHUB_TOKEN no configurado")

    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Content-Type": "application/json"
    }

    # Construir catálogo para el sistema
    catalog_text = ""
    if request.products:
        catalog_lines = [f"- {p['name']} | Precio: ${p['price']} | ID: {p['id']}" for p in request.products]
        catalog_text = "\n".join(catalog_lines)
    else:
        catalog_text = "(catálogo vacío)"

    system_prompt = f"""Eres Daniel, el asesor experto de Tecnovariedades D&S. Eres un agente de ventas profesional y amigable.

CATÁLOGO DE PRODUCTOS DISPONIBLES:
{catalog_text}

REGLAS CRÍTICAS:
1. Analiza el historial completo de la conversación para entender qué quiere el cliente.
2. Si el cliente menciona un producto o tema relacionado a alguno del catálogo, identifícalo e incluye EXACTAMENTE el campo "matched_product_name" con el nombre EXACTO del producto del catálogo.
3. Tu respuesta de texto debe ser MUY BREVE (1-2 líneas máximo), amigable y profesional. No incluyas precios ni detalles en tu texto — el sistema los enviará automáticamente en una tarjeta visual.
4. NUNCA uses cajas ASCII como ┌───, └, o caracteres especiales de marcos.
5. Si es el primer mensaje, saluda brevemente como Daniel.
6. Si el cliente ya conoce el producto y pregunta por precio o cómo comprar, tu texto debe guiarlo hacia el proceso de pago."""

    messages = [
        {"role": "system", "content": system_prompt},
        *request.history,
        {"role": "user", "content": request.message}
    ]

    # Tool para detectar producto
    tools = [
        {
            "type": "function",
            "function": {
                "name": "show_product_card",
                "description": "Llama esta función cuando el cliente pregunta por un producto específico del catálogo. Devuelve el nombre EXACTO del producto como aparece en el catálogo.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "product_name": {
                            "type": "string",
                            "description": "Nombre exacto del producto del catálogo"
                        },
                        "brief_reply": {
                            "type": "string",
                            "description": "Respuesta breve y amigable de 1-2 líneas para el cliente"
                        }
                    },
                    "required": ["product_name", "brief_reply"]
                }
            }
        }
    ]

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                BASE_URL,
                headers=headers,
                json={
                    "model": GITHUB_MODEL,
                    "messages": messages,
                    "tools": tools,
                    "tool_choice": "auto",
                    "temperature": 0.4
                },
                timeout=30.0
            )
            data = response.json()
            choice = data["choices"][0]["message"]

            # Si Hermes activó la tool show_product_card
            if choice.get("tool_calls"):
                tool_call = choice["tool_calls"][0]
                args = json.loads(tool_call["function"]["arguments"])
                return {
                    "response": args.get("brief_reply", "¡Claro! Aquí tienes la información:"),
                    "matched_product_name": args.get("product_name"),
                    "tool_calls": choice.get("tool_calls")
                }

            return {
                "response": choice.get("content") or "Dame un momento, enseguida te ayudo. 😊",
                "matched_product_name": None,
                "tool_calls": None
            }
        except Exception as e:
            print(f"Error en Hermes: {e}")
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
