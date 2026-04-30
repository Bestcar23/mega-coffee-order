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

## 메뉴 추가 기능

- 기본 메뉴에 `애플 머스캣 요거트 스무디 / 3,900원`이 추가되어 있습니다.
- 화면 하단의 `메뉴 직접 추가` 영역에서 메뉴명, 가격, 분류를 입력하면 메뉴 목록에 추가됩니다.
- Firebase Firestore 연결이 정상일 경우 추가 메뉴는 `customMenus` 컬렉션에 저장되어 다른 사용자 화면에도 동기화됩니다.

## 🗑️ 메뉴 삭제 기능

- 각 메뉴 카드의 `삭제` 버튼을 누르면 해당 메뉴가 목록에서 숨겨집니다.
- 직접 추가한 메뉴는 `customMenus` 컬렉션에서 삭제됩니다.
- 기본 제공 메뉴는 `deletedMenus` 컬렉션에 삭제 표시가 저장되어 다른 사용자 화면에서도 숨김 처리됩니다.
- 삭제한 메뉴를 현재 사용자가 선택 중이었다면 해당 사용자의 주문도 자동으로 취소됩니다.


## 👥 여러 사용자 실시간 주문 누적 기능

- 주문 저장 문서 ID를 사용자 이름 기준(`member-이름`)으로 구성하여 여러 사람이 각각 선택한 메뉴가 `userOrders` 컬렉션에 누적됩니다.
- 한 사용자가 메뉴를 선택하면 Firestore `onSnapshot` 실시간 구독을 통해 다른 사용자 화면 상단의 `실시간 주문 현황`에도 즉시 반영됩니다.
- 상단 주문 현황에는 주문자 수, 총 잔 수, 총 금액, 메뉴별 주문자 명단, 메뉴별 소계가 함께 표시됩니다.
- 같은 이름으로 다시 주문하면 해당 주문자의 기존 주문이 새 메뉴로 갱신됩니다.
