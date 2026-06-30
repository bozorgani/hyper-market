import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
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
        { returnDocument: 'after', upsert: true },
      )
      .exec();
  }


  async upsertItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<Cart | null> {
    const productObjectId = new Types.ObjectId(productId);

    return this.cartModel
      .findOneAndUpdate(
        { userId },
        [
          {
            $set: {
              items: {
                $let: {
                  vars: {
                    existingItems: {
                      $filter: {
                        input: '$items',
                        as: 'item',
                        cond: { $eq: ['$$item.productId', productObjectId] },
                      },
                    },
                  },
                  in: {
                    $cond: [
                      { $gt: [{ $size: '$$existingItems' }, 0] },
                      {
                        $map: {
                          input: '$items',
                          as: 'item',
                          in: {
                            $cond: [
                              { $eq: ['$$item.productId', productObjectId] },
                              { productId: '$$item.productId', quantity },
                              '$$item',
                            ],
                          },
                        },
                      },
                      {
                        $concatArrays: [
                          '$items',
                          [{ productId: productObjectId, quantity }],
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
        { returnDocument: 'after' },
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
        { returnDocument: 'after' },
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
        { returnDocument: 'after' },
      )
      .exec();
  }

  async removeItem(userId: string, productId: string): Promise<Cart | null> {
    return this.cartModel
      .findOneAndUpdate(
        { userId },
        { $pull: { items: { productId: new Types.ObjectId(productId) } } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async clearCart(userId: string, session?: ClientSession): Promise<Cart | null> {
    return this.cartModel
      .findOneAndUpdate(
        { userId },
        { $set: { items: [] } },
        { returnDocument: 'after', session },
      )
      .exec();
  }
}
