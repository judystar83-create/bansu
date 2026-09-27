// 동요 반주 메이커 — 깃허브 페이지 버전 연결 부분
// 파일 저장(다운로드)과 악보 읽기(Firebase AI · Gemini)를 앱에 연결해요.
const V = '12.18.0';
const cfg = window.FIREBASE_CONFIG;

const downloads = {
  async save({ filename, data }) {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return { status: 'saved' };
  }
};

const blobToBase64 = blob => new Promise((ok, bad) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(',')[1]);
  r.onerror = bad;
  r.readAsDataURL(blob);
});

let sample = null;
async function setupAI() {
  if (!cfg || !cfg.apiKey) return;
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const { getAI, getGenerativeModel, GoogleAIBackend, VertexAIBackend } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-ai.js`);
  const app = initializeApp(cfg);
  window.FIREBASE_APP = app;
  if (cfg.appCheckSiteKey) {
    const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app-check.js`);
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(cfg.appCheckSiteKey), isTokenAutoRefreshEnabled: true });
  }
  // vertex: 구글 클라우드 결제(무료 체험 크레딧 포함)로 계산 / google: Gemini Developer API(선불 크레딧 필요)
  const ai = getAI(app, { backend: cfg.aiBackend === 'google' ? new GoogleAIBackend() : new VertexAIBackend(cfg.aiLocation || 'global') });
  const models = cfg.models || ['gemini-3.8-flash', 'gemini-3.5-flash'];
  const run = async (input, opts = {}, json = false) => {
    const parts = [String(input)];
    for (const f of [].concat(opts.images || [])) parts.push({ inlineData: { data: await blobToBase64(f), mimeType: f.type || 'image/jpeg' } });
    let lastErr = null;
    const errs = [];
    const limit = opts.careful ? 150 : 90;
    const deadline = Date.now() + (opts.careful ? 270 : 180) * 1000; // 전체 최대 시간: 넘으면 멈추고 알려 줘요
    const once = async (name, plain) => {
      const gc = json ? { responseMimeType: 'application/json' } : {};
      // 보통: 빨리 읽기 / 꼼꼼하게: 더 오래 생각해서 정확하게
      if (!plain) {
        if (/gemini-3/.test(name)) gc.thinkingConfig = { thinkingLevel: opts.careful ? 'medium' : 'low' };
        else if (/gemini-2\.5/.test(name)) gc.thinkingConfig = { thinkingBudget: opts.careful ? 2048 : 0 };
      }
      const model = getGenerativeModel(ai, { model: name, generationConfig: gc });
      const t0 = Date.now();
      const tick = setInterval(() => { if (opts.onText) opts.onText({ text: `${name} 모델로 읽는 중… ${Math.round((Date.now() - t0) / 1000)}초`, delta: '' }); }, 1000);
      try {
        const res = await Promise.race([
          model.generateContent(parts), // 한 번에 받기 (아이폰에서 더 안정적)
          new Promise((_, bad) => setTimeout(() => bad(new Error('시간 초과')), Math.max(5000, Math.min(limit * 1000, deadline - Date.now())))),
          new Promise((_, bad) => opts.signal && opts.signal.addEventListener('abort', () => bad({ code: 'cancelled' })))
        ]);
        return res.response.text();
      } finally { clearInterval(tick); }
    };
    for (const name of models) {
      let plain = false, retried = false;
      while (true) {
        if (opts.signal && opts.signal.aborted) throw { code: 'cancelled' };
        if (Date.now() > deadline - 15000) break;
        try {
          const text = await once(name, plain);
          if (opts.onText) opts.onText({ text, delta: text });
          return text;
        } catch (e) {
          if (e && e.code === 'cancelled') throw e;
          const m = String((e && e.message) || e);
          console.warn(name, '실패', e); lastErr = e; errs.push(`${name}: ${m.replace(/^.*?\]:\s*/, '').slice(0, 120)}`);
          // 설정 때문에 거절 → 기본 설정으로 한 번 더
          if (!plain && /\b400\b|INVALID_ARGUMENT|Unknown name|thinking/i.test(m)) { plain = true; continue; }
          // 구글 쪽 일시 오류 → 2초 쉬고 한 번 더
          if (!retried && /\b(500|503)\b|Internal error|UNAVAILABLE|overloaded/i.test(m)) { retried = true; await new Promise(r => setTimeout(r, 2000)); continue; }
          break; // 다음 모델로
        }
      }
      if (Date.now() > deadline - 15000) break;
    }
    if (errs.length) lastErr = new Error(errs.join(' / '));
    const msg = String((lastErr && lastErr.message) || lastErr);
    console.error('악보 읽기 오류', lastErr);
    throw { code: /app.?check/i.test(msg) ? 'appcheck' : /\[429\b|\b429\b|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(msg) ? 'rate_limited' : 'error', message: msg };
  };
  sample = Object.assign((input, opts) => run(input, opts).then(text => ({ text, truncated: false })), {
    json: async (input, opts) => { const t = await run(input, opts, true); const m = t.match(/\{[\s\S]*\}/); return JSON.parse(m ? m[0] : t); },
    limits: async () => ({ maxPromptBytes: 200000, images: { maxCount: 8, maxInputBytes: 20e6, mediaTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'] } })
  });
}
const ready = setupAI().catch(e => console.error('Firebase 연결 실패', e));
window.claude = { use: async n => { await ready; return n === 'downloads' ? downloads : n === 'sample' ? sample : null; } };
