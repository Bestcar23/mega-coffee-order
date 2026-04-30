# ☕ 메가커피 실시간 주문 헬퍼 프로

팀원들의 메가커피 주문을 실시간으로 취합하는 Vite + React + Firebase 웹앱입니다.

## 1. 로컬 실행

```bash
npm install
npm run dev
```

## 2. GitHub 업로드

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/사용자명/저장소명.git
git push -u origin main
```

## 3. Vercel 배포 설정

Vercel에서 GitHub 저장소를 Import한 뒤 아래와 같이 설정합니다.

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## 4. Firebase 환경변수

Vercel `Project > Settings > Environment Variables`에 아래 키를 추가합니다.

- Key: `VITE_FIREBASE_CONFIG`
- Value: Firebase Console 웹앱 설정 JSON 한 줄 문자열

예시:

```json
{"apiKey":"...","authDomain":"...firebaseapp.com","projectId":"...","storageBucket":"...appspot.com","messagingSenderId":"...","appId":"..."}
```

## 5. Firebase에서 확인할 항목

- Authentication: Anonymous 로그인 활성화
- Firestore Database: 생성 및 읽기/쓰기 규칙 설정

개인·팀 내부용으로 빠르게 테스트할 때는 Firestore 규칙을 임시로 완화할 수 있으나, 실제 공개 배포 전에는 접근 범위를 제한하는 규칙으로 조정하는 것이 좋습니다.
