import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ListPostsQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(280)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  content!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(280)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  arabicContent!: string;

  @IsOptional()
  @IsUrl()
  image?: string;
}

export class UpdatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(280)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  content!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(280)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  arabicContent!: string;

  @IsOptional()
  @IsUrl()
  image?: string | null;
}

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  content!: string;
}
