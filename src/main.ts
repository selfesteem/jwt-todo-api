import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const port = app.get(ConfigService).get<number>('PORT') ?? 3000;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`Application is running on: http://localhost:${port}`);
}

void bootstrap();
