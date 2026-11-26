// Modèles 3D de la page events-map.html : épingles 3D et objets « recherche » posés sur le globe.
// Repère local de chaque objet : x = est, y = nord, z = haut, en mètres.
import * as THREE from 'three';

const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const box = (w, d, h, m, x = 0, y = 0, z = 0) => {
    const g = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), m);
    g.position.set(x, y, z + h / 2);
    return g;
};
const cylZ = (r, h, m, seg = 16) => {
    const g = new THREE.CylinderGeometry(r, r, h, seg);
    g.rotateX(Math.PI / 2); g.translate(0, 0, h / 2);
    return new THREE.Mesh(g, m);
};

// ---- Épingles 3D (hauteur totale 1,6 ; mise à l'échelle écran par la page) -------------
export const PIN_HEIGHT = 1.6;
const COLORS = { paper: 0x1772d0, outreach: 0x2e8b57, seminar: 0xd9822b };

export function buildPin(kind) {
    const g = new THREE.Group();
    const white = mat(0xffffff), c = mat(COLORS[kind]);
    g.add(cylZ(0.035, 1.0, white, 8));
    const head = new THREE.Group();
    head.position.z = 1.0;
    if (kind === 'paper') {
        // livre ouvert : deux couvertures en V et leurs pages
        [-1, 1].forEach((s) => {
            const side = new THREE.Group();
            side.add(box(0.3, 0.46, 0.035, c, s * 0.15, 0, 0));
            side.add(box(0.27, 0.42, 0.03, white, s * 0.145, 0, 0.035));
            side.rotation.y = -s * 0.42;
            side.position.z = 0.12;
            head.add(side);
        });
        head.add(box(0.05, 0.46, 0.14, c));
    } else if (kind === 'outreach') {
        // brique Lego 2×2
        head.add(box(0.5, 0.5, 0.3, c));
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([i, j]) => {
            const s = cylZ(0.075, 0.08, c, 14);
            s.position.set(i * 0.125, j * 0.125, 0.3);
            head.add(s);
        });
    } else {
        // micro
        const handle = cylZ(0.05, 0.36, mat(0x333333), 12);
        head.add(handle);
        const ring = cylZ(0.085, 0.06, c, 16); ring.position.z = 0.34; head.add(ring);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), mat(0xbfc3c7));
        ball.position.z = 0.5; head.add(ball);
    }
    g.add(head);
    return g;
}

// ---- Petits bâtiments génériques -------------------------------------------------------
function roof(w, d, h, m) {
    // toit à deux pans, faîtage selon y
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
    g.rotateX(Math.PI / 2); g.translate(0, d / 2, 0);
    return new THREE.Mesh(g, m);
}
function building(kind, m, mr) {
    const g = new THREE.Group();
    if (kind === 'house') {
        g.add(box(60, 44, 22, m));
        const r = roof(60, 44, 16, mr); r.position.z = 22; g.add(r);
    } else if (kind === 'house+') {
        g.add(box(60, 44, 22, m));
        const r = roof(60, 44, 16, mr); r.position.z = 22; g.add(r);
        g.add(box(44, 40, 16, m, 52, -2, 0));
    } else if (kind === 'block') {
        g.add(box(150, 70, 40, m));
    } else if (kind === 'block+tower') {
        g.add(box(150, 70, 28, m));
        g.add(box(50, 50, 62, m, 40, 0, 0));
    } else if (kind === 'tower') {
        g.add(box(46, 46, 70, m));
        g.add(box(34, 34, 18, m, 0, 0, 70));
    } else if (kind === 'stepped') {
        g.add(box(70, 60, 24, m));
        g.add(box(50, 44, 22, m, 0, 0, 24));
        g.add(box(30, 28, 20, m, 0, 0, 46));
    }
    return g;
}

const lineMat = (color, opacity = 1) => new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });

// ---- Space-time cube (IV 2023) : un bâtiment qui évolue, le temps à la verticale ----------
export function buildSTC() {
    const S = 400, g = new THREE.Group();
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(S, S, S)), lineMat(0xffffff, 0.9));
    frame.position.z = S / 2; g.add(frame);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshBasicMaterial({ color: 0x0b1a2e, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    floor.position.z = 0.5; g.add(floor);
    const grid = new THREE.GridHelper(S, 8, 0x88aaff, 0x88aaff);
    grid.rotation.x = Math.PI / 2; grid.position.z = 1; grid.material.transparent = true; grid.material.opacity = 0.35; g.add(grid);

    // quatre états du même bâtiment, chacun à la hauteur de sa date
    const years = [1950, 1975, 2000, 2020];
    const kinds = ['house', 'house+', 'block', 'block+tower'];
    const levels = years.map((_, i) => S * (0.06 + i * 0.235));
    kinds.forEach((k, i) => {
        const b = building(k, mat(0xf2efe8), mat(0xb5523b));
        b.position.set(-40, -30, levels[i]);
        g.add(b);
    });
    // lignes de vie : les coins de l'emprise principale relient les états successifs
    const pts = [];
    [[-75, -35], [75, -35], [75, 35], [-75, 35]].forEach(([x, y]) => {
        for (let i = 0; i < levels.length - 1; i++) pts.push(new THREE.Vector3(x - 40, y - 30, levels[i]), new THREE.Vector3(x - 40, y - 30, levels[i + 1]));
    });
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat(0xffd54f, 0.45)));

    const notes = [
        { pos: [0, 0, S + 30], text: 'Space-time cube', cls: 'title' },
        ...years.map((y, i) => ({ pos: [-S / 2, -S / 2, levels[i]], text: String(y) })),
        { pos: [-S / 2, -S / 2, S], text: 'time ↑' },
    ];
    return { group: g, notes, update: null, size: S };
}

// ---- Hélice (Pacific Graphics 2024) : une frise temporelle paramétrique -------------------
export function buildHelix() {
    const R = 230, TURNS = 2.25, H = 720, Z0 = 30, g = new THREE.Group();
    const spin = new THREE.Group(); g.add(spin);
    const P = (t) => new THREE.Vector3(R * Math.cos(t * TURNS * 2 * Math.PI), R * Math.sin(t * TURNS * 2 * Math.PI), Z0 + H * t);
    const curve = new (class extends THREE.Curve { getPoint(t, v = new THREE.Vector3()) { return v.copy(P(t)); } })();
    const tube = new THREE.TubeGeometry(curve, 400, 6, 10, false);
    // dégradé de couleur le long du temps : bleu (passé) → orange (présent)
    const col = [], a = new THREE.Color(0x1772d0), b = new THREE.Color(0xff7043), c = new THREE.Color();
    const pos = tube.attributes.position;
    for (let i = 0; i < pos.count; i++) { c.copy(a).lerp(b, (pos.getZ(i) - Z0) / H); col.push(c.r, c.g, c.b); }
    tube.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    spin.add(new THREE.Mesh(tube, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x222222 })));
    // axe du temps
    spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, Z0 + H + 60)]), lineMat(0xffffff, 0.6)));

    const kinds = ['house', 'house+', 'stepped', 'block', 'tower', 'block+tower', 'stepped', 'tower'];
    const ts = kinds.map((_, i) => 0.04 + i * (0.92 / (kinds.length - 1)));
    const items = kinds.map((k, i) => {
        const p = P(ts[i]);
        const holder = new THREE.Group();
        holder.position.copy(p);
        holder.rotation.z = Math.atan2(p.y, p.x);               // bâtiment tourné vers l'extérieur
        const disc = cylZ(38, 3, mat(0xdddddd), 28); disc.position.z = -3; holder.add(disc);
        const m = mat(0xf2efe8), mr = mat(0xb5523b);
        const bld = building(k, m, mr);
        bld.scale.setScalar(0.55);
        holder.add(bld);
        holder.userData.mats = [m, mr];
        spin.add(holder);
        return holder;
    });
    const cursor = new THREE.Mesh(new THREE.SphereGeometry(14, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffe082 }));
    spin.add(cursor);

    const notes = [
        { pos: [0, 0, Z0 + H + 90], text: 'Helix timeline', cls: 'title' },
        { pos: P(0).toArray(), text: 'past' },
        { pos: P(1).toArray(), text: 'present' },
    ];
    function update(t) {
        spin.rotation.z = t * 0.12;
        const u = ((t / 12) % 1);
        cursor.position.copy(P(u));
        let cur = 0; ts.forEach((x, i) => { if (x <= u) cur = i; });
        items.forEach((it, i) => it.userData.mats.forEach((m) => m.emissive.setHex(i === cur ? 0x555500 : 0)));
    }
    // les notes tournent avec l'hélice : la page relit leur position via notePos()
    const notePos = (n, v) => {
        v.fromArray(n.pos);
        if (n.cls !== 'title') v.applyAxisAngle(new THREE.Vector3(0, 0, 1), spin.rotation.z);
        return v;
    };
    return { group: g, notes, update, notePos, size: Z0 + H };
}

// ---- STAG (ISPRS 2026) : casque Meta Quest 3 + 2 antennes GNSS RTK, sa GeoPose et le contenu virtuel ----
export function buildSTAG() {
    const g = new THREE.Group();
    const K = 110, HZ = 200;                                   // casque grossi ×110, posé à 200 m
    const hs = new THREE.Group();
    hs.position.z = HZ; hs.scale.setScalar(K); g.add(hs);
    const white = mat(0xf4f4f4), black = mat(0x1d1d1d), alu = mat(0xb4b8bc), blue = mat(0x1e63c8);
    hs.add(box(1.0, 0.55, 0.55, white, 0, 0, -0.275));        // visière (regarde vers le nord, +y)
    hs.add(box(0.9, 0.04, 0.42, black, 0, 0.29, -0.21));       // face avant
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 32, Math.PI), black);
    strap.rotation.z = Math.PI; strap.position.y = -0.2; hs.add(strap);
    hs.add(box(1.4, 0.12, 0.06, alu, 0, 0.12, 0.28));          // barre de fixation
    [-0.62, 0.62].forEach((x) => { const a = cylZ(0.16, 0.26, black, 20); a.position.set(x, 0.12, 0.34); hs.add(a); });
    hs.add(box(0.26, 0.16, 0.12, blue, -0.3, 0.12, 0.34));     // récepteur GNSS

    // GeoPose : position + orientation du casque (axes est / nord / haut)
    const o = new THREE.Vector3(0, 0, HZ);
    [[1, 0, 0, 0xe53935], [0, 1, 0, 0x43a047], [0, 0, 1, 0x1e88e5]].forEach(([x, y, z, c]) =>
        g.add(new THREE.ArrowHelper(new THREE.Vector3(x, y, z), o, 160, c, 30, 16)));

    // contenu virtuel ancré par la GeoPose, et le champ de vision du casque
    const VY = 420, vb = new THREE.Group(); vb.position.y = VY; g.add(vb);
    const cyan = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.22, depthWrite: false });
    vb.add(box(150, 90, 170, cyan));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(150, 90, 170)), lineMat(0x00e5ff));
    edges.position.z = 85; vb.add(edges);
    const eye = new THREE.Vector3(0, 0.3 * K, HZ), near = VY - 45;
    const corners = [[-110, 0], [110, 0], [110, 200], [-110, 200]].map(([x, z]) => new THREE.Vector3(x, near, z));
    const fr = [];
    corners.forEach((c, i) => fr.push(eye, c, c, corners[(i + 1) % 4]));
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(fr), lineMat(0x00e5ff, 0.55)));

    // satellites GNSS reliés aux deux antennes
    const sat = () => {
        const s = new THREE.Group();
        s.add(box(14, 14, 14, alu, 0, 0, -7));
        [-1, 1].forEach((k) => s.add(box(30, 2, 12, blue, k * 24, 0, -6)));
        return s;
    };
    const ant = [-0.62, 0.62].map((x) => new THREE.Vector3(x * K, 0.12 * K, HZ + 0.47 * K));
    const sl = [];
    [[-260, -140, 470], [230, -220, 500], [280, 200, 460], [-200, 260, 520]].forEach(([x, y, z]) => {
        const s = sat(); s.position.set(x, y, z); g.add(s);
        ant.forEach((a) => sl.push(new THREE.Vector3(x, y, z), a));
    });
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(sl), lineMat(0xffffff, 0.3)));

    const notes = [
        { pos: [0, 0, 600], text: 'STAG: outdoor AR with GeoPose', cls: 'title' },
        { pos: [0, -40, HZ - 95], text: 'Meta Quest 3 + 2 RTK GNSS antennas' },
        { pos: [185, 0, HZ + 30], text: 'GeoPose' },
        { pos: [0, VY, 200], text: 'virtual 3D content' },
        { pos: [0, 0, 545], text: 'GNSS satellites' },
    ];
    return { group: g, notes, update: null, size: 620 };
}

// ---- Intégration de documents multimédias dans une maquette 3D de ville (3DGeoInfo 2022) ------
function docTexture(kind) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 200;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.strokeStyle = '#1772d0'; x.lineWidth = 10;
    x.beginPath(); x.roundRect(6, 6, 244, 188, 18); x.fill(); x.stroke();
    x.fillStyle = '#dfe8f3'; x.fillRect(28, 28, 200, 112);
    x.fillStyle = '#1772d0';
    if (kind === 'video') {
        x.beginPath(); x.moveTo(110, 58); x.lineTo(110, 110); x.lineTo(152, 84); x.closePath(); x.fill();
    } else if (kind === 'photo') {
        x.beginPath(); x.moveTo(40, 132); x.lineTo(96, 66); x.lineTo(136, 112); x.lineTo(162, 86); x.lineTo(216, 132); x.closePath(); x.fill();
        x.beginPath(); x.arc(186, 56, 14, 0, 2 * Math.PI); x.fill();
    } else {
        for (let i = 0; i < 5; i++) x.fillRect(44, 44 + i * 18, i === 4 ? 100 : 168, 8);
    }
    x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#222';
    x.fillText(kind, 128, 178);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
}
export function buildMultimedia() {
    const g = new THREE.Group(), W = 700, D = 480;
    g.add(box(W, D, 8, mat(0xefe9dc)));
    // rivière en méandre
    const river = new THREE.Shape(), N = 40;
    const rx = (t) => -W / 2 + t * W, ry = (t) => Math.sin(t * Math.PI * 2.2) * 110 - 20;
    river.moveTo(rx(0), ry(0) - 22);
    for (let i = 1; i <= N; i++) river.lineTo(rx(i / N), ry(i / N) - 22);
    for (let i = N; i >= 0; i--) river.lineTo(rx(i / N), ry(i / N) + 22);
    const rg = new THREE.ShapeGeometry(river); rg.translate(0, 0, 8.5);
    g.add(new THREE.Mesh(rg, mat(0x8ec5ea)));
    // bâtiments (tirage pseudo-aléatoire fixe), hors de la rivière
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const bm = mat(0xffffff), bm2 = mat(0xdadde2);
    for (let i = 0; i < 260; i++) {
        const x = (rnd() - 0.5) * (W - 40), y = (rnd() - 0.5) * (D - 40);
        if (Math.abs(y - ry((x + W / 2) / W)) < 45) continue;
        const w = 10 + rnd() * 22, d = 10 + rnd() * 22, h = 6 + rnd() * rnd() * 45;
        g.add(box(w, d, h, rnd() < 0.7 ? bm : bm2, x, y, 8));
    }
    // documents posés dans la ville : une vignette au-dessus de leur lieu
    const pin = mat(0xe53935), stems = [];
    [['video', -200, 120, 150], ['photo', 90, -150, 170], ['text', 230, 140, 140], ['video', -60, -40, 190]].forEach(([k, x, y, z]) => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: docTexture(k) }));
        sp.scale.set(96, 75, 1); sp.position.set(x, y, z); g.add(sp);
        const m = new THREE.Mesh(new THREE.SphereGeometry(7, 14, 10), pin); m.position.set(x, y, 14); g.add(m);
        stems.push(new THREE.Vector3(x, y, 14), new THREE.Vector3(x, y, z - 38));
    });
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(stems), lineMat(0xffffff, 0.9)));
    const notes = [{ pos: [0, 0, 280], text: 'Multimedia documents in a 3D city model', cls: 'title' }];
    return { group: g, notes, update: null, size: 260 };
}

// ---- Maquette Lego des Gratte-Ciel, à partir de la BD TOPO voxelisée -----------------------
export function buildLego(d) {
    const g = new THREE.Group(), s = d.studM, bh = d.brickM;
    const W = d.cols * s, D = d.rows * s;
    const plate = box(W + 2 * s, D + 2 * s, bh / 3, mat(0x237841), 0, 0, -bh / 3);
    g.add(plate);
    const alpha = '0123456789abcdefghijklmnopqrstuvwxyz';
    let n = 0, tops = 0;
    d.heights.forEach((row) => { for (const ch of row) { const h = alpha.indexOf(ch); n += h; if (h) tops++; } });
    const bricks = new THREE.InstancedMesh(new THREE.BoxGeometry(s * 0.96, s * 0.96, bh * 0.94), new THREE.MeshLambertMaterial(), n);
    const studGeo = new THREE.CylinderGeometry(s * 0.3, s * 0.3, bh * 0.17, 10);
    studGeo.rotateX(Math.PI / 2);
    const studs = new THREE.InstancedMesh(studGeo, new THREE.MeshLambertMaterial(), tops);
    const M = new THREE.Matrix4(), C = new THREE.Color();
    const palette = { 1: [0xe4cd9e, 0xd9bb7b], 2: [0xc8ccd0, 0xa0a5a9] };   // logement : beige ; autres : gris clair
    let bi = 0, si = 0;
    d.heights.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
            const h = alpha.indexOf(row[c]);
            if (!h) continue;
            const x = (c + 0.5 - d.cols / 2) * s, y = (r + 0.5 - d.rows / 2) * s;
            const pal = palette[d.usage[r][c]] || palette[2];
            for (let k = 0; k < h; k++) {
                M.makeTranslation(x, y, (k + 0.5) * bh);
                bricks.setMatrixAt(bi, M);
                bricks.setColorAt(bi, C.setHex(pal[k % 2]));
                bi++;
            }
            M.makeTranslation(x, y, h * bh + bh * 0.085);
            studs.setMatrixAt(si, M);
            studs.setColorAt(si, C.setHex(pal[(h - 1) % 2]));
            si++;
        }
    });
    g.add(bricks, studs);
    const notes = [{ pos: [0, d.rows * s / 2, 110], text: 'Lego twin of the Gratte-Ciel', cls: 'title' }];
    return { group: g, notes, update: null, size: 60 };
}
