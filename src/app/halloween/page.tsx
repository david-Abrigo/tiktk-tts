'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { HalloweenDrawingGame } from '@/components/halloween3d/HalloweenDrawingGame';
import { DrawingUser } from '@/components/halloween3d/drawingEngine';

function HalloweenStandaloneContent() {
  const searchParams = useSearchParams();
  const initialUser = searchParams.get('username') || 'shulls_freefire';
  const [username, setUsername] = useState(initialUser);
  const [isStreamConnected, setIsStreamConnected] = useState(false);
  const [latestGift, setLatestGift] = useState<DrawingUser | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const cleanUser = username.replace(/^@/, '').trim();
    if (!cleanUser) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const sseUrl = `/api/stream?username=${encodeURIComponent(cleanUser)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('status', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.status === 'connected') {
          setIsStreamConnected(true);
        } else if (data.status === 'disconnected') {
          setIsStreamConnected(false);
        }
      } catch {}
    });

    es.addEventListener('gift', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const simUser: DrawingUser = {
          uniqueId: data.uniqueId || 'anon',
          nickname: data.nickname || data.uniqueId || 'Anon',
          avatar: data.avatar || '',
          giftName: data.giftName || 'Regalo',
          giftPictureUrl: data.giftPictureUrl,
          diamonds: data.diamonds || 1,
          repeatCount: data.repeatCount || 1,
          timestamp: data.timestamp || Date.now(),
        };
        setLatestGift(simUser);
      } catch (err) {
        console.error('Error parsing gift event', err);
      }
    });

    es.onerror = () => {
      setIsStreamConnected(false);
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [username]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-black select-none">
      <HalloweenDrawingGame
        incomingGift={latestGift}
        isStreamConnected={isStreamConnected}
        streamUsername={username}
      />
    </div>
  );
}

export default function HalloweenStandalonePage() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen bg-black flex items-center justify-center text-orange-400 font-bold">
          Cargando Retablo 3D de Halloween...
        </div>
      }
    >
      <HalloweenStandaloneContent />
    </Suspense>
  );
}
