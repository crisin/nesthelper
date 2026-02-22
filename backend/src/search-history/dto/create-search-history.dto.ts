import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateSearchHistoryDto {
  @IsString()
  spotifyId: string;

  @IsString()
  track: string;

  @IsString()
  artist: string;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  imgUrl?: string;
}
