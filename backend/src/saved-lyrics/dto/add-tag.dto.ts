import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TagType } from '@prisma/client';

export class AddTagDto {
  @IsString()
  @MaxLength(50)
  tag: string;

  @IsOptional()
  @IsEnum(TagType)
  type?: TagType;
}
