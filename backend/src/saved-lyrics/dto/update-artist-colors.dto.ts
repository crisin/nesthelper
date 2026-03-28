import { IsObject } from 'class-validator'

export class UpdateArtistColorsDto {
  @IsObject()
  artistColors!: Record<string, string>
}
