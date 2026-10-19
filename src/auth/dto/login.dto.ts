import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'email은 올바른 이메일 형식이어야 합니다.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  email!: string;

  @IsString({ message: 'password는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: 'password는 비어 있을 수 없습니다.' })
  password!: string;
}
