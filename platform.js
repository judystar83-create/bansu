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
    for (const name of models) {
      try {
        if (opts.signal && opts.signal.aborted) throw { code: 'cancelled' };
        const model = getGenerativeModel(ai, { model: name, generationConfig: json ? { responseMimeType: 'application/json' } : {} });
        if (opts.onText) opts.onText({ text: `${name} 모델로 읽는 중…`, delta: '' });
        const res = await model.generateContent(parts); // 한 번에 받기 (아이폰에서 더 안정적)
        const text = res.response.text();
        if (opts.onText) opts.onText({ text, delta: text });
        return text;
      } catch (e) {
        if (e && e.code === 'cancelled') throw e;
        console.warn(name, '실패', e);
        lastErr = e; // 어떤 오류든 다음 모델로 한 번 더 시도
      }
    }
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
