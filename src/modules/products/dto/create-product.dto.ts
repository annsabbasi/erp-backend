import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  unit?: string;
}
