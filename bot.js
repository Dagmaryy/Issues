// BOT.JS — Simulación Monte Carlo de CUBEFLICT v3
// Coherente con el juego actual (decay 0.4, EE.UU.<38, UK<28, efectos suavizados)
// Uso: node bot.js [N] [random|smart|both]

const N = parseInt(process.argv[2]) || 500;
const MODO_ARG = (process.argv[3] || "smart").toLowerCase();
const MODO = MODO_ARG === "random" ? "random" : MODO_ARG === "both" ? "both" : "smart";

let MODO_ACTIVO = MODO;

const CONFIG = {
    FILAS: 6, COLUMNAS: 6, TURNOS_TOTALES: 15,
    EFECTO_TRATADO: { diplomacia: 2, economia: -2, opinion: 0, conflicto: -2 },
    EFECTO_COMERCIO: { diplomacia: 0, economia: 3.5, opinion: -1.5, conflicto: 0 },
    EFECTO_PRENSA: { diplomacia: 0, economia: -2, opinion: 1.5, conflicto: 0 },
    EFECTO_MILITAR: { diplomacia: 0, economia: 2, opinion: 0, conflicto: 2 },
    STAT_INICIAL: 50, STAT_MIN: 0, STAT_MAX: 100,
    UMBRAL_CONFLICTO_ROJO: 75,
    UMBRAL_DIPLOMACIA_VICTORIA: 75,
    REQUISITO_OPINION_VICTORIA: 30,
    UMBRAL_DERROTA_ECONOMIA: 10,
    UMBRAL_DERROTA_OPINION: 15,
    CONFLICTO_UMBRAL_MODERADO: 40,
    CONFLICTO_UMBRAL_SEVERO: 60,
    OPINION_PRESION_CONFLICTO_MODERADA: 0.2,
    OPINION_PRESION_CONFLICTO_SEVERA: 0.4,
    ECONOMIA_UMBRAL_MODERADO: 50,
    ECONOMIA_UMBRAL_SEVERO: 30,
    OPINION_PRESION_ECONOMIA_MODERADA: 0.3,
    OPINION_PRESION_ECONOMIA_SEVERA: 0.6,
    RACHA_MINIMO_SUMA: 4,
    RACHA_BONUS_UMBRAL: 10,
    MULT_BASE: 1.0, MULT_PASO: 0.25, MULT_CAP: 1.9,
    MULT_CAP_SIN_RUSIA: 1.3,
    MULTIPLICADOR_FASE_FINAL: 2,
    MINIMO_GRUPO: 3,
    DECAIMIENTO_CONFLICTO: 0.4,
    PROB_PLANTAR_4: 0.5,
    UMBRAL_CHINA_DIPLOMACIA: 60,
    UMBRAL_PARALISIS: 4
};

const TIPOS_CUBO = ["tratado", "comercio", "prensa", "militar"];
const TURNOS_DECISION = [4, 8, 12, 15];
const TURNOS_VETO = [5, 9, 13];
const TURNOS_RECONCILIACION = [9, 13];

const DECISIONES_POOL = {
    4: [
        { opciones: [
            { titulo: "Observadores militares", stat: "diplomacia", efecto: { diplomacia: 3, conflicto: -2 }, bonus: { stat: "diplomacia", valor: 10 }, penalty: { stat: "conflicto", valor: 30 } },
            { titulo: "Ignorar movilización", stat: "conflicto", efecto: { conflicto: 10, opinion: -5 }, bonus: { stat: "conflicto", valor: 15 }, penalty: { stat: "diplomacia", valor: -15 } }
        ] },
        { opciones: [
            { titulo: "Desmentir información", stat: "opinion", efecto: { opinion: 5, conflicto: -2 }, bonus: { stat: "opinion", valor: 10 }, penalty: { stat: "diplomacia", valor: -10 } },
            { titulo: "Mostrar pruebas", stat: "diplomacia", efecto: { diplomacia: 5, conflicto: 7 }, bonus: { stat: "diplomacia", valor: 15 }, penalty: { stat: "conflicto", valor: 20 } }
        ] },
        { opciones: [
            { titulo: "Reunión secreta", stat: "diplomacia", efecto: { diplomacia: 5, opinion: -5 }, bonus: { stat: "diplomacia", valor: 10 }, penalty: { stat: "opinion", valor: -10 } },
            { titulo: "Rechazar y hacer público", stat: "opinion", efecto: { opinion: 8, conflicto: 7 }, bonus: { stat: "opinion", valor: 10 }, penalty: { stat: "conflicto", valor: 15 } }
        ] },
        { opciones: [
            { titulo: "Enviar fragata", stat: "conflicto", efecto: { conflicto: 7, opinion: 5 }, bonus: { stat: "conflicto", valor: 10 }, penalty: { stat: "diplomacia", valor: -15 } },
            { titulo: "Protesta formal", stat: "diplomacia", efecto: { diplomacia: 4, conflicto: -2 }, bonus: { stat: "diplomacia", valor: 10 }, penalty: { stat: "opinion", valor: -10 } }
        ] }
    ],
    8: [
        { opciones: [
            { titulo: "Condenar ataque", stat: "opinion", efecto: { opinion: 5, conflicto: -2 }, bonus: { stat: "opinion", valor: 10 }, penalty: { stat: "diplomacia", valor: -15 } },
            { titulo: "Proponer embargo", stat: "diplomacia", efecto: { diplomacia: 3, economia: -10 }, requisito: { stat: "economia", valor: 40 }, bonus: { stat: "diplomacia", valor: 10 }, penalty: { stat: "economia", valor: -15 } }
        ] },
        { opciones: [
            { titulo: "Corredores humanitarios", stat: "opinion", efecto: { opinion: 8, economia: -8 }, bonus: { stat: "opinion", valor: 15 }, penalty: { stat: "economia", valor: -10 } },
            { titulo: "Militarizar zona", stat: "conflicto", efecto: { conflicto: 8, diplomacia: 3 }, bonus: { stat: "conflicto", valor: 15 }, penalty: { stat: "diplomacia", valor: -10 } }
        ] },
        { opciones: [
            { titulo: "Respuesta diplomática", stat: "diplomacia", efecto: { diplomacia: 5, opinion: -2 }, bonus: { stat: "diplomacia", valor: 15 }, penalty: { stat: "conflicto", valor: 10 } },
            { titulo: "Contraataque cibernético", stat: "conflicto", efecto: { conflicto: 10, economia: 5 }, bonus: { stat: "conflicto", valor: 20 }, penalty: { stat: "diplomacia", valor: -15 } }
        ] },
        { opciones: [
            { titulo: "Filtrar pruebas prensa", stat: "opinion", efecto: { opinion: 12, diplomacia: 3 }, bonus: { stat: "opinion", valor: 20 }, penalty: { stat: "conflicto", valor: 15 } },
            { titulo: "Presión diplomática", stat: "diplomacia", efecto: { diplomacia: 4, conflicto: -2 }, bonus: { stat: "diplomacia", valor: 10 }, penalty: { stat: "opinion", valor: -10 } }
        ] }
    ],
    12: [
        { opciones: [
            { titulo: "Sanciones económicas", stat: "diplomacia", efecto: { diplomacia: 3, economia: -10 }, requisito: { stat: "economia", valor: 40 }, bonus: { stat: "diplomacia", valor: 15 }, penalty: { stat: "opinion", valor: -15 } },
            { titulo: "Apoyo militar aliado", stat: "conflicto", efecto: { conflicto: 10, economia: 5 }, bonus: { stat: "conflicto", valor: 15 }, penalty: { stat: "diplomacia", valor: -15 } }
        ] },
        { opciones: [
            { titulo: "Cascos azules", stat: "diplomacia", efecto: { diplomacia: 8, economia: -15 }, requisito: { stat: "economia", valor: 60 }, bonus: { stat: "diplomacia", valor: 20 }, penalty: { stat: "economia", valor: -20 } },
            { titulo: "Rechazar intervención", stat: "conflicto", efecto: { conflicto: 10, opinion: -5 }, bonus: { stat: "conflicto", valor: 15 }, penalty: { stat: "opinion", valor: -15 } }
        ] },
        { opciones: [
            { titulo: "Aceptar mediación", stat: "diplomacia", efecto: { diplomacia: 7, conflicto: -5 }, bonus: { stat: "diplomacia", valor: 15 }, penalty: { stat: "opinion", valor: -15 } },
            { titulo: "Rechazar condiciones", stat: "opinion", efecto: { conflicto: 8, opinion: 5 }, bonus: { stat: "opinion", valor: 15 }, penalty: { stat: "conflicto", valor: 15 } }
        ] },
        { opciones: [
            { titulo: "Liderar coalición", stat: "diplomacia", efecto: { diplomacia: 10, opinion: 5 }, bonus: { stat: "diplomacia", valor: 20 }, penalty: { stat: "conflicto", valor: 15 } },
            { titulo: "Perfil bajo", stat: "opinion", efecto: { opinion: 5, conflicto: -2 }, bonus: { stat: "opinion", valor: 10 }, penalty: { stat: "diplomacia", valor: -10 } }
        ] }
    ],
    15: [
        { opciones: [
            { titulo: "Firmar acuerdo de paz", stat: "diplomacia", efecto: { diplomacia: 10, conflicto: -10 }, bonus: { stat: "diplomacia", valor: 15 }, penalty: { stat: "conflicto", valor: 25 } },
            { titulo: "Romper negociaciones", stat: "conflicto", efecto: { conflicto: 12, diplomacia: -10 }, bonus: { stat: "conflicto", valor: 20 }, penalty: { stat: "opinion", valor: -20 } }
        ] },
        { opciones: [
            { titulo: "Alto el fuego", stat: "diplomacia", efecto: { conflicto: -20, diplomacia: 7 }, bonus: { stat: "diplomacia", valor: 20 }, penalty: { stat: "opinion", valor: -15 } },
            { titulo: "Aprovechar debilidad", stat: "conflicto", efecto: { conflicto: 10, diplomacia: -10 }, bonus: { stat: "conflicto", valor: 25 }, penalty: { stat: "diplomacia", valor: -25 } }
        ] },
        { opciones: [
            { titulo: "Conferencia de paz", stat: "diplomacia", efecto: { diplomacia: 8, conflicto: -8 }, bonus: { stat: "diplomacia", valor: 15 }, penalty: { stat: "opinion", valor: -10 } },
            { titulo: "Boicotear", stat: "conflicto", efecto: { conflicto: 10, opinion: 5 }, bonus: { stat: "conflicto", valor: 15 }, penalty: { stat: "diplomacia", valor: -20 } }
        ] },
        { opciones: [
            { titulo: "Resolución de consenso", stat: "diplomacia", efecto: { diplomacia: 12, conflicto: -15 }, bonus: { stat: "diplomacia", valor: 25 }, penalty: { stat: "opinion", valor: -10 } },
            { titulo: "Firmeza", stat: "conflicto", efecto: { conflicto: 7, diplomacia: 3 }, bonus: { stat: "conflicto", valor: 15 }, penalty: { stat: "diplomacia", valor: -15 } }
        ] }
    ]
};

const aleatorio = (n) => Math.floor(Math.random() * n);
const elegir = (arr) => arr[aleatorio(arr.length)];
const limitar = (v, min, max) => Math.max(min, Math.min(max, v));

function escalar(obj, m) {
    const out = {};
    Object.keys(obj).forEach(k => { out[k] = obj[k] * m; });
    return out;
}

function percentile(arr, p) {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const idx = (s.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return s[lo];
    return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

function multiplicador(cantidad, apoyoP5) {
    if (cantidad < 4) return 1.0;
    let m = Math.min(CONFIG.MULT_BASE + (cantidad - 3) * CONFIG.MULT_PASO, CONFIG.MULT_CAP);
    if (apoyoP5 && !apoyoP5.rusia) m = Math.min(m, CONFIG.MULT_CAP_SIN_RUSIA);
    return m;
}

function calcularEfectos(tipo, apoyoP5) {
    const e = { ...CONFIG["EFECTO_" + tipo.toUpperCase()] };
    if (!apoyoP5.china && e.diplomacia > 0) e.diplomacia *= 0.5;
    if (!apoyoP5.reino && e.economia > 0) e.economia /= 2;
    if (!apoyoP5.eeuu && e.conflicto > 0) e.conflicto += 5;
    if (!apoyoP5.francia && e.opinion > 0) e.opinion /= 2;
    return e;
}

function hayCadenaDe(t, min) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let f = 0; f < CONFIG.FILAS; f++) {
        for (let c = 0; c < CONFIG.COLUMNAS; c++) {
            const ti = t[f][c];
            if (!ti) continue;
            for (const [df, dc] of dirs) {
                let n = 1;
                for (let p = 1; p < min; p++) {
                    const ff = f + df * p, cc = c + dc * p;
                    if (ff < 0 || ff >= CONFIG.FILAS || cc < 0 || cc >= CONFIG.COLUMNAS) break;
                    if (t[ff][cc] !== ti) break;
                    n++;
                }
                if (n >= min) return true;
            }
        }
    }
    return false;
}
function hayGrupoValido(t) { return hayCadenaDe(t, CONFIG.MINIMO_GRUPO); }

function plantarGrupo(t, longitudMinima) {
    const min = longitudMinima || CONFIG.MINIMO_GRUPO;
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    const tipo = elegir(TIPOS_CUBO);
    for (let i = 0; i < 80; i++) {
        const [df, dc] = elegir(dirs);
        const f = aleatorio(CONFIG.FILAS), c = aleatorio(CONFIG.COLUMNAS);
        const celdas = [];
        let cabe = true;
        for (let p = 0; p < min; p++) {
            const ff = f + df * p, cc = c + dc * p;
            if (ff < 0 || ff >= CONFIG.FILAS || cc < 0 || cc >= CONFIG.COLUMNAS) { cabe = false; break; }
            celdas.push([ff, cc]);
        }
        if (!cabe) continue;
        celdas.forEach(([ff, cc]) => t[ff][cc] = tipo);
        return;
    }
    const tipoFb = elegir(TIPOS_CUBO);
    for (let c = 0; c < min; c++) t[0][c] = tipoFb;
}

function crearTablero() {
    const t = [];
    for (let f = 0; f < CONFIG.FILAS; f++) {
        const fila = [];
        for (let c = 0; c < CONFIG.COLUMNAS; c++) fila.push(elegir(TIPOS_CUBO));
        t.push(fila);
    }
    if (!hayCadenaDe(t, 3)) plantarGrupo(t, 3);
    if (!hayCadenaDe(t, 4)) plantarGrupo(t, 4);
    return t;
}

function encontrarGrupos(t) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    const min = CONFIG.MINIMO_GRUPO;
    const grupos = [];
    for (let f = 0; f < CONFIG.FILAS; f++) {
        for (let c = 0; c < CONFIG.COLUMNAS; c++) {
            const ti = t[f][c];
            if (!ti) continue;
            for (const [df, dc] of dirs) {
                const celdas = [{ fila: f, col: c }];
                for (let p = 1; p < 8; p++) {
                    const ff = f + df * p, cc = c + dc * p;
                    if (ff < 0 || ff >= CONFIG.FILAS || cc < 0 || cc >= CONFIG.COLUMNAS) break;
                    if (t[ff][cc] !== ti) break;
                    celdas.push({ fila: ff, col: cc });
                }
                if (celdas.length >= min) {
                    for (let k = min; k <= celdas.length; k++) grupos.push(celdas.slice(0, k));
                }
            }
        }
    }
    return grupos;
}

function aplicarGravedad(t) {
    for (let c = 0; c < CONFIG.COLUMNAS; c++) {
        const viv = [];
        for (let f = CONFIG.FILAS - 1; f >= 0; f--) {
            if (t[f][c] !== null) viv.push(t[f][c]);
        }
        for (let f = CONFIG.FILAS - 1; f >= 0; f--) {
            const idx = CONFIG.FILAS - 1 - f;
            t[f][c] = idx < viv.length ? viv[idx] : elegir(TIPOS_CUBO);
        }
    }
}

function scoreGrupo(grupo, tipo, estado) {
    const efectos = calcularEfectos(tipo, estado.apoyoP5);
    const mult = multiplicador(grupo.length, estado.apoyoP5);
    const n = grupo.length;
    const d = efectos.diplomacia * n * mult;
    const e = efectos.economia * n * mult;
    const o = efectos.opinion * n * mult;
    const c = efectos.conflicto * n * mult;
    const stats = estado.estadisticas;
    const newC = stats.conflicto + c;
    const newE = stats.economia + e;
    const newO = stats.opinion + o;
    const newD = stats.diplomacia + d;
    let penalty = 0;
    if (newC >= 65) penalty += 1000;
    if (newE <= 15) penalty += 800;
    if (newO <= 20) penalty += 800;
    return newD * 3 + newE * 0.8 + newO * 0.8 - newC * 4 - penalty;
}

function elegirGrupo(grupos, estado) {
    if (MODO_ACTIVO === "random") return elegir(grupos);
    if (Math.random() < 0.15) return elegir(grupos);
    let mejor = grupos[0];
    let mejorScore = -Infinity;
    grupos.forEach(g => {
        const tipo = estado.tablero[g[0].fila][g[0].col];
        const score = scoreGrupo(g, tipo, estado);
        if (score > mejorScore) { mejorScore = score; mejor = g; }
    });
    return mejor;
}

function elegirOpcion(opciones, estado) {
    if (MODO_ACTIVO === "random") return elegir(opciones);
    if (Math.random() < 0.15) return elegir(opciones);
    let mejor = opciones[0];
    let mejorScore = -Infinity;
    opciones.forEach(op => {
        const mult = estado.turno === 15 ? CONFIG.MULTIPLICADOR_FASE_FINAL : 1;
        const statValor = estado.estadisticas[op.stat] || 50;
        const prob = limitar(30 + statValor / 2, 30, 80) / 100;
        const ef = op.efecto;
        const b = op.bonus;
        const p = op.penalty;
        let score = 0;
        score += (ef.diplomacia || 0) * 3 * mult;
        score += (ef.economia || 0) * 0.8 * mult;
        score += (ef.opinion || 0) * 0.8 * mult;
        score -= (ef.conflicto || 0) * 4 * mult;
        score += prob * (b.stat === "diplomacia" ? b.valor * 3 : b.stat === "conflicto" ? -b.valor * 4 : b.valor * 0.5) * mult;
        score += (1 - prob) * (p.stat === "diplomacia" ? p.valor * 3 : p.stat === "conflicto" ? -p.valor * 4 : p.valor * 0.5) * mult;
        if (score > mejorScore) { mejorScore = score; mejor = op; }
    });
    return mejor;
}

function simularPartida() {
    const estado = {
        turno: 1, rachaGlobal: 0,
        estadisticas: {
            diplomacia: CONFIG.STAT_INICIAL,
            economia: CONFIG.STAT_INICIAL,
            opinion: CONFIG.STAT_INICIAL,
            conflicto: CONFIG.STAT_INICIAL
        },
        apoyoP5: { eeuu: true, rusia: true, china: true, francia: true, reino: true },
        decisionesPartida: {}, tablero: [],
        finDeJuego: false, motivoFin: null,
        historial: [],
        cadenas: { tratado: 0, comercio: 0, prensa: 0, militar: 0 },
        cadenasPorTamano: { 3: 0, 4: 0, 5: 0, 6: 0 },
        decisiones: { 4: { total: 0, exitos: 0 }, 8: { total: 0, exitos: 0 }, 12: { total: 0, exitos: 0 }, 15: { total: 0, exitos: 0 } },
        conflictoMax: CONFIG.STAT_INICIAL,
        sumaConflicto: CONFIG.STAT_INICIAL,
        turnosContados: 1,
        supero60: false,
        reconciliaciones: 0
    };

    [4, 8, 12, 15].forEach(t => { estado.decisionesPartida[t] = elegir(DECISIONES_POOL[t]); });
    estado.tablero = crearTablero();

    function actualizarTension() {
        const c = estado.estadisticas.conflicto;
        if (c > estado.conflictoMax) estado.conflictoMax = c;
        if (c >= 60) estado.supero60 = true;
    }

    function aplicarCambios(cambios) {
        Object.keys(cambios).forEach(k => {
            if (k in estado.estadisticas) {
                estado.estadisticas[k] = limitar(estado.estadisticas[k] + cambios[k], CONFIG.STAT_MIN, CONFIG.STAT_MAX);
            }
        });
        actualizarTension();
    }

    function comprobarGameOver() {
        if (estado.finDeJuego) return true;
        const s = estado.estadisticas;
        const sinApoyo = Object.keys(estado.apoyoP5).filter(k => !estado.apoyoP5[k]).length;
        const derrota = s.conflicto >= CONFIG.UMBRAL_CONFLICTO_ROJO
        || s.economia <= CONFIG.UMBRAL_DERROTA_ECONOMIA
        || s.opinion <= CONFIG.UMBRAL_DERROTA_OPINION
        || sinApoyo >= CONFIG.UMBRAL_PARALISIS;
        if (!derrota) return false;
        estado.finDeJuego = true;
        if (s.conflicto >= CONFIG.UMBRAL_CONFLICTO_ROJO && s.diplomacia < 40) estado.motivoFin = "guerra";
        else if (s.conflicto >= CONFIG.UMBRAL_CONFLICTO_ROJO) estado.motivoFin = "guerra_accidente";
        else if (s.economia <= CONFIG.UMBRAL_DERROTA_ECONOMIA) estado.motivoFin = "economia";
        else if (s.opinion <= CONFIG.UMBRAL_DERROTA_OPINION) estado.motivoFin = "opinion";
        else estado.motivoFin = "paralisis";
        return true;
    }

    for (estado.turno = 1; estado.turno <= CONFIG.TURNOS_TOTALES; estado.turno++) {
        if (estado.finDeJuego) break;

        if (estado.turno > 1) {
            estado.estadisticas.conflicto = limitar(
                estado.estadisticas.conflicto - CONFIG.DECAIMIENTO_CONFLICTO,
                CONFIG.STAT_MIN, CONFIG.STAT_MAX
            );

            let presionOpinion = 0;
            if (estado.estadisticas.conflicto >= CONFIG.CONFLICTO_UMBRAL_SEVERO) {
                presionOpinion += CONFIG.OPINION_PRESION_CONFLICTO_SEVERA;
            } else if (estado.estadisticas.conflicto >= CONFIG.CONFLICTO_UMBRAL_MODERADO) {
                presionOpinion += CONFIG.OPINION_PRESION_CONFLICTO_MODERADA;
            }
            if (estado.estadisticas.economia < CONFIG.ECONOMIA_UMBRAL_SEVERO) {
                presionOpinion += CONFIG.OPINION_PRESION_ECONOMIA_SEVERA;
            } else if (estado.estadisticas.economia < CONFIG.ECONOMIA_UMBRAL_MODERADO) {
                presionOpinion += CONFIG.OPINION_PRESION_ECONOMIA_MODERADA;
            }
            if (presionOpinion > 0) {
                estado.estadisticas.opinion = limitar(
                    estado.estadisticas.opinion - presionOpinion,
                    CONFIG.STAT_MIN, CONFIG.STAT_MAX
                );
            }

            if (comprobarGameOver()) break;
        }

        let grupos = encontrarGrupos(estado.tablero);
        if (grupos.length === 0) {
            plantarGrupo(estado.tablero);
            grupos = encontrarGrupos(estado.tablero);
        }

        let tipo = null, n = 0, mult = 1;
        if (grupos.length > 0) {
            const grupo = elegirGrupo(grupos, estado);
            tipo = estado.tablero[grupo[0].fila][grupo[0].col];
            n = grupo.length;
            const efectos = calcularEfectos(tipo, estado.apoyoP5);
            mult = multiplicador(n, estado.apoyoP5);

            if (n >= CONFIG.RACHA_MINIMO_SUMA) estado.rachaGlobal += n;
            else estado.rachaGlobal = 0;

            estado.cadenas[tipo] = (estado.cadenas[tipo] || 0) + 1;
            estado.cadenasPorTamano[n] = (estado.cadenasPorTamano[n] || 0) + 1;

            grupo.forEach(({ fila, col }) => { estado.tablero[fila][col] = null; });

            const cambios = {};
            Object.keys(efectos).forEach(k => {
                if (efectos[k] !== 0) cambios[k] = efectos[k] * n * mult;
            });
                aplicarCambios(cambios);

                if (comprobarGameOver()) break;

                aplicarGravedad(estado.tablero);
            if (!hayCadenaDe(estado.tablero, 3)) plantarGrupo(estado.tablero, 3);
            if (!hayCadenaDe(estado.tablero, 4) && Math.random() < CONFIG.PROB_PLANTAR_4) {
                plantarGrupo(estado.tablero, 4);
            }
        }

        if (TURNOS_DECISION.includes(estado.turno)) {
            const d = estado.decisionesPartida[estado.turno];
            if (d) {
                const multDec = estado.turno === 15 ? CONFIG.MULTIPLICADOR_FASE_FINAL : 1;
                const opciones = d.opciones.filter(o =>
                !(o.requisito && estado.estadisticas[o.requisito.stat] < o.requisito.valor)
                );
                if (opciones.length > 0) {
                    const op = elegirOpcion(opciones, estado);
                    const statValor = estado.estadisticas[op.stat] || 50;
                    const prob = limitar(30 + statValor / 2, 30, 80) / 100;

                    aplicarCambios(escalar(op.efecto, multDec));
                    const exito = Math.random() < prob;
                    if (exito) aplicarCambios(escalar({ [op.bonus.stat]: op.bonus.valor }, multDec));
                    else aplicarCambios(escalar({ [op.penalty.stat]: op.penalty.valor }, multDec));

                    estado.decisiones[estado.turno].total++;
                    if (exito) estado.decisiones[estado.turno].exitos++;

                    if (comprobarGameOver()) break;
                }
            }
        }

        if (TURNOS_VETO.includes(estado.turno)) {
            const s = estado.estadisticas;
            const candidatos = [];
            if (estado.turno === 5) {
                if (s.conflicto < 38 && estado.apoyoP5.eeuu) candidatos.push("eeuu");
                if (s.conflicto > 50 && estado.apoyoP5.rusia) candidatos.push("rusia");
            }
            if (estado.turno === 9) {
                if (s.diplomacia < CONFIG.UMBRAL_CHINA_DIPLOMACIA && estado.apoyoP5.china) candidatos.push("china");
                if (s.economia < 28 && estado.apoyoP5.reino) candidatos.push("reino");
            }
            if (estado.turno === 13) {
                if (s.opinion < 35 && estado.apoyoP5.francia) candidatos.push("francia");
            }
            if (candidatos.length > 0) {
                if (estado.rachaGlobal >= CONFIG.RACHA_BONUS_UMBRAL) {
                    estado.rachaGlobal = 0;
                } else {
                    candidatos.forEach(k => { estado.apoyoP5[k] = false; });
                    if (comprobarGameOver()) break;
                }
            }
        }

        if (TURNOS_RECONCILIACION.includes(estado.turno)) {
            const perdidos = Object.keys(estado.apoyoP5).filter(k => !estado.apoyoP5[k]);
            if (perdidos.length > 0) {
                const pais = perdidos[0];
                let acepta;
                if (MODO_ACTIVO === "random") {
                    acepta = Math.random() < 0.5;
                } else {
                    const ecoSegura = estado.estadisticas.economia - 15 > CONFIG.UMBRAL_DERROTA_ECONOMIA + 5;
                    const opiSegura = estado.estadisticas.opinion - 5 > CONFIG.UMBRAL_DERROTA_OPINION + 5;
                    acepta = ecoSegura && opiSegura;
                }
                if (acepta) {
                    aplicarCambios({ economia: -15, opinion: -5 });
                    estado.apoyoP5[pais] = true;
                    estado.reconciliaciones++;
                    if (comprobarGameOver()) break;
                }
            }
        }

        const cFin = estado.estadisticas.conflicto;
        if (cFin > estado.conflictoMax) estado.conflictoMax = cFin;
        if (cFin >= 60) estado.supero60 = true;
        estado.sumaConflicto += cFin;
        estado.turnosContados++;

        estado.historial.push({
            turno: estado.turno,
            tipo, cantidad: n, mult,
            stats: { ...estado.estadisticas }
        });
    }

    if (!estado.finDeJuego) {
        const s = estado.estadisticas;
        if (s.diplomacia >= CONFIG.UMBRAL_DIPLOMACIA_VICTORIA
            && s.conflicto < 20
            && s.opinion >= CONFIG.REQUISITO_OPINION_VICTORIA) {
            estado.motivoFin = "paz_duradera";
            } else if (s.diplomacia >= 80 && s.conflicto < 25) {
                estado.motivoFin = "paz_presion";
            } else if (s.diplomacia >= 70 && s.conflicto < 40) {
                estado.motivoFin = "paz_fragil";
            } else {
                estado.motivoFin = "tensiones";
            }
            estado.finDeJuego = true;
    }

    estado.conflictoMedio = estado.sumaConflicto / estado.turnosContados;
    return estado;
}

function correrSimulacion(n, modo) {
    const res = {
        victorias: 0, derrotas: 0, neutros: 0,
        motivos: {}, turnoFin: {}, p5Vetados: {},
        statsFin: { diplomacia: 0, economia: 0, opinion: 0, conflicto: 0 },
        statsArr: { diplomacia: [], economia: [], opinion: [], conflicto: [] },
        cadenas: { tratado: 0, comercio: 0, prensa: 0, militar: 0 },
        cadenasPorTamano: { 3: 0, 4: 0, 5: 0, 6: 0 },
        decisiones: { 4: { total: 0, exitos: 0 }, 8: { total: 0, exitos: 0 }, 12: { total: 0, exitos: 0 }, 15: { total: 0, exitos: 0 } },
        conflictoMax: [], conflictoMedio: [], supero60: 0,
        reconciliaciones: 0
    };

    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
        MODO_ACTIVO = (modo === "both") ? (i % 2 === 0 ? "smart" : "random") : modo;
        const r = simularPartida();

        if (r.motivoFin.startsWith("paz_")) res.victorias++;
        else if (r.motivoFin === "tensiones") res.neutros++;
        else res.derrotas++;

        res.motivos[r.motivoFin] = (res.motivos[r.motivoFin] || 0) + 1;

        const turnoBucket = Math.min(r.turno, CONFIG.TURNOS_TOTALES);
        res.turnoFin[turnoBucket] = (res.turnoFin[turnoBucket] || 0) + 1;

        Object.keys(r.apoyoP5).forEach(k => {
            if (!r.apoyoP5[k]) res.p5Vetados[k] = (res.p5Vetados[k] || 0) + 1;
        });

            Object.keys(res.statsFin).forEach(k => {
                res.statsFin[k] += r.estadisticas[k];
                res.statsArr[k].push(r.estadisticas[k]);
            });

            Object.keys(r.cadenas).forEach(k => { res.cadenas[k] += r.cadenas[k]; });
            Object.keys(r.cadenasPorTamano).forEach(k => { res.cadenasPorTamano[k] += r.cadenasPorTamano[k]; });

            Object.keys(r.decisiones).forEach(t => {
                res.decisiones[t].total += r.decisiones[t].total;
                res.decisiones[t].exitos += r.decisiones[t].exitos;
            });

            res.conflictoMax.push(r.conflictoMax);
            res.conflictoMedio.push(r.conflictoMedio);
            if (r.supero60) res.supero60++;
            res.reconciliaciones += r.reconciliaciones;
    }
    const dur = Date.now() - t0;

    return { res, dur, n, modo };
}

function imprimirReporte({ res, dur, n, modo }) {
    console.log(`\n🎲 ${n} partidas · modo "${modo}" · ⏱ ${dur}ms (${(dur / n).toFixed(2)}ms/partida)`);
    console.log("═".repeat(60));
    console.log(`📊 RESULTADOS`);
    console.log("═".repeat(60));
    console.log(`✅ Victorias: ${res.victorias} (${((res.victorias / n) * 100).toFixed(1)}%)`);
    console.log(`❌ Derrotas:  ${res.derrotas} (${((res.derrotas / n) * 100).toFixed(1)}%)`);
    console.log(`⚪ Neutros:   ${res.neutros} (${((res.neutros / n) * 100).toFixed(1)}%)`);

    console.log("\n📋 FINALES:");
    Object.entries(res.motivos).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
        console.log(`  ${k.padEnd(20)} ${String(v).padStart(5)} (${((v / n) * 100).toFixed(1)}%)`);
    });

    console.log("\n🎬 TURNO DE FIN:");
    Object.entries(res.turnoFin).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([k, v]) => {
        console.log(`  Turno ${String(k).padStart(2)}  ${String(v).padStart(5)} (${((v / n) * 100).toFixed(1)}%)`);
    });

    console.log("\n🏳  P5 VETADOS:");
    Object.entries(res.p5Vetados).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
        console.log(`  ${k.padEnd(10)} ${String(v).padStart(5)} (${((v / n) * 100).toFixed(1)}%)`);
    });

    console.log(`\n🤝 Reconciliaciones aceptadas (media/partida): ${(res.reconciliaciones / n).toFixed(2)}`);

    console.log("\n🧩 CADENAS USADAS (total por tipo):");
    const totalCadenas = Object.values(res.cadenas).reduce((a, b) => a + b, 0) || 1;
    Object.entries(res.cadenas).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
        console.log(`  ${k.padEnd(10)} ${String(v).padStart(6)} (${((v / totalCadenas) * 100).toFixed(1)}%)`);
    });

    console.log("\n📏 DISTRIBUCIÓN POR TAMAÑO:");
    Object.entries(res.cadenasPorTamano).forEach(([k, v]) => {
        console.log(`  ${String(k).padEnd(3)} cubos  ${String(v).padStart(6)} (${((v / totalCadenas) * 100).toFixed(1)}%)`);
    });

    console.log("\n🌡  TENSIÓN (conflicto durante la partida):");
    const maxArr = res.conflictoMax;
    const medArr = res.conflictoMedio;
    console.log(`  Conflicto máx p50:    ${percentile(maxArr, 0.50).toFixed(1)}`);
    console.log(`  Conflicto máx p75:    ${percentile(maxArr, 0.75).toFixed(1)}`);
    console.log(`  Conflicto medio p50:  ${percentile(medArr, 0.50).toFixed(1)}`);
    console.log(`  % partidas que superaron 60 en algún momento: ${((res.supero60 / n) * 100).toFixed(1)}%`);

    console.log("\n🎯 DECISIONES (tasa de éxito por turno):");
    Object.entries(res.decisiones).forEach(([t, d]) => {
        if (d.total > 0) {
            console.log(`  Turno ${String(t).padStart(2)}  ${String(d.exitos).padStart(4)}/${String(d.total).padEnd(4)} (${((d.exitos / d.total) * 100).toFixed(1)}%)`);
        }
    });

    console.log("\n📈 STATS FINALES (media · p25 · p50 · p75):");
    Object.keys(res.statsFin).forEach(k => {
        const arr = res.statsArr[k];
        const media = res.statsFin[k] / n;
        console.log(`  ${k.padEnd(10)}  media ${media.toFixed(1).padStart(5)}  p25 ${percentile(arr, 0.25).toFixed(1).padStart(5)}  p50 ${percentile(arr, 0.50).toFixed(1).padStart(5)}  p75 ${percentile(arr, 0.75).toFixed(1).padStart(5)}`);
    });

    console.log("═".repeat(60) + "\n");
}

function main() {
    if (MODO === "both") {
        console.log(`\n🔀 Modo comparativo: ${N} partidas por modo\n`);
        const rSmart = correrSimulacion(N, "smart");
        const rRandom = correrSimulacion(N, "random");
        console.log("\n══════════════ SMART ══════════════");
        imprimirReporte(rSmart);
        console.log("\n══════════════ RANDOM ══════════════");
        imprimirReporte(rRandom);

        const vSmart = (rSmart.res.victorias / N) * 100;
        const vRandom = (rRandom.res.victorias / N) * 100;
        console.log("\n📊 RESUMEN COMPARATIVO");
        console.log("═".repeat(60));
        console.log(`  Victorias smart:  ${vSmart.toFixed(1)}%`);
        console.log(`  Victorias random: ${vRandom.toFixed(1)}%`);
        console.log(`  Delta:            ${(vSmart - vRandom).toFixed(1)} pts`);
        console.log("═".repeat(60) + "\n");
    } else {
        const r = correrSimulacion(N, MODO);
        imprimirReporte(r);
    }
}

main();
