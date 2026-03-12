import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { FeatureStatus } from '@prisma/client';

export class CreateFeatureRequestDto {
  @IsOptional()
  @IsString()
  kind?: string;  // "feature" | "bug", defaults to "feature"

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  page?: string;
}

export class UpdateFeatureRequestDto {
  @IsOptional()
  @IsString()
  title?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsString()
  page?: string | null;
}

export class UpdateStatusDto {
  @IsEnum(FeatureStatus)
  status: FeatureStatus;
}
