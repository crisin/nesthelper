import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum TagTypeDto {
  CONTEXT = 'CONTEXT',
  MOOD = 'MOOD',
}

export class AddTagDto {
  @IsString()
  @MaxLength(50)
  tag: string;

  @IsOptional()
  @IsEnum(TagTypeDto)
  type?: TagTypeDto;
}
