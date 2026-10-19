import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTodoDto {
  @IsString({ message: 'title은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: 'title은 필수입니다.' })
  title!: string;

  @IsOptional()
  @IsString({ message: 'description은 문자열이어야 합니다.' })
  description?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'completed는 불리언이어야 합니다.' })
  completed?: boolean;
}
