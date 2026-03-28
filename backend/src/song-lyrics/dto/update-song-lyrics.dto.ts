import { Type } from 'class-transformer'
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'
import { LyricsStatus } from '@prisma/client'

export class SectionDto {
  @IsString()
  label!: string

  @IsInt()
  startLine!: number
}

export class UpdateSongLyricsDto {
  @IsString()
  rawText!: string

  /** Current version for optimistic locking. Omit to skip the check. */
  @IsOptional()
  @IsNumber()
  version?: number

  /** Set to 'lrclib' when importing from LRCLib; omit for manual edits (resets the flag). */
  @IsOptional()
  @IsString()
  source?: string

  /** Section definitions — full replacement on each save. Omit to leave sections unchanged. */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections?: SectionDto[]

  /** Lines with optional singer attribution — used to persist singer on lines during full save. */
  @IsOptional()
  lines?: { lineNumber: number; singer?: string | null }[]
}
