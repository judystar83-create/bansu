#!/bin/bash
# 베에르 뮤직 반주 메이커 — 악보 읽기 서버 올리기
# 화면 연결이 끊겨도 멈추지 않도록 뒤에서 돌려요. 기록은 ~/omr-deploy.log 에 남아요.
cd ~ && rm -rf bansu-omr-src && git clone -q --depth 1 https://github.com/judystar83-create/bansu bansu-omr-src || { echo "내려받기 실패"; exit 1; }
nohup bash ~/bansu-omr-src/omr-server/deploy.sh > ~/omr-deploy.log 2>&1 &
echo "== 시작했어요! 화면이 끊겨도 뒤에서 계속 만들어요 (10~15분) =="
echo "== 나중에 확인하려면: cat omr-deploy.log =="
sleep 2
tail -f ~/omr-deploy.log
