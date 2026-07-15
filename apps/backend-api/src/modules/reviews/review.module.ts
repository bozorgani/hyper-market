import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Review, ReviewSchema } from './review.schema';
import { ReviewHelpfulVote, ReviewHelpfulVoteSchema } from './review-helpful-vote.schema';
import { ReviewRepository } from './review.repository';
import { ReviewService } from './review.service';
import { ReviewController, AdminReviewController } from './review.controller';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { ReviewImageStorageService } from './review-image-storage.service';
import { ReviewImageUploadInterceptor } from './review-image-upload.interceptor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: ReviewHelpfulVote.name, schema: ReviewHelpfulVoteSchema },
    ]),
    OrdersModule,
    ProductsModule,
  ],
  controllers: [ReviewController, AdminReviewController],
  providers: [
    ReviewRepository,
    ReviewService,
    ReviewImageStorageService,
    ReviewImageUploadInterceptor,
  ],
  exports: [ReviewService, ReviewRepository],
})
export class ReviewModule {}
