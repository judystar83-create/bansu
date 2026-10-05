# 베에르 뮤직 반주 메이커 — 악보 읽기 서버
# 악보 읽기 전문 프로그램 Audiveris(오픈소스, AGPL-3.0, 수정 없이 사용)를 돌려서 MusicXML을 돌려줘요.
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive \
    XDG_CONFIG_HOME=/config \
    AUDIVERIS=/opt/audiveris/bin/Audiveris \
    PYTHONUNBUFFERED=1
ARG AUDIVERIS_VERSION=5.9.0
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl git python3 python3-pil fontconfig libfreetype6 \
 && curl -fsSL -o /tmp/audiveris.deb "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu24.04-x86_64.deb" \
 && apt-get install -y --no-install-recommends /tmp/audiveris.deb \
 && rm -f /tmp/audiveris.deb \
 && mkdir -p /config/AudiverisLtd/audiveris/tessdata \
 && git clone -q --depth 1 --filter=blob:none --no-checkout https://github.com/tesseract-ocr/tessdata_fast /tmp/td \
 && cd /tmp/td && git sparse-checkout set --no-cone eng.traineddata && git checkout -q \
 && cp eng.traineddata /config/AudiverisLtd/audiveris/tessdata/ && cd / && rm -rf /tmp/td \
 && apt-get purge -y git && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
COPY server.py /app/server.py
WORKDIR /app
EXPOSE 8080
CMD ["python3", "/app/server.py"]
