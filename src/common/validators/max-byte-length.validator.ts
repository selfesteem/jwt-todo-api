import { Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

/**
 * bcrypt는 입력 비밀번호의 앞 72바이트만 사용하고 나머지를 자릅니다.
 * 문자 수(UTF-16 코드 유닛)가 아니라 UTF-8 바이트 수 기준으로 상한을 검증합니다.
 */
export const BCRYPT_MAX_PASSWORD_BYTES = 72;

@ValidatorConstraint({ name: 'maxByteLength', async: false })
export class MaxByteLengthConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return Buffer.byteLength(value, 'utf8') <= (args.constraints[0] as number);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property}은(는) 최대 ${args.constraints[0] as number}바이트까지 입력할 수 있습니다.`;
  }
}

/** 최대 바이트 길이 검증 데코레이터 (예: @Validate(MaxByteLengthConstraint, [72])) */
export const MaxByteLength = (maxBytes: number): PropertyDecorator =>
  Validate(MaxByteLengthConstraint, [maxBytes]);
