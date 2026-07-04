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

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPrice?: number;

  @IsNumber()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  images?: string[];

  @IsMongoId()
  categoryId!: string;

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

  /** Measurement unit (e.g. عدد, کیلوگرم, لیتر) */
  @IsOptional()
  @IsString()
  unit?: string;

  /** Weight in grams */
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  /** Searchable tags */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];
}
