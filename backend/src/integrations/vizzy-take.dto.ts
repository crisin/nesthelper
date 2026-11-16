import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** a day — far beyond any song, only there to keep nonsense out */
const MAX_MS = 86_400_000;

export class VizzyTakeLineDto {
  @IsString()
  @MaxLength(500)
  text: string;

  @IsInt()
  @Min(0)
  @Max(MAX_MS)
  startMs: number;

  @IsInt()
  @Min(0)
  @Max(MAX_MS)
  endMs: number;

  @IsBoolean()
  repeat: boolean;
}

export class VizzyTakeCoverageDto {
  @IsInt()
  @Min(0)
  @Max(MAX_MS)
  fromMs: number;

  @IsInt()
  @Min(0)
  @Max(MAX_MS)
  toMs: number;
}

/** vizzy's take file (`lyrics-takes/*.json`), sent as it is. */
export class VizzyTakeDto {
  /** format version of the file */
  @IsInt()
  @IsIn([1])
  v: number;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  spotifyId: string;

  @IsString()
  @MaxLength(300)
  artist: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_MS)
  durationMs?: number | null;

  @IsISO8601()
  recordedAt: string;

  /** how the lines were timed: by the media position, or only by the
   *  time since the song changed */
  @IsIn(['media', 'songchange'])
  clock: string;

  @ValidateNested()
  @Type(() => VizzyTakeCoverageDto)
  coverage: VizzyTakeCoverageDto;

  @IsInt()
  @Min(0)
  @Max(MAX_MS)
  heardMs: number;

  @IsOptional()
  @IsObject()
  engine?: Record<string, unknown> | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => VizzyTakeLineDto)
  lines: VizzyTakeLineDto[];
}
