import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Un' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;
}
