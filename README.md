# 🎙️ TikTok LIVE TTS & Realtime API (Vercel Ready)

Bot y API en tiempo real para leer en voz alta (Text-To-Speech) comentarios y donaciones de transmisiones de **TikTok LIVE** (ejemplo preconfigurado: [`@shulls_freefire`](https://www.tiktok.com/@shulls_freefire/live)), con transmisión instantánea hacia otros dispositivos como **teléfonos móviles**, OBS o aplicaciones personalizadas.

Construido con **Next.js (App Router)**, **Tailwind CSS**, y **tiktok-live-connector**, 100% preparado para ser desplegado en **Vercel** o ejecutado en modo standalone 24/7 con Node.js / Docker.

---

## 🚀 Características Principales

- **Conexión en Vivo con TikTok**: Captura en tiempo real comentarios de chat, regalos (gifts), me gusta (likes) y contador de espectadores.
- **Sintetizador de Voz (Text-to-Speech)**:
  - Basado en Web Speech API del dispositivo: **cero latencia y 100% gratuito** (sin APIs de pago).
  - Selección de voces en español (latino, España, etc.).
  - Controles de velocidad (0.5x - 2.0x), tono y volumen.
  - Filtro inteligente de spam (omite mensajes de 1 letra o solo emojis).
  - Cola de reproducción inteligente para evitar voces encimadas.
  - Botón de **"Probar Voz"** y **"Simular Comentario"** para pruebas inmediatas.
- **API en Tiempo Real para Móviles**:
  - Endpoint **Server-Sent Events (SSE)** en `/api/stream?username=...` con cabeceras CORS universales (`*`).
  - Compatible con cualquier cliente externo: **Flutter, React Native, Swift (iOS), Kotlin (Android), Python, cURL**.
  - Endpoint REST en `/api/status?username=...` para comprobar si el streamer está transmitiendo en directo y cuántos espectadores tiene.
- **Doble Modo de Despliegue**:
  1. **Vercel**: Despliegue serverless rápido con interfaz responsiva y SSE con reconexión automática.
  2. **Standalone Node.js**: Archivo `server.js` para ejecución continua 24/7 en VPS, Railway, Render o Docker sin límites de tiempo de ejecución.

---

## 🛠️ Instalación y Uso Local

1. Clona el repositorio e instala las dependencias:
```bash
git clone https://github.com/david-Abrigo/tiktk-tts.git
cd tiktk-tts
npm install
```

2. Inicia el servidor de desarrollo de Next.js:
```bash
npm run dev
```
Abre tu navegador en `http://localhost:3000`.

3. *(Opcional)* Iniciar el servidor autónomo 24/7:
```bash
npm run server
```
El servidor escuchará en `http://localhost:3001`.

---

## ☁️ Despliegue en Vercel

1. Sube este proyecto a tu repositorio de GitHub (o importa directamente `david-Abrigo/tiktk-tts`).
2. Entra a [Vercel](https://vercel.com) y selecciona **"Add New Project"**.
3. Importa el repositorio `tiktk-tts`.
4. Deja la configuración de compilación por defecto:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Haz clic en **Deploy**. ¡Listo!

---

## 📱 Integración con Dispositivos Móviles (API SSE)

Cualquier dispositivo móvil puede escuchar los comentarios en tiempo real conectándose al endpoint Server-Sent Events.

### Endpoint SSE:
```http
GET https://tu-dominio.vercel.app/api/stream?username=shulls_freefire
```

### 1. React Native / JavaScript
```javascript
const eventSource = new EventSource('https://tu-dominio.vercel.app/api/stream?username=shulls_freefire');

// Escuchar comentarios del chat
eventSource.addEventListener('chat', (event) => {
  const data = JSON.parse(event.data);
  console.log(`${data.nickname} dice: ${data.comment}`);
  // Llama aquí al motor de TTS nativo de tu teléfono (e.g. react-native-tts)
});

// Escuchar regalos
eventSource.addEventListener('gift', (event) => {
  const gift = JSON.parse(event.data);
  console.log(`Regalo: ${gift.nickname} envió ${gift.repeatCount}x ${gift.giftName}`);
});
```

### 2. Flutter / Dart
```dart
import 'dart:convert';
import 'package:eventsource/eventsource.dart';

void startListening() async {
  final eventSource = await EventSource.connect(
    'https://tu-dominio.vercel.app/api/stream?username=shulls_freefire'
  );

  eventSource.listen((Event event) {
    if (event.event == 'chat') {
      final commentData = jsonDecode(event.data!);
      print("${commentData['nickname']}: ${commentData['comment']}");
    }
  });
}
```

### 3. cURL (Prueba desde consola)
```bash
curl -N "https://tu-dominio.vercel.app/api/stream?username=shulls_freefire"
```

---

## 📊 Consulta de Estado REST

Para verificar si un usuario de TikTok está en vivo antes de conectar:

```http
GET /api/status?username=shulls_freefire
```

**Respuesta JSON:**
```json
{
  "success": true,
  "username": "shulls_freefire",
  "roomId": "7687583257332206343",
  "isLive": true,
  "status": "LIVE",
  "title": "4 dia sin dormir reto extremo",
  "viewerCount": 1488,
  "timestamp": 1740000000000
}
```

---

## 📦 Estructura del Código

```text
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── stream/route.ts   # Endpoint SSE en tiempo real
│   │   │   └── status/route.ts   # Endpoint de estado REST
│   │   ├── globals.css           # Estilos con tema TikTok Dark
│   │   ├── layout.tsx            # Metadata y estructura
│   │   └── page.tsx              # Dashboard interactivo con TTS y móvil
├── server.js                     # Servidor Node.js standalone 24/7
├── next.config.mjs               # Configuración de Next.js y paquetes de servidor
├── vercel.json                   # Ajustes de tiempo de ejecución para Vercel
├── package.json
└── README.md
```

---

## 📝 Licencia

MIT © 2026 david-Abrigo
