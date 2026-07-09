import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto, RemoveFromWishlistDto, WishlistQueryDto } from './wishlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async getWishlist(@Request() req: any, @Query() query: WishlistQueryDto) {
    return this.wishlistService.getWishlist(
      req.user.sub,
      query.page || 1,
      query.limit || 20,
    );
  }

  @Get('count')
  async getWishlistCount(@Request() req: any) {
    const count = await this.wishlistService.getWishlistCount(req.user.sub);
    return { count };
  }

  @Get('check/:productId')
  async isInWishlist(@Request() req: any, @Query('productId') productId: string) {
    const isInWishlist = await this.wishlistService.isInWishlist(
      req.user.sub,
      productId,
    );
    return { isInWishlist };
  }

  @Post('add')
  async addToWishlist(@Request() req: any, @Body() dto: AddToWishlistDto) {
    return this.wishlistService.addToWishlist(req.user.sub, dto.productId);
  }

  @Post('toggle')
  async toggleWishlist(@Request() req: any, @Body() dto: AddToWishlistDto) {
    return this.wishlistService.toggleWishlist(req.user.sub, dto.productId);
  }

  @Delete('remove')
  @HttpCode(HttpStatus.OK)
  async removeFromWishlist(@Request() req: any, @Body() dto: RemoveFromWishlistDto) {
    return this.wishlistService.removeFromWishlist(
      req.user.sub,
      dto.productId,
    );
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  async clearWishlist(@Request() req: any) {
    return this.wishlistService.clearWishlist(req.user.sub);
  }
}
