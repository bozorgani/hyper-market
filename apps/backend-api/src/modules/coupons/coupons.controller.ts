import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CartService } from '../cart/services/cart.service';
import { UserRole } from '../users/enums/user-role.enum';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Controller('coupons')
@Roles(UserRole.CUSTOMER)
export class CouponsController {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly cartService: CartService,
  ) {}

  @Post('validate')
  async validateCoupon(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ValidateCouponDto,
  ) {
    const cart = await this.cartService.getCartSummary(user.sub);
    return this.couponsService.validateCoupon(dto.code, cart.totalPrice);
  }
}
