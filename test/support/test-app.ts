import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, EntityTarget, Repository } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

export interface TestContext {
  app: INestApplication;
  dataSource: DataSource;
}

/**
 * in-memory SQLite 로 앱을 부팅한다.
 * env-setup.ts(setupFiles) 가 process.env.DB_PATH=':memory:' 를 이미 설정했다.
 */
export async function bootstrapTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return { app, dataSource: app.get(DataSource) };
}

/** DataSource 로부터 리포지토리를 얻는다 (feature 모듈 등록과 무관). */
export function getRepo<T extends object>(ctx: TestContext, entity: EntityTarget<T>): Repository<T> {
  return ctx.dataSource.getRepository(entity);
}

/** 테스트 간 순서 의존 제거: 매 테스트 전 전체 삭제 (FK 순서: todos → users). */
export async function clearDatabase(ctx: TestContext): Promise<void> {
  await ctx.dataSource.query('DELETE FROM todos');
  await ctx.dataSource.query('DELETE FROM users');
}

/** 회원가입 + 로그인 헬퍼. 인증이 필요한 테스트에서 사용. */
export async function signupAndLogin(
  app: INestApplication,
  email: string,
  password = 'StrongPassword123!',
): Promise<string> {
  const server = app.getHttpServer();
  await request(server).post('/users/signup').send({ email, password, name: '테스트유저' });
  const res = await request(server).post('/users/login').send({ email, password });
  return res.body.access_token as string;
}
