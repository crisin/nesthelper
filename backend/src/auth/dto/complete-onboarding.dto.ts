import { IsString, MinLength } from 'class-validator';

export class CompleteOnboardingDto {
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
