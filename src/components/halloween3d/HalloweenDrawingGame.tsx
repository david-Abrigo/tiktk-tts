'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HalloweenScene3D } from './HalloweenScene3D';
import { HalloweenGameOverlay } from './HalloweenGameOverlay';
import { DrawingUser } from './drawingEngine';

interface HalloweenDrawingGameProps {
  incomingGift?: DrawingUser | null;
  isStreamConnected: boolean;
  streamUsername: string;
}

// Preset avatars for instant simulation
const DEMO_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
];

export const HalloweenDrawingGame: React.FC<HalloweenDrawingGameProps> = ({
  incomingGift,
  isStreamConnected,
  streamUsername,
}) => {
  const [currentDrawing, setCurrentDrawing] = useState<DrawingUser | null>(null);
  const [drawingProgress, setDrawingProgress] = useState<number>(0);
  const [drawingQueue, setDrawingQueue] = useState<DrawingUser[]>([]);
  const [history, setHistory] = useState<DrawingUser[]>([]);
  const [cameraMode, setCameraMode] = useState<'cinematic' | 'stream' | 'topdown' | 'free'>('cinematic');
  const [drawSpeedSeconds, setDrawSpeedSeconds] = useState<number>(8); // default 8s
  const [particleBurstCount, setParticleBurstCount] = useState<number>(0);

  const isDrawingActiveRef = useRef<boolean>(false);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Enqueue incoming real-time gifts from TikTok Live
  const lastProcessedGiftRef = useRef<number>(0);
  useEffect(() => {
    if (incomingGift && incomingGift.timestamp > lastProcessedGiftRef.current) {
      lastProcessedGiftRef.current = incomingGift.timestamp;
      setDrawingQueue((prev) => [...prev, incomingGift]);
    }
  }, [incomingGift]);

  // Auto-activar demostración inicial al cargar para que el plotter cobre vida inmediatamente
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isDrawingActiveRef.current && drawingQueue.length === 0 && !currentDrawing) {
        handleSimulateGift('donut');
      }
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  // Queue runner: starts next drawing when idle
  useEffect(() => {
    if (!isDrawingActiveRef.current && drawingQueue.length > 0) {
      const nextUser = drawingQueue[0];
      setDrawingQueue((prev) => prev.slice(1));
      startDrawingUser(nextUser);
    }
  }, [drawingQueue, currentDrawing]);

  const startDrawingUser = (user: DrawingUser) => {
    isDrawingActiveRef.current = true;
    setCurrentDrawing(user);
    setDrawingProgress(0);
    startTimeRef.current = performance.now();

    const durationMs = drawSpeedSeconds * 1000;

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1.0, elapsed / durationMs);
      setDrawingProgress(progress);

      if (progress < 1.0) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        // Complete drawing!
        setParticleBurstCount((c) => c + 1);
        setHistory((prev) => [user, ...prev]);

        // Pause to appreciate the finished masterpiece before starting next in queue
        setTimeout(() => {
          isDrawingActiveRef.current = false;
          // If there is another person waiting, clear current so queue picks them up;
          // If queue is empty, leave the current drawing standing proud on the canvas!
          setDrawingQueue((q) => {
            if (q.length > 0) {
              setCurrentDrawing(null);
            }
            return q;
          });
        }, 3000);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  const skipCurrent = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    isDrawingActiveRef.current = false;
    setCurrentDrawing(null);
  };

  const clearQueue = () => {
    setDrawingQueue([]);
  };

  // Gift simulation handlers
  const handleSimulateGift = useCallback(
    (preset: 'rose' | 'donut' | 'swan' | 'lion' | 'custom', customData?: Partial<DrawingUser>) => {
      let simUser: DrawingUser;
      const randomAvatar = DEMO_AVATARS[Math.floor(Math.random() * DEMO_AVATARS.length)];

      switch (preset) {
        case 'rose':
          simUser = {
            uniqueId: 'fanta_rosa',
            nickname: 'Fantasmita Rosa',
            avatar: randomAvatar,
            giftName: 'Rosa Espectral',
            diamonds: 1,
            repeatCount: 1,
            timestamp: Date.now(),
          };
          break;
        case 'donut':
          simUser = {
            uniqueId: 'brujita_glow',
            nickname: 'Bruja de Neón',
            avatar: randomAvatar,
            giftName: 'Calabaza Maldita',
            diamonds: 30,
            repeatCount: 1,
            timestamp: Date.now(),
          };
          break;
        case 'swan':
          simUser = {
            uniqueId: 'conde_dracula',
            nickname: 'Conde Sombrio',
            avatar: randomAvatar,
            giftName: 'Cisne Carmesí',
            diamonds: 199,
            repeatCount: 1,
            timestamp: Date.now(),
          };
          break;
        case 'lion':
          simUser = {
            uniqueId: 'titan_halloween',
            nickname: 'Rey de las Sombras',
            avatar: randomAvatar,
            giftName: 'León de Halloween',
            diamonds: 1000,
            repeatCount: 1,
            timestamp: Date.now(),
          };
          break;
        case 'custom':
        default:
          simUser = {
            uniqueId: customData?.uniqueId || 'pro_gamer',
            nickname: customData?.nickname || 'Guerrero Espectral',
            avatar: customData?.avatar || randomAvatar,
            giftName: customData?.giftName || 'Regalo Épico',
            diamonds: customData?.diamonds || 500,
            repeatCount: 1,
            timestamp: Date.now(),
          };
          break;
      }

      setDrawingQueue((prev) => [...prev, simUser]);
    },
    []
  );

  return (
    <div className="relative w-full h-full min-h-[640px] bg-zinc-950 overflow-hidden flex flex-col">
      {/* 3D Scene */}
      <HalloweenScene3D
        currentDrawing={currentDrawing}
        drawingProgress={drawingProgress}
        cameraMode={cameraMode}
        particleBurstCount={particleBurstCount}
      />

      {/* Interactive HUD / Overlay */}
      <HalloweenGameOverlay
        currentDrawing={currentDrawing}
        drawingProgress={drawingProgress}
        drawingQueue={drawingQueue}
        history={history}
        cameraMode={cameraMode}
        setCameraMode={setCameraMode}
        drawSpeedSeconds={drawSpeedSeconds}
        setDrawSpeedSeconds={setDrawSpeedSeconds}
        onSimulateGift={handleSimulateGift}
        onClearQueue={clearQueue}
        onSkipCurrent={skipCurrent}
        isStreamConnected={isStreamConnected}
        streamUsername={streamUsername}
      />
    </div>
  );
};
