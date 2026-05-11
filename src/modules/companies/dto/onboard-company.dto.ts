import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { BillingInterval } from '@prisma/client';

/** Company-onboarding wizard payload (Section 4.3). */
export class OnboardCompanyDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers, and hyphens only' })
  slug: string;

  @IsString()
  @IsOptional()
  industry?: string;          // template key — defaults to 'generic'

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

  // Subscription
  @IsString()
  planKey: string;

  @IsEnum(BillingInterval)
  @IsOptional()
  billingInterval?: BillingInterval;

  // First Company Admin
  @IsString()
  adminName: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  adminPassword?: string;     // optional — server generates one if omitted
}
