(() => {
    'use strict';

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
    const html = document.documentElement;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const wideLayout = matchMedia('(min-width: 1000px)');
    const px = (value) => `${value.toFixed(1)}px`;

    // La clase .motion (puesta en el <head>) activa las animaciones completas;
    // sin ella, por "movimiento reducido" en el sistema, todo usa fundidos suaves.
    const motionOK = () => html.classList.contains('motion');
    const isGlass = () => html.classList.contains('theme-glass');
    reducedMotion.addEventListener('change', () => {
        html.classList.toggle('motion', !reducedMotion.matches);
    });

    /* ---------- Letras estilo "nota de rescate" ---------- */

    // Probabilidad de cada estilo de letra: o = contorno, w = caja blanca, k = caja negra, r = caja roja
    const SKINS = {
        menu: [['o', .74], ['k', .16], ['w', .1]],
        title: [['w', .4], ['k', .36], ['o', .14], ['r', .1]],
        tag: [['w', .55], ['k', .45]],
        num: [['o', .6], ['w', .4]],
    };

    const hashString = (text) => {
        let hash = 2166136261;
        for (const char of text) {
            hash ^= char.codePointAt(0);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    };

    // Aleatorio con semilla: el mismo texto siempre se "recorta" igual
    const seededRandom = (seed) => () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const pickSkin = (table, roll) => {
        let total = 0;
        for (const [skin, weight] of table) {
            total += weight;
            if (roll < total) return skin;
        }
        return table[table.length - 1][0];
    };

    function ransom(el, text = el.textContent) {
        const mode = el.dataset.ransom || 'title';
        const clean = text.trim().replace(/\s+/g, ' ');
        const random = seededRandom(hashString(`${mode}:${clean}`));
        const table = SKINS[mode] || SKINS.title;
        const letters = document.createElement('span');
        letters.className = `rn rn--${mode}`;
        letters.setAttribute('aria-hidden', 'true');

        // Cada letra guarda su texto real: el estilo P5R cambia mayúsculas/minúsculas con CSS
        // y el estilo Glass las muestra normales (y usa --i para colorearlas en degradé).
        let previous = '';
        let index = 0;
        clean.split(' ').forEach((word) => {
            const wordEl = document.createElement('span');
            wordEl.className = 'rn-word';
            [...word].forEach((char, i) => {
                let skin = pickSkin(table, random());
                if (skin === previous && skin !== 'o') skin = skin === 'w' ? 'k' : 'w';
                previous = skin;
                const lead = i === 0;
                const scale = lead ? 1.16 + random() * .14 : .84 + random() * .26;
                const font = 1 + Math.floor(random() * 6);
                const rotation = random() * 14 - 7;
                const shift = random() * .12 - .06;
                const lower = !lead && random() < .3;
                const letter = document.createElement('span');
                letter.className = `rn-ch rn-f${font} rn-${skin} ${lower ? 'rn-lc' : 'rn-uc'}`;
                letter.style.setProperty('--sc', scale.toFixed(2));
                letter.style.setProperty('--rot', `${rotation.toFixed(1)}deg`);
                letter.style.setProperty('--dy', `${shift.toFixed(3)}em`);
                letter.style.setProperty('--i', index++);
                letter.textContent = char;
                wordEl.append(letter);
            });
            letters.append(wordEl);
        });

        const label = document.createElement('span');
        label.className = 'sr-only';
        label.textContent = clean;
        el.replaceChildren(label, letters);
    }

    $$('[data-ransom]').forEach((el) => {
        if (el.textContent.trim()) ransom(el);
    });

    /* ---------- Calendario ---------- */

    const calendar = $('.calendar');
    if (calendar) {
        const now = new Date();
        const hour = now.getHours();
        $('.cal-day', calendar).textContent = now.getDate();
        $('.cal-month', calendar).textContent = now.getMonth() + 1;
        $('.cal-weekday', calendar).textContent = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'][now.getDay()];
        $('.cal-phase', calendar).textContent = hour < 6 ? 'Madrugada' : hour < 12 ? 'Mañana' : hour < 19 ? 'Tarde' : 'Noche';
    }

    /* ---------- Menú principal ---------- */

    const menu = $('#menu');
    const items = $$('.menu-item', menu);
    const pointer = $('.menu-pointer', menu);
    const blade = $('.pointer-blade', menu);
    const edge = $('.pointer-edge', menu);
    const indexNum = $('.menu-index-num', menu);
    const helpText = $('.menu-help-text', menu);
    const helpJp = $('.menu-help-jp', menu);
    let selected = 0;
    let readyTimer = 0;

    // Estilo P5R: dibuja la "cuchilla" desde el número grande hasta la opción elegida.
    // Estilo Glass: mueve el resplandor (--lx, --ly, --lw, --lh) detrás de la tarjeta elegida.
    function aim() {
        if (!menu.classList.contains('is-active')) return;
        const box = menu.getBoundingClientRect();
        const row = items[selected].parentElement;
        const target = row.getBoundingClientRect();
        if (!target.width) return;

        pointer.style.setProperty('--lx', px(target.left - box.left));
        pointer.style.setProperty('--ly', px(target.top - box.top));
        pointer.style.setProperty('--lw', px(target.width));
        pointer.style.setProperty('--lh', px(target.height));

        const num = indexNum.getBoundingClientRect();
        if (!num.width) return;

        // offsetHeight ignora la rotación de la fila, así el grosor no se infla
        const thickness = row.offsetHeight;
        const ox = num.left + num.width / 2 - box.left;
        const oy = num.top + num.height / 2 - box.top;
        const tx = target.left - box.left - thickness * .3;
        const ty = target.top + target.height / 2 - box.top;
        const length = Math.hypot(tx - ox, ty - oy) || 1;
        const dx = (tx - ox) / length;
        const dy = (ty - oy) / length;
        const half = thickness * .66;

        const shape = (shiftX, shiftY, grow) => {
            const h = half * grow;
            const points = [
                [ox - dy * 6, oy + dx * 6],
                [tx - dy * h, ty + dx * h],
                [tx + dx * h * .9, ty + dy * h * .9],
                [tx + dy * h, ty - dx * h],
                [ox + dy * 6, oy - dx * 6],
            ];
            return `polygon(${points.map(([x, y]) => `${px(x + shiftX)} ${px(y + shiftY)}`).join(', ')})`;
        };

        blade.style.clipPath = shape(0, 0, 1);
        edge.style.clipPath = shape(9, 8, 1.1);
        pointer.style.setProperty('--ox', px(ox));
        pointer.style.setProperty('--oy', px(oy));
    }

    function select(index, { focus = false } = {}) {
        const next = (index + items.length) % items.length;
        const changed = next !== selected;
        selected = next;
        items.forEach((item, i) => item.classList.toggle('is-selected', i === selected));
        helpText.textContent = $('.menu-desc', items[selected]).textContent;
        helpJp.textContent = items[selected].dataset.jp;

        if (changed) {
            ransom(indexNum, String(selected + 1).padStart(2, '0'));
            indexNum.classList.remove('is-pop');
            void indexNum.offsetWidth;
            indexNum.classList.add('is-pop');
        }

        aim();
        if (focus) items[selected].focus();
    }

    // El puntero aparece cuando las opciones terminan de entrar
    function enterMenu() {
        pointer.classList.remove('is-ready');
        clearTimeout(readyTimer);
        const delay = !motionOK() ? 250 : isGlass() ? 950 : 650;
        readyTimer = setTimeout(() => {
            aim();
            pointer.classList.add('is-ready');
        }, delay);
    }

    items.forEach((item, i) => {
        item.addEventListener('pointerenter', (event) => {
            if (event.pointerType === 'mouse') select(i);
        });
        item.addEventListener('focus', () => select(i));
    });

    /* ---------- Proyectos (lista + detalle) ---------- */

    const projects = $$('[data-entry]');
    let projectIndex = 0;
    let videoWanted = false;

    function syncVideos(play) {
        if (play !== undefined) videoWanted = play;
        const allowed = videoWanted && current === 'proyectos' && wideLayout.matches;

        projects.forEach((project) => {
            const video = $('video', project);
            if (!video) return;
            if (allowed && project.classList.contains('is-selected')) {
                if (!video.getAttribute('src')) video.src = video.dataset.src;
                video.play().then(() => project.classList.add('is-playing')).catch(() => {});
            } else {
                video.pause();
                project.classList.remove('is-playing');
            }
        });
    }

    function chooseProject(index, { focus = false, play } = {}) {
        projectIndex = (index + projects.length) % projects.length;
        projects.forEach((project, i) => {
            const on = i === projectIndex;
            project.classList.toggle('is-selected', on);
            $('[data-tab]', project).setAttribute('aria-expanded', String(on));
        });
        if (focus) $('[data-tab]', projects[projectIndex]).focus();
        syncVideos(play);
    }

    projects.forEach((project, i) => {
        const tab = $('[data-tab]', project);
        tab.addEventListener('click', () => chooseProject(i, { play: true }));
        tab.addEventListener('focus', () => chooseProject(i));
        tab.addEventListener('pointerenter', (event) => {
            if (event.pointerType === 'mouse') chooseProject(i, { play: true });
        });
        tab.addEventListener('keydown', (event) => {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            event.preventDefault();
            chooseProject(projectIndex + (event.key === 'ArrowDown' ? 1 : -1), { focus: true });
        });
        $('.project-media', project).addEventListener('pointerenter', (event) => {
            if (event.pointerType === 'mouse') syncVideos(true);
        });
    });

    wideLayout.addEventListener('change', () => syncVideos());

    /* ---------- Navegación entre pantallas ---------- */

    const screens = new Map($$('[data-screen]').map((el) => [el.dataset.screen, el]));
    const NAMES = {
        menu: 'Menú',
        'sobre-mi': 'Sobre mí',
        proyectos: 'Proyectos',
        informacion: 'Información',
        habilidades: 'Habilidades',
    };
    const wipe = $('.wipe');
    const wipeTitle = $('.wipe-title');
    // [ms hasta cubrir la pantalla, ms hasta descubrirla]
    const WIPE_TIMING = { full: [400, 460], gentle: [190, 260] };
    let current = 'menu';
    let busy = false;

    const routeFromHash = () => {
        const id = decodeURIComponent(location.hash.slice(1));
        return screens.has(id) ? id : 'menu';
    };

    function activate(id, { focus = true } = {}) {
        const previous = current;
        screens.forEach((el, key) => el.classList.toggle('is-active', key === id));
        current = id;
        document.title = id === 'menu' ? 'David Barrientos | Portafolio' : `${NAMES[id]} | David Barrientos`;
        window.scrollTo(0, 0);

        if (id === 'menu') {
            const cameFrom = items.findIndex((item) => item.hash === `#${previous}`);
            if (cameFrom >= 0) select(cameFrom);
            enterMenu();
            if (focus) items[selected].focus({ preventScroll: true });
        } else if (focus) {
            $('.page-title', screens.get(id)).focus({ preventScroll: true });
        }

        if (id === 'proyectos') chooseProject(projectIndex);
        syncVideos(false);
    }

    const centerOf = (el) => {
        const box = el.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    };

    function navigate(id, { push = true, origin } = {}) {
        if (!screens.has(id)) id = 'menu';
        if (push && id !== routeFromHash()) {
            history.pushState(null, '', id === 'menu' ? location.pathname + location.search : `#${id}`);
        }
        if (busy || id === current) return;

        const [cover, reveal] = motionOK() ? WIPE_TIMING.full : WIPE_TIMING.gentle;
        const from = origin || { x: innerWidth / 2, y: innerHeight / 2 };
        busy = true;
        ransom(wipeTitle, NAMES[id]);
        wipe.style.setProperty('--wx', px(from.x));
        wipe.style.setProperty('--wy', px(from.y));
        wipe.classList.remove('is-out');
        wipe.classList.add('is-on');

        setTimeout(() => {
            activate(id);
            wipe.classList.add('is-out');
            setTimeout(() => {
                wipe.classList.remove('is-on', 'is-out');
                busy = false;
                const wanted = routeFromHash();
                if (wanted !== current) navigate(wanted, { push: false });
            }, reveal);
        }, cover);
    }

    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const id = decodeURIComponent(link.hash.slice(1));
        if (!screens.has(id)) return;
        event.preventDefault();
        // detail === 0: activado con teclado, la transición nace del centro del enlace
        navigate(id, { origin: event.detail ? { x: event.clientX, y: event.clientY } : centerOf(link) });
    });

    window.addEventListener('popstate', () => navigate(routeFromHash(), { push: false }));
    window.addEventListener('hashchange', () => navigate(routeFromHash(), { push: false }));

    document.addEventListener('keydown', (event) => {
        if (busy || event.altKey || event.ctrlKey || event.metaKey) return;

        if (current !== 'menu') {
            if (event.key === 'Escape') {
                event.preventDefault();
                navigate('menu');
            }
            return;
        }

        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            event.preventDefault();
            select(selected - 1, { focus: true });
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            event.preventDefault();
            select(selected + 1, { focus: true });
        } else if (event.key === ' ' || event.key === 'Enter') {
            const control = event.target.closest('a, button');
            // Los botones y enlaces normales se activan solos; Espacio también abre la opción enfocada
            if (control && !(event.key === ' ' && control.classList.contains('menu-item'))) return;
            event.preventDefault();
            navigate(items[selected].hash.slice(1), { origin: centerOf(items[selected]) });
        }
    });

    /* ---------- Cambio de estilo: P5R ⇄ Glass ---------- */

    const themeToggle = $('.theme-toggle');
    const themeColor = $('meta[name="theme-color"]');

    function applyTheme(glass) {
        html.classList.toggle('theme-glass', glass);
        themeToggle.setAttribute('aria-checked', String(glass));
        themeColor.content = glass ? '#07061a' : '#e3001b';
        try {
            localStorage.setItem('portfolio-theme', glass ? 'glass' : 'p5');
        } catch (error) {
            // Sin almacenamiento disponible: el estilo solo dura esta visita
        }
        // Las animaciones de entrada se repiten con el nuevo estilo: el puntero se ubica al terminar
        if (current === 'menu') enterMenu();
    }

    // Revela el nuevo estilo con un círculo que crece desde el botón (View Transitions API)
    themeToggle.addEventListener('click', (event) => {
        const glass = !isGlass();
        const { x, y } = event.detail ? { x: event.clientX, y: event.clientY } : centerOf(themeToggle);
        if (!document.startViewTransition || !motionOK()) {
            applyTheme(glass);
            return;
        }
        const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        document.startViewTransition(() => applyTheme(glass)).ready.then(() => {
            html.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                { duration: 760, easing: 'cubic-bezier(.7, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' },
            );
        }).catch(() => {});
    });

    /* ---------- Estilo Glass: luz que sigue al cursor, tarjetas 3D, botones magnéticos y ondas ---------- */

    const glassBg = $('.glass-bg');
    let pointerX = innerWidth / 2;
    let pointerY = innerHeight / 3;
    let spotX = pointerX;
    let spotY = pointerY;
    let glowFrame = 0;
    let tilted = null;
    let pulled = null;

    // La luz del fondo persigue al cursor con un poco de retraso (interpolación)
    function glowLoop() {
        spotX += (pointerX - spotX) * .12;
        spotY += (pointerY - spotY) * .12;
        glassBg.style.setProperty('--sx', px(spotX));
        glassBg.style.setProperty('--sy', px(spotY));
        glassBg.style.setProperty('--px', (spotX / innerWidth - .5).toFixed(3));
        glassBg.style.setProperty('--py', (spotY / innerHeight - .5).toFixed(3));
        const moving = Math.abs(pointerX - spotX) + Math.abs(pointerY - spotY) > .5;
        glowFrame = moving ? requestAnimationFrame(glowLoop) : 0;
    }

    function releaseTilt() {
        if (!tilted) return;
        ['--tilt-x', '--tilt-y'].forEach((prop) => tilted.style.removeProperty(prop));
        tilted = null;
    }

    function releaseMagnet() {
        if (!pulled) return;
        ['--pull-x', '--pull-y'].forEach((prop) => pulled.style.removeProperty(prop));
        pulled = null;
    }

    document.addEventListener('pointermove', (event) => {
        if (!isGlass() || event.pointerType !== 'mouse') return;
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (motionOK() && !glowFrame) glowFrame = requestAnimationFrame(glowLoop);

        // .tilt: se inclina en 3D y tiene brillo; .shine: solo el brillo que sigue al cursor
        const card = event.target.closest('.tilt, .shine');
        if (card !== tilted) releaseTilt();
        if (card) {
            const box = card.getBoundingClientRect();
            const x = (event.clientX - box.left) / box.width;
            const y = (event.clientY - box.top) / box.height;
            card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
            card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
            if (motionOK() && card.classList.contains('tilt')) {
                tilted = card;
                card.style.setProperty('--tilt-x', `${((.5 - y) * 10).toFixed(2)}deg`);
                card.style.setProperty('--tilt-y', `${((x - .5) * 12).toFixed(2)}deg`);
            }
        }

        const magnet = event.target.closest('.magnetic');
        if (magnet !== pulled) releaseMagnet();
        if (magnet && motionOK()) {
            pulled = magnet;
            const box = magnet.getBoundingClientRect();
            magnet.style.setProperty('--pull-x', px((event.clientX - box.left - box.width / 2) * .25));
            magnet.style.setProperty('--pull-y', px((event.clientY - box.top - box.height / 2) * .35));
        }
    });

    // Al salir de la ventana todo vuelve a su lugar
    document.addEventListener('pointerout', (event) => {
        if (event.relatedTarget) return;
        releaseTilt();
        releaseMagnet();
    });

    // Onda de luz al hacer clic en botones y tarjetas
    document.addEventListener('pointerdown', (event) => {
        if (!isGlass() || !motionOK()) return;
        const host = event.target.closest('.cta, .menu-item, .project-tab, .back, .theme-toggle-track');
        if (!host) return;
        const box = host.getBoundingClientRect();
        const ripple = document.createElement('i');
        ripple.className = 'ripple';
        ripple.style.left = px(event.clientX - box.left);
        ripple.style.top = px(event.clientY - box.top);
        host.append(ripple);
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });

    // Recalcula el puntero ante cualquier cambio de tamaño (ventana, fuentes, orientación)
    let resizeFrame = 0;
    const reaim = new ResizeObserver(() => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(aim);
    });
    reaim.observe(menu);
    reaim.observe($('.menu-list', menu));

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    themeToggle.setAttribute('aria-checked', String(isGlass()));
    themeColor.content = isGlass() ? '#07061a' : '#e3001b';
    select(0);
    activate(routeFromHash(), { focus: false });
    document.fonts?.ready.then(aim);
})();
