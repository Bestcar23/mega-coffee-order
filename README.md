# 메가커피 실시간 주문 헬퍼

여러 사용자의 주문이 화면 상단 **실시간 주문 현황**에 누적 표시되도록 수정한 Vite + React + Firebase 웹앱입니다.

## 핵심 수정 사항

- 주문 저장 문서 ID를 로그인 UID가 아니라 `주문자 성명` 기준으로 저장합니다.
- 여러 사용자가 각자 선택한 메뉴가 Firestore `userOrders` 컬렉션에 저장됩니다.
- `onSnapshot` 실시간 구독으로 모든 주문자의 주문을 화면 상단에 즉시 누적 표시합니다.
- 같은 주문자가 메뉴를 다시 선택하면 해당 주문자의 주문만 갱신됩니다.
- 메뉴 삭제 시 해당 메뉴를 선택한 주문도 자동 제외됩니다.

## Vercel 배포 설정

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## 환경 변수

Vercel > Project Settings > Environment Variables에 아래 값을 등록합니다.

```txt
VITE_FIREBASE_CONFIG
```

Value 예시:

```json
{"apiKey":"...","authDomain":"...firebaseapp.com","projectId":"...","storageBucket":"...appspot.com","messagingSenderId":"...","appId":"..."}
```

## Firebase 설정 체크

Authentication에서 Anonymous 로그인을 활성화해야 합니다.

Firestore Rules는 테스트 단계에서 아래처럼 설정할 수 있습니다.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/data/{document=**} {
      allow read, write: if true;
    }
  }
}
```

운영 단계에서는 학교/부서 상황에 맞게 접근 권한을 제한하세요.
