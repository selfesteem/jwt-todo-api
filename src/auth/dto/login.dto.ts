import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  /** 회원가입과 동일하게 정규화(공백 제거 + 소문자)하여 저장된 이메일과 일치시킨다. */
  @IsEmail({}, { message: 'email은 올바른 이메일 형식이어야 합니다.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @IsString({ message: 'password는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: 'password는 비어 있을 수 없습니다.' })
  password!: string;
}
