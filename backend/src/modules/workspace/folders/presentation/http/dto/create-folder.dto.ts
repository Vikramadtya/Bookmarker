import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFolderDto {
  @ApiPropertyOptional({ description: 'Folder display name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Parent collection UUID. Null = top-level collection.',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Make this folder publicly shareable' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Hide from the main sidebar (still accessible)',
  })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiPropertyOptional({ description: 'Lock this folder with a password' })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({
    description: 'Password to lock this folder (4–72 chars)',
    minLength: 4,
    maxLength: 72,
  })
  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'Password must be at least 4 characters' })
  @MaxLength(72, { message: 'Password must be at most 72 characters' })
  password?: string;
}
