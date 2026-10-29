import {
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteDto {
  @ApiProperty({
    type: [String],
    description: 'Array of bookmark IDs to delete',
    maxItems: 500,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  ids: string[];
}
