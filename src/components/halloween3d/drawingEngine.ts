/**
 * Motor de Simulación de Dibujo Artístico en Tiempo Real con Temática Halloween
 * Procesa la foto de perfil, el nombre y el regalo enviado para generar un retrato
 * exclusivo según la jerarquía de diamantes.
 * 
 * Sincroniza al 100% las coordenadas del cabezal CNC del plotter 3D con el trazo
 * visible sobre el papel:
 * 1. Fase 1 (0% - 20%): Marco gótico exterior, runas y reliquias de Halloween.
 * 2. Fase 2 (20% - 65%): DIBUJO CNC DEL AVATAR / FOTO DE PERFIL mediante pases
 *    de grabado/trama vectorial con revelado progresivo línea por línea bajo la pluma.
 * 3. Fase 3 (65% - 90%): ESCRITURA EN CALIGRAFÍA DEL NOMBRE Y @USUARIO letra por letra,
 *    con el cabezal trazando físicamente cada carácter antes de plasmarlo con tinta espectral.
 * 4. Fase 4 (90% - 100%): Sello Imperial de Halloween y Diamantes del regalo.
 */

export interface DrawingUser {
  uniqueId: string;
  nickname: string;
  avatar?: string;
  giftName: string;
  giftPictureUrl?: string;
  diamonds: number;
  repeatCount?: number;
  timestamp: number;
}

export type HalloweenTier = 'ghost' | 'pumpkin' | 'vampire' | 'titan';

export interface TierConfig {
  tier: HalloweenTier;
  tierName: string;
  accentColor: string;
  secondaryColor: string;
  glowColor: string;
  titleBadge: string;
  description: string;
  particleColor: number;
}

export function getTierForDiamonds(diamonds: number): TierConfig {
  if (diamonds >= 500) {
    return {
      tier: 'titan',
      tierName: 'Titán Rey de Halloween',
      accentColor: '#FFB800',
      secondaryColor: '#FF3B00',
      glowColor: 'rgba(255, 184, 0, 0.85)',
      titleBadge: '👑 REY SUPREMO',
      description: 'Retablo Imperial Dorado con Cuernos Demoniacos y Fuego Eterno',
      particleColor: 0xffaa00,
    };
  }
  if (diamonds >= 100) {
    return {
      tier: 'vampire',
      tierName: 'Señor Vampiro Carmesí',
      accentColor: '#E11D48',
      secondaryColor: '#881337',
      glowColor: 'rgba(225, 29, 72, 0.8)',
      titleBadge: '🧛 CONDE DE LA NOCHE',
      description: 'Marco Gótico con Ojos Carmesí, Alas y Runas de Sangre',
      particleColor: 0xe11d48,
    };
  }
  if (diamonds >= 20) {
    return {
      tier: 'pumpkin',
      tierName: 'Calabaza Maldita Neón',
      accentColor: '#F97316',
      secondaryColor: '#9333EA',
      glowColor: 'rgba(249, 115, 22, 0.8)',
      titleBadge: '🎃 JACK-O-LANTERN',
      description: 'Talla de Neón con Fuego Mágico y Murciélagos Espectrales',
      particleColor: 0xf97316,
    };
  }
  return {
    tier: 'ghost',
    tierName: 'Boceto Espectral',
    accentColor: '#10B981',
    secondaryColor: '#064E3B',
    glowColor: 'rgba(16, 185, 129, 0.8)',
    titleBadge: '👻 ALMA ESPECTRAL',
    description: 'Boceto a Carboncillo con Telarañas y Niebla de Ectoplasma',
    particleColor: 0x10b981,
  };
}

export interface DrawingPoint {
  x: number; // 0..1 normalizado en canvas
  y: number; // 0..1 normalizado en canvas
  pressure: number;
}

export interface StrokePath {
  points: DrawingPoint[];
  color: string;
  width: number;
  glow?: string;
  isAccent?: boolean;
}

interface LetterLayout {
  char: string;
  x: number; // Coordenada X normalizada del centro de la letra
  y: number; // Coordenada Y normalizada
  width: number;
  height: number;
  strokes: DrawingPoint[];
}

/**
 * Sesión de Dibujo Halloween sincronizada con el Plotter CNC 3D
 */
export class HalloweenDrawingSession {
  public user: DrawingUser;
  public tierConfig: TierConfig;
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  // Offscreen canvas para pre-procesar y renderizar el avatar con filtro artístico
  private avatarCanvas: HTMLCanvasElement;
  private avatarCtx: CanvasRenderingContext2D;
  private isAvatarReady: boolean = false;

  // Trazos vectoriales de la Fase 1 (Marco exterior)
  private frameStrokes: StrokePath[] = [];

  // Pases de grabado CNC para el Avatar (Fase 2)
  private avatarScanlines: { y: number; xStart: number; xEnd: number }[] = [];
  private readonly avatarCenter = { x: 0.5, y: 0.38 };
  private readonly avatarRadius = 0.19; // Radio normalizado en el canvas

  // Trazos de la Cinta / Pergamino inferior
  private ribbonStrokes: StrokePath[] = [];

  // Disposición letra por letra del Nickname
  private nicknameLetters: LetterLayout[] = [];
  private uniqueIdLetters: LetterLayout[] = [];

  // Sello final
  private sealStrokes: StrokePath[] = [];

  public currentQuillPos = { quillX: 0.5, quillY: 0.5, isDrawing: false, pressure: 0 };

  constructor(user: DrawingUser) {
    this.user = user;
    this.tierConfig = getTierForDiamonds(user.diamonds);

    // Canvas principal (1024x1024)
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 1024;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    // Canvas offscreen del Avatar (512x512)
    this.avatarCanvas = document.createElement('canvas');
    this.avatarCanvas.width = 512;
    this.avatarCanvas.height = 512;
    const aCtx = this.avatarCanvas.getContext('2d');
    if (!aCtx) throw new Error('Cannot get Avatar 2D context');
    this.avatarCtx = aCtx;

    // Generar fallback inmediato por si la imagen tarda o falla
    this.generateFallbackAvatar();

    // Inicializar carga de imagen remota del avatar
    this.initAvatar();

    // Precalcular todas las trayectorias de corte y dibujo
    this.precomputeAllPaths();
  }

  /**
   * Prepara el canvas offscreen del avatar con estilizado gótico
   */
  private prepareAvatarFilter(sourceImage: HTMLImageElement | HTMLCanvasElement) {
    const w = this.avatarCanvas.width;
    const h = this.avatarCanvas.height;
    const ctx = this.avatarCtx;

    ctx.clearRect(0, 0, w, h);

    // Máscara circular con borde difuminado
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.47, 0, Math.PI * 2);
    ctx.clip();

    // Fondo oscuro con gradiente espectral
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.5);
    bgGrad.addColorStop(0, '#1c1527');
    bgGrad.addColorStop(1, '#090510');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Dibujar imagen centrada
    ctx.drawImage(sourceImage, 0, 0, w, h);

    // Tinte de Halloween según el Tier
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = this.tierConfig.accentColor;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(0, 0, w, h);

    // Trama de líneas de grabado artístico (efecto xilografía/grabador CNC)
    ctx.globalCompositeOperation = 'overlay';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.25;
    for (let y = 0; y < h; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Viñeta oscura periférica
    ctx.globalCompositeOperation = 'source-over';
    const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w * 0.48);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.8, 'rgba(10,5,20,0.6)');
    vignette.addColorStop(1, 'rgba(5,2,10,0.95)');
    ctx.fillStyle = vignette;
    ctx.globalAlpha = 1.0;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
    this.isAvatarReady = true;
  }

  private generateFallbackAvatar() {
    const fCanvas = document.createElement('canvas');
    fCanvas.width = 512;
    fCanvas.height = 512;
    const fCtx = fCanvas.getContext('2d')!;

    // Fondo cósmico tenebroso
    const grad = fCtx.createRadialGradient(256, 256, 40, 256, 256, 256);
    grad.addColorStop(0, '#2d1b4e');
    grad.addColorStop(1, '#0b0615');
    fCtx.fillStyle = grad;
    fCtx.fillRect(0, 0, 512, 512);

    // Silueta estilizada de Calavera Rey / Segador
    fCtx.fillStyle = '#e2e8f0';
    fCtx.beginPath();
    fCtx.arc(256, 220, 125, 0, Math.PI * 2);
    fCtx.fill();

    // Mandíbula
    fCtx.fillRect(205, 305, 102, 65);

    // Cuencas oculares con brillo demoníaco
    fCtx.fillStyle = '#0b0615';
    fCtx.beginPath();
    fCtx.ellipse(212, 220, 30, 40, -0.15, 0, Math.PI * 2);
    fCtx.ellipse(300, 220, 30, 40, 0.15, 0, Math.PI * 2);
    fCtx.fill();

    // Brillo interior de los ojos según tier
    fCtx.fillStyle = this.tierConfig.accentColor;
    fCtx.beginPath();
    fCtx.arc(215, 222, 10, 0, Math.PI * 2);
    fCtx.arc(297, 222, 10, 0, Math.PI * 2);
    fCtx.fill();

    // Nariz triangular
    fCtx.fillStyle = '#0b0615';
    fCtx.beginPath();
    fCtx.moveTo(256, 272);
    fCtx.lineTo(246, 294);
    fCtx.lineTo(266, 294);
    fCtx.closePath();
    fCtx.fill();

    // Dientes de grabado
    fCtx.strokeStyle = '#0b0615';
    fCtx.lineWidth = 4;
    for (let x = 222; x <= 290; x += 17) {
      fCtx.beginPath();
      fCtx.moveTo(x, 312);
      fCtx.lineTo(x, 355);
      fCtx.stroke();
    }

    this.prepareAvatarFilter(fCanvas);
  }

  private initAvatar() {
    if (!this.user.avatar) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.prepareAvatarFilter(img);
    };
    img.onerror = () => {
      // Si falla CORS, el fallback vectorial ya está activo
    };
    img.src = this.user.avatar;
  }

  /**
   * Precalcula todas las trayectorias de dibujo para sincronización total con el plotter 3D
   */
  private precomputeAllPaths() {
    const primary = this.tierConfig.accentColor;
    const tier = this.tierConfig.tier;

    // 1. MARCO GÓTICO EXTERIOR (Fase 1: 0% - 20%)
    const borderPoints: DrawingPoint[] = [];
    const inset = 0.07;
    const steps = 32;

    // Borde superior
    for (let i = 0; i <= steps; i++) {
      const x = inset + (1 - 2 * inset) * (i / steps);
      borderPoints.push({ x, y: inset + Math.sin(i * 1.5) * 0.003, pressure: 0.85 });
    }
    // Borde derecho
    for (let i = 0; i <= steps; i++) {
      const y = inset + (1 - 2 * inset) * (i / steps);
      borderPoints.push({ x: 1 - inset + Math.sin(i * 1.2) * 0.003, y, pressure: 0.85 });
    }
    // Borde inferior
    for (let i = steps; i >= 0; i--) {
      const x = inset + (1 - 2 * inset) * (i / steps);
      borderPoints.push({ x, y: 1 - inset + Math.cos(i * 1.4) * 0.003, pressure: 0.85 });
    }
    // Borde izquierdo
    for (let i = steps; i >= 0; i--) {
      const y = inset + (1 - 2 * inset) * (i / steps);
      borderPoints.push({ x: inset + Math.cos(i * 1.3) * 0.003, y, pressure: 0.85 });
    }
    this.frameStrokes.push({
      points: borderPoints,
      color: primary,
      width: 5,
      glow: this.tierConfig.glowColor,
    });

    // Reliquia superior de cabecera según el Tier
    if (tier === 'titan') {
      // Corona de Cuernos Titánicos
      const horns: DrawingPoint[] = [
        { x: 0.40, y: 0.12, pressure: 1.0 },
        { x: 0.32, y: 0.04, pressure: 0.9 },
        { x: 0.24, y: 0.02, pressure: 1.0 },
        { x: 0.28, y: 0.08, pressure: 0.8 },
        { x: 0.38, y: 0.13, pressure: 0.7 },
        { x: 0.50, y: 0.15, pressure: 0.9 },
        { x: 0.62, y: 0.13, pressure: 0.7 },
        { x: 0.72, y: 0.08, pressure: 0.8 },
        { x: 0.76, y: 0.02, pressure: 1.0 },
        { x: 0.68, y: 0.04, pressure: 0.9 },
        { x: 0.60, y: 0.12, pressure: 1.0 },
      ];
      this.frameStrokes.push({ points: horns, color: '#fbbf24', width: 6, glow: 'rgba(251,191,36,0.9)' });
    } else if (tier === 'vampire') {
      // Alas de murciélago góticas
      const batWings: DrawingPoint[] = [
        { x: 0.50, y: 0.14, pressure: 0.9 },
        { x: 0.42, y: 0.08, pressure: 0.8 },
        { x: 0.34, y: 0.11, pressure: 0.8 },
        { x: 0.26, y: 0.05, pressure: 0.9 },
        { x: 0.30, y: 0.16, pressure: 0.7 },
        { x: 0.50, y: 0.14, pressure: 0.9 },
        { x: 0.70, y: 0.16, pressure: 0.7 },
        { x: 0.74, y: 0.05, pressure: 0.9 },
        { x: 0.66, y: 0.11, pressure: 0.8 },
        { x: 0.58, y: 0.08, pressure: 0.8 },
        { x: 0.50, y: 0.14, pressure: 0.9 },
      ];
      this.frameStrokes.push({ points: batWings, color: '#e11d48', width: 5, glow: 'rgba(225,29,72,0.9)' });
    } else {
      // Telarañas góticas en esquinas superiores
      const webPoints: DrawingPoint[] = [
        { x: 0.07, y: 0.07, pressure: 0.5 },
        { x: 0.20, y: 0.07, pressure: 0.7 },
        { x: 0.07, y: 0.07, pressure: 0.3 },
        { x: 0.17, y: 0.14, pressure: 0.7 },
        { x: 0.07, y: 0.07, pressure: 0.3 },
        { x: 0.07, y: 0.20, pressure: 0.7 },
      ];
      this.frameStrokes.push({ points: webPoints, color: '#94a3b8', width: 2.5 });
    }

    // 2. PASES DE CORTE Y TRAMADO DEL AVATAR (Fase 2: 20% - 65%)
    // Generar 32 pases horizontales alternantes que barren el círculo del avatar
    const cx = this.avatarCenter.x;
    const cy = this.avatarCenter.y;
    const r = this.avatarRadius;
    const numScanlines = 32;

    this.avatarScanlines = [];
    for (let k = 0; k < numScanlines; k++) {
      const fracY = (k + 0.5) / numScanlines;
      const y = (cy - r) + fracY * (2 * r);
      const dy = y - cy;
      const halfChord = Math.sqrt(Math.max(0, r * r - dy * dy)) * 0.97;

      if (k % 2 === 0) {
        this.avatarScanlines.push({ y, xStart: cx - halfChord, xEnd: cx + halfChord });
      } else {
        this.avatarScanlines.push({ y, xStart: cx + halfChord, xEnd: cx - halfChord });
      }
    }

    // 3. CINTA PERGAMINO DECORATIVA PARA EL NOMBRE (Fase 3: 65% - 73%)
    const ribbon: DrawingPoint[] = [
      { x: 0.16, y: 0.74, pressure: 0.8 },
      { x: 0.50, y: 0.725, pressure: 0.9 },
      { x: 0.84, y: 0.74, pressure: 0.8 },
      { x: 0.88, y: 0.81, pressure: 0.8 },
      { x: 0.82, y: 0.795, pressure: 0.7 },
      { x: 0.50, y: 0.78, pressure: 0.9 },
      { x: 0.18, y: 0.795, pressure: 0.7 },
      { x: 0.12, y: 0.81, pressure: 0.8 },
      { x: 0.16, y: 0.74, pressure: 0.8 },
    ];
    this.ribbonStrokes.push({ points: ribbon, color: primary, width: 4, glow: this.tierConfig.glowColor });

    // 4. DISPOSICIÓN Y TRAZOS LETRA POR LETRA DEL NICKNAME (Fase 3: 73% - 85%)
    const rawName = (this.user.nickname || this.user.uniqueId || 'Anon').trim();
    const cleanName = rawName.length > 15 ? rawName.slice(0, 14) + '…' : rawName;
    this.nicknameLetters = this.generateTextLayout(cleanName, 0.50, 0.765, 0.038, 0.050);

    // 5. DISPOSICIÓN Y TRAZOS DE @UNIQUEID (Fase 3: 85% - 90%)
    const rawId = `@${this.user.uniqueId || 'fan'}`.slice(0, 18);
    this.uniqueIdLetters = this.generateTextLayout(rawId, 0.50, 0.825, 0.024, 0.032);

    // 6. SELLO IMPERIAL DE HALLOWEEN (Fase 4: 90% - 100%)
    const sealPoints: DrawingPoint[] = [];
    const sCx = 0.50, sCy = 0.925, sR = 0.038;
    for (let a = 0; a <= Math.PI * 4; a += 0.25) {
      const curR = sR * (0.8 + 0.2 * Math.sin(a * 5));
      sealPoints.push({
        x: sCx + Math.cos(a) * curR,
        y: sCy + Math.sin(a) * curR,
        pressure: 0.95,
      });
    }
    this.sealStrokes.push({ points: sealPoints, color: primary, width: 4.5, glow: this.tierConfig.glowColor });
  }

  /**
   * Genera la disposición centrada de caracteres con sus correspondientes trazos de pluma
   */
  private generateTextLayout(
    text: string,
    centerX: number,
    centerY: number,
    charWidth: number,
    charHeight: number
  ): LetterLayout[] {
    const letters: LetterLayout[] = [];
    const totalChars = Math.max(1, text.length);
    const spacing = charWidth * 0.88;
    const startX = centerX - ((totalChars - 1) * spacing) / 2;

    for (let i = 0; i < totalChars; i++) {
      const char = text[i];
      const cx = startX + i * spacing;
      const cy = centerY;

      // Generar 3 trazos físicos que simulan la escritura de la letra
      const strokes: DrawingPoint[] = [
        { x: cx - charWidth * 0.35, y: cy + charHeight * 0.45, pressure: 0.9 }, // Abajo izquierda
        { x: cx, y: cy - charHeight * 0.45, pressure: 1.0 },                   // Vértice superior
        { x: cx + charWidth * 0.35, y: cy + charHeight * 0.45, pressure: 0.9 }, // Abajo derecha
        { x: cx - charWidth * 0.20, y: cy, pressure: 0.7 },                    // Trazo medio
        { x: cx + charWidth * 0.20, y: cy, pressure: 0.7 },
      ];

      letters.push({
        char,
        x: cx,
        y: cy,
        width: charWidth,
        height: charHeight,
        strokes,
      });
    }

    return letters;
  }

  /**
   * Renderiza el estado del dibujo para el progreso actual t (0.0 a 1.0).
   * Devuelve las coordenadas exactas de la pluma (quillX, quillY) para mover
   * el cabezal del plotter en 3D en tiempo real.
   */
  public renderProgress(t: number): { quillX: number; quillY: number; isDrawing: boolean } {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // 1. Limpiar lienzo
    ctx.clearRect(0, 0, w, h);

    // Fondo de Pergamino Imperial Ancestral
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 70, w / 2, h / 2, w * 0.68);
    bgGrad.addColorStop(0, '#1c1527');
    bgGrad.addColorStop(0.6, '#110a1c');
    bgGrad.addColorStop(1, '#07040d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Textura sutil de pergamino envejecido
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#fce7f3';
    for (let i = 0; i < 35; i++) {
      const rx = (i * 149) % w;
      const ry = (i * 263) % h;
      ctx.beginPath();
      ctx.arc(rx, ry, (i % 5) * 14 + 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    let quillX = 0.5;
    let quillY = 0.5;
    let isDrawing = true;

    // =========================================================================
    // FASE 1: MARCO GÓTICO Y ADORNOS EXTERIORES (0.0 <= t <= 0.20)
    // =========================================================================
    const p1 = Math.min(1.0, t / 0.20);
    this.renderStrokeList(this.frameStrokes, p1, (x, y) => {
      quillX = x;
      quillY = y;
    });

    // =========================================================================
    // FASE 2: DIBUJO CNC DEL AVATAR / FOTO DE PERFIL (0.20 < t <= 0.65)
    // =========================================================================
    const cx = this.avatarCenter.x;
    const cy = this.avatarCenter.y;
    const r = this.avatarRadius;

    if (t > 0.20) {
      const pAvatar = Math.min(1.0, (t - 0.20) / 0.45); // 0 a 1 en la fase 2

      // 2A. Medallón Circular Exterior
      ctx.save();
      ctx.strokeStyle = this.tierConfig.accentColor;
      ctx.lineWidth = 6;
      ctx.shadowColor = this.tierConfig.glowColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      const ringAngle = Math.min(Math.PI * 2, pAvatar * Math.PI * 4); // El anillo se dibuja rápido
      ctx.arc(cx * w, cy * h, r * w, 0, ringAngle);
      ctx.stroke();

      // Anillo decorativo interior fino
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f8fafc';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(cx * w, cy * h, (r - 0.012) * w, 0, ringAngle);
      ctx.stroke();
      ctx.restore();

      // 2B. Pases de Grabado del Avatar y Revelado Progresivo Línea por Línea
      if (this.avatarScanlines.length > 0) {
        const totalLines = this.avatarScanlines.length;
        const currentLineProgress = pAvatar * totalLines;
        const currentLineIdx = Math.min(totalLines - 1, Math.floor(currentLineProgress));
        const lineFrac = currentLineProgress - Math.floor(currentLineProgress);

        const activeLine = this.avatarScanlines[currentLineIdx];
        const currentScanY = activeLine.y;

        // Calcular posición actual del cabezal en el pase activo
        quillX = activeLine.xStart + (activeLine.xEnd - activeLine.xStart) * lineFrac;
        quillY = currentScanY + Math.sin(lineFrac * Math.PI * 16) * 0.002; // Micro-stippling
        isDrawing = true;

        // REVELADO DE LA FOTO: Solo se muestra hasta la línea de corte actual
        if (this.isAvatarReady && this.avatarCanvas) {
          ctx.save();
          // Máscara 1: Solo dentro del círculo del medallón
          ctx.beginPath();
          ctx.arc(cx * w, cy * h, (r - 0.005) * w, 0, Math.PI * 2);
          ctx.clip();

          // Máscara 2: Revelado progresivo hasta la línea Y actual del cabezal
          const revealY = pAvatar >= 0.98 ? (cy + r + 0.05) * h : (currentScanY + 0.006) * h;
          ctx.beginPath();
          ctx.rect(0, 0, w, revealY);
          ctx.clip();

          // Dibujar el avatar filtrado
          const imgD = 2 * r * w;
          ctx.drawImage(this.avatarCanvas, (cx - r) * w, (cy - r) * h, imgD, imgD);

          ctx.restore();
        }

        // TRAZOS DE CORTE EN VIVO: Líneas de tinta y trama grabadas bajo la pluma
        if (pAvatar < 0.98) {
          ctx.save();
          ctx.strokeStyle = this.tierConfig.accentColor;
          ctx.lineWidth = 3;
          ctx.shadowColor = this.tierConfig.glowColor;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(activeLine.xStart * w, activeLine.y * h);
          ctx.lineTo(quillX * w, quillY * h);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // =========================================================================
    // FASE 3: ESCRITURA EN CALIGRAFÍA DEL NOMBRE Y @USUARIO (0.65 < t <= 0.90)
    // =========================================================================
    if (t > 0.65) {
      const p3 = Math.min(1.0, (t - 0.65) / 0.25);

      // 3A. Dibujar la Cinta Pergamino
      const pRibbon = Math.min(1.0, p3 / 0.25);
      this.renderStrokeList(this.ribbonStrokes, pRibbon, (rx, ry) => {
        if (p3 <= 0.25) {
          quillX = rx;
          quillY = ry;
          isDrawing = true;
        }
      });

      // 3B. Escritura Letra por Letra del Nickname (p3 de 0.25 a 0.70)
      if (p3 > 0.25 && this.nicknameLetters.length > 0) {
        const pName = Math.min(1.0, (p3 - 0.25) / 0.45);
        const totalLetters = this.nicknameLetters.length;
        const letterProgress = pName * totalLetters;
        const currentLetterIdx = Math.min(totalLetters - 1, Math.floor(letterProgress));
        const charFrac = letterProgress - Math.floor(letterProgress);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 38px "Cinzel Decorative", "Cinzel", "Georgia", serif';

        // 1. Renderizar todas las letras ya completadas con tinta permanente
        for (let i = 0; i <= currentLetterIdx; i++) {
          const l = this.nicknameLetters[i];
          const isCurrent = i === currentLetterIdx;

          if (!isCurrent || pName >= 0.99) {
            // Letra completada
            ctx.fillStyle = '#f8fafc';
            ctx.shadowColor = this.tierConfig.glowColor;
            ctx.shadowBlur = 16;
            ctx.fillText(l.char, l.x * w, l.y * h);
          } else {
            // Letra siendo escrita actualmente por el cabezal CNC
            const strokePoints = l.strokes;
            const strokeIdx = Math.floor(charFrac * strokePoints.length);
            const pt = strokePoints[Math.min(strokePoints.length - 1, strokeIdx)];

            quillX = pt.x;
            quillY = pt.y;
            isDrawing = charFrac < 0.85; // Pen-lift entre letras

            // Trazo dinámico de tinta fresca bajo la pluma
            ctx.strokeStyle = this.tierConfig.accentColor;
            ctx.lineWidth = 4;
            ctx.shadowColor = this.tierConfig.glowColor;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(strokePoints[0].x * w, strokePoints[0].y * h);
            for (let s = 1; s <= strokeIdx; s++) {
              ctx.lineTo(strokePoints[s].x * w, strokePoints[s].y * h);
            }
            ctx.stroke();

            // Desvanecimiento suave de la letra al 50% de su trazo
            if (charFrac > 0.45) {
              ctx.fillStyle = 'rgba(248, 250, 252, 0.7)';
              ctx.shadowColor = this.tierConfig.glowColor;
              ctx.shadowBlur = 10;
              ctx.fillText(l.char, l.x * w, l.y * h);
            }
          }
        }
        ctx.restore();
      }

      // 3C. Escritura de @UniqueId (p3 de 0.70 a 1.0)
      if (p3 > 0.70 && this.uniqueIdLetters.length > 0) {
        const pId = Math.min(1.0, (p3 - 0.70) / 0.30);
        const totalIdChars = this.uniqueIdLetters.length;
        const idProgress = pId * totalIdChars;
        const currentIdIdx = Math.min(totalIdChars - 1, Math.floor(idProgress));
        const idFrac = idProgress - Math.floor(idProgress);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 22px "Courier New", monospace';
        ctx.fillStyle = this.tierConfig.accentColor;
        ctx.shadowColor = this.tierConfig.glowColor;
        ctx.shadowBlur = 8;

        for (let i = 0; i <= currentIdIdx; i++) {
          const l = this.uniqueIdLetters[i];
          const isCurrent = i === currentIdIdx;

          if (!isCurrent || pId >= 0.99) {
            ctx.fillText(l.char, l.x * w, l.y * h);
          } else {
            quillX = l.x + (Math.random() - 0.5) * 0.005;
            quillY = l.y;
            isDrawing = idFrac < 0.85;
            ctx.fillText(l.char, l.x * w, l.y * h);
          }
        }
        ctx.restore();
      }
    }

    // =========================================================================
    // FASE 4: SELLO IMPERIAL DE HALLOWEEN Y REGALO (0.90 < t <= 1.0)
    // =========================================================================
    if (t > 0.90) {
      const p4 = Math.min(1.0, (t - 0.90) / 0.10);

      // Línea de Regalo y Diamantes
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
      ctx.shadowBlur = 12;
      ctx.fillText(
        `🎁 ${this.user.giftName} • ${this.user.diamonds} 💎`,
        w * 0.50,
        h * 0.875
      );
      ctx.restore();

      // Dibujar Sello Imperial
      this.renderStrokeList(this.sealStrokes, p4, (sx, sy) => {
        quillX = sx;
        quillY = sy;
        isDrawing = true;
      });

      // Título de Honor / Insignia Suprema al 100%
      if (t >= 0.98) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillStyle = this.tierConfig.accentColor;
        ctx.shadowColor = this.tierConfig.glowColor;
        ctx.shadowBlur = 14;
        ctx.fillText(this.tierConfig.titleBadge, w * 0.50, h * 0.975);
        ctx.restore();

        // Pluma levantada al finalizar
        isDrawing = false;
        quillX = 0.50;
        quillY = 0.925;
      }
    }

    this.currentQuillPos = {
      quillX,
      quillY,
      isDrawing,
      pressure: isDrawing ? 0.85 : 0.0,
    };

    return this.currentQuillPos;
  }

  /**
   * Renderiza una lista de trazos vectoriales hasta una fracción progress (0..1)
   */
  private renderStrokeList(
    strokes: StrokePath[],
    progress: number,
    onCurrentPos?: (x: number, y: number) => void
  ) {
    if (progress <= 0 || strokes.length === 0) return;

    let totalPoints = 0;
    for (const s of strokes) {
      totalPoints += s.points.length;
    }

    const pointsToRender = Math.floor(totalPoints * Math.min(1.0, progress));
    let renderedCount = 0;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (const stroke of strokes) {
      if (renderedCount >= pointsToRender) break;

      const available = Math.min(stroke.points.length, pointsToRender - renderedCount);
      if (available > 1) {
        ctx.save();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.glow) {
          ctx.shadowColor = stroke.glow;
          ctx.shadowBlur = 12;
        }

        ctx.beginPath();
        const p0 = stroke.points[0];
        ctx.moveTo(p0.x * w, p0.y * h);

        let lastPt = p0;
        for (let i = 1; i < available; i++) {
          const pt = stroke.points[i];
          ctx.lineTo(pt.x * w, pt.y * h);
          lastPt = pt;
        }
        ctx.stroke();
        ctx.restore();

        if (onCurrentPos) {
          onCurrentPos(lastPt.x, lastPt.y);
        }
      }

      renderedCount += stroke.points.length;
    }
  }
}
