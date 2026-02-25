import { IsArray, IsString } from 'class-validator';

export class ReorderCollectionItemsDto {
  @IsArray()
  @IsString({ each: true })
  orderedIds: string[];
}
