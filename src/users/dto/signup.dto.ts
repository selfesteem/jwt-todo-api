import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  BCRYPT_MAX_PASSWORD_BYTES,
  MaxByteLength,
} from '../../common/validators/max-byte-length.validator';

export class SignupDto {
  /** 앞뒤 공백 제거 후 소문자로 정규화 — 대소문자만 다른 이메일의 중복 가입/로그인 불일치 방지 */
  @IsEmail({}, { message: 'email은 올바른 이메일 형식이어야 합니다.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @IsString({ message: 'password는 문자열이어야 합니다.' })
  @MinLength(8, { message: 'password는 최소 8자 이상이어야 합니다.' })
  @MaxByteLength(BCRYPT_MAX_PASSWORD_BYTES)
  password!: string;

  @IsString({ message: 'name은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: 'name은 비어 있을 수 없습니다.' })
  name!: string;
}
