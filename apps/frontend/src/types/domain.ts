export type User = {
  _id?: string;
  id: string;
  role: string;
  email?: string;
  phoneNumber?: string;
  accountStatus?: string;
  sessionId?: string;
  deviceId?: string;
};

export type Product = {
  _id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number | null;
  stock: number;
  images: string[];
  categoryId: string;
  isActive: boolean;
};

export type ProductListResponse = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
};

export type Category = {
  _id: string;
  name: string;
  slug: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type Cart = {
  _id?: string;
  userId: string;
  items: CartItem[];
};

export type CartSummary = {
  cart: Cart;
  totalPrice: number;
};

export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";

export type Order = {
  _id: string;
  userId: string;
  items: Array<CartItem & { priceAtPurchase: number }>;
  totalPrice: number;
  status: OrderStatus;
  createdAt?: string;
};

export type Payment = {
  _id: string;
  orderId: string;
  userId: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  method: "mock" | "stripe" | "zarinpal";
  transactionId?: string | null;
};
