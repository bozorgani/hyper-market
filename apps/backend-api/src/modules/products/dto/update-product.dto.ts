import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Brand name */
  @IsOptional()
  @IsString()
  brand?: string;

  /** Stock-Keeping Unit — unique warehouse code */
  @IsOptional()
  @IsString()
  sku?: string;

  /** Measurement unit */
  @IsOptional()
  @IsString()
  unit?: string;

  /** Weight in grams */
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  /** Searchable tags — replaces entire array */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];
}
