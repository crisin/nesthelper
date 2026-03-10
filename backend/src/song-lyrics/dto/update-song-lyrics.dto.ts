import { IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateSongLyricsDto {
  @IsString()
  rawText!: string

  /** Current version for optimistic locking. Omit to skip the check. */
  @IsOptional()
  @IsNumber()
  version?: number
}
