import { IsArray, ArrayNotEmpty, ArrayMaxSize, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkMoveDto {
  @ApiProperty({
    type: [String],
    description: 'Array of bookmark IDs to move',
    maxItems: 500,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  ids: string[];

  @ApiProperty({ description: 'Target folder ID' })
  @IsUUID()
  folderId: string;
}
