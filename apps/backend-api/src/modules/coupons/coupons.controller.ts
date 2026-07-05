import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CartService } from '../cart/services/cart.service';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Controller('coupons')
@Roles(UserRole.CUSTOMER)
export class CouponsController {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly cartService: CartService,
  ) {}

  @Get('available')
  async availableCoupons(@CurrentUser() user: JwtPayload) {
    const cart = await this.cartService.getCartSummary(user.sub);
    return this.couponsService.listAvailableCoupons(cart.totalPrice, user.sub);
  }

  @Post('validate')
  async validateCoupon(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ValidateCouponDto,
  ) {
    const cart = await this.cartService.getCartSummary(user.sub);
    return this.couponsService.validateCoupon(dto.code, cart.totalPrice, user.sub);
  }
}

@Controller('admin/coupons')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminCouponsController {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Permissions('coupons.read')
  listCoupons(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('active') active?: string,
  ) {
    return this.couponsService.listCoupons(
      this.toPositiveInteger(page, 1),
      this.toPositiveInteger(limit, 20),
      this.toOptionalBoolean(active),
    );
  }

  @Get('analytics')
  @Permissions('coupons.read')
  getAnalytics() {
    return this.couponsService.getAnalytics();
  }

  @Get(':id')
  @Permissions('coupons.read')
  getCoupon(@Param('id') id: string) {
    return this.couponsService.getCoupon(id);
  }

  @Post()
  @Permissions('coupons.create')
  async createCoupon(
    @Body() dto: CreateCouponDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    const coupon = await this.couponsService.createCoupon(dto);
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.COUPON_CREATED,
      resource: 'coupon',
      resourceId: coupon.code,
      metadata: { code: coupon.code, percent: coupon.percent },
      request,
    });
    return coupon;
  }

  @Put(':id')
  @Permissions('coupons.update')
  async updateCoupon(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    const coupon = await this.couponsService.updateCoupon(id, dto);
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.COUPON_UPDATED,
      resource: 'coupon',
      resourceId: id,
      metadata: { changedFields: Object.keys(dto), code: coupon.code },
      request,
    });
    return coupon;
  }

  @Delete(':id')
  @Permissions('coupons.delete')
  async deleteCoupon(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    const coupon = await this.couponsService.deleteCoupon(id);
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.COUPON_DELETED,
      resource: 'coupon',
      resourceId: id,
      metadata: { code: coupon.code },
      request,
    });
    return coupon;
  }

  private toPositiveInteger(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) return fallback;
    return parsed;
  }

  private toOptionalBoolean(value: string | undefined): boolean | undefined {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }
}
