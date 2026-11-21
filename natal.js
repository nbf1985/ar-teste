// natal.js — a cena inteira do Papai Noel, feita só com código (sem arquivos 3D externos).
// Unidades: a largura do porta-copos = 1. O eixo Y da "raiz" aponta para cima (para fora do porta-copos).
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const R = 0.26;   // raio do buraco
const D = 0.62;   // profundidade do buraco
const ESC_NOEL = 0.78; // tamanho do Papai Noel

// Roteiro (em segundos). Mude aqui para acelerar/atrasar cada parte.
const T = {
  abre0: 0.0, abre1: 1.0,        // buraco abre
  noel: 0.25,                    // Papai Noel aparece lá no fundo
  prep0: 1.6, prep1: 2.1,        // pega impulso com o saco
  lanca: 2.35,                   // solta o saco
  sacoPousa: 3.15,               // saco cai fora do buraco
  vira0: 3.0, vira1: 3.4,        // vira para a parede do fundo
  arma0: 3.3, arma1: 3.6,        // saca o arpão
  mira0: 3.4, mira1: 3.9,        // mira para a borda
  tiro: 4.0, ganchoPrende: 4.25, // dispara e o gancho prende na borda
  sobe0: 4.5, sobe1: 5.6,        // é puxado pelo cabo
  pulo0: 5.7, pulo1: 6.5,        // solta o cabo, dá um mortal e cai do lado de fora
  texto0: 6.7, texto1: 7.3,      // "FELIZ NATAL"
  aceno: 6.9,                    // acena
  fecha0: 7.6, fecha1: 8.4,      // buraco fecha
  fim: 8.6,
};

// ---------- ajudantes de animação ----------
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));             // progresso de 0 a 1 entre a e b
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeIn = (x) => x * x * x;
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = THREE.MathUtils.lerp;
const EIXO_Y = new THREE.Vector3(0, 1, 0);

// valor animado por quadros-chave: [[tempo, valor], [tempo, valor], ...]
function kf(t, chaves, ease = easeInOut) {
  if (t <= chaves[0][0]) return chaves[0][1];
  for (let i = 1; i < chaves.length; i++) {
    const [t1, v1] = chaves[i];
    if (t <= t1) {
      const [t0, v0] = chaves[i - 1];
      return lerp(v0, v1, ease((t - t0) / (t1 - t0)));
    }
  }
  return chaves[chaves.length - 1][1];
}

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });

function malha(geo, material, x = 0, y = 0, z = 0, pai = null) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (pai) pai.add(m);
  return m;
}

// ruído "fixo" por posição (para a terra das paredes não ter emendas)
const ruido = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };

// ---------- o buraco ----------
function criarBuraco() {
  const g = new THREE.Group();

  // Anel invisível gigante que só grava profundidade: esconde tudo que está "debaixo da mesa",
  // menos o que se vê pela boca do buraco. É isso que cria a ilusão de profundidade.
  const oclusor = malha(new THREE.RingGeometry(1, 1000, 72), new THREE.MeshBasicMaterial({ colorWrite: false }), 0, 0, 0, g);
  oclusor.rotation.x = -Math.PI / 2;
  oclusor.renderOrder = -1;

  // Paredes de terra (vistas por dentro), escurecendo até o fundo
  const paredeGeo = new THREE.CylinderGeometry(1, 0.85, D, 56, 12, true);
  const pos = paredeGeo.attributes.position;
  const cores = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const alt = (y + D / 2) / D;                       // 1 = topo, 0 = fundo
    const k = alt * alt * (0.7 + 0.6 * ruido(x, y, z));
    cores.push(0.07 * k, 0.04 * k, 0.025 * k);
  }
  paredeGeo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  malha(paredeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }), 0, -D / 2, 0, g);

  // Fundo preto
  const fundo = malha(new THREE.CircleGeometry(0.87, 56), new THREE.MeshBasicMaterial({ color: 0x030201 }), 0, -D, 0, g);
  fundo.rotation.x = -Math.PI / 2;

  // Borda irregular (porta-copos "quebrado") e rachaduras
  const corBorda = new THREE.MeshBasicMaterial({ color: 0x1a0f08 });
  const forma = new THREE.Shape();
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = 1.1 + 0.05 * Math.sin(a * 5) + 0.035 * Math.sin(a * 13 + 1);
    i === 0 ? forma.moveTo(Math.cos(a) * r, Math.sin(a) * r) : forma.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const furo = new THREE.Path();
  furo.absarc(0, 0, 1, 0, Math.PI * 2, true);
  forma.holes.push(furo);
  const borda = malha(new THREE.ShapeGeometry(forma, 64), corBorda, 0, 0.003, 0, g);
  borda.rotation.x = -Math.PI / 2;

  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + ruido(i, 1, 2) * 0.5;
    const len = 1.25 + ruido(i, 3, 4) * 0.2;
    const w = 0.04;
    const tri = new THREE.Shape();
    tri.moveTo(Math.cos(a - w) * 1.05, Math.sin(a - w) * 1.05);
    tri.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    tri.lineTo(Math.cos(a + w) * 1.05, Math.sin(a + w) * 1.05);
    const r = malha(new THREE.ShapeGeometry(tri), corBorda, 0, 0.003, 0, g);
    r.rotation.x = -Math.PI / 2;
  }
  return g;
}

// ---------- Papai Noel ----------
function criarNoel() {
  const vermelho = mat(0xd32f2f), branco = mat(0xf7f7f7), pele = mat(0xf1c27d), preto = mat(0x222222),
        dourado = mat(0xf4c542, { metalness: 0.6, roughness: 0.3 }), rosa = mat(0xe57373);
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';   // primeiro gira para os lados, depois "dá cambalhota"

  // pernas (com articulação no quadril)
  const pernas = [];
  for (const sx of [-1, 1]) {
    const quadril = new THREE.Group();
    quadril.position.set(sx * 0.042, 0.13, 0);
    g.add(quadril);
    malha(new THREE.CylinderGeometry(0.027, 0.025, 0.09, 12), vermelho, 0, -0.045, 0, quadril);
    malha(new THREE.BoxGeometry(0.052, 0.04, 0.078), preto, 0, -0.11, 0.012, quadril);
    pernas.push(quadril);
  }

  // corpo, barra branca, cinto e fivela
  malha(new THREE.CylinderGeometry(0.095, 0.115, 0.2, 24), vermelho, 0, 0.21, 0, g);
  const barra = malha(new THREE.TorusGeometry(0.113, 0.016, 8, 32), branco, 0, 0.115, 0, g);
  barra.rotation.x = Math.PI / 2;
  malha(new THREE.BoxGeometry(0.03, 0.17, 0.014), branco, 0, 0.215, 0.102, g);
  malha(new THREE.CylinderGeometry(0.109, 0.112, 0.032, 24), preto, 0, 0.18, 0, g);
  malha(new THREE.BoxGeometry(0.05, 0.036, 0.012), dourado, 0, 0.18, 0.114, g);
  malha(new THREE.SphereGeometry(0.096, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), vermelho, 0, 0.308, 0, g);

  // cabeça, barba, bigode, nariz e olhos
  malha(new THREE.SphereGeometry(0.062, 24, 16), pele, 0, 0.39, 0, g);
  const barba = malha(new THREE.SphereGeometry(0.066, 24, 16), branco, 0, 0.352, 0.022, g);
  barba.scale.set(1, 1.15, 0.75);
  for (const sx of [-1, 1]) {
    const b = malha(new THREE.SphereGeometry(0.022, 12, 8), branco, sx * 0.022, 0.378, 0.058, g);
    b.scale.set(1.4, 0.7, 0.8);
    malha(new THREE.SphereGeometry(0.0085, 8, 6), preto, sx * 0.024, 0.408, 0.054, g);
  }
  malha(new THREE.SphereGeometry(0.014, 12, 8), rosa, 0, 0.39, 0.062, g);

  // gorro
  const gorro = new THREE.Group();
  gorro.position.set(0, 0.43, 0);
  g.add(gorro);
  const aba = malha(new THREE.TorusGeometry(0.058, 0.017, 8, 24), branco, 0, 0, 0, gorro);
  aba.rotation.x = Math.PI / 2;
  const cone = malha(new THREE.ConeGeometry(0.058, 0.13, 20), vermelho, 0, 0.06, -0.01, gorro);
  cone.rotation.x = -0.35;
  malha(new THREE.SphereGeometry(0.02, 12, 8), branco, 0, 0.12, -0.034, gorro);

  // braços (com articulação no ombro); "mao" é onde seguramos o saco e o arpão
  const bracos = [];
  for (const sx of [-1, 1]) {
    const pivo = new THREE.Group();
    pivo.position.set(sx * 0.112, 0.295, 0);
    g.add(pivo);
    malha(new THREE.SphereGeometry(0.03, 12, 8), vermelho, 0, 0, 0, pivo);
    malha(new THREE.CylinderGeometry(0.026, 0.024, 0.12, 12), vermelho, 0, -0.06, 0, pivo);
    const punho = malha(new THREE.TorusGeometry(0.025, 0.01, 6, 16), branco, 0, -0.118, 0, pivo);
    punho.rotation.x = Math.PI / 2;
    const mao = new THREE.Group();
    mao.position.set(0, -0.14, 0);
    pivo.add(mao);
    malha(new THREE.SphereGeometry(0.025, 12, 8), branco, 0, 0, 0, mao);
    bracos.push({ pivo, mao, sx });
  }
  return { g, pernas, bracoE: bracos[0], bracoD: bracos[1] };
}

// ---------- objetos ----------
function criarSaco() {
  const g = new THREE.Group();
  const tecido = mat(0x8d5524, { roughness: 0.95 });
  const dourado = mat(0xffc107, { metalness: 0.5, roughness: 0.35 });
  const bojo = malha(new THREE.SphereGeometry(0.07, 20, 14), tecido, 0, 0.068, 0, g);
  bojo.scale.set(1.05, 1, 0.95);
  malha(new THREE.CylinderGeometry(0.016, 0.03, 0.035, 12), tecido, 0, 0.14, 0, g);
  malha(new THREE.CylinderGeometry(0.03, 0.014, 0.025, 12), tecido, 0, 0.168, 0, g);
  const laco = malha(new THREE.TorusGeometry(0.018, 0.006, 6, 16), dourado, 0, 0.152, 0, g);
  laco.rotation.x = Math.PI / 2;
  const p1 = malha(new THREE.BoxGeometry(0.03, 0.03, 0.03), mat(0x1e88e5), 0.01, 0.19, 0, g);
  p1.rotation.set(0.3, 0.4, 0.2);
  const p2 = malha(new THREE.BoxGeometry(0.024, 0.024, 0.024), mat(0x43a047), -0.012, 0.186, 0.006, g);
  p2.rotation.set(-0.2, 0.7, -0.3);
  return g;
}

function criarArma() {   // aponta para o -Y da mão (a mesma direção do braço)
  const g = new THREE.Group();
  const cinza = mat(0x455a64, { metalness: 0.5, roughness: 0.35 });
  const amarelo = mat(0xffca28);
  malha(new THREE.BoxGeometry(0.032, 0.06, 0.04), cinza, 0, -0.025, 0.012, g);
  malha(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 10), cinza, 0, -0.07, 0.012, g);
  malha(new THREE.BoxGeometry(0.034, 0.014, 0.03), amarelo, 0, -0.045, 0.012, g);
  const ponta = new THREE.Object3D();
  ponta.position.set(0, -0.095, 0.012);
  g.add(ponta);
  return { g, ponta };
}

function criarGancho() {  // a ponta aponta para +Y
  const g = new THREE.Group();
  const aco = mat(0xb0bec5, { metalness: 0.8, roughness: 0.25 });
  malha(new THREE.CylinderGeometry(0.006, 0.006, 0.045, 8), aco, 0, 0, 0, g);
  malha(new THREE.ConeGeometry(0.011, 0.02, 8), aco, 0, 0.032, 0, g);
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Group();
    p.rotation.y = (i * 2 * Math.PI) / 3;
    g.add(p);
    const dente = malha(new THREE.CylinderGeometry(0.004, 0.004, 0.032, 6), aco, 0.012, 0.016, 0, p);
    dente.rotation.z = -2.3;
  }
  return g;
}

function criarSombra(r) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  m.visible = false;
  return m;
}

function criarNeve(n = 220) {
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = 0.6 * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2;
    pos.set([Math.cos(a) * r, Math.random() * 0.9, Math.sin(a) * r], i * 3);
    vel[i] = 0.06 + Math.random() * 0.08;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const ctx = cv.getContext('2d');
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const m = new THREE.PointsMaterial({ size: 0.02, map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: 0 });
  const pts = new THREE.Points(geo, m);
  pts.userData.vel = vel;
  pts.visible = false;
  return pts;
}

// ---------- a cena ----------
export class CenaNatal {
  constructor() {
    this.raiz = new THREE.Group();
    this.raiz.rotation.x = Math.PI / 2;   // a imagem do MindAR fica no plano XY; isso faz o Y apontar para fora do porta-copos

    this.buraco = criarBuraco();
    this.raiz.add(this.buraco);

    this.atores = new THREE.Group();      // gira para ficar de frente para quem está olhando
    this.raiz.add(this.atores);

    this.noel = criarNoel();
    this.atores.add(this.noel.g);
    this.saco = criarSaco();
    this.arma = criarArma();
    this.noel.bracoD.mao.add(this.arma.g);
    this.gancho = criarGancho();
    this.corda = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 1, 6), mat(0x212121));
    this.atores.add(this.corda);
    this.sombraNoel = criarSombra(0.1);
    this.sombraSaco = criarSombra(0.075);
    this.atores.add(this.sombraNoel, this.sombraSaco);

    this.texto = new THREE.Group();
    this.texto.position.set(0, 0.5, 0);
    this.raiz.add(this.texto);

    this.neve = criarNeve();
    this.raiz.add(this.neve);

    this._v = new THREE.Vector3();
    this._w = new THREE.Vector3();
    this.reiniciar();
  }

  async carregarTexto(urlFonte) {
    const fonte = await new FontLoader().loadAsync(urlFonte);
    const frente = mat(0xe53935, { emissive: 0x5a0000, roughness: 0.4 });
    const lado = mat(0xffc107, { metalness: 0.6, roughness: 0.3 });
    [['FELIZ', 0.065], ['NATAL', -0.065]].forEach(([palavra, y]) => {   // duas linhas: cabe na tela do celular em pé
      const geo = new TextGeometry(palavra, {
        font: fonte, size: 0.09, height: 0.028, curveSegments: 6,
        bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.004, bevelSegments: 2,
      });
      geo.center();
      const m = new THREE.Mesh(geo, [frente, lado]);
      m.position.y = y;
      this.texto.add(m);
    });
  }

  reiniciar() {
    this.t = 0;
    this.direcaoFixada = false;
    this.terminou = false;

    this.noel.bracoD.mao.add(this.saco);          // saco volta para a mão
    this.saco.position.set(0, -0.155, 0);
    this.saco.rotation.set(0, 0, 0);
    this.saco.scale.set(1, 1, 1);
    this.sacoSolto = false;

    this.arma.g.add(this.gancho);                 // gancho volta para a ponta do arpão
    this.gancho.position.copy(this.arma.ponta.position);
    this.gancho.rotation.set(Math.PI, 0, 0);
    this.gancho.scale.set(1, 1, 1);
    this.gancho.visible = true;
    this.ganchoSolto = false;

    this.corda.visible = false;
    this.texto.scale.setScalar(0.001);
    this.texto.visible = false;
    this.neve.visible = false;
    this.atualizar(0, null);
  }

  // Papai Noel fica de frente para o celular no começo da animação
  fixarDirecao(camera) {
    const v = camera.getWorldPosition(this._v);
    this.raiz.updateWorldMatrix(true, false);
    this.raiz.worldToLocal(v);
    this.atores.rotation.y = Math.hypot(v.x, v.z) > 1e-6 ? Math.atan2(v.x, v.z) : 0;
    this.direcaoFixada = true;
  }

  // posição de um objeto no sistema dos "atores"
  _local(obj, alvo) {
    obj.getWorldPosition(alvo);
    return this.atores.worldToLocal(alvo);
  }

  atualizar(dt, camera) {
    if (camera && !this.direcaoFixada) this.fixarDirecao(camera);
    this.t += dt;
    const t = this.t;
    const n = this.noel;

    // ----- buraco abre e, no final, fecha -----
    const abertura = easeOutBack(seg(t, T.abre0, T.abre1)) * (1 - easeInOut(seg(t, T.fecha0, T.fecha1)));
    const s = Math.max(abertura, 0.001) * R;
    this.buraco.scale.set(s, 1, s);
    this.buraco.visible = abertura > 0.002;

    // ----- Papai Noel: posição, giro, cambalhota -----
    const S0 = this._w.set(0, -D, -0.09);
    const S1 = new THREE.Vector3(0, -0.36, -0.14);
    const L = new THREE.Vector3(-0.12, 0, 0.36);     // cai na frente do buraco
    const p = n.g.position;
    let rotX = 0, rotY = kf(t, [[T.vira0, 0], [T.vira1, Math.PI]]);
    if (t < T.sobe0) {
      p.copy(S0);
      p.y += Math.abs(Math.sin(t * 7)) * 0.03 * seg(t, 0.6, 1.0) * (1 - seg(t, T.prep0 - 0.2, T.prep0)); // pulinhos de "oi"
    } else if (t < T.pulo0) {
      const u = easeIn(seg(t, T.sobe0, T.sobe1));                       // puxado cada vez mais rápido
      p.lerpVectors(S0, S1, u);
      p.x += Math.sin(u * Math.PI * 3) * 0.015;
      rotX = -0.3 * seg(t, T.sobe0, T.sobe0 + 0.2);
    } else if (t < T.pulo1) {
      const u = seg(t, T.pulo0, T.pulo1);
      p.lerpVectors(S1, L, u);
      p.y += 0.45 * 4 * u * (1 - u);                                    // arco do pulo
      const e = easeInOut(u);
      rotX = lerp(-0.3, -Math.PI * 2, e);                               // mortal para trás
      rotY = lerp(Math.PI, 0, e);                                       // termina de frente
    } else {
      p.copy(L);
      rotY = 0;
      p.y += t > T.aceno ? Math.abs(Math.sin((t - T.aceno) * 4)) * 0.015 : 0;
    }
    n.g.rotation.set(rotX, rotY, 0);
    n.g.visible = t > T.noel;
    const amasso = Math.sin(Math.PI * seg(t, T.pulo1, T.pulo1 + 0.3));   // "amassadinha" ao cair
    n.g.scale.set(ESC_NOEL * (1 + 0.12 * amasso), ESC_NOEL * (1 - 0.25 * amasso), ESC_NOEL * (1 + 0.12 * amasso));

    // ----- braços -----
    const recuo = 0.3 * Math.sin(Math.PI * seg(t, T.tiro, T.tiro + 0.15));
    n.bracoD.pivo.rotation.x = kf(t, [
      [T.prep0, 0], [T.prep1, 0.9], [T.lanca, -2.4], [T.lanca + 0.4, 0],
      [T.mira0, 0], [T.mira1, -2.2], [T.sobe0, -2.2], [T.sobe1, -2.95], [T.pulo0 + 0.2, -2.6], [T.pulo1, 0],
    ]) + recuo;
    n.bracoD.pivo.rotation.z = 0.12;
    n.bracoE.pivo.rotation.x = kf(t, [[T.sobe0 - 0.25, 0], [T.sobe0, -2.9], [T.sobe1, -2.95], [T.pulo1, 0]]);
    const aceno = easeOut(seg(t, T.aceno, T.aceno + 0.3));
    n.bracoE.pivo.rotation.z = lerp(-0.12, -(2.6 + 0.35 * Math.sin(t * 9)), aceno);

    // ----- pernas: "andam" na parede ao subir e encolhem no mortal -----
    const subindo = t >= T.sobe0 && t < T.pulo0;
    const voando = t >= T.pulo0 && t < T.pulo1;
    n.pernas.forEach((perna, i) => {
      if (subindo) perna.rotation.x = -0.6 + 0.5 * Math.sin(t * 16 + i * Math.PI);
      else if (voando) perna.rotation.x = -1.2 * Math.sin(Math.PI * seg(t, T.pulo0, T.pulo1));
      else perna.rotation.x = 0;
    });

    // ----- saco de presentes -----
    const LS = new THREE.Vector3(0.22, 0, 0.32);
    if (t >= T.lanca) {
      if (!this.sacoSolto) {
        this.atores.attach(this.saco);                 // larga o saco mantendo a posição de onde estava
        this.sacoP0 = this.saco.position.clone();
        this.sacoR0 = this.saco.rotation.clone();
        this.sacoEsc = this.saco.scale.x;
        this.sacoSolto = true;
      }
      const u = seg(t, T.lanca, T.sacoPousa);
      this.saco.position.lerpVectors(this.sacoP0, LS, u);
      this.saco.position.y += 0.45 * 4 * u * (1 - u);
      this.saco.rotation.set(lerp(this.sacoR0.x, 0, u), lerp(this.sacoR0.y, 0, u), lerp(this.sacoR0.z, 0, u) - Math.PI * 2 * u);
      const b = Math.sin(Math.PI * seg(t, T.sacoPousa, T.sacoPousa + 0.3));
      this.saco.scale.set(this.sacoEsc * (1 + 0.15 * b), this.sacoEsc * (1 - 0.25 * b), this.sacoEsc * (1 + 0.15 * b));
    }

    // ----- arpão, gancho e corda -----
    const escArma = easeOutBack(seg(t, T.arma0, T.arma1)) * (1 - seg(t, T.pulo0, T.pulo0 + 0.15));
    this.arma.g.scale.setScalar(Math.max(escArma, 0.0001));
    this.arma.g.visible = escArma > 0.01;

    const H = new THREE.Vector3(0, 0.012, -R * 1.02);   // ponto da borda onde o gancho prende
    if (t >= T.tiro) {
      if (!this.ganchoSolto) {
        this.atores.attach(this.gancho);
        this.ganchoP0 = this.gancho.position.clone();
        this.ganchoSolto = true;
      }
      const u = seg(t, T.tiro, T.ganchoPrende);
      this.gancho.position.lerpVectors(this.ganchoP0, H, u);
      const dir = new THREE.Vector3().subVectors(H, this.ganchoP0).normalize();
      this.gancho.quaternion.setFromUnitVectors(EIXO_Y, dir);
      this.gancho.visible = t < T.pulo0 + 0.1;

      this.corda.visible = t < T.pulo0 + 0.05;
      if (this.corda.visible) {
        n.g.updateWorldMatrix(true, true);
        const a = this._local(this.arma.ponta, new THREE.Vector3());
        const b = this.gancho.position;
        const d = new THREE.Vector3().subVectors(b, a);
        const len = Math.max(d.length(), 0.0001);
        this.corda.position.copy(a).addScaledVector(d, 0.5);
        this.corda.quaternion.setFromUnitVectors(EIXO_Y, d.normalize());
        this.corda.scale.set(1, len, 1);
      }
    }

    // ----- sombras no porta-copos -----
    const sombra = (som, obj, ativo) => {
      const y = obj.position.y;
      som.visible = ativo && y > -0.03;
      if (som.visible) {
        som.position.set(obj.position.x, 0.002, obj.position.z);
        som.material.opacity = 0.35 * clamp01(1 - y / 0.5);
      }
    };
    sombra(this.sombraSaco, this.saco, this.sacoSolto);
    sombra(this.sombraNoel, n.g, t >= T.pulo0);

    // ----- FELIZ NATAL + neve -----
    const et = easeOutBack(seg(t, T.texto0, T.texto1));
    this.texto.visible = et > 0.001;
    this.texto.scale.setScalar(Math.max(et, 0.001));
    this.texto.position.y = 0.5 + 0.015 * Math.sin(t * 2);

    this.neve.visible = t > T.texto0;
    if (this.neve.visible) {
      this.neve.material.opacity = 0.9 * seg(t, T.texto0, T.texto0 + 1);
      const pos = this.neve.geometry.attributes.position;
      const vel = this.neve.userData.vel;
      for (let i = 0; i < vel.length; i++) {
        let y = pos.getY(i) - vel[i] * dt;
        if (y < 0) y += 0.9;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(t * 1.5 + i) * 0.01 * dt);
      }
      pos.needsUpdate = true;
    }

    if (camera) {
      this.raiz.updateWorldMatrix(true, false);
      // tamanho dos flocos acompanha a escala do porta-copos na tela
      this.neve.material.size = 0.02 * this.raiz.matrixWorld.getMaxScaleOnAxis();
      // o texto vira devagar para ficar sempre de frente
      const v = this.raiz.worldToLocal(camera.getWorldPosition(new THREE.Vector3()));
      if (Math.hypot(v.x, v.z) > 1e-6) {
        let alvo = Math.atan2(v.x, v.z);
        let dif = alvo - this.texto.rotation.y;
        dif = Math.atan2(Math.sin(dif), Math.cos(dif));
        this.texto.rotation.y += dif * Math.min(1, dt * 5);
      }
    }

    this.terminou = t >= T.fim;
  }
}
