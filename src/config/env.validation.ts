export interface AppEnv {
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  DB_PATH: string;
  PORT: number;
  NODE_ENV: string;
}

/**
 * 환경변수를 검증하고 기본값을 적용한다.
 * ConfigModule.forRoot({ validate }) 에 전달되어
 * 애플리케이션 부팅 단계에서 잘못된 설정을 조기에 실패시킨다.
 */
export function validateEnv(raw: Record<string, unknown>): AppEnv {
  const secret = typeof raw.JWT_SECRET === 'string' ? raw.JWT_SECRET.trim() : '';

  if (!secret) {
    throw new Error(
      '환경변수 JWT_SECRET이 설정되지 않았습니다. .env.example을 복사해 .env를 만들고 JWT_SECRET을 설정하세요.',
    );
  }

  const port = Number(raw.PORT);

  return {
    JWT_SECRET: secret,
    JWT_EXPIRES_IN: (raw.JWT_EXPIRES_IN as string) || '1h',
    DB_PATH: (raw.DB_PATH as string) || './data/dev.sqlite',
    PORT: Number.isFinite(port) && port > 0 ? port : 3000,
    NODE_ENV: (raw.NODE_ENV as string) || 'development',
  };
}
