# JWT TODO API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** JWT 인증이 적용된 TODO REST API(`jwt-todo-api`)를 NestJS + TypeORM + SQLite(better-sqlite3)로 구현하고, 통합 테스트·README·제출 ZIP까지 완성한다.

**Architecture:** NestJS 모듈 구조(users / auth / todos / database). 인증은 passport-jwt 전략 + 전용 가드(라우트 단위 적용), 사용자 ID는 검증된 JWT 페이로드에서만 추출. SQLite는 TypeORM `synchronize`로 개발/테스트 환경에서 자동 생성, DB 경로와 JWT 설정은 환경변수로 관리(@nestjs/config). e2e는 in-memory SQLite로 앱을 직접 부팅하여 순서 의존 없이 격리.

**Tech Stack:** NestJS(최신 안정), TypeORM 0.3.x + better-sqlite3, @nestjs/jwt + passport-jwt, bcrypt, class-validator/class-transformer, Jest + Supertest, TypeScript.

**Spec:** 사용자 제공 마스터 프롬프트(이 세션의 원문). 원문이 스펙의 단일 출처이며 모든 요구사항은 원문을 따른다.

## Global Constraints

- Node.js 20 이상 / TypeScript / NestJS / npm / TypeORM / better-sqlite3 / SQLite 파일 DB (스펙 고정)
- JWT: @nestjs/jwt, @nestjs/passport, passport-jwt. Secret은 환경변수, 소스 하드코딩 금지. 누락 시 시작 단계에서 명확한 오류
- 비밀번호: bcrypt 해싱, 원문/해시 응답 노출 금지, 토큰 미포함
- 엔드포인트: POST /users/signup, POST /users/login, GET /users/me, POST/GET/GET:id/PUT:id/DELETE:id /todos
- 소유권: 타인/미존재 TODO는 모두 404, 존재 여부 노출 금지. 사용자 ID는 요청 본문 신뢰 금지
- 검증: ValidationPipe(whitelist + forbidNonWhitelisted + transform), 이메일 유니크 제약조건
- 스크립트: start:dev, build, test, test:e2e — 모두 실제 동작해야 함
- 산출물: README.md(14개 항목), prompts/used_prompts.md(실제 작업 기준), .env.example, ZIP(`nestjs.zip`, node_modules/dist/.env/DB파일 제외, 루트 기준 경로)
- 빌드/테스트 결과는 실제 실행 출력 기준으로만 보고

## Review Focus

1. **비숫자 :id (예: GET /todos/abc)** → 404(또는 400)로 처리, 500 금지 → Task 5 서비스/컨트롤러 파싱 처리 + e2e 확인
2. **DTO 외 필드 주입 (예: todo 생성 시 userId/createdAt 전달)** → 400(forbidNonWhitelisted) → Task 5 + Task 6 e2e
3. **JWT_SECRET 누락/빈 값으로 시작** → 시작 즉시 명확한 예외 → Task 2 env 검증 + 단위 테스트
4. **만료·변조(다른 시크릿 서명) 토큰** → 401 → Task 6 e2e(1초 만료 토큰 실제 대기, 잘못된 시크릿 서명 토큰)
5. **잘못된 Content-Type/형식뿐인 JSON** → 400, 서버 크래시 없음 → Task 6 e2e(빈 body POST 등)

---

### Task 1: 프로젝트 스캐폴드 + 의존성 설치

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `.gitignore`, `.env.example`, `src/main.ts`, `src/app.module.ts`(최소), `src/app.controller.ts`(헬스체크용, 최종 제거 여부는 Task 7에서 결정)

**Interfaces:**
- Produces: 실행 가능한 Nest 앱 골격, `npm run start:dev` / `build` / `test` / `test:e2e` 스크립트(스크립트는 후속 태스크에서 실제 동작 확인)

- [ ] **Step 1: package.json + 설정 파일 작성** — dependencies: @nestjs/common, core, platform-express, config, typeorm, jwt, passport, passport-jwt / typeorm / better-sqlite3 / bcrypt / class-validator / class-transformer / reflect-metadata / rxjs / passport / passport-jwt. devDependencies: @nestjs/cli, @nestjs/testing, typescript, ts-node, ts-jest, jest, @types/jest, @types/node, @types/supertest, @types/passport-jwt, @types/bcrypt, @types/express, supertest
- [ ] **Step 2: `npm install` 실행** — 네이티브 모듈(better-sqlite3, bcrypt) 빌드 확인. 실패 시 컴파일 도구 유무 확인 후 조치/보고
- [ ] **Step 3: 버전 호환성 확인** — `npm ls`로 의존성 트리 정상 확인, 설치된 주요 버전 기록
- [ ] **Step 4: 최소 앱 부팅 확인** — `npm run build` 성공 + 서버 기동 로그 확인 후 종료
- [ ] **Step 5: git init + 커밋**

### Task 2: DB 및 환경설정 계층

**Files:**
- Create: `src/database/database.module.ts`(또는 app.module 내 DataSource 팩토리), `src/config/env.validation.ts`(이름은 구현에 맞게), `src/users/entities/user.entity.ts`, `src/todos/entities/todo.entity.ts`
- Modify: `src/app.module.ts`
- Test: `src/config/env.validation.spec.ts`

**Interfaces:**
- Produces: `User` 엔티티 — `id`(auto-increment PK), `email`(unique), `password`(bcrypt 해시, `select: false`), `name`, timestamps. `Todo` 엔티티 — `id`, `title`, `description`(nullable), `completed`(기본 false), `userId` FK(삭제 시 CASCADE), timestamps. `TypeOrmModule.forRootAsync` 설정: `type: 'better-sqlite3'`, `database: DB_PATH`, `synchronize: NODE_ENV !== 'production'`, `autoLoadEntities: true`. env 검증: `JWT_SECRET` 없으면 시작 실패, `JWT_EXPIRES_IN`(기본 '1h'), `DB_PATH`(기본 './data/dev.sqlite')

- [ ] **Step 1: env 검증 단위 테스트 작성** — JWT_SECRET 누락 시 에러 케이스
- [ ] **Step 2: 테스트 실행으로 실패 확인**
- [ ] **Step 3: env 검증 + DataSource 설정 + 엔티티 구현**
- [ ] **Step 4: 앱 부팅으로 테이블 자동 생성 확인** — data/ 디렉터리 및 DB 파일 생성, sqlite 테이블 존재 확인(.schema 조회)
- [ ] **Step 5: 커밋**

### Task 3: Users — 회원가입

**Files:**
- Create: `src/users/users.module.ts`, `src/users/users.controller.ts`, `src/users/users.service.ts`, `src/users/dto/signup.dto.ts`
- Test: `test/app.e2e-spec.ts`(회원가입 describe — 파일 신규 생성, jest-e2e.json 포함)

**Interfaces:**
- Produces: `UsersService.create(SignupDto): Promise<Omit<User,'password'>>`(중복 이메일 → 409 ConflictException). `POST /users/signup` → 201, 응답에 password/hash 미포함. DTO: email(@IsEmail + trim), password(@MinLength(8)), name(@IsNotEmpty)

- [ ] **Step 1: e2e 회원가입 테스트 작성** — 201/응답 필드/중복 409/잘못된 이메일 400/누락 필드 400. e2e 헬퍼: in-memory SQLite로 TestingModule 부팅
- [ ] **Step 2: 실행해 실패 확인**
- [ ] **Step 3: users 모듈 구현**
- [ ] **Step 4: e2e 통과 확인**
- [ ] **Step 5: 커밋**

### Task 4: Auth — 로그인/JWT/내 정보

**Files:**
- Create: `src/auth/auth.module.ts`, `src/auth/auth.service.ts`, `src/auth/strategies/jwt.strategy.ts`, `src/auth/guards/jwt-auth.guard.ts`, `src/auth/dto/login.dto.ts`, `src/common/decorators/current-user.decorator.ts`
- Modify: `src/users/users.controller.ts`(GET /users/me), `src/users/users.service.ts`(이메일+select 비밀번호 조회), `src/app.module.ts`(ValidationPipe 전역)
- Test: `test/app.e2e-spec.ts`(로그인/me describe), `src/auth/auth.service.spec.ts`

**Interfaces:**
- Produces: `AuthService.login(LoginDto): Promise<{ access_token: string }>`(실패 시 401). JWT 페이로드 `{ sub: user.id, email }`, 만료 `JWT_EXPIRES_IN`. `JwtAuthGuard`(라우트 단위), `@CurrentUser()` 데코레이터 → `{ id, email }`(전략에서 사용자 존재 재확인). `POST /users/login` → 200, `GET /users/me` → 200(인증 필수)

- [ ] **Step 1: auth.service 단위 테스트(토큰 발급/자격증명 실패) + e2e 로그인/me 테스트 작성**
- [ ] **Step 2: 실행해 실패 확인**
- [ ] **Step 3: auth 모듈·전략·가드·me 구현**
- [ ] **Step 4: 토큰으로 /users/me 200 + password 미포함 확인**
- [ ] **Step 5: 커밋**

### Task 5: Todos — CRUD + 소유권

**Files:**
- Create: `src/todos/todos.module.ts`, `src/todos/todos.controller.ts`, `src/todos/todos.service.ts`, `src/todos/dto/create-todo.dto.ts`, `src/todos/dto/update-todo.dto.ts`
- Test: `test/app.e2e-spec.ts`(CRUD describe)

**Interfaces:**
- Consumes: `@CurrentUser()`가 반환하는 `{ id }`
- Produces: `TodosService.create/list/getOne(id,userId)/update(id,userId,dto)/remove(id,userId)` — 모든 조회에 `userId` 스코프 적용, 미존재/비소유 → 404. `UpdateTodoDto`: title/description/completed 모두 선택(PartialType 금지—명시 정의, forbidNonWhitelisted). DELETE → 204

- [ ] **Step 1: e2e CRUD 시나리오 작성**(생성 201/목록 격리/단건/수정/삭제 204/재조회 404/비숫자 id)
- [ ] **Step 2: 실행해 실패 확인**
- [ ] **Step 3: todos 모듈 구현**
- [ ] **Step 4: e2e 통과 확인**
- [ ] **Step 5: 커밋**

### Task 6: 보안 e2e 강화

**Files:**
- Test: `test/app.e2e-spec.ts`(인증 실패/404/교차 사용자/만료 토큰 describe)

- [ ] **Step 1: 시나리오 3·4 + 추가 검증 테스트 작성** — 토큰 없음 401(users/me, POST/GET todos), 위조 서명 401, 만료 토큰(1초 만료 발급 후 실제 대기) 401, 미존재 id 404(GET/PUT/DELETE), 사용자 A가 B의 TODO 접근 404(조회·수정·삭제), 필드 주입 400, 잘못된 비밀번호 401, 중복 409(이미 Task 3), 빈 body 400
- [ ] **Step 2: 실행해 전부 통과 확인(실패 시 구현 수정)**
- [ ] **Step 3: 커밋**

### Task 7: 단위 테스트 보강 + 문서화

**Files:**
- Create: `src/todos/todos.service.spec.ts`, `README.md`, `prompts/used_prompts.md`
- Modify: 필요 시 `src/app.controller.ts` 정리

**Interfaces:**
- Produces: README 14개 항목(실행/테스트/빌드/환경변수/API 목록·예시/인증 헤더/오류 코드/제한 사항), 프롬프트 기록(실제 실행 명령·결과 기준)

- [ ] **Step 1: todos.service 단위 테스트(소유권 스코프, 404) 작성 및 통과**
- [ ] **Step 2: README.md 작성**
- [ ] **Step 3: prompts/used_prompts.md 작성(이 문서는 최종 결과 확정 후 Task 8의 실제 실행 결과로 갱신)**
- [ ] **Step 4: 커밋**

### Task 8: 전체 검증 + ZIP

- [ ] **Step 1: `npm run build` 실행·성공 확인**
- [ ] **Step 2: `npm run test` 실행·전체 통과 확인**
- [ ] **Step 3: `npm run test:e2e` 실행·전체 통과 확인**
- [ ] **Step 4: README 절차 재현 검증** — DB 파일 삭제 후 README 명령만으로 dev DB 재생성 + 서버 기동 + curl 스크립트로 스토리지 회원가입→로그인→TODO CRUD 흐름 확인
- [ ] **Step 5: `prompts/used_prompts.md` 최종 결과 반영**
- [ ] **Step 6: `nestjs.zip` 생성** — 포함: src/, test/, package.json, package-lock.json, README.md, prompts/, .env.example, 설정 파일들. 제외: node_modules/, dist/, data/, .env, docs/. `unzip -l`로 경로가 루트 기준인지 확인
- [ ] **Step 7: 최종 보고**
