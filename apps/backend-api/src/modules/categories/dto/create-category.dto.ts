import {
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  /** Optional short description */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Emoji or icon identifier */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  /** Cover image URL */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  /** Parent category ID (null = root) */
  @IsOptional()
  @IsMongoId()
  parentId?: string;

  /** Display sort order (lower = first) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  /** Whether the category is visible to customers */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
