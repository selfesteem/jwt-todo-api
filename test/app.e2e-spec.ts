import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { bootstrapTestApp, clearDatabase, getRepo, signupAndLogin, TestContext } from './support/test-app';
import { User } from '../src/users/entities/user.entity';

describe('TODO API (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  });

  beforeEach(async () => {
    await clearDatabase(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('회원가입 POST /users/signup', () => {
    const validBody = {
      email: 'developer@example.com',
      password: 'StrongPassword123!',
      name: '홍길동',
    };

    it('유효한 요청이면 201과 password/hash 미포함 사용자 정보를 반환한다', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/users/signup')
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.email).toBe('developer@example.com');
      expect(res.body.name).toBe('홍길동');
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('passwordHash');
      // 응답 전체에 bcrypt 해시 형태($2a$/$2b$/$2y$) 문자열이 없어야 한다
      expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
    });

    it('저장된 비밀번호는 해시되어 있다 (원문 아님)', async () => {
      await request(ctx.app.getHttpServer()).post('/users/signup').send(validBody).expect(201);

      // password 컬럼은 select:false 이므로 명시적으로 select 해야 확인 가능하다
      const saved = await getRepo(ctx, User)
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.email = :email', { email: validBody.email })
        .getOneOrFail();
      expect(saved.password).toMatch(/^\$2[aby]\$/);
      expect(saved.password).not.toBe(validBody.password);
    });

    it('중복 이메일은 409 Conflict', async () => {
      await request(ctx.app.getHttpServer()).post('/users/signup').send(validBody).expect(201);

      const res = await request(ctx.app.getHttpServer()).post('/users/signup').send(validBody);

      expect(res.status).toBe(409);
    });

    it('잘못된 이메일 형식은 400', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/users/signup')
        .send({ ...validBody, email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('필수 필드 누락(password) 시 400', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/users/signup')
        .send({ email: 'nopw@example.com', name: '누락' });

      expect(res.status).toBe(400);
    });

    it('필수 필드 누락(name) 시 400', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/users/signup')
        .send({ email: 'noname@example.com', password: 'StrongPassword123!' });

      expect(res.status).toBe(400);
    });

    it('DTO에 없는 필드 전달 시 400 (mass assignment 방지)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/users/signup')
        .send({ ...validBody, role: 'admin' });

      expect(res.status).toBe(400);
    });
  });

  describe('로그인 POST /users/login', () => {
    const credentials = {
      email: 'login-user@example.com',
      password: 'StrongPassword123!',
      name: '로그인유저',
    };

    beforeEach(async () => {
      await request(ctx.app.getHttpServer()).post('/users/signup').send(credentials).expect(201);
    });

    it('올바른 자격증명이면 200과 access_token(JWT)을 반환한다', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/users/login')
        .send({ email: credentials.email, password: credentials.password });

      expect(res.status).toBe(200);
      expect(typeof res.body.access_token).toBe('string');
      // JWT 형식: header.payload.signature
      expect(res.body.access_token.split('.')).toHaveLength(3);
    });

    it('잘못된 비밀번호면 401', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/users/login')
        .send({ email: credentials.email, password: 'WrongPassword123!' });

      expect(res.status).toBe(401);
      expect(res.body.access_token).toBeUndefined();
    });

    it('존재하지 않는 이메일이면 401', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/users/login')
        .send({ email: 'ghost@example.com', password: 'StrongPassword123!' });

      expect(res.status).toBe(401);
    });

    it('요청 형식 오류(이메일 아님)는 400', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/users/login')
        .send({ email: 'not-an-email', password: 'StrongPassword123!' });

      expect(res.status).toBe(400);
    });
  });

  describe('내 정보 GET /users/me', () => {
    it('시나리오1: 회원가입 → 로그인 → 토큰으로 내 정보 조회', async () => {
      const server = ctx.app.getHttpServer();
      const email = 'scenario1@example.com';

      // 1) 회원가입
      await request(server)
        .post('/users/signup')
        .send({ email, password: 'StrongPassword123!', name: '시나리오유저' })
        .expect(201);

      // 2) 로그인 → access_token 발급
      const loginRes = await request(server)
        .post('/users/login')
        .send({ email, password: 'StrongPassword123!' });
      expect(loginRes.status).toBe(200);
      const token: string = loginRes.body.access_token;
      expect(token).toBeDefined();

      // 3) 토큰으로 내 정보 조회
      const meRes = await request(server)
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.email).toBe(email);
      expect(meRes.body.name).toBe('시나리오유저');
      expect(meRes.body.id).toBeDefined();
      expect(meRes.body).not.toHaveProperty('password');
      expect(meRes.body).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(meRes.body)).not.toMatch(/\$2[aby]\$/);
    });

    it('토큰 없이 호출하면 401', async () => {
      const res = await request(ctx.app.getHttpServer()).get('/users/me');

      expect(res.status).toBe(401);
    });
  });

  describe('TODO CRUD /todos', () => {
    let token: string;
    let server: ReturnType<TestContext['app']['getHttpServer']>;

    beforeEach(async () => {
      server = ctx.app.getHttpServer();
      token = await signupAndLogin(ctx.app, 'todo-user@example.com');
    });

    const withAuth = (): { Authorization: string } => ({ Authorization: `Bearer ${token}` });

    it('시나리오2: 생성 → 목록 → 단건조회 → 수정 → 삭제 → 재조회 404', async () => {
      // 생성
      const createRes = await request(server)
        .post('/todos')
        .set(withAuth())
        .send({ title: 'JWT 인증 구현', description: '인증 및 인가 테스트 작성', completed: false });

      expect(createRes.status).toBe(201);
      expect(createRes.body.id).toBeDefined();
      expect(createRes.body.title).toBe('JWT 인증 구현');
      expect(createRes.body.description).toBe('인증 및 인가 테스트 작성');
      expect(createRes.body.completed).toBe(false);
      const todoId = createRes.body.id;

      // 목록
      const listRes = await request(server).get('/todos').set(withAuth());
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.some((t: { id: number }) => t.id === todoId)).toBe(true);

      // 단건 조회
      const oneRes = await request(server).get(`/todos/${todoId}`).set(withAuth());
      expect(oneRes.status).toBe(200);
      expect(oneRes.body.id).toBe(todoId);
      expect(oneRes.body.title).toBe('JWT 인증 구현');

      // 수정 (제목 + 완료 상태)
      const putRes = await request(server)
        .put(`/todos/${todoId}`)
        .set(withAuth())
        .send({ title: 'JWT 인증 구현 완료', completed: true });
      expect(putRes.status).toBe(200);
      expect(putRes.body.title).toBe('JWT 인증 구현 완료');
      expect(putRes.body.completed).toBe(true);

      // 삭제
      const delRes = await request(server).delete(`/todos/${todoId}`).set(withAuth());
      expect(delRes.status).toBe(204);

      // 재조회 404
      const afterRes = await request(server).get(`/todos/${todoId}`).set(withAuth());
      expect(afterRes.status).toBe(404);
    });

    it('description/completed 생략 시 기본값 적용 (description=null, completed=false)', async () => {
      const res = await request(server).post('/todos').set(withAuth()).send({ title: '최소 필드' });

      expect(res.status).toBe(201);
      expect(res.body.completed).toBe(false);
      expect(res.body.description).toBeNull();
    });

    it('title 누락/빈값 시 400', async () => {
      const noTitle = await request(server).post('/todos').set(withAuth()).send({});
      expect(noTitle.status).toBe(400);

      const emptyTitle = await request(server)
        .post('/todos')
        .set(withAuth())
        .send({ title: '' });
      expect(emptyTitle.status).toBe(400);
    });

    it('DTO에 없는 필드(userId 등) 주입 시 400 — 소유자 위조 방지', async () => {
      const res = await request(server)
        .post('/todos')
        .set(withAuth())
        .send({ title: 'x', userId: 999, createdAt: '2000-01-01' });

      expect(res.status).toBe(400);
    });

    it('비숫자 :id 요청은 404 또는 400 (500 아님)', async () => {
      const getRes = await request(server).get('/todos/not-a-number').set(withAuth());
      expect([400, 404]).toContain(getRes.status);

      const putRes = await request(server).put('/todos/not-a-number').set(withAuth()).send({});
      expect([400, 404]).toContain(putRes.status);
    });

    it('수정은 전달된 필드만 반영한다 (부분 수정)', async () => {
      const created = await request(server)
        .post('/todos')
        .set(withAuth())
        .send({ title: '원본', description: '원본설명' });

      const res = await request(server)
        .put(`/todos/${created.body.id}`)
        .set(withAuth())
        .send({ completed: true });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('원본');
      expect(res.body.description).toBe('원본설명');
      expect(res.body.completed).toBe(true);
    });

    it('토큰 없이 POST/GET /todos 는 401', async () => {
      const postRes = await request(server).post('/todos').send({ title: 'x' });
      expect(postRes.status).toBe(401);

      const listRes = await request(server).get('/todos');
      expect(listRes.status).toBe(401);
    });
  });

  describe('시나리오3: 인증 실패 케이스', () => {
    let token: string;
    let server: ReturnType<TestContext['app']['getHttpServer']>;

    beforeEach(async () => {
      server = ctx.app.getHttpServer();
      token = await signupAndLogin(ctx.app, 'auth-fail@example.com');
    });

    it('Authorization 헤더 전체가 없으면 401 (GET/POST/PUT/DELETE /todos)', async () => {
      expect((await request(server).get('/todos')).status).toBe(401);
      expect((await request(server).post('/todos').send({ title: 'x' })).status).toBe(401);
      expect((await request(server).put('/todos/1').send({ title: 'x' })).status).toBe(401);
      expect((await request(server).delete('/todos/1')).status).toBe(401);
      expect((await request(server).get('/users/me')).status).toBe(401);
    });

    it('JWT 형식이 아닌 문자열 토큰은 401', async () => {
      const res = await request(server)
        .get('/users/me')
        .set('Authorization', 'Bearer not-a-valid-jwt');

      expect(res.status).toBe(401);
    });

    it('Bearer 스킴이 아닌 헤더는 401', async () => {
      const res = await request(server)
        .get('/users/me')
        .set('Authorization', `Basic ${token}`);

      expect(res.status).toBe(401);
    });

    it('다른 시크릿으로 서명한 위조 토큰은 401', async () => {
      const forged = await new JwtService({ secret: 'attacker-wrong-secret' }).signAsync({
        sub: 1,
        email: 'forged@example.com',
      });

      const res = await request(server)
        .get('/users/me')
        .set('Authorization', `Bearer ${forged}`);

      expect(res.status).toBe(401);
    });

    it('만료된 토큰은 401 (1초 만료 토큰 실제 대기)', async () => {
      const appJwt = ctx.app.get(JwtService);
      const expired = await appJwt.signAsync(
        { sub: 1, email: 'expired@example.com' },
        { expiresIn: '1s' },
      );

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const res = await request(server)
        .get('/users/me')
        .set('Authorization', `Bearer ${expired}`);

      expect(res.status).toBe(401);
    });
  });

  describe('시나리오4: 존재하지 않는 TODO ID', () => {
    let token: string;
    let server: ReturnType<TestContext['app']['getHttpServer']>;

    const NON_EXISTENT_ID = 999_999;

    beforeEach(async () => {
      server = ctx.app.getHttpServer();
      token = await signupAndLogin(ctx.app, 'notfound-user@example.com');
    });

    it('GET /todos/:id → 404', async () => {
      const res = await request(server)
        .get(`/todos/${NON_EXISTENT_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('PUT /todos/:id → 404', async () => {
      const res = await request(server)
        .put(`/todos/${NON_EXISTENT_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '수정 시도' });

      expect(res.status).toBe(404);
    });

    it('DELETE /todos/:id → 404', async () => {
      const res = await request(server)
        .delete(`/todos/${NON_EXISTENT_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('데이터 소유권: 교차 사용자 접근 차단', () => {
    let server: ReturnType<TestContext['app']['getHttpServer']>;
    let tokenA: string;
    let tokenB: string;
    let todoBId: number;

    beforeEach(async () => {
      server = ctx.app.getHttpServer();
      tokenA = await signupAndLogin(ctx.app, 'user-a@example.com');
      tokenB = await signupAndLogin(ctx.app, 'user-b@example.com');

      const createB = await request(server)
        .post('/todos')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'B의 TODO' });
      todoBId = createB.body.id;
    });

    it('사용자 A는 B의 TODO를 조회할 수 없다 (404)', async () => {
      const res = await request(server)
        .get(`/todos/${todoBId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });

    it('사용자 A는 B의 TODO를 수정할 수 없다 (404, 데이터 무변경)', async () => {
      const res = await request(server)
        .put(`/todos/${todoBId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'A가 훔쳐 수정' });

      expect(res.status).toBe(404);

      const after = await request(server)
        .get(`/todos/${todoBId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(after.status).toBe(200);
      expect(after.body.title).toBe('B의 TODO');
    });

    it('사용자 A는 B의 TODO를 삭제할 수 없다 (404, B는 여전히 조회 가능)', async () => {
      const res = await request(server)
        .delete(`/todos/${todoBId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);

      const after = await request(server)
        .get(`/todos/${todoBId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(after.status).toBe(200);
    });

    it('A의 목록에는 B의 TODO가 포함되지 않는다', async () => {
      const res = await request(server).get('/todos').set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.some((t: { id: number }) => t.id === todoBId)).toBe(false);
    });
  });

  describe('입력값 검증 추가 케이스', () => {
    let server: ReturnType<TestContext['app']['getHttpServer']>;

    beforeEach(() => {
      server = ctx.app.getHttpServer();
    });

    it('빈 JSON body로 회원가입하면 400 (서버 크래시 없음)', async () => {
      const res = await request(server).post('/users/signup').send({});

      expect(res.status).toBe(400);
    });

    it('짧은 비밀번호(8자 미만)는 400', async () => {
      const res = await request(server).post('/users/signup').send({
        email: 'shortpw@example.com',
        password: 'short',
        name: '짧은비번',
      });

      expect(res.status).toBe(400);
    });
  });
});
