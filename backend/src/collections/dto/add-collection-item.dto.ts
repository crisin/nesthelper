import { IsOptional, IsString } from 'class-validator';

export class AddCollectionItemDto {
  @IsOptional()
  @IsString()
  savedLyricId?: string;

  @IsOptional()
  @IsString()
  lineId?: string;
}
