import { NextRequest, NextResponse } from 'next/server';
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

  try {
    const connection = new TikTokLiveConnection(username, {
      processInitialData: false,
      fetchRoomInfoOnConnect: true,
      enableExtendedGiftInfo: false,
    });

    const roomId = await connection.fetchRoomId();
    const roomInfo = await connection.fetchRoomInfo();

    const data = roomInfo?.data;
    const isLive = data?.status === 2;

    return NextResponse.json(
      {
        success: true,
        username,
        roomId,
        isLive,
        status: isLive ? 'LIVE' : 'OFFLINE',
        title: data?.title || '',
        viewerCount: data?.user_count || 0,
        owner: {
          nickname: data?.owner?.nickname || username,
          displayId: data?.owner?.display_id || username,
          avatar: data?.owner?.avatar_thumb?.url_list?.[0] || '',
        },
        timestamp: Date.now(),
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        username,
        isLive: false,
        status: 'OFFLINE',
        message: error?.message || 'No se pudo obtener información del live',
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
