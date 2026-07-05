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
  discountPercentage?: number;
  stock: number;
  images: string[];
  categoryId: string;
  isActive: boolean;
  brand?: string | null;
  sku?: string | null;
  unit?: string | null;
  weight?: number | null;
  tags?: string[];
};

export type PaginationMeta = {
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  meta?: PaginationMeta;
};

export type ProductListResponse = PaginatedResponse<Product>;

export type Coupon = {
  _id: string;
  code: string;
  percent: number;
  active: boolean;
  minSubtotal?: number;
  maxDiscountAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  usedCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Category = {
  _id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type CartItemProductSummary = {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number | null;
  image?: string | null;
  images: string[];
  stock: number;
  isActive: boolean;
};

export type CartDetailedItem = CartItem & {
  name: string;
  price: number;
  discountPrice?: number | null;
  image?: string | null;
  stock: number;
  lineTotal: number;
  isAvailable?: boolean;
  product?: CartItemProductSummary | null;
};

export type Cart = {
  _id?: string;
  userId: string;
  items: CartItem[];
};

export type CartSummary = {
  cart: Cart;
  totalPrice: number;
  items: CartDetailedItem[];
};

export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";

export type DeliveryAddress = {
  recipientName: string;
  phoneNumber: string;
  province: string;
  city: string;
  addressLine: string;
  plate?: string | null;
  unit?: string | null;
  postalCode?: string | null;
};

export type DeliveryWindow = {
  date: string;
  timeSlot: string;
};

export type Address = DeliveryAddress & {
  _id: string;
  userId?: string;
  label?: string | null;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Order = {
  _id: string;
  userId: string;
  items: Array<CartItem & { priceAtPurchase: number }>;
  subtotalPrice?: number;
  discountAmount?: number;
  couponCode?: string | null;
  shippingMethod?: "standard" | "express";
  deliveryFee?: number;
  freeShippingApplied?: boolean;
  totalPrice: number;
  status: OrderStatus;
  deliveryAddress?: DeliveryAddress;
  deliveryWindow?: DeliveryWindow;
  createdAt?: string;
};

export type Payment = {
  _id: string;
  orderId: string;
  userId: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  method: "cod" | "stripe" | "zarinpal";
  transactionId?: string | null;
};
