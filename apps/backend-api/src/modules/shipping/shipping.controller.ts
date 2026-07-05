import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CartService } from '../cart/services/cart.service';
import { CouponsService } from '../coupons/coupons.service';
import { UserRole } from '../users/enums/user-role.enum';
import { ShippingQuoteDto } from './dto/shipping-quote.dto';
import { ShippingService } from './shipping.service';

@Controller('shipping')
@Roles(UserRole.CUSTOMER)
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly cartService: CartService,
    private readonly couponsService: CouponsService,
  ) {}

  @Post('quote')
  async getQuote(@CurrentUser() user: JwtPayload, @Body() dto: ShippingQuoteDto) {
    const cart = await this.cartService.getCartSummary(user.sub);
    const coupon = this.couponsService.validateCoupon(dto.couponCode, cart.totalPrice);
    const subtotal = coupon?.total ?? cart.totalPrice;

    return this.shippingService.getQuote({
      province: dto.address.province,
      city: dto.address.city,
      subtotal,
      deliveryDate: new Date(dto.deliveryWindow.date),
      timeSlot: dto.deliveryWindow.timeSlot,
      method: dto.method,
    });
  }
}
