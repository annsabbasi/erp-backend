import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  managerId?: number;
}
