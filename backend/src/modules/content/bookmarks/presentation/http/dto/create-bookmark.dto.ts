import {
  IsIn,
  IsNumber,
  ValidateIf,
  IsDateString,
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

  @IsOptional()
  @IsIn(['unread', 'reading', 'done', 'archived'])
  status?: 'unread' | 'reading' | 'done' | 'archived';

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsNumber()
  position?: number;

  /** Hidden from the triage queue until this time; null clears it. */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsDateString()
  snoozedUntil?: string | null;

  /** Remind me to look at this again on this date; null clears it. */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsDateString()
  revisitAt?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  suggestedTags?: string[];

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  suggestedFolderId?: string | null;
}
