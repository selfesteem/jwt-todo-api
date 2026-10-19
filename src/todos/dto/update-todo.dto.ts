import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 수정 가능한 필드만 노출한다. 모든 필드 선택적.
 * (PartialType 미사용 — 명시적 정의로 whitelist 검증 대상을 정확히 고정)
 */
export class UpdateTodoDto {
  @IsOptional()
  @IsString({ message: 'title은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: 'title은 비어 있을 수 없습니다.' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'description은 문자열이어야 합니다.' })
  description?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'completed는 불리언이어야 합니다.' })
  completed?: boolean;
}
