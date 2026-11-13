import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export const SORTS = ['newest', 'oldest', 'title', 'site', 'opened', 'manual'];

export class ListBookmarksDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  folderId?: string;

  /** Free text plus operators, e.g. `rust tag:dev is:unread saved:7d`. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fields?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tag?: string;

  @IsOptional()
  @IsIn(SORTS)
  sort?: string;

  /** `true` only pinned, `false` only unpinned; omitted both. */
  @IsOptional()
  @IsBooleanString()
  pinned?: string;

  /** `true`: the triage queue (unread and not snoozed), oldest first. */
  @IsOptional()
  @IsBooleanString()
  triage?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  cursor?: string;
}
