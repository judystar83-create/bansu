# 베에르 뮤직 반주 메이커 — 악보 읽기 서버
# 악보 읽기 전문 프로그램 Audiveris(오픈소스, AGPL-3.0, 수정 없이 사용)를 돌려서 MusicXML을 돌려줘요.
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive \
    XDG_CONFIG_HOME=/config \
    AUDIVERIS=/opt/audiveris/bin/Audiveris \
    PYTHONUNBUFFERED=1
ARG AUDIVERIS_VERSION=5.9.0
# 설치 프로그램(.deb)은 데스크톱 메뉴 등록 단계 때문에 서버에서 실패할 수 있어서, 파일만 풀어서 써요
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl python3 python3-pil fontconfig fonts-dejavu-core \
      libfreetype6 libasound2t64 libx11-6 libxext6 libxi6 libxrender1 libxtst6 libbsd0 zlib1g libgomp1 tesseract-ocr-eng \
 && curl -fsSL -o /tmp/audiveris.deb "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu24.04-x86_64.deb" \
 && dpkg-deb -x /tmp/audiveris.deb / \
 && rm -f /tmp/audiveris.deb \
 && mkdir -p /config/AudiverisLtd/audiveris/tessdata \
 && cp "$(find /usr/share -name eng.traineddata | head -1)" /config/AudiverisLtd/audiveris/tessdata/ \
 && test -x /opt/audiveris/bin/Audiveris \
 && rm -rf /var/lib/apt/lists/*
COPY server.py /app/server.py
WORKDIR /app
EXPOSE 8080
CMD ["python3", "/app/server.py"]
