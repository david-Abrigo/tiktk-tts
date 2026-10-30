import { NextRequest } from 'next/server';
import { TikTokLiveConnection } from 'tiktok-live-connector';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUsername = searchParams.get('username') || 'shulls_freefire';
  const username = rawUsername.replace(/^@/, '').trim();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      let connection: any = null;
      let heartbeatTimer: NodeJS.Timeout | null = null;

      const sendEvent = (event: string, data: any) => {
        if (isClosed) return;
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream already closed
        }
      };

      // Send initial connecting status
      sendEvent('status', {
        status: 'connecting',
        username,
        timestamp: Date.now(),
      });

      // Periodic heartbeat to keep SSE alive through proxies / Vercel
      heartbeatTimer = setInterval(() => {
        if (isClosed) {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          return;
        }
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      }, 10000);

      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (connection) {
          try {
            connection.disconnect();
          } catch {
            // Ignore disconnect errors on close
          }
          connection = null;
        }
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      req.signal.addEventListener('abort', cleanup);

      try {
        connection = new TikTokLiveConnection(username, {
          processInitialData: true,
          fetchRoomInfoOnConnect: true,
          enableExtendedGiftInfo: false,
        });

        // Chat event
        connection.on('chat', (data: any) => {
          const comment = data?.content || data?.comment || '';
          const uniqueId = data?.user?.displayId || data?.uniqueId || 'anon';
          const nickname = data?.user?.nickname || data?.nickname || uniqueId;
          const avatar =
            data?.user?.avatarThumb?.urlList?.[0] ||
            data?.profilePictureUrl ||
            '';

          // Detect if user is a subscriber
          const isSubscriber = Boolean(
            data?.userIdentity?.isSubscriberOfAnchor ||
            data?.user?.isSubscribe ||
            data?.isSubscriber ||
            data?.user?.badgeList?.some((b: any) =>
              b?.name?.toLowerCase()?.includes('sub') ||
              b?.displayType === 1
            )
          );

          sendEvent('chat', {
            id: data?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            uniqueId,
            nickname,
            comment,
            avatar,
            isSubscriber,
            timestamp: Date.now(),
          });
        });

        // Follow event
        connection.on('follow', (data: any) => {
          const uniqueId = data?.user?.displayId || data?.uniqueId || 'anon';
          const nickname = data?.user?.nickname || data?.nickname || uniqueId;
          const avatar = data?.user?.avatarThumb?.urlList?.[0] || '';

          sendEvent('follow', {
            uniqueId,
            nickname,
            avatar,
            timestamp: Date.now(),
          });
        });

        // Subscribe / Superfan event
        const onSubEvent = (data: any) => {
          const uniqueId = data?.user?.displayId || data?.uniqueId || 'anon';
          const nickname = data?.user?.nickname || data?.nickname || uniqueId;

          sendEvent('subscribe', {
            uniqueId,
            nickname,
            timestamp: Date.now(),
          });
        };
        connection.on('subscribe', onSubEvent);
        connection.on('superFanJoin', onSubEvent);

        // Gift event
        connection.on('gift', (data: any) => {
          const giftName = data?.gift?.name || data?.giftName || 'Gift';
          const diamonds = data?.gift?.diamondCount || data?.diamondCount || 0;
          const repeatCount = data?.repeatCount || 1;
          const uniqueId = data?.user?.displayId || data?.uniqueId || 'anon';
          const nickname = data?.user?.nickname || data?.nickname || uniqueId;
          const avatar =
            data?.user?.avatarThumb?.urlList?.[0] ||
            data?.user?.avatarMedium?.urlList?.[0] ||
            data?.user?.avatarLarge?.urlList?.[0] ||
            data?.profilePictureUrl ||
            '';
          const giftPictureUrl =
            data?.gift?.image?.urlList?.[0] ||
            data?.giftPictureUrl ||
            data?.gift?.icon?.urlList?.[0] ||
            '';

          sendEvent('gift', {
            uniqueId,
            nickname,
            avatar,
            giftName,
            giftPictureUrl,
            diamonds,
            repeatCount,
            timestamp: Date.now(),
          });
        });

        // Like event
        connection.on('like', (data: any) => {
          const uniqueId = data?.user?.displayId || data?.uniqueId || 'anon';
          sendEvent('like', {
            uniqueId,
            likeCount: data?.likeCount || 1,
            totalLikeCount: data?.totalLikeCount,
            timestamp: Date.now(),
          });
        });

        // Viewer count update
        connection.on('roomUser', (data: any) => {
          sendEvent('viewerCount', {
            viewerCount: data?.viewerCount || 0,
            timestamp: Date.now(),
          });
        });

        // Stream disconnected
        connection.on('disconnected', () => {
          sendEvent('status', {
            status: 'disconnected',
            username,
            timestamp: Date.now(),
          });
          cleanup();
        });

        // Connect
        const state = await connection.connect();
        const roomInfo = connection.roomInfo?.data;

        sendEvent('status', {
          status: 'connected',
          username,
          roomId: state?.roomId || connection.roomId,
          title: roomInfo?.title || '',
          userCount: roomInfo?.user_count || 0,
          timestamp: Date.now(),
        });
      } catch (err: any) {
        sendEvent('error', {
          status: 'error',
          message: err?.message || 'Error al conectar con la transmisión de TikTok',
          isOffline:
            err?.message?.includes('offline') ||
            err?.name === 'UserOfflineError',
          timestamp: Date.now(),
        });
        cleanup();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
