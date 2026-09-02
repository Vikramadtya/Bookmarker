import {
  IsString,
  IsUrl,
  IsOptional,
  IsArray,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreateBookmarkDto {
  @IsUrl()
  bookmarkURL: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsUrl()
  logoURL?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  comments?: string[];

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsUUID()
  folderId: string;
}
