import { IsString } from 'class-validator';

export class UpdateSavedLyricDto {
  @IsString()
  lyrics: string;
}
