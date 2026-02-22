import { IsOptional, IsString } from 'class-validator';

export class CreateSavedLyricDto {
  @IsString()
  track: string;

  @IsString()
  artist: string;

  @IsOptional()
  @IsString()
  lyrics?: string;

  @IsOptional()
  @IsString()
  searchHistoryId?: string;
}
