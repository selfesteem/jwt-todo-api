import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Todo } from '../todos/entities/todo.entity';

const IN_MEMORY = ':memory:';

/** SQLite 파일 경로를 절대경로로 정규화하고, 필요한 디렉터리를 생성한다. */
function prepareDatabasePath(dbPath: string): string {
  if (dbPath === IN_MEMORY) {
    return dbPath;
  }
  const absolute = resolve(process.cwd(), dbPath);
  mkdirSync(dirname(absolute), { recursive: true });
  return absolute;
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3' as const,
        database: prepareDatabasePath(config.getOrThrow<string>('DB_PATH')),
        // 개발/테스트 환경에서는 엔티티 정의로부터 테이블을 자동 생성한다.
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        entities: [User, Todo],
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
