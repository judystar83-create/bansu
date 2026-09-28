// Firebase 설정 — 반주 앱 전용 프로젝트 (My First Project)
// 이 값은 웹 앱 안에 원래 들어가는 공개 값이에요. 몰래 쓰는 것을 막는 건 App Check가 해요.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyC7OZVKrpCzSjFypICGQwHl6tig_VIhlY4",
  authDomain: "project-3b470209-1287-4219-9be.firebaseapp.com",
  projectId: "project-3b470209-1287-4219-9be",
  storageBucket: "project-3b470209-1287-4219-9be.firebasestorage.app",
  messagingSenderId: "968490880212",
  appId: "1:968490880212:web:dd6dd13e189ec30facff41",
  // AI 연결 방식: "vertex" = 구글 클라우드 결제(크레딧 사용)
  aiBackend: "vertex",
  aiLocation: "global",
  // 악보 읽기에 쓸 AI 모델 (앞에서부터 차례로 시도)
  models: ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-3.8-flash"],
  carefulModels: ["gemini-3.5-pro", "gemini-3.1-pro-preview", "gemini-2.5-pro"],
  // App Check(보안 확인) — Fraud Defense(reCAPTCHA Enterprise) 사이트 키
  // Firebase App Check에 등록을 마치면 아래 주석을 풀어요
  appCheckSiteKey: null // "6LdW3NEtAAAAABsROrW3AFvc7he0a2fPNHZfUenX"
};
