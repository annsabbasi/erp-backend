import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BillingInterval } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsString()
  planKey: string;

  @IsEnum(BillingInterval)
  @IsOptional()
  billingInterval?: BillingInterval;

  @IsInt()
  @Min(1)
  @IsOptional()
  seatsOverride?: number;

  @IsBoolean()
  @IsOptional()
  startInTrial?: boolean;
}

export class ChangePlanDto {
  @IsString()
  planKey: string;

  @IsEnum(BillingInterval)
  @IsOptional()
  billingInterval?: BillingInterval;
}

export class TransitionDto {
  @IsString()
  @IsOptional()
  reason?: string;

  @IsDateString()
  @IsOptional()
  effectiveAt?: string;
}
