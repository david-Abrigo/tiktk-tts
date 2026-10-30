'use client';

import React, { useState } from 'react';
import {
  Skull,
  Flame,
  Volume2,
  VolumeX,
  Camera,
  Maximize2,
  Minimize2,
  Download,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Crown,
  Ghost,
  Radio,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { DrawingUser, getTierForDiamonds } from './drawingEngine';
import { halloweenAudio } from './halloweenAudio';

interface HalloweenGameOverlayProps {
  currentDrawing: DrawingUser | null;
  drawingProgress: number;
  drawingQueue: DrawingUser[];
  history: DrawingUser[];
  cameraMode: 'cinematic' | 'stream' | 'topdown' | 'free';
  setCameraMode: (mode: 'cinematic' | 'stream' | 'topdown' | 'free') => void;
  drawSpeedSeconds: number;
  setDrawSpeedSeconds: (sec: number) => void;
  onSimulateGift: (preset: 'rose' | 'donut' | 'swan' | 'lion' | 'custom', customData?: Partial<DrawingUser>) => void;
  onClearQueue: () => void;
  onSkipCurrent: () => void;
  isStreamConnected: boolean;
  streamUsername: string;
}

export const HalloweenGameOverlay: React.FC<HalloweenGameOverlayProps> = ({
  currentDrawing,
  drawingProgress,
  drawingQueue,
  history,
  cameraMode,
  setCameraMode,
  drawSpeedSeconds,
  setDrawSpeedSeconds,
  onSimulateGift,
  onClearQueue,
  onSkipCurrent,
  isStreamConnected,
  streamUsername,
}) => {
  const [isObsCleanMode, setIsObsCleanMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCustomSimModal, setShowCustomSimModal] = useState(false);

  // Custom simulator fields
  const [customName, setCustomName] = useState('halloween_fan');
  const [customNick, setCustomNick] = useState('Lord Espectro');
  const [customDiamonds, setCustomDiamonds] = useState(500);
  const [customAvatar, setCustomAvatar] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
  );

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    halloweenAudio.setMuted(nextMuted);
  };

  const currentTier = currentDrawing ? getTierForDiamonds(currentDrawing.diamonds) : null;

  // Determine stage description based on drawing progress
  const getStageDescription = (progress: number) => {
    if (progress < 0.25) return 'Talla del Marco Gótico & Runas Mágicas';
    if (progress < 0.70) return 'Transfiguración de Foto de Perfil';
    if (progress < 0.92) return 'Grabando Nombre en Caligrafía Espectral';
    return '¡Invocación Final & Sello de Halloween!';
  };

  return (
    <>
      {/* OBS CLEAN MODE EXIT PILL */}
      {isObsCleanMode && (
        <button
          onClick={() => setIsObsCleanMode(false)}
          className="absolute top-4 right-4 z-50 px-3 py-1.5 bg-black/80 hover:bg-black text-xs text-orange-400 border border-orange-500/50 rounded-full flex items-center gap-1.5 backdrop-blur-md transition-all shadow-lg shadow-orange-500/20"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          Salir de Modo OBS
        </button>
      )}

      {/* TOP STATUS BAR */}
      <div className={`absolute top-4 left-4 right-4 z-40 pointer-events-none flex items-center justify-between transition-opacity duration-300 ${isObsCleanMode ? 'opacity-0' : 'opacity-100'}`}>
        {/* Streamer Live Badge & Title */}
        <div className="pointer-events-auto flex items-center gap-3 bg-zinc-950/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-zinc-800 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isStreamConnected ? 'bg-emerald-400' : 'bg-orange-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isStreamConnected ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              {isStreamConnected ? `@${streamUsername}` : 'Modo Simulador'}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800" />

          <div className="flex items-center gap-1.5 text-xs font-medium text-orange-400">
            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 animate-pulse" />
            <span>Plotter CNC Graphtec FCX2000</span>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="pointer-events-auto flex items-center gap-2 bg-zinc-950/85 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 shadow-xl">
          {/* Camera switch */}
          <div className="flex items-center bg-zinc-900/90 rounded-xl p-1 border border-zinc-800">
            <button
              onClick={() => setCameraMode('cinematic')}
              className={`px-2 py-1 text-xs rounded-lg font-medium transition-all ${
                cameraMode === 'cinematic' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'text-zinc-400 hover:text-white'
              }`}
              title="Cámara orbital cinemática"
            >
              Cinemática
            </button>
            <button
              onClick={() => setCameraMode('topdown')}
              className={`px-2 py-1 text-xs rounded-lg font-medium transition-all ${
                cameraMode === 'topdown' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'text-zinc-400 hover:text-white'
              }`}
              title="Cámara cenital: vista directa desde arriba del Plotter"
            >
              Cenital (Top)
            </button>
            <button
              onClick={() => setCameraMode('stream')}
              className={`px-2 py-1 text-xs rounded-lg font-medium transition-all ${
                cameraMode === 'stream' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'text-zinc-400 hover:text-white'
              }`}
              title="Cámara frontal optimizada para Stream y OBS"
            >
              Stream (Frontal)
            </button>
            <button
              onClick={() => setCameraMode('free')}
              className={`px-2 py-1 text-xs rounded-lg font-medium transition-all ${
                cameraMode === 'free' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'text-zinc-400 hover:text-white'
              }`}
              title="Control libre 3D con el ratón"
            >
              3D Libre
            </button>
          </div>

          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all border border-zinc-800"
            title={isMuted ? 'Activar Sonidos' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* History modal */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all border border-zinc-800 flex items-center gap-1.5 text-xs font-medium"
            title="Galería de Almas (Retratos Dibujados)"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Galería ({history.length})</span>
          </button>

          {/* Full OBS Mode */}
          <button
            onClick={() => setIsObsCleanMode(true)}
            className="p-2 text-zinc-400 hover:text-orange-400 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all border border-zinc-800"
            title="Modo Limpio para OBS Studio (Oculta botones)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CURRENT DRAWING HERO CARD (LOWER CENTER / LEFT) */}
      <div className={`absolute bottom-6 left-6 z-40 max-w-sm w-full pointer-events-none transition-all duration-300 ${isObsCleanMode ? 'translate-y-2' : ''}`}>
        {currentDrawing && currentTier ? (
          <div className="pointer-events-auto bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-4 shadow-2xl shadow-orange-950/30 relative overflow-hidden">
            {/* Ambient Tier Glow */}
            <div
              className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-35"
              style={{ background: currentTier.accentColor }}
            />

            <div className="flex items-center gap-3.5 relative z-10">
              {/* Profile Avatar with Tier Border */}
              <div className="relative">
                <img
                  src={currentDrawing.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                  alt={currentDrawing.nickname}
                  className="w-14 h-14 rounded-2xl object-cover border-2 shadow-lg"
                  style={{ borderColor: currentTier.accentColor }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200';
                  }}
                />
                <span className="absolute -bottom-1 -right-1 text-sm">
                  {currentTier.tier === 'titan' ? '👑' : currentTier.tier === 'vampire' ? '🧛' : currentTier.tier === 'pumpkin' ? '🎃' : '👻'}
                </span>
              </div>

              {/* User details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white truncate">{currentDrawing.nickname}</h3>
                  <span
                    className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full"
                    style={{ background: `${currentTier.accentColor}25`, color: currentTier.accentColor }}
                  >
                    {currentTier.titleBadge}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 truncate">@{currentDrawing.uniqueId}</p>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                    🎁 {currentDrawing.giftName}
                  </span>
                  <span className="text-xs text-zinc-400">•</span>
                  <span className="text-xs font-bold text-orange-400">
                    {currentDrawing.diamonds} 💎
                  </span>
                </div>
              </div>
            </div>

            {/* Live Progress Bar */}
            <div className="mt-3.5 relative z-10">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-zinc-400 font-medium truncate">
                  {getStageDescription(drawingProgress)}
                </span>
                <span className="font-mono font-bold text-orange-400 ml-2">
                  {Math.round(drawingProgress * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full rounded-full transition-all duration-150 ease-out shadow-sm"
                  style={{
                    width: `${Math.min(100, Math.max(0, drawingProgress * 100))}%`,
                    background: `linear-gradient(90deg, #ea580c, ${currentTier.accentColor})`,
                  }}
                />
              </div>
            </div>

            {/* Queue Counter if multiple gifts waiting */}
            {drawingQueue.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Ghost className="w-3.5 h-3.5 text-purple-400" />
                  {drawingQueue.length} {drawingQueue.length === 1 ? 'persona en cola' : 'personas en cola'}
                </span>
                {!isObsCleanMode && (
                  <button
                    onClick={onSkipCurrent}
                    className="text-xs text-zinc-400 hover:text-white hover:underline transition-all"
                  >
                    Saltar actual
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="pointer-events-auto bg-zinc-950/85 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-4 shadow-xl text-center">
            <Ghost className="w-8 h-8 text-orange-400/80 mx-auto mb-2 animate-bounce" />
            <h4 className="text-sm font-semibold text-zinc-200">El Altar Espera Nuevas Almas</h4>
            <p className="text-xs text-zinc-400 mt-1">
              Envía un regalo en el Live o pulsa los botones de prueba para comenzar a dibujar.
            </p>
          </div>
        )}
      </div>

      {/* STREAMER QUICK CONTROL DOCK (BOTTOM RIGHT) */}
      {!isObsCleanMode && (
        <div className="absolute bottom-6 right-6 z-40 flex flex-col gap-3 pointer-events-none">
          {/* Quick Gift Simulators */}
          <div className="pointer-events-auto bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-3 shadow-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Simulador de Regalos
              </span>
              <button
                onClick={() => setShowCustomSimModal(true)}
                className="text-[11px] text-orange-400 hover:text-orange-300 font-medium hover:underline"
              >
                Personalizado
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onSimulateGift('rose')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-xs text-emerald-400 font-medium rounded-xl border border-zinc-800 transition-all hover:border-emerald-500/50"
              >
                🌹 Rosa (1💎)
              </button>

              <button
                onClick={() => onSimulateGift('donut')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-xs text-orange-400 font-medium rounded-xl border border-zinc-800 transition-all hover:border-orange-500/50"
              >
                🍩 Dona (30💎)
              </button>

              <button
                onClick={() => onSimulateGift('swan')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-xs text-rose-400 font-medium rounded-xl border border-zinc-800 transition-all hover:border-rose-500/50"
              >
                🦢 Cisne (199💎)
              </button>

              <button
                onClick={() => onSimulateGift('lion')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/90 hover:bg-amber-950/40 text-xs text-amber-400 font-bold rounded-xl border border-amber-600/40 transition-all hover:border-amber-400"
              >
                🦁 León (1000💎)
              </button>
            </div>

            {/* Speed slider */}
            <div className="pt-2 border-t border-zinc-800/80 px-1">
              <div className="flex justify-between items-center text-[11px] text-zinc-400 mb-1">
                <span>Velocidad de Dibujo:</span>
                <span className="font-semibold text-zinc-200">{drawSpeedSeconds}s por obra</span>
              </div>
              <input
                type="range"
                min="4"
                max="25"
                step="1"
                value={drawSpeedSeconds}
                onChange={(e) => setDrawSpeedSeconds(Number(e.target.value))}
                className="w-full accent-orange-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GALERÍA DE RETRATOS COMPLETADOS (HALL OF FAME) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skull className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-white">Galería de Almas Inmortales</h3>
                <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full font-semibold">
                  {history.length} retratos
                </span>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {history.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Ghost className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Aún no se han completado retratos.</p>
                  <p className="text-xs mt-1 text-zinc-600">
                    Los retratos dibujados se guardarán aquí para que puedas descargarlos o mostrarlos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {history.map((item, idx) => {
                    const tier = getTierForDiamonds(item.diamonds);
                    return (
                      <div
                        key={idx}
                        className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 flex items-center gap-3 relative group hover:border-zinc-700 transition-all"
                      >
                        <img
                          src={item.avatar}
                          alt={item.nickname}
                          className="w-12 h-12 rounded-xl object-cover border"
                          style={{ borderColor: tier.accentColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{item.nickname}</p>
                          <p className="text-xs text-zinc-400 truncate">@{item.uniqueId}</p>
                          <p className="text-xs font-bold mt-0.5" style={{ color: tier.accentColor }}>
                            {item.giftName} • {item.diamonds} 💎
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SIMULADOR PERSONALIZADO */}
      {showCustomSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-orange-400" />
                Simular Donador Personalizado
              </h3>
              <button
                onClick={() => setShowCustomSimModal(false)}
                className="text-zinc-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Nombre / Apodo</label>
                <input
                  type="text"
                  value={customNick}
                  onChange={(e) => setCustomNick(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Usuario (@handle)</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">Diamantes del Regalo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customDiamonds}
                    onChange={(e) => setCustomDiamonds(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">
                    ({getTierForDiamonds(customDiamonds).tierName})
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">URL Foto de Perfil</label>
                <input
                  type="text"
                  value={customAvatar}
                  onChange={(e) => setCustomAvatar(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500 truncate"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowCustomSimModal(false)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onSimulateGift('custom', {
                    nickname: customNick,
                    uniqueId: customName,
                    diamonds: customDiamonds,
                    avatar: customAvatar,
                    giftName:
                      customDiamonds >= 500
                        ? 'León Legendario'
                        : customDiamonds >= 100
                        ? 'Cisne Vampírico'
                        : customDiamonds >= 20
                        ? 'Calabaza Glow'
                        : 'Rosa Espectral',
                  });
                  setShowCustomSimModal(false);
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-orange-600/30"
              >
                Enviar a Dibujar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
