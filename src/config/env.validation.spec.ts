import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const validSecret = 'x'.repeat(32);

  it('JWT_SECRET이 없으면 시크릿 이름을 포함한 에러를 던진다', () => {
    expect(() => validateEnv({})).toThrow(/JWT_SECRET/);
  });

  it('JWT_SECRET이 빈 문자열이나 공백이면 에러를 던진다', () => {
    expect(() => validateEnv({ JWT_SECRET: '' })).toThrow(/JWT_SECRET/);
    expect(() => validateEnv({ JWT_SECRET: '   ' })).toThrow(/JWT_SECRET/);
  });

  it('생략된 항목에 기본값을 적용한다', () => {
    const env = validateEnv({ JWT_SECRET: validSecret });

    expect(env.JWT_EXPIRES_IN).toBe('1h');
    expect(env.DB_PATH).toBe('./data/dev.sqlite');
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
  });

  it('전달된 값을 그대로 반영한다', () => {
    const env = validateEnv({
      JWT_SECRET: validSecret,
      JWT_EXPIRES_IN: '30m',
      DB_PATH: './data/custom.sqlite',
      PORT: '4000',
      NODE_ENV: 'production',
    });

    expect(env.JWT_SECRET).toBe(validSecret);
    expect(env.JWT_EXPIRES_IN).toBe('30m');
    expect(env.DB_PATH).toBe('./data/custom.sqlite');
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('production');
  });

  it('PORT가 숫자로 변환 불가능하면 기본값 3000을 사용한다', () => {
    const env = validateEnv({ JWT_SECRET: validSecret, PORT: 'not-a-number' });

    expect(env.PORT).toBe(3000);
  });
});
