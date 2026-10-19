# AI 사용 프롬프트 기록 (used_prompts.md)

본 문서는 `jwt-todo-api` 과제 개발에 실제로 사용한 프롬프트와 그 결과, 실행한 명령어와 확인 결과를 기록합니다.

## 1. 사용한 주요 프롬프트

### 프롬프트 1: 마스터 프롬프트 (전체 과제 수행)

**목적:** JWT 인증 TODO REST API의 요구사항 정의 및 구현·테스트·문서화·제출 ZIP 생성까지 전체 수행 지시

**요지:**
- 기술 스택 고정: Node.js 20+, TypeScript, NestJS, npm, TypeORM, better-sqlite3, SQLite 파일 DB, @nestjs/jwt/passport-jwt, bcrypt, class-validator/class-transformer, Jest/Supertest
- 필수 API: `POST /users/signup`, `POST /users/login`, `GET /users/me`, `POST/GET/GET:id/PUT:id/DELETE:id /todos`
- 보안 요구: Bearer 인증, 토큰 만료 검증, 401/404/409 처리, 해시 미노출, 환경변수 기반 JWT Secret, 이메일 유니크 제약조건
- 테스트 요구: 4개 시나리오(회원가입→로그인→내정보 / TODO CRUD / 인증 실패 / 미존재 ID) + 추가 검증(중복 이메일, 입력 검증, 교차 사용자 차단, 만료 토큰, 테스트 격리)
- 산출물: README 14개 항목, `prompts/used_prompts.md`, `.env.example`, 제출 ZIP(`node_modules/`, `dist/`, `.env`, DB 파일 제외)

**AI가 수행한 주요 결과:**
- 프로젝트 스캐폴드: package.json, tsconfig(2종), nest-cli.json, .gitignore, .env.example
- 데이터 계층: `env.validation.ts`(시작 시점 env 검증), `database.module.ts`(better-sqlite3 + synchronize), `User`/`Todo` 엔티티(UNIQUE 이메일, FK CASCADE)
- 사용자/인증: `UsersModule`(회원가입), `AuthModule`(로그인/JWT), `JwtStrategy`, `JwtAuthGuard`, `@CurrentUser()` 데코레이터, `GET /users/me`
- TODO: `TodosModule` CRUD, 모든 쿼리에 소유자 스코프 적용
- 테스트: 단위 테스트 3건 스위트, 통합 테스트(e2e) 34건 — 인메모리 SQLite로 격리
- 문서: README.md, 본 문서

추가 프롬프트(세부 지시)는 사용하지 않았고, 마스터 프롬프트 1건으로 전 과제를 수행했습니다. 개발 도중 라이브러리 버전/호환성 판단, 폴더 구조 세부 결정 등은 AI가 자율적으로 판단해 진행했습니다.

## 2. 실행한 명령어와 확인 결과

| 단계 | 명령어 | 결과 |
| --- | --- | --- |
| 환경 확인 | `node --version` / `npm --version` | v25.6.1 / 11.9.0 (요구 Node 20+ 충족) |
| 레지스트리 버전 조사 | `npm view <패키지> version/peerDependencies/engines` | NestJS 12.x 최신 확인, typeorm 1.1.2가 better-sqlite3 ^12 peer 요구 확인, TS 7.0.2는 ts-jest 미지원(<7) 확인 |
| 의존성 설치 | `npm install` | 성공(596 패키지). @nestjs/schematics 제거 후 재설치(아래 문제 1) |
| 네이티브 모듈 점검 | `node -e "require('better-sqlite3')... bcrypt..."` | 인메모리 테이블 생성, hash/compare 정상 동작 |
| 빌드 | `npm run build` | exit 0, `dist/` 생성 (엔티티 strict 초기화 오류 수정 후 — 아래 문제 2) |
| DB 자동 생성 확인 | 서버 기동 후 better-sqlite3로 `sqlite_master` 조회 | `users`, `todos` 테이블 생성, `email` UNIQUE 제약, `todos.userId` FK `ON DELETE CASCADE` 확인 |
| env 검증 확인 | `JWT_SECRET='' node dist/main.js` | 시작 단계에서 명확한 오류 메시지와 함께 실패 확인 |
| 단위 테스트 | `npm test` | 16/16 통과 (env 5, auth 3, todos 8건) |
| 통합 테스트 | `npm run test:e2e` | 34/34 통과 (인메모리 SQLite, 매 테스트 DB 초기화) |
| 운영 서버 동작 확인 | `node dist/main.js` + curl 스크립트 | 회원가입→로그인→/users/me→TODO CRUD→삭제 404 전 흐름 200/201/204 확인 (README 검증 절차) |

## 3. AI 결과에서 발견한 문제 및 수정 내용

1. **@nestjs/schematics peer 충돌 (설치 실패)**
   - 현상: `npm install` ERESOLVE — @nestjs/schematics@12는 `typescript >=6` peer 요구, ts-jest는 `<7` 요구. TypeScript 7은 ts-jest 미지원
   - 조치: 코드 생성(`nest g`)을 사용하지 않으므로 @nestjs/schematics를 제거하고 TypeScript는 ~5.9.3으로 확정 → 설치 성공
2. **엔티티 strict 초기화 컴파일 오류 (TS2564)**
   - 현상: `strict: true`에서 TypeORM 엔티티 속성이 "no initializer" 오류 15건
   - 조치: 엔티티 속성에 확정 할당 어설션(`!`) 적용 — strict 모드를 유지하면서 해결
3. **synchronize로 테이블이 생성되지 않음 (0바이트 DB)**
   - 현상: `autoLoadEntities`만으로는 feature 모듈 등록 전까지 엔티티가 로드되지 않아 최초 부팅 시 테이블 미생성
   - 조치: DataSource 옵션에 `entities: [User, Todo]` 명시 등록 → 부팅 시점 확정 생성
4. **Jest가 @nestjs/* 12(ESM 배포)를 로드하지 못함**
   - 현상: `Must use import to load ES Module .../node_modules/@nestjs/testing/index.js`
   - 원인: NestJS 12 패키지가 `type: module`로 배포. Jest의 require(esm) 지원은 `vm.SourceTextModule`(Node 25에서 `--experimental-vm-modules` 필요)이 있어야 동작
   - 조치: `test`/`test:e2e` 스크립트에 `NODE_OPTIONS=--experimental-vm-modules` 적용 → 해결 (Windows cmd 사용자를 위해 README에 안내)
5. **class-validator에 없는 `Transform` 임포트**
   - 현상: `Module '"class-validator"' has no exported member 'Transform'` (TS2305)
   - 조치: `Transform`은 `class-transformer`에서 임포트하도록 수정
6. **테스트 헬퍼의 숨은 컬럼 미조회**
   - 현상: "저장된 비밀번호는 해시" 테스트에서 `saved.password`가 undefined — `select: false` 동작으로 정상
   - 조치: 테스트에서 `addSelect('user.password')`로 명시 조회하도록 수정. 응답/기본 조회에서 해시가 노출되지 않는다는 요구사항의 역방향 검증으로 활용
7. **jsonwebtoken 타입 불일치 (TS2322)**
   - 현상: `expiresIn: string`이 `number | StringValue`에 할당 불가
   - 조치: `JwtSignOptions['expiresIn']`으로 캐스팅(잘못된 값은 서명 시점에 jsonwebtoken이 검증)
8. **Node 하위 호환 범위 과대 표기 (코드 리뷰 지적)**
   - 현상: `engines.node >=20` 및 README "Node 20 이상" — NestJS 12 패키지가 ESM(`type: module`) 전용 배포인데 빌드 산출물은 CommonJS여서 `require(esm)` 미지원 Node(20.0~20.18, 21.x, 22.0~22.11)에서는 `ERR_REQUIRE_ESM`으로 부팅 실패
   - 조치: `engines.node`를 `>=20.19.0`으로 수정, README 사전 요구사항에 근거와 함께 명시. 수정 후 빌드/테스트 전체 재검증(build 0, 단위 16/16, 통합 34/34)

## 4. 최종 테스트 결과

- `npm run build`: 성공 (오류 0)
- `npm test` (단위): **16/16 통과** — env 검증 5건, auth.service 3건(토큰 발급/자격증명 실패), todos.service 8건(소유권 스코프)
- `npm run test:e2e` (통합): **34/34 통과**
  - 시나리오 1 (회원가입→로그인→내 정보): 200 + 사용자 정보 + password/hash 미포함 확인
  - 시나리오 2 (TODO CRUD): 생성→목록→단건→수정→삭제(204)→재조회 404 전 흐름 + 기본값/검증 케이스
  - 시나리오 3 (인증 실패): 토큰 없음/형식 오류/Bearer 스킴 오류/위조 서명/만료(1초 토큰 실제 대기) 모두 401
  - 시나리오 4 (미존재 ID): GET/PUT/DELETE 모두 404
  - 추가: 중복 이메일 409, 교차 사용자 접근 차단(A가 B의 TODO 조회·수정·삭제 404 + B 데이터 무변경), 필드 주입 400, 빈 body 400, 짧은 비밀번호 400
- 테스트는 매 케이스 전 DB를 초기화(`DELETE FROM todos/users`)하므로 실행 순서에 의존하지 않습니다.
- 운영 서버(curl) 검증: README 절차대로 dev DB 자동 생성 + 전 API 흐름 확인 완료.
- 클린룸 재현 검증: `data/`, `.env`, `dist/` 삭제 상태에서 README 명령만으로(`cp .env.example .env` → `npm run start:dev`) 회원가입 201 / 로그인 토큰 발급 / 내 정보 200 / TODO 생성 201 확인 및 `data/dev.sqlite` 자동 생성 확인.

## 5. 참고: 버전 확정 내역

@nestjs/* 12.1.x, @nestjs/typeorm 12.0.2, typeorm 1.1.2, better-sqlite3 12.11.1(Node 25 공식 지원), bcrypt 6.0.0, typescript 5.9.3, jest 30.5.2, ts-jest 29.4.15, supertest 7.3.1 — `npm ls`로 트리 정상 확인 완료.
