import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { SUPPORTED_COUNTRIES } from '../../lib/countries';
import { IsOurUploadUrl } from '../validators/is-our-upload-url.validator';

export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

export class ConnectionsQueryDto {
  @IsOptional()
  @IsEnum(['followers', 'following'])
  type: 'followers' | 'following' = 'followers';
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  arabicName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  bio?: string;

  @IsOptional()
  @IsUrl()
  @IsOurUploadUrl()
  avatar?: string;

  @IsOptional()
  @IsUrl()
  @IsOurUploadUrl()
  coverImage?: string;

  @IsOptional()
  @IsEnum(SUPPORTED_COUNTRIES)
  country?: (typeof SUPPORTED_COUNTRIES)[number];

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  fcmToken?: string | null;
}
