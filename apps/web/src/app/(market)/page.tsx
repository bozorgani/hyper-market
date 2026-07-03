"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useMarketStore } from "@/store/market-store";
import { HomePage as MarketHomePage } from "@/components/market/home-page";
import { ProductsPage } from "@/components/market/products-page";
import { CartPage } from "@/components/market/cart-page";
import { CheckoutPage } from "@/components/market/checkout-page";
import { ProfilePage } from "@/components/market/profile-page";
import { ProductDetailPage } from "@/components/market/product-detail-page";

function MarketRouter() {
  const { currentPage } = useMarketStore();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={currentPage.type} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
        {currentPage.type === "home" && <MarketHomePage />}
        {currentPage.type === "products" && <ProductsPage />}
        {currentPage.type === "product-detail" && <ProductDetailPage />}
        {currentPage.type === "cart" && <CartPage />}
        {currentPage.type === "checkout" && <CheckoutPage />}
        {currentPage.type === "profile" && <ProfilePage />}
      </motion.div>
    </AnimatePresence>
  );
}
export default function MarketPage() { return <MarketRouter />; }