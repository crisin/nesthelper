import { IsIn } from 'class-validator';

export class UpdateVisibilityDto {
  @IsIn(['PRIVATE', 'FRIENDS', 'PUBLIC'])
  visibility: 'PRIVATE' | 'FRIENDS' | 'PUBLIC';
}
