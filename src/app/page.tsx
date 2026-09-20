'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Radio,
  Play,
  Square,
  Sparkles,
  Smartphone,
  Share2,
  ExternalLink,
  Code2,
  Settings,
  Heart,
  Gift,
  MessageSquare,
  Users,
  Check,
  Copy,
  Trash2,
  Pause,
  ArrowDownCircle,
  RefreshCw,
  Sliders,
} from 'lucide-react';

interface CommentItem {
  id: string;
  uniqueId: string;
  nickname: string;
  comment: string;
  avatar: string;
  timestamp: number;
}

interface GiftItem {
  uniqueId: string;
  nickname: string;
  giftName: string;
  diamonds: number;
  repeatCount: number;
  timestamp: number;
}

export default function Home() {
  const [username, setUsername] = useState('shulls_freefire');
  const [inputUsername, setInputUsername] = useState('shulls_freefire');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Stream info
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [streamTitle, setStreamTitle] = useState('');
  const [roomId, setRoomId] = useState('');

  // Comments feed
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // TTS Settings
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');
  const [ttsRate, setTtsRate] = useState<number>(1.1);
  const [ttsPitch, setTtsPitch] = useState<number>(1.0);
  const [ttsVolume, setTtsVolume] = useState<number>(1.0);
  const [ttsReadUsername, setTtsReadUsername] = useState(false);
  const [ttsFilterShort, setTtsFilterShort] = useState(true);
  const [ttsReadGifts, setTtsReadGifts] = useState(true);
  const [queueLength, setQueueLength] = useState(0);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'comments' | 'tts' | 'api' | 'gifts'>('comments');

  // Copied helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Queue ref
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load browser voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setTtsVoices(available);
        // Default to a Spanish voice if available
        const spanishVoice = available.find((v) => v.lang.startsWith('es'));
        if (spanishVoice && !selectedVoiceUri) {
          setSelectedVoiceUri(spanishVoice.voiceURI);
        } else if (!selectedVoiceUri && available[0]) {
          setSelectedVoiceUri(available[0].voiceURI);
        }
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, [selectedVoiceUri]);

  // TTS Play queue handler
  const processNextInQueue = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speechQueueRef.current.length === 0) {
      isSpeakingRef.current = false;
      setQueueLength(0);
      return;
    }

    if (isSpeakingRef.current) return;

    const text = speechQueueRef.current.shift();
    setQueueLength(speechQueueRef.current.length);
    if (!text) return;

    isSpeakingRef.current = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = ttsRate;
    utterance.pitch = ttsPitch;
    utterance.volume = ttsVolume;

    if (selectedVoiceUri) {
      const voice = ttsVoices.find((v) => v.voiceURI === selectedVoiceUri);
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => {
      isSpeakingRef.current = false;
      processNextInQueue();
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      processNextInQueue();
    };

    window.speechSynthesis.speak(utterance);
  }, [ttsRate, ttsPitch, ttsVolume, selectedVoiceUri, ttsVoices]);

  const speakText = useCallback(
    (text: string) => {
      if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      // Filter short messages if enabled
      if (ttsFilterShort && text.trim().length < 2) return;

      // Limit queue to avoid accumulating 100+ messages
      if (speechQueueRef.current.length > 15) {
        speechQueueRef.current.splice(0, speechQueueRef.current.length - 10);
      }

      speechQueueRef.current.push(text);
      setQueueLength(speechQueueRef.current.length);

      if (!isSpeakingRef.current) {
        processNextInQueue();
      }
    },
    [ttsEnabled, ttsFilterShort, processNextInQueue]
  );

  const stopSpeaking = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    speechQueueRef.current = [];
    isSpeakingRef.current = false;
    setQueueLength(0);
    window.speechSynthesis.cancel();
  };

  const testVoice = () => {
    stopSpeaking();
    const sample = '¡Hola! Este es el bot de voz para leer comentarios de TikTok en vivo.';
    speakText(sample);
  };

  // Connect SSE
  const connectToStream = useCallback((targetUser: string) => {
    const cleanUser = targetUser.replace(/^@/, '').trim();
    if (!cleanUser) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionStatus('connecting');
    setErrorMessage('');
    setUsername(cleanUser);

    const sseUrl = `/api/stream?username=${encodeURIComponent(cleanUser)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('status', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.status === 'connected') {
          setConnectionStatus('connected');
          if (data.title) setStreamTitle(data.title);
          if (data.userCount) setViewerCount(data.userCount);
          if (data.roomId) setRoomId(data.roomId);
        } else if (data.status === 'disconnected') {
          setConnectionStatus('disconnected');
        }
      } catch (err) {
        console.error('Error parsing status event', err);
      }
    });

    es.addEventListener('chat', (e: MessageEvent) => {
      try {
        const data: CommentItem = JSON.parse(e.data);
        setComments((prev) => {
          const next = [...prev, data];
          return next.length > 200 ? next.slice(-200) : next;
        });

        // Trigger TTS
        const toSpeak = ttsReadUsername
          ? `${data.nickname} dice: ${data.comment}`
          : data.comment;
        speakText(toSpeak);
      } catch (err) {
        console.error('Error parsing chat event', err);
      }
    });

    es.addEventListener('gift', (e: MessageEvent) => {
      try {
        const data: GiftItem = JSON.parse(e.data);
        setGifts((prev) => [data, ...prev].slice(0, 50));
        if (ttsReadGifts) {
          speakText(`¡${data.nickname} envió ${data.repeatCount} ${data.giftName}!`);
        }
      } catch (err) {
        console.error('Error parsing gift event', err);
      }
    });

    es.addEventListener('viewerCount', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.viewerCount) setViewerCount(data.viewerCount);
      } catch {}
    });

    es.addEventListener('error', (e: any) => {
      try {
        if (e.data) {
          const data = JSON.parse(e.data);
          setErrorMessage(data.message || 'Error de conexión con TikTok');
          setConnectionStatus('error');
        }
      } catch {
        // SSE general connection error or disconnect
      }
    });

    es.onerror = () => {
      // EventSource automatically attempts to reconnect on error
    };
  }, [speakText, ttsReadGifts, ttsReadUsername]);

  // Initial connect on mount
  useEffect(() => {
    connectToStream(username);
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      stopSpeaking();
    };
  }, []);

  // Auto scroll comments
  useEffect(() => {
    if (autoScroll && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, autoScroll]);

  // Add simulated comment for testing
  const addSimulatedComment = () => {
    const mockNames = ['Carlos_Gamer', 'Maria_FreeFire', 'AlexPro99', 'Goku_FF', 'Valen_Live', 'Javier_P'];
    const mockMessages = [
      '¡Buena partida hermano!',
      'Manda saludos a México por favor',
      '¿Qué arma estás usando?',
      'GG crack, juega con la escopeta',
      'Saludos desde Colombia',
      'Jajaja qué épica esa jugada',
    ];
    const randomUser = mockNames[Math.floor(Math.random() * mockNames.length)];
    const randomMsg = mockMessages[Math.floor(Math.random() * mockMessages.length)];

    const mockItem: CommentItem = {
      id: `${Date.now()}-${Math.random()}`,
      uniqueId: randomUser.toLowerCase(),
      nickname: randomUser,
      comment: randomMsg,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${randomUser}`,
      timestamp: Date.now(),
    };

    setComments((prev) => [...prev, mockItem]);
    const textToSpeak = ttsReadUsername ? `${mockItem.nickname} dice: ${mockItem.comment}` : mockItem.comment;
    speakText(textToSpeak);
  };

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://tu-app.vercel.app';
  const apiStreamUrl = `${currentOrigin}/api/stream?username=${username}`;

  return (
    <main className="min-h-screen pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#09090b]/80 border-b border-[#23232c] px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FE2C55] to-[#25F4EE] flex items-center justify-center p-0.5 shadow-lg shadow-[#FE2C55]/20">
              <div className="w-full h-full bg-[#0d0d11] rounded-[10px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-[#25F4EE] animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                TikTok Live TTS
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#25F4EE]/10 text-[#25F4EE] border border-[#25F4EE]/30">
                  Vercel Ready
                </span>
              </h1>
              <p className="text-xs text-gray-400">Lector de voz y API en tiempo real para móviles</p>
            </div>
          </div>

          {/* Quick Streamer Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              connectToStream(inputUsername);
            }}
            className="flex items-center gap-2 flex-1 max-w-md"
          >
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-semibold">@</span>
              <input
                type="text"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                placeholder="usuario_tiktok"
                className="w-full bg-[#16161d] border border-[#282834] rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none focus:border-[#25F4EE] transition"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white font-medium text-sm transition flex items-center gap-1.5 shadow-md shadow-[#FE2C55]/20"
            >
              <RefreshCw className={`w-4 h-4 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
              Conectar
            </button>
          </form>

          {/* Connection Status Pill */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : connectionStatus === 'error'
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-400 animate-ping'
                    : connectionStatus === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : connectionStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-zinc-500'
                }`}
              />
              {connectionStatus === 'connected' && 'EN VIVO'}
              {connectionStatus === 'connecting' && 'Conectando...'}
              {connectionStatus === 'error' && 'Error'}
              {connectionStatus === 'disconnected' && 'Desconectado'}
            </div>

            {/* TTS Quick Toggle */}
            <button
              onClick={() => {
                if (ttsEnabled) stopSpeaking();
                setTtsEnabled(!ttsEnabled);
              }}
              title={ttsEnabled ? 'Silenciar voz' : 'Activar voz'}
              className={`p-2 rounded-lg border transition ${
                ttsEnabled
                  ? 'bg-[#25F4EE]/10 text-[#25F4EE] border-[#25F4EE]/40 shadow-sm shadow-[#25F4EE]/20'
                  : 'bg-[#16161d] text-gray-400 border-[#282834]'
              }`}
            >
              {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Stream Info & Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Streamer Card */}
          <div className="bg-[#121216] border border-[#23232c] rounded-2xl p-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FE2C55]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FE2C55] to-[#25F4EE] p-0.5">
                  <div className="w-full h-full rounded-full bg-[#181820] flex items-center justify-center overflow-hidden">
                    <span className="font-bold text-lg text-white">
                      {username.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <h2 className="font-bold text-base text-white flex items-center gap-1.5">
                    @{username}
                    <a
                      href={`https://www.tiktok.com/@${username}/live`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-[#25F4EE] transition"
                      title="Abrir en TikTok"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </h2>
                  <p className="text-xs text-gray-400 line-clamp-1">{streamTitle || 'Transmisión de TikTok LIVE'}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="flex items-center gap-1 text-gray-300">
                      <Users className="w-3.5 h-3.5 text-[#25F4EE]" />
                      {viewerCount.toLocaleString()} viewers
                    </span>
                    {roomId && (
                      <span className="text-zinc-500 font-mono text-[11px]">
                        ID: {roomId.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                ⚠️ {errorMessage}
              </div>
            )}
          </div>

          {/* Quick Action Tabs */}
          <div className="flex rounded-xl bg-[#121216] p-1 border border-[#23232c] gap-1">
            <button
              onClick={() => setActiveTab('comments')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'comments'
                  ? 'bg-[#1e1e27] text-white shadow-sm border border-[#2c2c3a]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat ({comments.length})
            </button>
            <button
              onClick={() => setActiveTab('tts')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'tts'
                  ? 'bg-[#1e1e27] text-[#25F4EE] shadow-sm border border-[#2c2c3a]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Ajustes TTS
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'api'
                  ? 'bg-[#1e1e27] text-[#FE2C55] shadow-sm border border-[#2c2c3a]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              API Móvil
            </button>
          </div>

          {/* TTS Settings Card */}
          <div className="bg-[#121216] border border-[#23232c] rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#23232c] pb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#25F4EE]" />
                <h3 className="font-semibold text-sm">Sintetizador de Voz (TTS)</h3>
              </div>
              {queueLength > 0 && (
                <span className="px-2 py-0.5 text-[11px] rounded-full bg-[#FE2C55]/20 text-[#FE2C55] border border-[#FE2C55]/30">
                  Cola: {queueLength}
                </span>
              )}
            </div>

            {/* Voice Select */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Voz del Navegador / Móvil</label>
              <select
                value={selectedVoiceUri}
                onChange={(e) => setSelectedVoiceUri(e.target.value)}
                className="w-full bg-[#16161d] border border-[#282834] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#25F4EE] text-gray-200"
              >
                {ttsVoices.length === 0 ? (
                  <option value="">Cargando voces del sistema...</option>
                ) : (
                  ttsVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Sliders: Rate, Pitch, Volume */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-gray-400 mb-1">
                  <span>Velocidad de Lectura</span>
                  <span className="text-[#25F4EE] font-mono">{ttsRate.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={ttsRate}
                  onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                  className="w-full accent-[#25F4EE] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-gray-400 mb-1">
                  <span>Tono (Pitch)</span>
                  <span className="text-[#25F4EE] font-mono">{ttsPitch.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={ttsPitch}
                  onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                  className="w-full accent-[#25F4EE] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-gray-400 mb-1">
                  <span>Volumen</span>
                  <span className="text-[#25F4EE] font-mono">{Math.round(ttsVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ttsVolume}
                  onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                  className="w-full accent-[#25F4EE] cursor-pointer"
                />
              </div>
            </div>

            {/* Filter checkboxes */}
            <div className="space-y-2 pt-2 border-t border-[#23232c] text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ttsReadUsername}
                  onChange={(e) => setTtsReadUsername(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-[#FE2C55] accent-[#FE2C55]"
                />
                <span className="text-gray-300">Mencionar nombre ("Juan dice: hola")</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ttsFilterShort}
                  onChange={(e) => setTtsFilterShort(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-[#FE2C55] accent-[#FE2C55]"
                />
                <span className="text-gray-300">Omitir spam o mensajes de 1 letra</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ttsReadGifts}
                  onChange={(e) => setTtsReadGifts(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-[#FE2C55] accent-[#FE2C55]"
                />
                <span className="text-gray-300">Anunciar regalos (Gifts) recibidos</span>
              </label>
            </div>

            {/* Voice Test & Stop buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#23232c]">
              <button
                onClick={testVoice}
                className="py-2 px-3 rounded-lg bg-[#1a1a24] hover:bg-[#232332] text-xs font-semibold text-gray-200 border border-[#2b2b3d] flex items-center justify-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Probar Voz
              </button>
              <button
                onClick={stopSpeaking}
                className="py-2 px-3 rounded-lg bg-[#25151a] hover:bg-[#331c23] text-xs font-semibold text-[#FE2C55] border border-[#FE2C55]/30 flex items-center justify-center gap-1.5 transition"
              >
                <Square className="w-3.5 h-3.5" />
                Detener Audio
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Comments Feed & API Integration (8 cols) */}
        <div className="lg:col-span-8">
          {activeTab === 'comments' && (
            <div className="bg-[#121216] border border-[#23232c] rounded-2xl flex flex-col h-[750px] shadow-xl overflow-hidden">
              {/* Header Feed Bar */}
              <div className="p-3.5 border-b border-[#23232c] flex items-center justify-between bg-[#14141a]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#FE2C55]" />
                  <span className="font-semibold text-sm text-gray-200">Comentarios en Tiempo Real</span>
                  <span className="text-xs text-gray-500 font-mono">({comments.length})</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={addSimulatedComment}
                    className="px-2.5 py-1 text-xs rounded-lg bg-[#1d1d28] hover:bg-[#272737] text-gray-300 border border-[#2c2c3d] flex items-center gap-1 transition"
                    title="Simular un comentario para probar TTS"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Simular
                  </button>

                  <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition flex items-center gap-1 ${
                      autoScroll
                        ? 'bg-[#25F4EE]/10 text-[#25F4EE] border-[#25F4EE]/30'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    <ArrowDownCircle className="w-3 h-3" />
                    Auto-scroll
                  </button>

                  <button
                    onClick={() => setComments([])}
                    className="p-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition"
                    title="Limpiar lista"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                    <Radio className="w-12 h-12 mb-3 text-gray-600 animate-pulse" />
                    <p className="font-medium text-gray-400">Esperando comentarios en vivo de @{username}...</p>
                    <p className="text-xs text-gray-600 mt-1 max-w-sm">
                      Si el streamer está en vivo, los comentarios aparecerán aquí y serán leídos por voz al instante.
                    </p>
                    <button
                      onClick={addSimulatedComment}
                      className="mt-4 px-4 py-2 rounded-xl bg-[#1e1e28] hover:bg-[#282836] border border-[#2f2f42] text-xs font-semibold text-[#25F4EE] flex items-center gap-1.5 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Enviar comentario de prueba
                    </button>
                  </div>
                ) : (
                  comments.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-start gap-3 p-2.5 rounded-xl bg-[#16161e]/60 hover:bg-[#1b1b24] border border-[#22222d] transition"
                    >
                      {item.avatar ? (
                        <img
                          src={item.avatar}
                          alt={item.nickname}
                          className="w-8 h-8 rounded-full object-cover border border-[#2a2a38]"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white">
                          {item.nickname.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#25F4EE] truncate">
                            {item.nickname}
                          </span>
                          <span className="text-[11px] text-gray-500 truncate">
                            @{item.uniqueId}
                          </span>
                          <span className="text-[10px] text-gray-600 ml-auto">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-100 mt-0.5 break-words font-normal">
                          {item.comment}
                        </p>
                      </div>

                      <button
                        onClick={() => speakText(item.comment)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                        title="Leer este comentario"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>
            </div>
          )}

          {activeTab === 'tts' && (
            <div className="bg-[#121216] border border-[#23232c] rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Volume2 className="w-5 h-5 text-[#25F4EE]" />
                  Configuración Avanzada de Text-To-Speech
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  El sistema utiliza la API estándar Web Speech API que se ejecuta directamente en el navegador del dispositivo (móvil o PC), con latencia ultra-baja y sin costos de servidores externos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#16161f] border border-[#242434] space-y-2">
                  <span className="font-semibold text-sm text-[#25F4EE] flex items-center gap-1.5">
                    📱 En Celulares (iOS y Android)
                  </span>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Puedes abrir esta misma URL en Chrome (Android) o Safari (iOS). Al pulsar "Probar Voz" o conectar el stream, tu teléfono leerá en voz alta todos los comentarios en directo a través de los parlantes o audífonos bluetooth.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#16161f] border border-[#242434] space-y-2">
                  <span className="font-semibold text-sm text-[#FE2C55] flex items-center gap-1.5">
                    🎧 Para Creadores de Contenido / OBS
                  </span>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Puedes conectar un auricular inalámbrico a tu PC o móvil mientras juegas Free Fire u otros juegos para escuchar el chat sin tener que apartar la vista de la pantalla.
                  </p>
                </div>
              </div>

              <div className="border-t border-[#23232c] pt-4">
                <button
                  onClick={testVoice}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FE2C55] to-[#25F4EE] text-white font-bold text-sm shadow-lg shadow-[#FE2C55]/20 flex items-center justify-center gap-2 hover:opacity-95 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  Hacer prueba de voz ahora
                </button>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="bg-[#121216] border border-[#23232c] rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Smartphone className="w-5 h-5 text-[#FE2C55]" />
                  API en Tiempo Real para Dispositivos Móviles
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Transmite los comentarios de TikTok a cualquier app móvil (Flutter, React Native, Swift, Kotlin) usando Server-Sent Events (SSE) o REST.
                </p>
              </div>

              {/* Endpoint Display */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300">URL del Endpoint SSE (EventSource)</label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0d0d12] border border-[#242434] font-mono text-xs text-[#25F4EE]">
                  <span className="truncate flex-1">{apiStreamUrl}</span>
                  <button
                    onClick={() => copyToClipboard(apiStreamUrl, 'endpoint')}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-gray-200 transition"
                  >
                    {copiedKey === 'endpoint' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Code Examples */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-200">Ejemplos de Integración:</h4>

                {/* React Native / JavaScript */}
                <div className="rounded-xl bg-[#0b0b10] border border-[#222230] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#25F4EE]">React Native / JavaScript</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `const eventSource = new EventSource('${apiStreamUrl}');\neventSource.addEventListener('chat', (e) => {\n  const comment = JSON.parse(e.data);\n  console.log(comment.nickname + ': ' + comment.comment);\n});`,
                          'code-js'
                        )
                      }
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'code-js' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copiar
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-gray-300 overflow-x-auto p-2 bg-[#121218] rounded-lg">
{`const eventSource = new EventSource('${apiStreamUrl}');

eventSource.addEventListener('chat', (event) => {
  const data = JSON.parse(event.data);
  console.log(\`\${data.nickname}: \${data.comment}\`);
  // Aquí puedes enviar el texto al TTS nativo de tu app móvil
});`}
                  </pre>
                </div>

                {/* Flutter / Dart */}
                <div className="rounded-xl bg-[#0b0b10] border border-[#222230] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#FE2C55]">Flutter / Dart</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `import 'package:eventsource/eventsource.dart';\n\nvoid listenLive() async {\n  final es = await EventSource.connect('${apiStreamUrl}');\n  es.listen((event) {\n    if (event.event == 'chat') {\n      print(event.data);\n    }\n  });\n}`,
                          'code-flutter'
                        )
                      }
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'code-flutter' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copiar
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-gray-300 overflow-x-auto p-2 bg-[#121218] rounded-lg">
{`import 'package:eventsource/eventsource.dart';

void listenLive() async {
  final es = await EventSource.connect('${apiStreamUrl}');
  es.listen((event) {
    if (event.event == 'chat') {
      final comment = jsonDecode(event.data!);
      print("\${comment['nickname']}: \${comment['comment']}");
    }
  });
}`}
                  </pre>
                </div>

                {/* cURL Command */}
                <div className="rounded-xl bg-[#0b0b10] border border-[#222230] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-400">cURL / Terminal</span>
                    <button
                      onClick={() => copyToClipboard(`curl -N "${apiStreamUrl}"`, 'code-curl')}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'code-curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copiar
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-gray-300 overflow-x-auto p-2 bg-[#121218] rounded-lg">
{`curl -N "${apiStreamUrl}"`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
