import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListBookmarksDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  folderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fields?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;
}
