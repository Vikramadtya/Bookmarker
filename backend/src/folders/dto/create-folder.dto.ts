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
}
