import { create } from "zustand";
import type { CartItem, Product } from "@/data/mock-data";

export type Page =
  | { type: "home" }
  | { type: "products"; categoryId?: string; searchQuery?: string }
  | { type: "product-detail"; productId: string }
  | { type: "cart" }
  | { type: "checkout" }
  | { type: "profile" };

interface MarketStore {
  currentPage: Page;
  navigate: (page: Page) => void;
  goBack: () => void;
  history: Page[];
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedAddress: string;
  setSelectedAddress: (addr: string) => void;
  selectedLocation: { lat: number; lng: number } | null;
  setSelectedLocation: (loc: { lat: number; lng: number } | null) => void;
  deliveryTime: string;
  setDeliveryTime: (time: string) => void;
  paymentMethod: "online" | "cod";
  setPaymentMethod: (method: "online" | "cod") => void;
  orderPlaced: boolean;
  setOrderPlaced: (v: boolean) => void;
  discountCode: string;
  discountPercent: number;
  applyDiscountCode: (code: string) => boolean;
  removeDiscountCode: () => void;
}

const initialHistory: Page[] = [{ type: "home" }];

export const useMarketStore = create<MarketStore>((set, get) => ({
  currentPage: { type: "home" },
  history: initialHistory,
  navigate: (page) => {
    const { history } = get();
    set({ currentPage: page, history: [...history, page] });
  },
  goBack: () => {
    const { history } = get();
    if (history.length <= 1) {
      set({ currentPage: { type: "home" }, history: initialHistory });
      return;
    }
    const newHistory = history.slice(0, -1);
    set({ currentPage: newHistory[newHistory.length - 1], history: newHistory });
  },
  cart: [],
  addToCart: (product) => {
    const { cart } = get();
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      set({ cart: cart.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)) });
    } else {
      set({ cart: [...cart, { product, quantity: 1 }] });
    }
  },
  removeFromCart: (productId) => { set({ cart: get().cart.filter((item) => item.product.id !== productId) }); },
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) { get().removeFromCart(productId); return; }
    set({ cart: get().cart.map((item) => (item.product.id === productId ? { ...item, quantity } : item)) });
  },
  clearCart: () => set({ cart: [] }),
  getCartTotal: () => { return get().cart.reduce((total, item) => { const price = item.product.discountPrice ?? item.product.price; return total + price * item.quantity; }, 0); },
  getCartCount: () => { return get().cart.reduce((count, item) => count + item.quantity, 0); },
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),
  selectedAddress: "",
  setSelectedAddress: (addr) => set({ selectedAddress: addr }),
  selectedLocation: null,
  setSelectedLocation: (loc) => set({ selectedLocation: loc }),
  deliveryTime: "",
  setDeliveryTime: (time) => set({ deliveryTime: time }),
  paymentMethod: "online",
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  orderPlaced: false,
  setOrderPlaced: (v) => set({ orderPlaced: v }),
  discountCode: "",
  discountPercent: 0,
  applyDiscountCode: (code) => {
    const validCodes: Record<string, number> = { "SNAPP20": 20, "HYPERSALE": 15, "WELCOME10": 10, "FREE50": 50, "MARKET30": 30 };
    const percent = validCodes[code.toUpperCase()];
    if (percent) { set({ discountCode: code.toUpperCase(), discountPercent: percent }); return true; }
    return false;
  },
  removeDiscountCode: () => set({ discountCode: "", discountPercent: 0 }),
}));