/**
 * Servidor Independiente Node.js (24/7 Standalone Server)
 * Permite ejecutar el bot de TikTok Live de forma continua en VPS, Docker, Render o Railway
 * sin las restricciones de tiempo de ejecución de funciones serverless.
 */

const http = require('http');
const url = require('url');
const { TikTokLiveConnection } = require('tiktok-live-connector');

const PORT = process.env.PORT || 3001;

// Almacén de conexiones activas por streamer
const activeStreams = new Map();

function getOrCreateStream(username) {
  if (activeStreams.has(username)) {
    return activeStreams.get(username);
  }

  const clients = new Set();
  const connection = new TikTokLiveConnection(username, {
    processInitialData: true,
    fetchRoomInfoOnConnect: true,
    enableExtendedGiftInfo: false,
  });

  const broadcast = (event, data) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
      try {
        client.write(payload);
      } catch (err) {
        clients.delete(client);
      }
    }
  };

  connection.on('chat', (data) => {
    const comment = data?.content || data?.comment || '';
    const uniqueId = data?.user?.displayId || data?.uniqueId || 'anon';
    const nickname = data?.user?.nickname || data?.nickname || uniqueId;
    const avatar = data?.user?.avatarThumb?.urlList?.[0] || data?.profilePictureUrl || '';

    const isSubscriber = Boolean(
      data?.userIdentity?.isSubscriberOfAnchor ||
      data?.user?.isSubscribe ||
      data?.isSubscriber ||
      data?.user?.badgeList?.some((b) =>
        b?.name?.toLowerCase()?.includes('sub') ||
        b?.displayType === 1
      )
    );

    broadcast('chat', {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      uniqueId,
      nickname,
      comment,
      avatar,
      isSubscriber,
      timestamp: Date.now(),
    });
  });

  connection.on('follow', (data) => {
    const uniqueId = data?.user?.displayId || data?.uniqueId || 'anon';
    const nickname = data?.user?.nickname || data?.nickname || uniqueId;
    const avatar = data?.user?.avatarThumb?.urlList?.[0] || '';

    broadcast('follow', {
      uniqueId,
      nickname,
      avatar,
      timestamp: Date.now(),
    });
  });

  const onSub = (data) => {
    const uniqueId = data?.user?.displayId || data?.uniqueId || 'anon';
    const nickname = data?.user?.nickname || data?.nickname || uniqueId;
    broadcast('subscribe', {
      uniqueId,
      nickname,
      timestamp: Date.now(),
    });
  };
  connection.on('subscribe', onSub);
  connection.on('superFanJoin', onSub);

  connection.on('gift', (data) => {
    const giftName = data?.gift?.name || data?.giftName || 'Gift';
    const diamonds = data?.gift?.diamondCount || data?.diamondCount || 0;
    const repeatCount = data?.repeatCount || 1;
    const uniqueId = data?.user?.displayId || data?.uniqueId || 'anon';
    const nickname = data?.user?.nickname || data?.nickname || uniqueId;

    broadcast('gift', {
      uniqueId,
      nickname,
      giftName,
      diamonds,
      repeatCount,
      timestamp: Date.now(),
    });
  });

  connection.on('like', (data) => {
    broadcast('like', {
      uniqueId: data?.user?.displayId || data?.uniqueId || 'anon',
      likeCount: data?.likeCount || 1,
      totalLikeCount: data?.totalLikeCount,
      timestamp: Date.now(),
    });
  });

  connection.on('roomUser', (data) => {
    broadcast('viewerCount', {
      viewerCount: data?.viewerCount || 0,
      timestamp: Date.now(),
    });
  });

  connection.on('disconnected', () => {
    broadcast('status', { status: 'disconnected', username, timestamp: Date.now() });
    activeStreams.delete(username);
  });

  connection.connect().then((state) => {
    broadcast('status', {
      status: 'connected',
      username,
      roomId: state.roomId,
      timestamp: Date.now(),
    });
    console.log(`[TikTok-Live] Conectado exitosamente al stream de @${username}`);
  }).catch((err) => {
    console.error(`[TikTok-Live] Error al conectar con @${username}:`, err.message);
    broadcast('error', { message: err.message, timestamp: Date.now() });
    activeStreams.delete(username);
  });

  const streamInfo = { connection, clients, broadcast };
  activeStreams.set(username, streamInfo);
  return streamInfo;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Cabeceras CORS universales para móvil y web
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Endpoint Server-Sent Events (SSE)
  if (pathname === '/api/stream') {
    const rawUsername = parsedUrl.query.username || 'shulls_freefire';
    const username = rawUsername.replace(/^@/, '').trim();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    res.write(`event: status\ndata: ${JSON.stringify({ status: 'subscribing', username })}\n\n`);

    const stream = getOrCreateStream(username);
    stream.clients.add(res);

    // Heartbeat
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      stream.clients.delete(res);
      if (stream.clients.size === 0) {
        console.log(`[TikTok-Live] Sin oyentes para @${username}. Cerrando sesión.`);
        try { stream.connection.disconnect(); } catch {}
        activeStreams.delete(username);
      }
    });
    return;
  }

  // 2. Endpoint de Estado
  if (pathname === '/api/status') {
    const rawUsername = parsedUrl.query.username || 'shulls_freefire';
    const username = rawUsername.replace(/^@/, '').trim();

    try {
      const conn = new TikTokLiveConnection(username, {
        processInitialData: false,
        fetchRoomInfoOnConnect: true,
      });
      const roomId = await conn.fetchRoomId();
      const roomInfo = await conn.fetchRoomInfo();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        username,
        roomId,
        isLive: roomInfo?.data?.status === 2,
        title: roomInfo?.data?.title || '',
        viewerCount: roomInfo?.data?.user_count || 0,
      }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        username,
        isLive: false,
        error: err.message,
      }));
    }
    return;
  }

  // 3. Info de bienvenida
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: 'TikTok LIVE TTS & Realtime API (Standalone Server)',
    version: '1.0.0',
    endpoints: {
      stream: '/api/stream?username=shulls_freefire',
      status: '/api/status?username=shulls_freefire',
    },
    message: 'Conéctate a /api/stream mediante EventSource desde móvil o navegador.',
  }));
});

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Servidor TikTok LIVE TTS activo en http://localhost:${PORT}`);
  console.log(` Stream SSE: http://localhost:${PORT}/api/stream?username=shulls_freefire`);
  console.log(`=========================================`);
});
