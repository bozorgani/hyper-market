import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from '../schemas/cart.schema';

@Injectable()
export class CartRepository {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
  ) {}

  async getCartByUserId(userId: string): Promise<Cart | null> {
    return this.cartModel.findOne({ userId }).lean().exec();
  }

  async createCart(userId: string): Promise<Cart> {
    return this.cartModel
      .findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId: new Types.ObjectId(userId), items: [] } },
        { new: true, upsert: true }
      )
      .exec();
  }

  async addItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<Cart | null> {
    return this.cartModel
      .findOneAndUpdate(
        { userId, 'items.productId': new Types.ObjectId(productId) },
        { $set: { 'items.$.quantity': quantity } },
        { new: true },
      )
      .exec();
  }

  async pushItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<Cart | null> {
    return this.cartModel
      .findOneAndUpdate(
        { userId },
        {
          $push: {
            items: {
              productId: new Types.ObjectId(productId),
              quantity,
            },
          },
        },
        { new: true },
      )
      .exec();
  }

  async removeItem(userId: string, productId: string): Promise<Cart | null> {
    return this.cartModel
      .findOneAndUpdate(
        { userId },
        { $pull: { items: { productId: new Types.ObjectId(productId) } } },
        { new: true },
      )
      .exec();
  }

  async clearCart(userId: string): Promise<Cart | null> {
    return this.cartModel
      .findOneAndUpdate({ userId }, { $set: { items: [] } }, { new: true })
      .exec();
  }
}
