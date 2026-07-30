# Contrato API para búsqueda de productos

El frontend distingue una conversación normal de una búsqueda de productos
mediante campos estructurados. No intenta inferirlo desde el texto de la
respuesta.

## 1. Inicio de la búsqueda

`POST /chat`

```json
{
  "message": "Necesito un taladro inalámbrico",
  "history": []
}
```

Cuando la IA determina que puede buscar un producto, la API debe responder:

```json
{
  "type": "product_search",
  "intent": "product_search",
  "status": "searching",
  "requestId": "search_123",
  "resultUrl": "/chat/searches/search_123",
  "ui": {
    "animation": "product_search"
  }
}
```

Al recibir esta respuesta, el frontend muestra la animación de búsqueda y
consulta `resultUrl` cada segundo.

## 2. Búsqueda en progreso

`GET /chat/searches/search_123`

```json
{
  "type": "product_search",
  "status": "searching"
}
```

## 3. Producto encontrado

```json
{
  "type": "product_search",
  "status": "completed",
  "reply": "Encontré estas opciones para ti.",
  "products": [
    {
      "id": "SKU-123",
      "name": "Taladro inalámbrico",
      "price": 799,
      "currency": "GTQ",
      "imageUrl": "https://ejemplo.com/taladro.jpg",
      "productUrl": "https://ejemplo.com/productos/SKU-123"
    }
  ]
}
```

## 4. Sin resultados

```json
{
  "type": "product_search",
  "status": "not_found",
  "reply": "No encontré ese producto, pero puedo ayudarte con una alternativa."
}
```

También se admite una respuesta inmediata. Si la API devuelve
`intent: "product_search"` junto con `status: "completed"`, el frontend
reproduce brevemente la animación y luego muestra la respuesta.
