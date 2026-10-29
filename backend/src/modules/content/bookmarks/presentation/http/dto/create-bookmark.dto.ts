import {
  IsString,
  IsUrl,
  IsOptional,
  IsArray,
  IsUUID,
  IsBoolean,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

const URL_OPTIONS = { protocols: ['http', 'https'], require_protocol: true };

export class CreateBookmarkDto {
  @IsUrl(URL_OPTIONS)
  @MaxLength(2048)
  bookmarkURL: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  author?: string;

  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(2048)
  logoURL?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  comments?: string[];

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsUUID()
  folderId: string;
}
