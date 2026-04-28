import { IsNumber, Min } from 'class-validator';

export class CreateInventoryDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  reorderLevel: number;
}
