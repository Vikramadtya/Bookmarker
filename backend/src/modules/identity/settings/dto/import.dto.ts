import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportDto {
  @ApiProperty({
    description: 'The raw HTML string of the Netscape Bookmark file',
  })
  @IsString()
  @IsNotEmpty()
  htmlContent: string;
}
