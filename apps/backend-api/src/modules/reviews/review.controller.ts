import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewQueryDto,
  ReviewHelpfulDto,
} from './review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewDto) {
    return this.reviewService.createReview(user.sub, dto);
  }

  @Get('product/:productId')
  @UseGuards(OptionalJwtAuthGuard)
  async getProductReviews(
    @Param('productId') productId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewService.getProductReviews(productId, query);
  }

  @Get('product/:productId/stats')
  async getProductRatingStats(@Param('productId') productId: string) {
    return this.reviewService.getProductRatingStats(productId);
  }

  @Get('my-reviews')
  @UseGuards(JwtAuthGuard)
  async getMyReviews(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.getUserReviews(
      user.sub,
      page || 1,
      limit || 10,
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateReview(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewService.updateReview(id, user.sub, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteReview(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.reviewService.deleteReview(
      id,
      user.sub,
      user.role,
    );
  }

  @Post(':id/helpful')
  @UseGuards(JwtAuthGuard)
  async markReviewHelpful(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReviewHelpfulDto,
  ) {
    return this.reviewService.markReviewHelpful(id, user.sub, dto.isHelpful);
  }
}

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('pending')
  async getPendingReviews(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.getPendingReviews(page || 1, limit || 10);
  }

  @Post(':id/approve')
  async approveReview(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.reviewService.approveReview(id, user.sub);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectReview(@Param('id') id: string) {
    return this.reviewService.rejectReview(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteReview(@Param('id') id: string) {
    return this.reviewService.deleteReview(id, '', 'ADMIN');
  }
}
