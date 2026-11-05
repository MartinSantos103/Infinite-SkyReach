import { PALETTE } from '../config/palette.js';

/**
 * Genera las texturas modulares por piezas para los tres Jefes de Sector:
 * 1. Valkiria (240x110 px + núcleo + 2 cañones laterales independientes + compuerta)
 * 2. Espectro (180x120 px crucero fantasma en forma de manta)
 * 3. Leviatán (220x220 px cuerpo octogonal + anillo rotatorio de 8 placas + drones orbitales)
 * Cumple con la sección 10.7.
 */
export function generateBossTextures(scene) {
  makeValkiriaTextures(scene);
  makeEspectroTextures(scene);
  makeLeviatanTextures(scene);
}

function makeValkiriaTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // Casco principal de Valkiria: 240x110 px
  g.fillStyle(PALETTE.BOSS.VALKIRIA_HULL, 1);
  // Ala horizontal pesada
  g.fillRoundedRect(10, 22, 220, 46, 8);
  // Proa y popa central
  g.fillTriangle(120, 104, 170, 56, 70, 56);
  g.fillRoundedRect(76, 6, 88, 72, 10);

  // Detalles metálicos claros (#A0AEC0)
  g.fillStyle(PALETTE.BOSS.VALKIRIA_DETAIL, 1);
  g.fillRect(24, 32, 192, 6);
  g.fillRect(88, 14, 64, 10);
  g.lineStyle(2, PALETTE.BOSS.VALKIRIA_DETAIL, 1);
  g.strokeRoundedRect(76, 6, 88, 72, 10);

  // Compuerta inferior cerrada
  g.fillStyle(0x2d3748, 1);
  g.fillRect(102, 74, 36, 14);

  g.generateTexture('boss_valkiria_hull', 240, 110);

  // Versión blanca _flash del casco
  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillRoundedRect(10, 22, 220, 46, 8);
  g.fillTriangle(120, 104, 170, 56, 70, 56);
  g.fillRoundedRect(76, 6, 88, 72, 10);
  g.generateTexture('boss_valkiria_hull_flash', 240, 110);

  // Núcleo central rojo que pulsa (#E63946): 44x44 px
  g.clear();
  g.fillStyle(PALETTE.BOSS.VALKIRIA_DETAIL, 1);
  g.fillCircle(22, 22, 20);
  g.fillStyle(PALETTE.BOSS.VALKIRIA_CORE, 1);
  g.fillCircle(22, 22, 15);
  g.fillStyle(PALETTE.DAMAGE_CORE, 0.9);
  g.fillCircle(22, 22, 7);
  g.generateTexture('boss_valkiria_core', 44, 44);

  // Cañón lateral intacto: 42x50 px
  g.clear();
  g.fillStyle(PALETTE.BOSS.VALKIRIA_HULL, 1);
  g.fillRoundedRect(4, 4, 34, 34, 6);
  g.lineStyle(2, PALETTE.BOSS.VALKIRIA_DETAIL, 1);
  g.strokeRoundedRect(4, 4, 34, 34, 6);
  // Dos bocas de cañón rojas
  g.fillStyle(PALETTE.BOSS.VALKIRIA_CORE, 1);
  g.fillRect(10, 34, 7, 14);
  g.fillRect(25, 34, 7, 14);
  g.fillStyle(PALETTE.BOSS.VALKIRIA_DETAIL, 1);
  g.fillCircle(21, 20, 9);
  g.generateTexture('boss_valkiria_cannon', 42, 50);

  // Cañón lateral flash blanco
  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillRoundedRect(4, 4, 34, 34, 6);
  g.fillRect(10, 34, 7, 14);
  g.fillRect(25, 34, 7, 14);
  g.generateTexture('boss_valkiria_cannon_flash', 42, 50);

  // Cañón lateral destruido (oscurecido): 42x50 px
  g.clear();
  g.fillStyle(PALETTE.BOSS.VALKIRIA_DEAD_PART, 1);
  g.fillRoundedRect(4, 4, 34, 30, 6);
  g.fillStyle(0x1a202c, 1);
  g.fillCircle(18, 18, 8);
  g.fillCircle(26, 24, 6);
  g.generateTexture('boss_valkiria_cannon_dead', 42, 50);

  // Destello amarillo de compuerta de escolta
  g.clear();
  g.fillStyle(PALETTE.HAZARD_YELLOW, 0.95);
  g.fillRoundedRect(0, 0, 36, 16, 4);
  g.fillStyle(PALETTE.WHITE, 0.9);
  g.fillRect(6, 4, 24, 8);
  g.generateTexture('boss_valkiria_hatch_glow', 36, 16);

  g.destroy();
}

function makeEspectroTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // Jefe 2: Espectro (180x120 px)
  // Crucero fantasma en forma de manta con núcleo blanco, lavanda #B8B8D1, borde violeta #9D4EDD
  const points = [
    { x: 90, y: 116 }, // Punta frontal inferior
    { x: 140, y: 74 },
    { x: 176, y: 42 }, // Ala derecha
    { x: 146, y: 10 },
    { x: 112, y: 24 },
    { x: 90, y: 6 },   // Cola superior
    { x: 68, y: 24 },
    { x: 34, y: 10 },
    { x: 4, y: 42 },   // Ala izquierda
    { x: 40, y: 74 }
  ];

  g.fillStyle(PALETTE.BOSS.ESPECTRO_HULL, 0.85);
  g.fillPoints(points, true);

  g.lineStyle(3, PALETTE.BOSS.ESPECTRO_BORDER, 1);
  g.strokePoints(points, true);

  // Líneas de energía violeta internas
  g.lineStyle(2, PALETTE.DEF_LIGHT, 0.8);
  g.strokeTriangle(90, 102, 136, 44, 44, 44);

  // Núcleo blanco brillante
  g.fillStyle(PALETTE.DEF_VIOLET, 1);
  g.fillCircle(90, 58, 20);
  g.fillStyle(PALETTE.BOSS.ESPECTRO_CORE, 1);
  g.fillCircle(90, 58, 12);

  g.generateTexture('boss_espectro', 180, 120);

  // Versión blanca _flash
  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillPoints(points, true);
  g.generateTexture('boss_espectro_flash', 180, 120);

  g.destroy();
}

function makeLeviatanTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // Jefe 3: Leviatán (220x220 px)
  // 1. Cuerpo octogonal oscuro (#22223B): 150x150 px
  const cx = 75;
  const cy = 75;
  const r = 64;
  const octPoints = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i + Math.PI / 8;
    octPoints.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r
    });
  }

  g.fillStyle(PALETTE.BOSS.LEVIATAN_BODY, 1);
  g.fillPoints(octPoints, true);
  g.lineStyle(3, PALETTE.BOSS.LEVIATAN_RING, 1);
  g.strokePoints(octPoints, true);

  // Anillo interior y núcleo gravitatorio violeta/ámbar
  g.lineStyle(2, PALETTE.DEF_VIOLET, 0.9);
  g.strokeCircle(cx, cy, 38);
  g.fillStyle(PALETTE.DEF_DARK, 1);
  g.fillCircle(cx, cy, 26);
  g.fillStyle(PALETTE.DEF_VIOLET, 1);
  g.fillCircle(cx, cy, 14);

  // 8 luces ámbar (#F4A261) en el cuerpo
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i;
    const lx = cx + Math.cos(angle) * 48;
    const ly = cy + Math.sin(angle) * 48;
    g.fillStyle(PALETTE.BOSS.LEVIATAN_LIGHT, 1);
    g.fillCircle(lx, ly, 4);
  }

  g.generateTexture('boss_leviatan_body', 150, 150);

  // Versión blanca _flash del cuerpo
  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillPoints(octPoints, true);
  g.generateTexture('boss_leviatan_body_flash', 150, 150);

  // 2. Anillo exterior de 8 placas que rota (#4A4E69): 220x220 px
  g.clear();
  const rcx = 110;
  const rcy = 110;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i;
    const px = rcx + Math.cos(angle) * 88;
    const py = rcy + Math.sin(angle) * 88;

    g.fillStyle(PALETTE.BOSS.LEVIATAN_RING, 1);
    g.fillCircle(px, py, 18);
    g.lineStyle(2, PALETTE.STAGE_2.CLOUD_LIGHT, 1);
    g.strokeCircle(px, py, 18);

    // Luz ámbar en cada placa
    g.fillStyle(PALETTE.BOSS.LEVIATAN_LIGHT, 1);
    g.fillCircle(px, py, 5);
  }
  g.lineStyle(4, PALETTE.BOSS.LEVIATAN_RING, 0.75);
  g.strokeCircle(rcx, rcy, 88);

  g.generateTexture('boss_leviatan_ring', 220, 220);

  // 3. Drones orbitales destructibles (octágonos #778DA9 con un aro): 32x32 px
  g.clear();
  const dPoints = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i + Math.PI / 8;
    dPoints.push({
      x: 16 + Math.cos(a) * 10,
      y: 16 + Math.sin(a) * 10
    });
  }
  g.lineStyle(2, PALETTE.BOSS.LEVIATAN_DRONE, 0.85);
  g.strokeCircle(16, 16, 14);
  g.fillStyle(PALETTE.BOSS.LEVIATAN_DRONE, 1);
  g.fillPoints(dPoints, true);
  g.fillStyle(PALETTE.DEF_LIGHT, 1);
  g.fillCircle(16, 16, 4);
  g.generateTexture('boss_leviatan_drone', 32, 32);

  // Flash blanco del dron orbital
  g.clear();
  g.fillStyle(PALETTE.WHITE, 1);
  g.fillCircle(16, 16, 14);
  g.generateTexture('boss_leviatan_drone_flash', 32, 32);

  g.destroy();
}
