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
});
