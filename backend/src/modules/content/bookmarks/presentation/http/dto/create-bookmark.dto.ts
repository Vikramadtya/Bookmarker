import {
  IsString,
  IsUrl,
  IsOptional,
  IsArray,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreateBookmarkDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  bookmarkURL: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
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
