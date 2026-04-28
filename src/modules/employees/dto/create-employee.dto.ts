import { IsString, IsEmail, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  position: string;

  @IsNumber()
  departmentId: number;

  @IsNumber()
  salary: number;

  @IsDateString()
  hireDate: string;

  @IsString()
  @IsOptional()
  address?: string;
}
