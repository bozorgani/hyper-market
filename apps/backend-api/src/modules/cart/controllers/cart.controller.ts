import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../../users/enums/user-role.enum';
import { AddCartItemDto } from '../dto/add-cart-item.dto';
import { RemoveCartItemDto } from '../dto/remove-cart-item.dto';
import { CartService } from '../services/cart.service';

@Controller('cart')
@Roles(UserRole.CUSTOMER)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('my')
  getMyCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.getCartSummary(user.sub);
  }

  @Post('add')
  addProduct(@CurrentUser() user: JwtPayload, @Body() dto: AddCartItemDto) {
    return this.cartService.addProductToCart(user.sub, dto.productId, dto.quantity);
  }

  @Post('remove')
  removeProduct(@CurrentUser() user: JwtPayload, @Body() dto: RemoveCartItemDto) {
    return this.cartService.removeProduct(user.sub, dto.productId);
  }

  @Post('clear')
  clearCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.clearCart(user.sub);
  }
}
