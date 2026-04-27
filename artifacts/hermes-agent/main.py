from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import os
import json

app = FastAPI(title="Hermes GitHub Agent")

# Configuración de GitHub Models (Copilot)
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_MODEL = os.getenv("GITHUB_MODEL", "gpt-4o-mini")
BASE_URL = "https://models.inference.ai.azure.com/chat/completions"

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]]
    phone: str

class ChatResponse(BaseModel):
    response: str
    tool_calls: Optional[List[Dict[str, Any]]] = None

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Hermes Agent razonando con GitHub Models.
    """
    if not GITHUB_TOKEN:
        raise HTTPException(status_code=500, detail="GITHUB_TOKEN no configurado")

    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Content-Type": "application/json"
    }

    # Definición de herramientas (Tools) para Hermes
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_product_info",
                "description": "Obtiene precio y detalles de un curso o pack.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "Nombre del curso (ej: piano, excel)"}
                    },
                    "required": ["name"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "create_payment_link",
                "description": "Genera links de pago para un producto.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "product_id": {"type": "string"},
                        "phone": {"type": "string"}
                    },
                    "required": ["product_id", "phone"]
                }
            }
        }
    ]

    messages = [
        {"role": "system", "content": "Eres Hermes, el cerebro de ventas de Tecnovariedades D&S. Tu objetivo es razonar y ayudar al cliente usando herramientas."},
        *request.history,
        {"role": "user", "content": request.message}
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
                    "tool_choice": "auto"
                },
                timeout=30.0
            )
            data = response.json()
            
            choice = data["choices"][0]["message"]
            return {
                "response": choice.get("content") or "Procesando...",
                "tool_calls": choice.get("tool_calls")
            }
        except Exception as e:
            print(f"Error en Hermes: {e}")
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
