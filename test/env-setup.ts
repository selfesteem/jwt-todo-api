/**
 * e2e 테스트 전용 환경변수.
 * jest setupFiles 는 스펙 파일 임포트(= AppModule 로드, ConfigModule.forRoot 즉시 검증)
 * 보다 먼저 실행되므로 여기서 값을 고정한다.
 *
 * - DB_PATH=:memory: → 테스트마다 격리된 임시 SQLite (운영 dev.sqlite 와 분리)
 * - NODE_ENV=test → production 이 아니므로 synchronize 활성
 */
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'e2e-test-only-secret-key-do-not-use-in-production';
process.env.JWT_EXPIRES_IN = '1h';
