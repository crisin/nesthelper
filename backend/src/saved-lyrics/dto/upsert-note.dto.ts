import { IsString } from 'class-validator';

export class UpsertNoteDto {
  @IsString()
  text: string;
}
