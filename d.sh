#!/bin/bash
# 베에르 뮤직 반주 메이커 — 악보 읽기 서버 올리기 (Cloud Shell에서 실행)
set -e
P=project-3b470209-1287-4219-9be
cd ~ && rm -rf bansu-omr-src && git clone -q --depth 1 https://github.com/judystar83-create/bansu bansu-omr-src && cd bansu-omr-src/omr-server
echo "== 필요한 기능 켜는 중 (1~2분) =="
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project $P
echo "== 서버 만드는 프로그램에 권한 주는 중 =="
N=$(gcloud projects describe $P --format='value(projectNumber)')
SA="$N-compute@developer.gserviceaccount.com"
for R in roles/cloudbuild.builds.builder roles/datastore.user roles/logging.logWriter roles/artifactregistry.writer roles/storage.objectViewer; do
  gcloud projects add-iam-policy-binding $P --member="serviceAccount:$SA" --role=$R --condition=None --quiet >/dev/null && echo "  ok $R"
done
sleep 20
echo "== 악보 읽기 서버 만드는 중 (5~10분) =="
gcloud run deploy bansu-omr --source . --region asia-northeast3 --allow-unauthenticated --memory 4Gi --cpu 2 --timeout 300 --concurrency 1 --max-instances 3 --project $P --quiet
echo "== 다 됐어요! 위의 Service URL 화면을 찍어서 보내 주세요 =="
