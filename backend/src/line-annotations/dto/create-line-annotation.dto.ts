import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLineAnnotationDto {
  @IsString()
  @MaxLength(500)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  emoji?: string;
}
