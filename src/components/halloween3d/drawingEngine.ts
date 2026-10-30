/**
 * Motor de Simulación de Dibujo Artístico en Tiempo Real con Temática Halloween
 * Procesa la foto de perfil, el nombre y el regalo enviado para generar un retrato
 * exclusivo según la jerarquía de diamantes, calculando en tiempo real las coordenadas
 * del pincel/pluma 3D que viaja sobre el lienzo.
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
  x: number; // 0..1 normalizado
  y: number; // 0..1 normalizado
  pressure: number;
}

export interface StrokePath {
  points: DrawingPoint[];
  color: string;
  width: number;
  glow?: string;
  isAccent?: boolean;
}

/**
 * Pre-calcula los trazos vectoriales y fases para simular el dibujo artístico
 */
export class HalloweenDrawingSession {
  public user: DrawingUser;
  public tierConfig: TierConfig;
  public loadedImage: HTMLImageElement | null = null;
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  private strokePaths: StrokePath[] = [];
  public currentQuillPos = { quillX: 0.5, quillY: 0.5, isDrawing: false, pressure: 0 };
  private imageError: boolean = false;

  constructor(user: DrawingUser) {
    this.user = user;
    this.tierConfig = getTierForDiamonds(user.diamonds);
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 1024;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.initAvatar();
    this.generateVectorStrokes();
  }

  private initAvatar() {
    if (!this.user.avatar) {
      this.generateFallbackAvatar();
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.loadedImage = img;
    };
    img.onerror = () => {
      this.imageError = true;
      this.generateFallbackAvatar();
    };
    img.src = this.user.avatar;
  }

  private generateFallbackAvatar() {
    // Generar un avatar vectorial de calavera / fantasma de alta calidad como fallback si falla CORS
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = 512;
    fallbackCanvas.height = 512;
    const fCtx = fallbackCanvas.getContext('2d')!;

    // Fondo oscuro degradado
    const grad = fCtx.createRadialGradient(256, 256, 50, 256, 256, 256);
    grad.addColorStop(0, '#2d1b4e');
    grad.addColorStop(1, '#0f071a');
    fCtx.fillStyle = grad;
    fCtx.fillRect(0, 0, 512, 512);

    // Silueta de calavera estilizada
    fCtx.fillStyle = '#e2e8f0';
    fCtx.beginPath();
    fCtx.arc(256, 220, 130, 0, Math.PI * 2);
    fCtx.fill();

    // Mandíbula
    fCtx.fillRect(200, 310, 112, 70);

    // Ojos negros huecos
    fCtx.fillStyle = '#0f071a';
    fCtx.beginPath();
    fCtx.ellipse(210, 220, 32, 42, -0.15, 0, Math.PI * 2);
    fCtx.ellipse(302, 220, 32, 42, 0.15, 0, Math.PI * 2);
    fCtx.fill();

    // Nariz triangular invertida
    fCtx.beginPath();
    fCtx.moveTo(256, 275);
    fCtx.lineTo(245, 298);
    fCtx.lineTo(267, 298);
    fCtx.closePath();
    fCtx.fill();

    // Dientes
    fCtx.strokeStyle = '#0f071a';
    fCtx.lineWidth = 5;
    for (let x = 220; x <= 292; x += 18) {
      fCtx.beginPath();
      fCtx.moveTo(x, 320);
      fCtx.lineTo(x, 365);
      fCtx.stroke();
    }

    const fallbackImg = new Image();
    fallbackImg.src = fallbackCanvas.toDataURL();
    this.loadedImage = fallbackImg;
  }

  /**
   * Genera los trazados vectoriales que la pluma 3D seguirá punto a punto
   */
  private generateVectorStrokes() {
    const strokes: StrokePath[] = [];
    const tier = this.tierConfig.tier;
    const primary = this.tierConfig.accentColor;
    const secondary = this.tierConfig.secondaryColor;

    // 1. MARCO EXTERIOR Y ADORNOS DE HALLOWEEN (Fase 1: 0% - 25%)
    // Borde pergamino / retablo
    const borderPoints: DrawingPoint[] = [];
    const inset = 0.08;
    const steps = 30;
    // Borde superior
    for (let i = 0; i <= steps; i++) {
      const x = inset + (1 - 2 * inset) * (i / steps);
      const jitter = (Math.sin(i * 1.5) * 0.004);
      borderPoints.push({ x, y: inset + jitter, pressure: 0.8 });
    }
    // Borde derecho
    for (let i = 0; i <= steps; i++) {
      const y = inset + (1 - 2 * inset) * (i / steps);
      borderPoints.push({ x: 1 - inset + (Math.sin(i * 1.2) * 0.004), y, pressure: 0.8 });
    }
    // Borde inferior
    for (let i = steps; i >= 0; i--) {
      const x = inset + (1 - 2 * inset) * (i / steps);
      borderPoints.push({ x, y: 1 - inset + (Math.cos(i * 1.4) * 0.004), pressure: 0.8 });
    }
    // Borde izquierdo
    for (let i = steps; i >= 0; i--) {
      const y = inset + (1 - 2 * inset) * (i / steps);
      borderPoints.push({ x: inset + (Math.cos(i * 1.3) * 0.004), y, pressure: 0.8 });
    }
    strokes.push({
      points: borderPoints,
      color: primary,
      width: 6,
      glow: this.tierConfig.glowColor,
    });

    // Adornos especiales según el nivel
    if (tier === 'ghost' || tier === 'pumpkin' || tier === 'vampire' || tier === 'titan') {
      // Telaraña en esquina superior izquierda
      const webPoints: DrawingPoint[] = [
        { x: 0.08, y: 0.08, pressure: 0.5 },
        { x: 0.22, y: 0.08, pressure: 0.7 },
        { x: 0.08, y: 0.08, pressure: 0.3 },
        { x: 0.19, y: 0.15, pressure: 0.7 },
        { x: 0.08, y: 0.08, pressure: 0.3 },
        { x: 0.08, y: 0.22, pressure: 0.7 },
      ];
      strokes.push({ points: webPoints, color: '#94a3b8', width: 2 });
    }

    if (tier === 'pumpkin' || tier === 'titan') {
      // Siluetas de calabazas en esquinas inferiores
      const pumpkinLeft: DrawingPoint[] = [];
      const cx = 0.15, cy = 0.85, r = 0.06;
      for (let a = 0; a <= Math.PI * 2; a += 0.2) {
        pumpkinLeft.push({
          x: cx + Math.cos(a) * r * (1 + 0.15 * Math.sin(a * 4)),
          y: cy + Math.sin(a) * r * 0.85,
          pressure: 0.9,
        });
      }
      strokes.push({ points: pumpkinLeft, color: '#f97316', width: 4, glow: 'rgba(249,115,22,0.9)' });
    }

    if (tier === 'vampire' || tier === 'titan') {
      // Alas de murciélago en la parte superior
      const batWings: DrawingPoint[] = [
        { x: 0.5, y: 0.14, pressure: 1.0 },
        { x: 0.42, y: 0.08, pressure: 0.9 },
        { x: 0.35, y: 0.12, pressure: 0.8 },
        { x: 0.28, y: 0.06, pressure: 0.9 },
        { x: 0.32, y: 0.18, pressure: 0.7 },
        { x: 0.5, y: 0.15, pressure: 0.9 },
        { x: 0.68, y: 0.18, pressure: 0.7 },
        { x: 0.72, y: 0.06, pressure: 0.9 },
        { x: 0.65, y: 0.12, pressure: 0.8 },
        { x: 0.58, y: 0.08, pressure: 0.9 },
        { x: 0.5, y: 0.14, pressure: 1.0 },
      ];
      strokes.push({ points: batWings, color: '#e11d48', width: 5, glow: 'rgba(225,29,72,0.9)' });
    }

    if (tier === 'titan') {
      // Corona de Cuernos Titánicos
      const horns: DrawingPoint[] = [
        { x: 0.4, y: 0.12, pressure: 1.0 },
        { x: 0.3, y: 0.04, pressure: 0.9 },
        { x: 0.22, y: 0.02, pressure: 1.0 },
        { x: 0.26, y: 0.07, pressure: 0.8 },
        { x: 0.38, y: 0.14, pressure: 0.7 },
        { x: 0.5, y: 0.16, pressure: 0.9 },
        { x: 0.62, y: 0.14, pressure: 0.7 },
        { x: 0.74, y: 0.07, pressure: 0.8 },
        { x: 0.78, y: 0.02, pressure: 1.0 },
        { x: 0.7, y: 0.04, pressure: 0.9 },
        { x: 0.6, y: 0.12, pressure: 1.0 },
      ];
      strokes.push({ points: horns, color: '#fbbf24', width: 7, glow: 'rgba(251,191,36,0.95)' });
    }

    // 2. RETRATO CENTRAL / ÓVALO MÁGICO (Fase 2: 25% - 70%)
    // Anillo exterior del avatar
    const avatarRing: DrawingPoint[] = [];
    const ringSteps = 45;
    const ringCx = 0.5, ringCy = 0.44, ringR = 0.24;
    for (let i = 0; i <= ringSteps; i++) {
      const angle = (i / ringSteps) * Math.PI * 2;
      avatarRing.push({
        x: ringCx + Math.cos(angle) * ringR,
        y: ringCy + Math.sin(angle) * ringR,
        pressure: 0.85,
      });
    }
    strokes.push({ points: avatarRing, color: primary, width: 6, glow: this.tierConfig.glowColor });

    // Trazos simulados de dibujo interno del rostro / espirales de sombreado
    for (let s = 0; s < 4; s++) {
      const hatchPoints: DrawingPoint[] = [];
      const startAngle = (s * Math.PI) / 2;
      for (let t = 0; t <= 20; t++) {
        const factor = t / 20;
        const curR = ringR * 0.15 + factor * (ringR * 0.75);
        const a = startAngle + factor * Math.PI * 1.5;
        hatchPoints.push({
          x: ringCx + Math.cos(a) * curR,
          y: ringCy + Math.sin(a) * curR,
          pressure: 0.4 + factor * 0.4,
        });
      }
      strokes.push({ points: hatchPoints, color: '#64748b', width: 2 });
    }

    // 3. CALIGRAFÍA DEL NOMBRE Y CINTA DE HONOR (Fase 3: 70% - 95%)
    // Cinta pergamino inferior
    const ribbonPoints: DrawingPoint[] = [
      { x: 0.18, y: 0.76, pressure: 0.7 },
      { x: 0.5, y: 0.74, pressure: 0.9 },
      { x: 0.82, y: 0.76, pressure: 0.7 },
      { x: 0.86, y: 0.83, pressure: 0.8 },
      { x: 0.8, y: 0.82, pressure: 0.7 },
      { x: 0.5, y: 0.80, pressure: 0.9 },
      { x: 0.2, y: 0.82, pressure: 0.7 },
      { x: 0.14, y: 0.83, pressure: 0.8 },
      { x: 0.18, y: 0.76, pressure: 0.7 },
    ];
    strokes.push({ points: ribbonPoints, color: primary, width: 4 });

    // Trazos de las letras del nombre (letras simuladas para que la pluma baile sobre el texto)
    const nameStr = this.user.nickname || this.user.uniqueId || 'Gamer';
    const nameLetterCount = Math.min(nameStr.length, 14);
    const startX = 0.26;
    const letterSpan = (0.74 - startX) / Math.max(nameLetterCount, 1);

    for (let l = 0; l < nameLetterCount; l++) {
      const lx = startX + l * letterSpan + letterSpan * 0.5;
      const letterStrokes: DrawingPoint[] = [
        { x: lx - 0.012, y: 0.755, pressure: 0.8 },
        { x: lx, y: 0.785, pressure: 0.9 },
        { x: lx + 0.012, y: 0.755, pressure: 0.8 },
        { x: lx - 0.008, y: 0.772, pressure: 0.7 },
        { x: lx + 0.008, y: 0.772, pressure: 0.7 },
      ];
      strokes.push({ points: letterStrokes, color: '#f8fafc', width: 3 });
    }

    // 4. SELLO FINAL / AMULETO (95% - 100%)
    const sealPoints: DrawingPoint[] = [];
    for (let a = 0; a <= Math.PI * 2; a += 0.4) {
      sealPoints.push({
        x: 0.5 + Math.cos(a) * 0.04,
        y: 0.89 + Math.sin(a) * 0.04,
        pressure: 1.0,
      });
    }
    strokes.push({ points: sealPoints, color: primary, width: 5, glow: this.tierConfig.glowColor });

    this.strokePaths = strokes;
  }

  /**
   * Renderiza el estado del dibujo para un progreso t de 0 a 1.
   * Devuelve las coordenadas actuales de la pluma (en espacio normalizado 0..1).
   */
  public renderProgress(t: number): { quillX: number; quillY: number; isDrawing: boolean } {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // Limpiar canvas
    ctx.clearRect(0, 0, w, h);

    // Fondo estilo pergamino antiguo / lápida encantada
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, w * 0.7);
    bgGrad.addColorStop(0, '#1c1527');
    bgGrad.addColorStop(0.6, '#120d1c');
    bgGrad.addColorStop(1, '#08050e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Textura sutil de pergamino envejecido
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#ffeedd';
    for (let i = 0; i < 40; i++) {
      const rx = ((i * 137) % w);
      const ry = ((i * 243) % h);
      ctx.beginPath();
      ctx.arc(rx, ry, (i % 6) * 12 + 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // TOTAL DE PUNTOS EN TODOS LOS TRAZOS
    let totalPoints = 0;
    for (const stroke of this.strokePaths) {
      totalPoints += stroke.points.length;
    }

    const currentPointsToDraw = Math.floor(totalPoints * Math.min(t, 1.0));
    let pointsRendered = 0;
    let lastX = 0.5;
    let lastY = 0.5;
    let isDrawingNow = t < 1.0;

    // Dibujar trazos hasta el límite actual
    for (const stroke of this.strokePaths) {
      if (pointsRendered >= currentPointsToDraw) break;

      const availableInStroke = Math.min(
        stroke.points.length,
        currentPointsToDraw - pointsRendered
      );

      if (availableInStroke > 1) {
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

        for (let i = 1; i < availableInStroke; i++) {
          const pt = stroke.points[i];
          ctx.lineTo(pt.x * w, pt.y * h);
          lastX = pt.x;
          lastY = pt.y;
        }
        ctx.stroke();
        ctx.restore();
      }

      pointsRendered += stroke.points.length;
    }

    // SI EL PROGRESO SUPERA EL 25%, COMENZAR A REVELAR LA FOTO DE PERFIL ESTILIZADA
    if (t > 0.25 && this.loadedImage) {
      const avatarProgress = Math.min(1.0, (t - 0.25) / 0.55); // 0 a 1 entre 25% y 80%

      ctx.save();
      // Máscara circular
      const cx = w * 0.5;
      const cy = h * 0.44;
      const radius = w * 0.23;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // Opacidad gradual del boceto
      ctx.globalAlpha = avatarProgress * 0.95;

      // Dibujar imagen
      const imgSize = radius * 2.2;
      ctx.drawImage(this.loadedImage, cx - imgSize / 2, cy - imgSize / 2, imgSize, imgSize);

      // Filtro de Halloween sobre la imagen (tinte misterioso según el tier)
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = this.tierConfig.accentColor;
      ctx.globalAlpha = 0.35 * avatarProgress;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      // Efecto viñeta oscura interior
      ctx.globalCompositeOperation = 'source-over';
      const vignette = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(10,5,20,0.85)');
      ctx.fillStyle = vignette;
      ctx.globalAlpha = 1.0;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      ctx.restore();
    }

    // SI EL PROGRESO SUPERA EL 70%, RENDERIZAR EL TEXTO DEL NOMBRE EN CALIGRAFÍA GÓTICA
    if (t > 0.70) {
      const textProgress = Math.min(1.0, (t - 0.70) / 0.22);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Nombre del streamer/usuario
      const name = this.user.nickname || this.user.uniqueId;
      const visibleChars = Math.floor(name.length * textProgress);
      const textToDraw = name.slice(0, visibleChars);

      ctx.font = 'bold 36px "Cinzel", "Georgia", "Times New Roman", serif';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = this.tierConfig.glowColor;
      ctx.shadowBlur = 18;
      ctx.fillText(textToDraw, w * 0.5, h * 0.78);

      // UniqueId (@usuario)
      if (t > 0.85) {
        ctx.font = 'italic 20px "Courier New", monospace';
        ctx.fillStyle = this.tierConfig.accentColor;
        ctx.shadowBlur = 8;
        ctx.fillText(`@${this.user.uniqueId}`, w * 0.5, h * 0.825);
      }

      // Regalo y Diamantes
      if (t > 0.90) {
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.shadowBlur = 12;
        ctx.fillText(`🎁 ${this.user.giftName} • ${this.user.diamonds} 💎`, w * 0.5, h * 0.865);
      }

      // Insignia del Nivel
      if (t > 0.95) {
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.fillStyle = this.tierConfig.accentColor;
        ctx.fillText(this.tierConfig.titleBadge, w * 0.5, h * 0.92);
      }

      ctx.restore();
    }

    this.currentQuillPos = {
      quillX: lastX,
      quillY: lastY,
      isDrawing: isDrawingNow,
      pressure: 0.8,
    };

    return this.currentQuillPos;
  }
}
