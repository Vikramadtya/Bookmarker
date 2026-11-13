import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class BulkUpdateDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  ids: string[];

  @IsOptional()
  @IsIn(['unread', 'reading', 'done', 'archived'])
  status?: 'unread' | 'reading' | 'done' | 'archived';

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  addTags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  removeTags?: string[];
}

export class MergeBookmarksDto {
  @IsUUID()
  keepId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  mergeIds: string[];
}

export class HighlightDto {
  @IsString()
  @MaxLength(1000)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
