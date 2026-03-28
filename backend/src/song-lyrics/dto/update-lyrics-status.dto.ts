import { IsEnum } from 'class-validator'
import { LyricsStatus } from '@prisma/client'

export class UpdateLyricsStatusDto {
  @IsEnum(LyricsStatus)
  status!: LyricsStatus
}
