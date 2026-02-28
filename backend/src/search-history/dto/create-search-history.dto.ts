import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateSearchHistoryDto {
  @IsString()
  spotifyId: string;

  @IsString()
  track: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  artists?: string[];

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  imgUrl?: string;
}
