import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { SUPPORTED_COUNTRIES } from '../../lib/countries';

export class LoginDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(254)
  login!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  allDevices?: boolean;
}

export class RegisterDto {
  @Matches(/^\+\d{9,14}$/)
  phone!: string;

  @IsString()
  @MinLength(10)
  phone_token!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  displayName!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  arabicName?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'أحرف إنجليزية صغيرة وأرقام وشرطة سفلية فقط',
  })
  username!: string;

  @IsOptional()
  @IsEnum(SUPPORTED_COUNTRIES)
  country?: (typeof SUPPORTED_COUNTRIES)[number] = 'SA';

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsString()
  googleId?: string;

  @IsOptional()
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  email?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[A-Z]/, { message: 'Must contain uppercase' })
  @Matches(/[0-9]/, { message: 'Must contain number' })
  newPassword!: string;
}

export class SendOtpDto {
  @Matches(/^\+\d{9,14}$/, {
    message: 'رقم الجوال يجب أن يبدأ بـ + ويحتوي على أرقام فقط',
  })
  phone!: string;

  @IsOptional()
  @IsEnum(['sms', 'whatsapp'])
  channel: 'sms' | 'whatsapp' = 'sms';
}

export class VerifyOtpDto {
  @Matches(/^\+\d{9,14}$/)
  phone!: string;

  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;

  @IsOptional()
  @IsEnum(['login', 'reset_password'])
  purpose: 'login' | 'reset_password' = 'login';
}

export class GoogleAuthDto {
  @IsString()
  @MinLength(10)
  id_token!: string;
}

export class ResetPasswordDto {
  @Matches(/^\+\d{9,14}$/)
  phone!: string;

  @IsString()
  @MinLength(10)
  phone_token!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  newPassword!: string;
}

export class VerifyEmailDto {
  @Length(6, 6)
  @Matches(/^\d+$/)
  code!: string;
}
