# Hookstick

Hookstick은 Next.js 기반의 웹 크롤링/스크래핑 도구로, 다양한 쇼핑몰 상품 정보를 자동으로 수집할 수 있는 프로젝트입니다. Playwright를 활용하여 상품 이미지, 가격, 상세 URL 등을 추출합니다.

## 주요 기능
- 다양한 쇼핑몰 상품 목록 크롤링 및 정보 추출
- Playwright 기반의 안정적인 크롤링 (재시도, 타임아웃, 리소스 차단 등)
- Next.js 15, React 19, TypeScript, TailwindCSS 적용
- 커스텀 컴포넌트 및 API 구조화

## 폴더 구조
```
├── src
│   ├── app           # Next.js 앱 엔트리포인트 및 페이지
│   │   └── api       # API 라우트 (크롤링 엔드포인트 등)
│   ├── components    # UI 컴포넌트
│   ├── hooks         # 커스텀 React 훅
│   ├── lib           # 유틸리티 함수
│   └── types         # 타입 정의
```

## 설치 및 실행 방법
1. 의존성 설치
```bash
npm install
```
2. 개발 서버 실행
```bash
npm run dev
```
3. 브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 주요 스크립트
- `npm run dev` : 개발 서버 실행
- `npm run build` : 프로덕션 빌드
- `npm run start` : 프로덕션 서버 실행
- `npm run lint` : 코드 린트 검사

## API 사용법
### 상품 크롤링 엔드포인트
- **POST** `/api/crawl`
- **Body 예시**
```json
{
  "url": "https://example.com/category",
  "baseUrl": "https://example.com",
  "limit": 20
}
```
- **응답 예시**
```json
{
  "products": [
    {
      "url": "https://example.com/product/123",
      "thumbnail": "https://example.com/images/123.jpg",
      "price": 19900
    },
    ...
  ]
}
```
- **설명**: 지정한 카테고리/리스트 URL에서 상품 정보를 최대 `limit`개까지 추출합니다. `baseUrl`은 도메인 기준입니다.

## 주요 의존성
- next@15, react@19, playwright, puppeteer, axios, tailwindcss 등

## 참고
- 본 프로젝트는 학습 및 연구 목적의 크롤링 도구입니다. 실제 서비스 적용 시 각 사이트의 robots.txt 및 이용약관을 반드시 준수하세요.
