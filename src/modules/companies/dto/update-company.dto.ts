import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

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

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  fiscalYearStart?: number;
}

export class UpdateBrandingDto {
  @IsObject()
  branding: Record<string, unknown>;
}

export class AssignModulesDto {
  @IsArray()
  @IsString({ each: true })
  moduleIds: string[];
}
