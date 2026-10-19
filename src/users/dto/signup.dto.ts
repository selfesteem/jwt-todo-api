import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SignupDto {
  @IsEmail({}, { message: 'email은 올바른 이메일 형식이어야 합니다.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  email!: string;

  @IsString({ message: 'password는 문자열이어야 합니다.' })
  @MinLength(8, { message: 'password는 최소 8자 이상이어야 합니다.' })
  password!: string;

  @IsString({ message: 'name은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: 'name은 비어 있을 수 없습니다.' })
  name!: string;
}
