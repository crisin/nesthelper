import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateSavedLyricDto {
  @IsString()
  track: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  artists?: string[];

  @IsOptional()
  @IsString()
  lyrics?: string;

  @IsOptional()
  @IsString()
  searchHistoryId?: string;
}
