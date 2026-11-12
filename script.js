(() => {
  const $ = s => document.querySelector(s);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme ---------- */
  const root = document.documentElement;
  try { const t = localStorage.getItem('rida-theme'); if (t) root.dataset.theme = t; } catch (e) {}
  $('#theme').addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('rida-theme', root.dataset.theme); } catch (e) {}
  });

  /* ---------- name: split into letters ---------- */
  const name = $('#name');
  name.innerHTML = [...name.textContent].map((c, i) =>
    c === ' ' ? '<span class="sp"></span>' : `<span class="ch" style="--i:${i}" aria-hidden="true">${c}</span>`).join('');

  /* ---------- pointer tilt on portrait ---------- */
  const portrait = $('#portrait');
  addEventListener('pointermove', e => {
    if (reduce) return;
    portrait.style.setProperty('--ry', ((e.clientX / innerWidth - .5) * 24) + 'deg');
    portrait.style.setProperty('--rx', (-(e.clientY / innerHeight - .5) * 24) + 'deg');
  });

  /* ---------- scroll scenes ---------- */
  const story = $('#story'), hero = $('#hero'), laptop = $('#laptop'), phone = $('#phone');
  const wrap = $('#wrap'), cap1 = $('#cap1'), cap2 = $('#cap2'), lbase = laptop.querySelector('.base');
  const bar = $('#bar'), stage = $('#stage'), orbs = document.querySelectorAll('.orb');
  let S1 = 3, S2 = 3, cur = 0, target = 0, running = false;

  function measure() {
    const screen = laptop.querySelector('.screen');
    S1 = Math.min(innerWidth / screen.offsetWidth, innerHeight / screen.offsetHeight) * 1.01;
    // phone screen is 250 x 540 portrait, 540 x 250 once turned
    S2 = Math.min(innerWidth / 540, innerHeight / 250) * 1.03;
  }

  function show(el, o) {
    el.style.opacity = o;
    el.style.visibility = o > .01 ? 'visible' : 'hidden';
    el.style.pointerEvents = o > .6 ? 'auto' : 'none';
  }

  function render(p) {
    const H = innerHeight;

    // intro fades back
    const h = ease(seg(p, 0, .09));
    hero.style.opacity = 1 - h;
    hero.style.visibility = h >= 1 ? 'hidden' : 'visible';
    hero.style.transform = `translate3d(0,${-h * 70}px,${-h * 300}px) scale(${1 - h * .12})`;

    // laptop: fly in, zoom to full screen, zoom out, leave
    const e = ease(seg(p, .03, .14));
    const zoom = ease(seg(p, .17, .29)) - ease(seg(p, .37, .47));
    const x = ease(seg(p, .5, .6));
    const y = (1 - e) * H * 1.1 - x * H * 1.2;
    const rx = (1 - e) * 65 - x * 50;
    const ry = (1 - e) * -30 + x * 40;
    laptop.style.transform = `translate3d(0,${y}px,0) rotateX(${rx}deg) rotateY(${ry}deg) scale(${lerp(1, S1, zoom)})`;
    show(laptop, e * (1 - x));
    lbase.style.opacity = 1 - clamp(zoom * 4);

    // phone: falls in upright, turns sideways, zooms to full screen, zooms out
    const pe = ease(seg(p, .54, .68));
    const r = ease(seg(p, .69, .77));
    const pz = ease(seg(p, .79, .89)) - ease(seg(p, .91, .99));
    const py = -(1 - pe) * H * 1.2;
    const spin = (1 - pe) * -140;
    phone.style.transform = `translate3d(0,${py}px,0) rotateX(${spin}deg) rotateY(${(1 - pe) * 40}deg) rotateZ(${-90 * r}deg) scale(${lerp(1, S2, pz)})`;
    show(phone, pe);
    wrap.style.setProperty('--r', r);
    wrap.style.setProperty('--lo', r);
    phone.style.setProperty('--no', 1 - clamp(r * 4)); // hide the notch so it never covers the sideways screen
    wrap.style.setProperty('--w', lerp(250, 540, r) + 'px');
    wrap.style.setProperty('--h', lerp(540, 250, r) + 'px');

    // dark backdrop while a screen is full-size, so no bars show the page colour
    const dark = Math.max(zoom, pz);
    stage.style.backgroundColor = `rgba(13,11,17,${dark})`;
    orbs.forEach(o => { o.style.opacity = .55 * (1 - dark); });

    // captions with links sit outside the screens
    show(cap1, e * (1 - clamp(zoom * 5)) * (1 - clamp(x * 3)));
    show(cap2, pe * (1 - clamp(pz * 5)) * (1 - clamp(r * 0)) * clamp(1 - seg(p, .995, 1)));
    if (p < .5) cap2.style.opacity = 0, cap2.style.visibility = 'hidden';
  }

  function tick() {
    cur += (target - cur) * (reduce ? 1 : .16);
    if (Math.abs(target - cur) < .0004) cur = target;
    render(cur);
    if (cur !== target) requestAnimationFrame(tick); else running = false;
  }

  function onScroll() {
    const max = Math.max(1, story.offsetHeight - innerHeight);
    target = clamp((scrollY - story.offsetTop) / max);
    bar.style.transform = `scaleX(${clamp(scrollY / (document.body.scrollHeight - innerHeight))})`;
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); render(cur); });
  measure(); onScroll(); render(cur);

  // make the laptop screen match the screenshot's own proportions so nothing is cropped
  const shot = laptop.querySelector('.screen img');
  const fitShot = () => {
    if (!shot.naturalWidth) return;
    root.style.setProperty('--arn', clamp(shot.naturalWidth / shot.naturalHeight, 1.3, 2.4));
    measure(); render(cur);
  };
  if (shot) shot.complete ? fitShot() : shot.addEventListener('load', fitShot);

  /* ---------- 3D tilt on cards and tiles ---------- */
  document.querySelectorAll('.tilt, .certs li').forEach(el => {
    el.addEventListener('pointermove', e => {
      if (reduce) return;
      const b = el.getBoundingClientRect();
      const px = (e.clientX - b.left) / b.width - .5, py = (e.clientY - b.top) / b.height - .5;
      el.style.transform = `perspective(800px) rotateY(${px * 12}deg) rotateX(${-py * 12}deg) translateZ(10px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  /* ---------- fill skill meters when visible ---------- */
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { threshold: .3 });
  document.querySelectorAll('.card').forEach(c => io.observe(c));

  /* ---------- certificate cards: staggered reveal on scroll ---------- */
  const certIo = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('show'); certIo.unobserve(en.target); }
  }), { threshold: .25 });
  document.querySelectorAll('.certs li').forEach((li, i) => {
    li.style.setProperty('--d', (i % 3) * 120 + 'ms');
    certIo.observe(li);
  });

  /* ---------- custom cursor: dot, trailing ring, sparkle trail, click burst ---------- */
  if (matchMedia('(pointer: fine)').matches && !reduce) {
    document.body.classList.add('has-cur');
    const dot = $('#cur'), ring = $('#ring');
    let mx = -100, my = -100, rx = -100, ry = -100, last = 0;
    const spark = (x, y, size, dx, dy) => {
      const s = document.createElement('i');
      s.className = 'spark';
      s.style.cssText = `--x:${x}px;--y:${y}px;--s:${size}px;--dx:${dx}px;--dy:${dy}px`;
      document.body.appendChild(s);
      s.addEventListener('animationend', () => s.remove());
    };
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
      ring.classList.toggle('hot', !!e.target.closest('a,button,.card,.tile'));
      document.body.classList.toggle('txt', !!e.target.closest('input,textarea'));
      const now = performance.now();
      if (now - last > 45) { last = now; spark(mx, my, 9 + Math.random() * 8, (Math.random() - .5) * 30, 20 + Math.random() * 20); }
    });
    addEventListener('pointerdown', e => {
      for (let k = 0; k < 10; k++) {
        const a = k / 10 * Math.PI * 2;
        spark(e.clientX, e.clientY, 14, Math.cos(a) * 60, Math.sin(a) * 60);
      }
    });
    (function loop() {
      rx += (mx - rx) * .18; ry += (my - ry) * .18;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- contact form: sends straight to your inbox through FormSubmit ---------- */
  const TO = 'ridahassan.work@gmail.com';
  const form = $('#form'), note = $('#note'), btn = form.querySelector('button');
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    let ok = true;
    form.querySelectorAll('input,textarea').forEach(f => {
      const bad = !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
      f.classList.toggle('bad', bad);
      if (bad) ok = false;
    });
    if (!ok) { note.textContent = 'Please fill in your name, a valid email, and a message.'; return; }
    const d = new FormData(form);
    btn.disabled = true; note.textContent = 'Sending...';
    // Web3Forms: get a free access key at web3forms.com (sent to your Gmail) and paste it here.
    const KEY = 'PASTE_YOUR_WEB3FORMS_ACCESS_KEY_HERE';
    if (KEY.startsWith('PASTE')) {
      note.textContent = 'Setup needed: paste your Web3Forms access key in script.js (KEY).';
      btn.disabled = false;
      return;
    }
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: KEY,
        subject: 'CV website message from ' + d.get('name'),
        from_name: d.get('name'),
        name: d.get('name'),
        email: d.get('email'),
        message: d.get('msg')
      })
    })
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error(res.message || 'failed');
        note.textContent = 'Message sent. Thank you, I will reply soon.';
        form.reset();
      })
      .catch(() => {
        const su = encodeURIComponent('CV website message from ' + d.get('name'));
        const bo = encodeURIComponent(d.get('msg') + '\n\nFrom: ' + d.get('name') + ' (' + d.get('email') + ')');
        note.innerHTML = 'Could not send from here. <a target="_blank" rel="noopener" href="https://mail.google.com/mail/?view=cm&fs=1&to=' + TO + '&su=' + su + '&body=' + bo + '">Send it through Gmail instead</a>.';
      })
      .finally(() => { btn.disabled = false; });
  });
})();