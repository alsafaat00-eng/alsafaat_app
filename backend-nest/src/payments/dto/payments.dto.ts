import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

const PAYMENT_METHODS = [
  'mada',
  'visa',
  'mastercard',
  'apple_pay',
  'stc_pay',
] as const;
const PAYMENT_TYPES = ['subscription', 'fee', 'listing_fee'] as const;
const PLAN_IDS = ['starter', 'pro', 'vip'] as const;
const BILLING_CYCLES = ['monthly', 'yearly'] as const;

export class InitiatePaymentDto {
  @IsNumber()
  @Min(0.01)
  @Max(100000)
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(PAYMENT_METHODS)
  method!: (typeof PAYMENT_METHODS)[number];

  @IsEnum(PAYMENT_TYPES)
  type!: (typeof PAYMENT_TYPES)[number];

  @IsUUID()
  referenceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descriptionAr?: string;

  @IsOptional()
  @IsEnum(PLAN_IDS)
  planId?: (typeof PLAN_IDS)[number];

  @IsOptional()
  @IsEnum(BILLING_CYCLES)
  billingCycle?: (typeof BILLING_CYCLES)[number];
}
