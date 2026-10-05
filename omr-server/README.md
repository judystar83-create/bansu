# 악보 읽기 서버 (bansu-omr)

악보 사진·PDF를 받아서 MusicXML로 바꿔 주는 서버예요. 반주 메이커 앱이 이 서버를 불러요.

- 엔진: [Audiveris](https://github.com/Audiveris/audiveris) 5.9 (AGPL-3.0) — 수정 없이 그대로 실행해요. 소스는 위 주소에 있어요.
- 코드 이름(C, G7 …)은 앱이 Gemini로 따로 읽어요.
- 체험 코드가 Firestore `trial/{코드}`에 있고 횟수가 남아 있어야 읽어 줘요.

## 올리기 (Google Cloud Shell에서 한 줄)

```
git clone -q https://github.com/judystar83-create/bansu && cd bansu/omr-server && gcloud run deploy bansu-omr --source . --region asia-northeast3 --allow-unauthenticated --memory 4Gi --cpu 2 --timeout 300 --concurrency 1 --max-instances 3 --project project-3b470209-1287-4219-9be --quiet
```
