import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TimestampEntry {
  @IsString()
  id!: string;

  @IsOptional()
  @IsNumber()
  timestampMs!: number | null;
}

export class UpdateTimestampsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimestampEntry)
  lines!: TimestampEntry[];
}
