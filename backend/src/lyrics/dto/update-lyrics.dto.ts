import { IsString } from 'class-validator';

export class UpdateLyricsDto {
  @IsString()
  rawText: string;
}
