import request from 'supertest';
import { bootstrapTestApp, clearDatabase, getRepo, TestContext } from './support/test-app';
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
});
