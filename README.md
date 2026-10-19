# jwt-todo-api

JWT 인증이 적용된 TODO REST API입니다. 사용자는 회원가입/로그인을 통해 JWT를 발급받고,
발급받은 토큰으로 자신의 TODO를 생성·조회·수정·삭제할 수 있습니다.
모든 TODO 데이터는 인증된 사용자 본인의 소유 데이터로만 접근이 제한됩니다.

## 1. 프로젝트 소개

- **회원가입/로그인**: 이메일 + 비밀번호 기반 인증, 비밀번호는 bcrypt로 해싱해 저장
- **JWT 인증**: `Authorization: Bearer <token>` 헤더 검증, 만료 시간 설정, 사용자 식별자만 페이로드에 포함
- **TODO CRUD**: 생성/목록/단건조회/수정/삭제, 현재 사용자 소유의 데이터만 접근 가능
- **데이터 소유권 보호**: 타인의 TODO는 존재 여부 노출 없이 일률적으로 404 처리
- **입력값 검증**: class-validator 기반 DTO 검증, 정의되지 않은 필드는 요청 거부(400)

## 2. 선택한 기술 스택

| 분류 | 기술 | 버전(검증됨) |
| --- | --- | --- |
| 런타임 | Node.js | 20 이상 (개발/검증: v25.6.1) |
| 언어 | TypeScript | 5.9.3 |
| 프레임워크 | NestJS | 12.1.x |
| ORM | TypeORM | 1.1.2 (`@nestjs/typeorm` 12.0.2) |
| 데이터베이스 | SQLite (better-sqlite3) | better-sqlite3 12.11.1 |
| 인증 | @nestjs/jwt, @nestjs/passport, passport-jwt | 12.0.3 / 12.0.0 / 4.0.1 |
| 비밀번호 해싱 | bcrypt | 6.0.0 |
| DTO 검증 | class-validator / class-transformer | 0.15.1 / 0.5.1 |
| 테스트 | Jest + Supertest | jest 30.5.2 / supertest 7.3.1 |
| 패키지 매니저 | npm | 11.x |

## 3. 사전 요구사항

- **Node.js 20 이상** (`node --version` 으로 확인)
- **npm 10 이상** (Node 20에 동봉된 버전이면 충분)
- 네이티브 모듈(better-sqlite3, bcrypt) 포함: 대부분의 환경에서 사전 빌드된 바이너리가 설치됩니다.
  사전 빌드 바이너리가 없는 환경에서는 `python3`, `make`, `g++`(또는 해당 플랫폼 빌드도구)가 필요합니다.

## 4. 설치 방법

```bash
npm install
```

## 5. 환경변수 설정 방법

`.env.example`을 복사해 `.env`를 생성하고 값을 수정합니다.

```bash
cp .env.example .env
```

`.env` 항목:

| 변수 | 설명 | 기본값 | 비고 |
| --- | --- | --- | --- |
| `JWT_SECRET` | JWT 서명 시크릿 | (없음, 필수) | **필수**. 누락/빈 값이면 애플리케이션이 시작 단계에서 실패합니다. 32자 이상 무작위 문자열 권장 (`openssl rand -base64 48`) |
| `JWT_EXPIRES_IN` | 토큰 만료 시간 | `1h` | jsonwebtoken 문법 (`30m`, `1h`, `7d` 등) |
| `DB_PATH` | SQLite 파일 경로 | `./data/dev.sqlite` | 디렉터리가 없으면 자동 생성. 테스트는 `:memory:` 사용 |
| `PORT` | 서버 포트 | `3000` | |
| `NODE_ENV` | 실행 환경 | `development` | `production`이면 `synchronize` 비활성화 |

> 시크릿은 소스 코드에 하드코딩되지 않으며 환경변수로만 주입됩니다.

## 6. SQLite 데이터베이스 자동 생성 방식

별도의 SQL 실행은 필요 없습니다.

- TypeORM의 `synchronize` 옵션이 `NODE_ENV !== 'production'` 인 경우 활성화되어,
  애플리케이션 시작 시 `users`, `todos` 테이블을 엔티티 정의로부터 자동 생성합니다.
- `DB_PATH`의 디렉터리(기본 `./data/`)가 없으면 자동으로 생성됩니다.
- 생성되는 제약조건:
  - `users.email` — UNIQUE (DB 레벨 중복 방지)
  - `todos.userId` — `users.id` 외래키, `ON DELETE CASCADE` (사용자 삭제 시 해당 TODO도 삭제되어 관계 일관성 유지)
- 운영(`production`) 환경에서는 `synchronize`가 비활성화되므로 마이그레이션 방식 사용을 권장합니다(과제 범위에서는 개발 DB 자동 생성만 제공).

서버 실행(`npm run start:dev`)만으로 `./data/dev.sqlite` 파일이 생성됩니다.

## 7. 개발 서버 실행 방법

```bash
npm run start:dev
```

기동 후 `http://localhost:{PORT}` (기본 3000) 에서 API를 사용할 수 있습니다.
종료는 `Ctrl+C`입니다. 개발 DB 파일(`data/dev.sqlite`)을 지우고 재시작하면 깨끗한 상태로 다시 생성됩니다.

## 8. 빌드 방법

```bash
npm run build     # dist/ 디렉터리에 컴파일
npm run start:prod  # 빌드 산출물 실행
```

## 9. 테스트 실행 방법

```bash
npm run test       # 단위 테스트 (Jest)
npm run test:e2e   # 통합 테스트 (Jest + Supertest, 실제 HTTP 요청)
```

- 통합 테스트는 **운영 DB와 분리된 인메모리 SQLite(`:memory:`)** 를 사용하며,
  매 테스트 전 데이터를 초기화해 실행 순서에 의존하지 않습니다.
- `users`↔`todos` 교차 검증, 위조/만료 토큰, 교차 사용자 접근 차단 등 보안 시나리오를 포함합니다.
- 스크립트에 `NODE_OPTIONS=--experimental-vm-modules`가 포함되어 있습니다. NestJS 12 패키지가 ESM으로 배포되어
  Jest가 이를 로드하기 위해 필요한 플래그입니다(Node 20 이상 동일). Windows `cmd`에서는 실행 전
  `set NODE_OPTIONS=--experimental-vm-modules` 를 먼저 실행하세요(PowerShell은 `$env:NODE_OPTIONS="--experimental-vm-modules"`).

## 10. 전체 API 목록

| 메서드 | 경로 | 인증 | 설명 |
| --- | --- | --- | --- |
| POST | `/users/signup` | 불필요 | 회원가입 |
| POST | `/users/login` | 불필요 | 로그인, access_token 발급 |
| GET | `/users/me` | **필요** | 내 정보 조회 |
| POST | `/todos` | **필요** | TODO 생성 |
| GET | `/todos` | **필요** | 내 TODO 목록 |
| GET | `/todos/:id` | **필요** | TODO 단건 조회 |
| PUT | `/todos/:id` | **필요** | TODO 수정 |
| DELETE | `/todos/:id` | **필요** | TODO 삭제 |

## 11. 요청 및 응답 예시

### 회원가입 — POST /users/signup

```bash
curl -X POST http://localhost:3000/users/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "developer@example.com", "password": "StrongPassword123!", "name": "홍길동"}'
```

`201 Created`

```json
{
  "id": 1,
  "email": "developer@example.com",
  "name": "홍길동",
  "createdAt": "2026-10-19T03:00:00.000Z",
  "updatedAt": "2026-10-19T03:00:00.000Z"
}
```

### 로그인 — POST /users/login

```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "developer@example.com", "password": "StrongPassword123!"}'
```

`200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 내 정보 — GET /users/me

`200 OK`

```json
{
  "id": 1,
  "email": "developer@example.com",
  "name": "홍길동",
  "createdAt": "2026-10-19T03:00:00.000Z",
  "updatedAt": "2026-10-19T03:00:00.000Z"
}
```

### TODO 생성 — POST /todos

```bash
curl -X POST http://localhost:3000/todos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "JWT 인증 구현", "description": "인증 및 인가 테스트 작성", "completed": false}'
```

`201 Created`

```json
{
  "id": 1,
  "title": "JWT 인증 구현",
  "description": "인증 및 인가 테스트 작성",
  "completed": false,
  "userId": 1,
  "createdAt": "2026-10-19T03:05:00.000Z",
  "updatedAt": "2026-10-19T03:05:00.000Z"
}
```

- `title` 필수, `description`/`completed` 선택(기본값 `null`/`false`)

### TODO 목록 — GET /todos

`200 OK` — 내 소유의 TODO 배열

```json
[
  { "id": 1, "title": "JWT 인증 구현", "description": "인증 및 인가 테스트 작성", "completed": false, "userId": 1, "createdAt": "...", "updatedAt": "..." }
]
```

### TODO 단건 — GET /todos/:id

`200 OK` — TODO 객체 1건 (위와 동일 형태)

### TODO 수정 — PUT /todos/:id

```bash
curl -X PUT http://localhost:3000/todos/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "JWT 인증 구현 완료", "completed": true}'
```

`200 OK` — 수정된 TODO 객체. 수정 가능한 필드는 `title`, `description`, `completed` 이며 전달된 필드만 반영됩니다.

### TODO 삭제 — DELETE /todos/:id

`204 No Content` (본문 없음)

## 12. 인증 헤더 사용 방법

로그인으로 발급받은 토큰을 다음 형식으로 전달합니다.

```
Authorization: Bearer <access_token>
```

예시(curl):

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "developer@example.com", "password": "StrongPassword123!"}' | jq -r .access_token)

curl -s http://localhost:3000/users/me -H "Authorization: Bearer $TOKEN"
```

- 토큰이 없거나, 서명이 유효하지 않거나, 만료된 경우 `401 Unauthorized`를 반환합니다.
- JWT 페이로드는 `{ "sub": <사용자ID>, "email": "<이메일>" }` 이며 비밀번호/해시는 포함되지 않습니다.
- 사용자 ID는 요청 본문이 아닌 **검증된 JWT 페이로드에서만** 추출합니다.

## 13. HTTP 오류 코드 요약

| 상태 코드 | 발생 조건 |
| --- | --- |
| `400 Bad Request` | DTO 검증 실패(형식 오류, 필수 필드 누락, 정의되지 않은 필드 포함), 비숫자 `:id` |
| `401 Unauthorized` | 토큰 없음/형식 오류/서명 위조/만료, 로그인 자격증명 불일치 |
| `404 Not Found` | 존재하지 않거나 현재 사용자 소유가 아닌 TODO (조회/수정/삭제) |
| `409 Conflict` | 이미 등록된 이메일로 회원가입 |
| `500 Internal Server Error` | 예기치 못한 서버 오류 |

## 14. 알려진 제한 사항

- **리프레시 토큰 없음**: access_token 하나만 발급됩니다. 만료 후에는 재로그인이 필요합니다.
- **토큰 블랙리스팅/로그아웃 API 없음**: 발급된 토큰은 만료까지 유효합니다.
  (단, 사용자가 삭제되면 이후 요청은 전략에서 사용자 존재를 재확인해 401 처리됩니다)
- **운영 마이그레이션 미제공**: `NODE_ENV=production`에서는 `synchronize`가 꺼지므로 테이블 생성을 위해
  TypeORM 마이그레이션 도입이 필요합니다(과제 요구 범위는 개발 DB 자동 생성).
- **페이지네이션 없음**: `GET /todos`는 소유한 TODO 전체를 반환합니다.
- **better-sqlite3/bcrypt는 네이티브 모듈**: 사전 빌드 바이너리가 없는 환경에서는 빌드 도구(python3, make, g++)가 필요합니다.
- **devDependencies에 npm audit moderate 경고 다수 존재**(@nestjs/cli 하위 트리). 런타임 의존성에는 영향이 없습니다.
- **단일 인스턴스 가정**: SQLite 특성상 다중 프로세스/서버 수평 확장에는 부적합합니다.
