import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsString()
  password?: string;
}
