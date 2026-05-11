import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  key: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  monthlyPrice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  annualPrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxUsers?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  trialDays?: number;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  moduleSlugs?: string[];
}

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  monthlyPrice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  annualPrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxUsers?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  trialDays?: number;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  moduleSlugs?: string[];
}
