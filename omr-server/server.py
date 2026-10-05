"""베에르 뮤직 반주 메이커 — 악보 읽기 서버

POST /read  (JSON)
  { "code": "<체험 코드>", "files": [ { "name": "p1.jpg", "type": "image/jpeg", "data": "<base64>" }, ... ] }
→ { "ok": true, "pages": [ { "name": "...", "mxl": "<base64 .mxl>" } ], "seconds": 12.3 }

악보 읽기 전문 프로그램 Audiveris(https://github.com/Audiveris/audiveris, AGPL-3.0)를 수정 없이 실행해요.
"""
import base64, glob, io, json, os, re, shutil, subprocess, tempfile, time, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from PIL import Image, ImageOps

AUDIVERIS = os.environ.get("AUDIVERIS", "/opt/audiveris/bin/Audiveris")
PROJECT = os.environ.get("FIREBASE_PROJECT", "project-3b470209-1287-4219-9be")
CHECK_CODE = os.environ.get("CHECK_CODE", "1") == "1"
MAX_BODY = 30 * 1024 * 1024
TIMEOUT = int(os.environ.get("OMR_TIMEOUT", "240"))


def norm_code(c):
    return re.sub(r"[^A-Z0-9]", "", str(c or "").upper())


def code_ok(code):
    """체험 코드가 Firestore에 있고 횟수가 남았는지 (앱이 이미 1번 썼다고 기록한 뒤에 불러요)."""
    if not CHECK_CODE:
        return True
    code = norm_code(code)
    if not code:
        return False
    try:
        tok = json.loads(urllib.request.urlopen(urllib.request.Request(
            "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
            headers={"Metadata-Flavor": "Google"}), timeout=5).read())["access_token"]
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/trial/{code}"
        doc = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": "Bearer " + tok}), timeout=8).read())
        f = doc.get("fields", {})
        used = int(f.get("used", {}).get("integerValue", 0))
        limit = int(f.get("limit", {}).get("integerValue", 0))
        return 0 < used <= limit
    except Exception as e:  # 코드가 없으면 404
        print("code check failed:", e)
        return False


def prep_image(raw, path, scale=None):
    """사진을 반듯하게 돌리고, 오선 간격이 알맞도록 크기를 맞춰요."""
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("L")
    w, h = im.size
    if scale is None:
        scale = 2400 / w if w < 1800 else (3000 / w if w > 4000 else 1.0)
    if abs(scale - 1) > 0.02:
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    im.save(path)
    return scale


def run_audiveris(inputs, outdir):
    cmd = [AUDIVERIS, "-batch", "-export", "-output", outdir, "--"] + inputs
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=TIMEOUT, text=True, errors="replace")
    return p.stdout


def read_scores(files):
    work = tempfile.mkdtemp(prefix="omr-")
    try:
        pages = []
        for i, f in enumerate(files):
            raw = base64.b64decode(f["data"])
            typ = (f.get("type") or "").lower()
            stem = f"page{i + 1:02d}"
            out = os.path.join(work, stem)
            os.makedirs(out, exist_ok=True)
            if "pdf" in typ or raw[:4] == b"%PDF":
                src = os.path.join(work, stem + ".pdf")
                open(src, "wb").write(raw)
                log = run_audiveris([src], out)
            else:
                src = os.path.join(work, stem + ".png")
                scale = prep_image(raw, src)
                log = run_audiveris([src], out)
                if not glob.glob(os.path.join(out, "**", "*.mxl"), recursive=True):
                    # 오선 간격이 너무 작거나 크면 크기를 바꿔서 한 번 더
                    m = re.search(r"interline value of (\d+) pixels", log)
                    if m and int(m.group(1)) > 0:
                        k = max(0.5, min(5.0, 20 / int(m.group(1))))
                        prep_image(raw, src, scale * k)
                        log = run_audiveris([src], out)
            mx = sorted(glob.glob(os.path.join(out, "**", "*.mxl"), recursive=True))
            for path in mx:
                pages.append({"name": f.get("name") or stem, "mxl": base64.b64encode(open(path, "rb").read()).decode()})
            if not mx:
                pages.append({"name": f.get("name") or stem, "error": "not_read", "log": log[-1500:]})
        return pages
    finally:
        shutil.rmtree(work, ignore_errors=True)


class H(BaseHTTPRequestHandler):
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def reply(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        self.reply(200, {"ok": True, "service": "bansu-omr", "engine": "Audiveris (AGPL-3.0) https://github.com/Audiveris/audiveris"})

    def do_POST(self):
        if self.path.rstrip("/") != "/read":
            return self.reply(404, {"ok": False, "error": "not_found"})
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BODY:
            return self.reply(413, {"ok": False, "error": "too_big"})
        try:
            req = json.loads(self.rfile.read(n))
        except Exception:
            return self.reply(400, {"ok": False, "error": "bad_json"})
        if not code_ok(req.get("code")):
            return self.reply(403, {"ok": False, "error": "bad_code"})
        files = (req.get("files") or [])[:6]
        if not files:
            return self.reply(400, {"ok": False, "error": "no_files"})
        t0 = time.time()
        try:
            pages = read_scores(files)
        except subprocess.TimeoutExpired:
            return self.reply(504, {"ok": False, "error": "timeout"})
        except Exception as e:
            return self.reply(500, {"ok": False, "error": "server", "message": str(e)[:300]})
        self.reply(200, {"ok": True, "pages": pages, "seconds": round(time.time() - t0, 1)})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    print("listening on", port)
    ThreadingHTTPServer(("", port), H).serve_forever()
