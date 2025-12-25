<div align="center">

# 시니어 롱폼 이미지 생성기 (Senior Longform Image Generator)

## AI 기반 한국형 숏폼 영상 제작 도구

Google Gemini AI를 활용하여 캐릭터 일관성 있는 이미지와 시나리오를 생성하는 React 애플리케이션입니다.

</div>

---

## 주요 기능

### 1. 에셋 관리 (Assets Tab)

- **캐릭터 생성**: 한국어 설명을 입력하면 AI가 자동으로 분석하여 포토리얼리스틱한 캐릭터 초상화 생성
- **소품 관리**: 스토리에 필요한 핵심 소품 및 일반 소품 등록
- **배경 관리**: 실내/실외, 도시/자연 등 다양한 배경 에셋 관리
- **역할 분류**: 주인공, 조연, 단역 등 캐릭터 역할 구분

### 2. 시나리오 생성 (Scenario Tab)

- **AI 시나리오 작성**: 주제, 분위기, 영상 길이를 입력하면 전문적인 숏폼 시나리오 자동 생성
- **씬 구성**: Hook → Setup → Development → Climax → Resolution 구조의 스토리 비트
- **다양한 톤/분위기**: 감성/힐링, 드라마틱, 동기부여, 로맨틱, 코믹, 미스터리, 향수 등
- **씬별 이미지 생성**: 각 씬에 대해 캐릭터 일관성을 유지한 이미지 자동 생성
- **씬 재생성**: 특정 씬만 선택하여 다시 생성 가능

### 3. 영상 편집 (Video Tab)

- **타임라인 관리**: 생성된 씬들을 타임라인에 배치
- **비디오 클립 생성**: 이미지를 기반으로 AI 영상 클립 생성 (개발 중)

### 4. 이미지 편집

- **AI 기반 수정**: 기존 이미지에 텍스트 프롬프트로 수정 요청
- **캐릭터 일관성 유지**: 수정 시에도 캐릭터의 정체성 보존
- **줌/확대 기능**: 생성된 이미지 상세 확인

---

## 기술 스택

| 분류        | 기술                      |
| ----------- | ------------------------- |
| Frontend    | React 19, TypeScript      |
| 빌드 도구   | Vite 6                    |
| 스타일링    | Tailwind CSS (다크 테마)  |
| AI 모델     | Google Gemini AI          |
| 패키지      | @google/genai, JSZip      |

### 사용된 AI 모델

- `gemini-2.5-flash`: 캐릭터 데이터 추출, 시나리오 생성
- `imagen-4.0-generate-001`: 캐릭터 초상화 생성
- `gemini-2.5-flash-image-preview`: 씬 이미지 생성, 이미지 편집

---

## 시작하기

### 사전 요구사항

- Node.js (v18 이상 권장)
- Google Gemini API 키

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
# .env.local 파일을 생성하고 API 키 추가
echo "GEMINI_API_KEY=your_api_key_here" > .env.local

# 3. 개발 서버 실행
npm run dev
```

개발 서버가 시작되면 `http://localhost:3000`에서 접속할 수 있습니다.

### 빌드

```bash
# 프로덕션 빌드
npm run build

# 빌드 결과물 미리보기
npm run preview
```

---

## 프로젝트 구조

```text
├── App.tsx                 # 메인 앱 컨테이너
├── types.ts                # TypeScript 타입 정의
├── index.tsx               # 앱 진입점
├── index.html              # HTML 템플릿
├── vite.config.ts          # Vite 설정
├── components/
│   ├── common/
│   │   └── TabNavigation.tsx    # 탭 네비게이션
│   ├── character/
│   │   ├── AssetTab.tsx         # 에셋 관리 탭
│   │   ├── AssetCreatorModal.tsx # 에셋 생성 모달
│   │   ├── CharacterCard.tsx    # 캐릭터 카드
│   │   ├── PropCard.tsx         # 소품 카드
│   │   └── BackgroundCard.tsx   # 배경 카드
│   ├── scenario/
│   │   └── ScenarioTab.tsx      # 시나리오 탭
│   ├── video/
│   │   └── VideoTab.tsx         # 영상 편집 탭
│   ├── ScenarioGenerator.tsx    # 시나리오 생성기
│   ├── ScenarioEditor.tsx       # 시나리오 에디터
│   ├── ImageEditor.tsx          # 이미지 편집기
│   ├── ImageUploader.tsx        # 이미지 업로더
│   ├── ResultDisplay.tsx        # 결과 표시
│   ├── ChapterDisplay.tsx       # 챕터 표시
│   └── Icons.tsx                # 아이콘 컴포넌트
├── contexts/
│   └── ProjectContext.tsx       # 프로젝트 상태 관리
├── services/
│   └── geminiService.ts         # Gemini AI 서비스
└── hooks/                       # 커스텀 훅
```

---

## 핵심 워크플로우

### 1. 캐릭터 생성 파이프라인

```text
한국어 설명 입력 → Gemini로 구조화된 데이터 추출 → Imagen으로 초상화 생성 → 라이브러리에 저장
```

### 2. 시나리오 생성 파이프라인

```text
주제/톤/길이 입력 → AI가 씬 구성 → 각 씬별 이미지 프롬프트 생성 → 캐릭터 참조하여 이미지 생성
```

### 3. 이미지 편집 파이프라인

```text
기존 이미지 선택 → 수정 프롬프트 입력 → AI가 캐릭터 일관성 유지하며 수정
```

---

## 주요 특징

- **한국형 최적화**: 한국어 입력, 한국인 캐릭터 생성에 특화
- **포토리얼리스틱**: 실사 수준의 고품질 이미지 생성
- **캐릭터 일관성**: 동일 캐릭터가 여러 씬에서 일관된 모습 유지
- **드래그 앤 드롭**: 직관적인 콘텐츠 정리 기능
- **다크 테마 UI**: 장시간 작업에 편안한 다크 그레이 테마
- **반응형 레이아웃**: 다양한 화면 크기 지원

---

## 환경 변수

| 변수명           | 설명                   | 필수 |
| ---------------- | ---------------------- | ---- |
| `GEMINI_API_KEY` | Google Gemini API 키   | O    |

---

## 라이선스

Private Project
