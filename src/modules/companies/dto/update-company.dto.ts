import { IsString, IsOptional, IsUrl, IsBoolean, IsArray } from 'class-validator';

export class UpdateCompanyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AssignModulesDto {
  @IsArray()
  @IsString({ each: true })
  moduleIds: string[];
}
