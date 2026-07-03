export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  productCount: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  image: string;
  categoryId: string;
  unit: string;
  description: string;
  brand: string;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export const categories: Category[] = [
  { id: "1", name: "میوه و سبزیجات", icon: "🍎", color: "#22c55e", productCount: 24 },
  { id: "2", name: "لبنیات و تخم مرغ", icon: "🥛", color: "#3b82f6", productCount: 18 },
  { id: "3", name: "نان و غلات", icon: "🍞", color: "#f59e0b", productCount: 15 },
  { id: "4", name: " گوشت و مرغ", icon: "🥩", color: "#ef4444", productCount: 12 },
  { id: "5", name: "نوشیدنی", icon: "🥤", color: "#06b6d4", productCount: 20 },
  { id: "6", name: "تنقلات و خشکبار", icon: "🥜", color: "#d97706", productCount: 22 },
  { id: "7", name: "برنج و حبوبات", icon: "🍚", color: "#92400e", productCount: 14 },
  { id: "8", name: "روغن و سس", icon: "🫒", color: "#65a30d", productCount: 10 },
  { id: "9", name: "کنسرو و غذای آماده", icon: "🥫", color: "#b91c1c", productCount: 16 },
  { id: "10", name: "شیرینی و شکلات", icon: "🍫", color: "#7c2d12", productCount: 19 },
  { id: "11", name: "بهداشت و آرایشی", icon: "🧴", color: "#ec4899", productCount: 21 },
  { id: "12", name: "شوینده و نظافت", icon: "🧹", color: "#6366f1", productCount: 13 },
];

export const products: Product[] = [
  { id: "p1", name: "سیب قرمز اعلا ۱ کیلوگرم", price: 65000, discountPrice: 52000, image: "https://placehold.co/400x400/fef2f2/dc2626?text=سیب+قرمز", categoryId: "1", unit: "کیلوگرم", description: "سیب قرمز تازه و درجه یک از باغ‌های سرسبز شمال ایران.", brand: "باغ سرسبز", stock: 150 },
  { id: "p2", name: "موز خنثی ۱ دسته", price: 35000, image: "https://placehold.co/400x400/fefce8/eab308?text=موز", categoryId: "1", unit: "دسته", description: "موز تازه و خنثی با کیفیت بالا.", brand: "میوه تازه", stock: 80 },
  { id: "p3", name: "گوجه فرنگی گلخانه‌ای ۱ کیلو", price: 45000, discountPrice: 38000, image: "https://placehold.co/400x400/fef2f2/ef4444?text=گوجه", categoryId: "1", unit: "کیلوگرم", description: "گوجه فرنگی گلخانه‌ای تازه و درجه یک.", brand: "گلخانه نوین", stock: 200 },
  { id: "p4", name: "خیار سبز ۱ کیلوگرم", price: 30000, image: "https://placehold.co/400x400/f0fdf4/22c55e?text=خیار", categoryId: "1", unit: "کیلوگرم", description: "خیار سبز تازه و خوش‌طعم.", brand: "سبزی تازه", stock: 180 },
  { id: "p5", name: "پرتقال تازه ۱ کیلوگرم", price: 55000, discountPrice: 45000, image: "https://placehold.co/400x400/fff7ed/f97316?text=پرتقال", categoryId: "1", unit: "کیلوگرم", description: "پرتقال تازه و آب‌دار.", brand: "باغ مرکبات", stock: 120 },
  { id: "p6", name: "شیر کم‌چرب کاله ۱ لیتری", price: 32000, image: "https://placehold.co/400x400/eff6ff/3b82f6?text=شیر+کاله", categoryId: "2", unit: "لیتر", description: "شیر کم‌چرب پاستوریزه کاله.", brand: "کاله", stock: 500 },
  { id: "p7", name: "ماست پرچرب رامک ۹۰۰ گرم", price: 38000, discountPrice: 33000, image: "https://placehold.co/400x400/f0fdf4/16a34a?text=ماست+رامک", categoryId: "2", unit: "گرم", description: "ماست پرچرب سنتی رامک.", brand: "رامک", stock: 300 },
  { id: "p8", name: "پنیر خامه‌ای صباح ۲۰۰ گرم", price: 28000, image: "https://placehold.co/400x400/fffff0/eab308?text=پنیر+صباح", categoryId: "2", unit: "گرم", description: "پنیر خامه‌ای نرم و خوش‌طعم.", brand: "صباح", stock: 250 },
  { id: "p9", name: "تخم مرغ روستایی ۱۲ عددی", price: 65000, discountPrice: 55000, image: "https://placehold.co/400x400/fefce8/f59e0b?text=تخم+مرغ", categoryId: "2", unit: "بسته", description: "تخم مرغ روستایی تازه.", brand: "مرغداری سپید", stock: 400 },
  { id: "p10", name: "نان بربری تازه ۲ عدد", price: 20000, image: "https://placehold.co/400x400/fef2f2/b91c1c?text=نان+بربری", categoryId: "3", unit: "عدد", description: "نان بربری تازه پخته شده.", brand: "نانوایی سنتی", stock: 100 },
  { id: "p11", name: "نان سنگک سبوس‌دار ۱ عدد", price: 15000, image: "https://placehold.co/400x400/fef3c7/92400e?text=نان+سنگک", categoryId: "3", unit: "عدد", description: "نان سنگک سبوس‌دار و مقوی.", brand: "نانوایی حافظ", stock: 80 },
  { id: "p12", name: "سینه مرغ منجمد ۱ کیلو", price: 185000, discountPrice: 165000, image: "https://placehold.co/400x400/fef2f2/ef4444?text=سینه+مرغ", categoryId: "4", unit: "کیلوگرم", description: "سینه مرغ منجمد تمیز.", brand: "مرغ آرین", stock: 60 },
  { id: "p13", name: "گوشت چرخ‌کرده گوسفندی ۵۰۰ گرم", price: 350000, discountPrice: 310000, image: "https://placehold.co/400x400/fef2f2/b91c1c?text=گوشت+چرخ", categoryId: "4", unit: "گرم", description: "گوشت چرخ‌کرده گوسفندی تازه.", brand: "گوشت فریز", stock: 40 },
  { id: "p14", name: "آب معدنی دماوند ۱.۵ لیتری", price: 8000, image: "https://placehold.co/400x400/eff6ff/06b6d4?text=آب+دماوند", categoryId: "5", unit: "لیتر", description: "آب معدنی طبیعی دماوند.", brand: "دماوند", stock: 1000 },
  { id: "p15", name: "نوشابه کوکا ۱.۵ لیتری", price: 22000, discountPrice: 18000, image: "https://placehold.co/400x400/fef2f2/dc2626?text=کوکا", categoryId: "5", unit: "لیتر", description: "نوشابه کوکاکولا.", brand: "کوکاکولا", stock: 600 },
  { id: "p16", name: "دوغ سنتی ۱ لیتری", price: 18000, image: "https://placehold.co/400x400/f0fdf4/22c55e?text=دوغ", categoryId: "5", unit: "لیتر", description: "دوغ سنتی گازدار و خنک.", brand: "انیس", stock: 400 },
  { id: "p17", name: "آبمیوه انار ۱ لیتری", price: 42000, discountPrice: 36000, image: "https://placehold.co/400x400/fef2f2/881337?text=آب+انار", categoryId: "5", unit: "لیتر", description: "آبمیوه انار طبیعی.", brand: "سنگن", stock: 250 },
  { id: "p18", name: "پسته خندان ۲۵۰ گرم", price: 195000, discountPrice: 175000, image: "https://placehold.co/400x400/fefce8/d97706?text=پسته", categoryId: "6", unit: "گرم", description: "پسته خندان درجه یک کرمان.", brand: "آرمان", stock: 100 },
  { id: "p19", name: "چیپس خلالی مزمز ۹۰ گرم", price: 25000, image: "https://placehold.co/400x400/fefce8/eab308?text=چیپس", categoryId: "6", unit: "گرم", description: "چیپس خلالی با طعم پنیر.", brand: "مزمز", stock: 500 },
  { id: "p20", name: "بادام زمینی بودار ۲۰۰ گرم", price: 65000, discountPrice: 55000, image: "https://placehold.co/400x400/fef3c7/b45309?text=بادام", categoryId: "6", unit: "گرم", description: "بادام زمینی بودار و شور.", brand: "آئورا", stock: 200 },
  { id: "p21", name: "برنج ایرانی هاشمی ۵ کیلو", price: 550000, discountPrice: 490000, image: "https://placehold.co/400x400/fffbeb/92400e?text=برنج+هاشمی", categoryId: "7", unit: "کیلوگرم", description: "برنج ایرانی هاشمی درجه یک.", brand: "ایل‌برنج", stock: 80 },
  { id: "p22", name: "عدس قرمز ۱ کیلوگرم", price: 95000, image: "https://placehold.co/400x400/fef2f2/b91c1c?text=عدس", categoryId: "7", unit: "کیلوگرم", description: "عدس قرمز درجه یک.", brand: "سحر", stock: 150 },
  { id: "p23", name: "روغن زیتون خالص ۵۰۰ میلی‌لیتر", price: 145000, image: "https://placehold.co/400x400/fefce8/65a30d?text=روغن+زیتون", categoryId: "8", unit: "میلی‌لیتر", description: "روغن زیتون فرابکر خالص.", brand: "گلبرگ", stock: 90 },
  { id: "p24", name: "سس مایونز کچاپ ۴۵۰ گرم", price: 32000, discountPrice: 28000, image: "https://placehold.co/400x400/fffff0/f59e0b?text=مایونز", categoryId: "8", unit: "گرم", description: "سس مایونز کچاپ.", brand: "کچاپ", stock: 350 },
  { id: "p25", name: "تن ماهی در روغن ۱۲۰ گرم", price: 45000, discountPrice: 39000, image: "https://placehold.co/400x400/eff6ff/1d4ed8?text=تن+ماهی", categoryId: "9", unit: "گرم", description: "تن ماهی در روغن زیتون.", brand: "شورچین", stock: 300 },
  { id: "p26", name: "لوبیا قرمز کنسروی ۴۰۰ گرم", price: 28000, image: "https://placehold.co/400x400/fef2f2/b91c1c?text=لوبیا", categoryId: "9", unit: "گرم", description: "لوبیا قرمز کنسروی.", brand: "کشمیر", stock: 200 },
  { id: "p27", name: "شکلات تلخ ۷۰٪ ۱۰۰ گرم", price: 65000, discountPrice: 55000, image: "https://placehold.co/400x400/422006/fbbf24?text=شکلات+تلخ", categoryId: "10", unit: "گرم", description: "شکلات تلخ خالص ۷۰٪ کاکائو.", brand: "شکلات هفت", stock: 180 },
  { id: "p28", name: "کلوچه سبوس‌دار ۱۲ عددی", price: 48000, image: "https://placehold.co/400x400/fef3c7/92400e?text=کلوچه", categoryId: "10", unit: "بسته", description: "کلوچه سبوس‌دار خانگی.", brand: "مادر", stock: 120 },
  { id: "p29", name: "شامپو سر و شانه پنتن ۴۰۰ میلی‌لیتر", price: 125000, discountPrice: 105000, image: "https://placehold.co/400x400/fdf2f8/ec4899?text=شامپو", categoryId: "11", unit: "میلی‌لیتر", description: "شامپوی ترمیم‌کننده پنتن.", brand: "پنتن", stock: 200 },
  { id: "p30", name: "صابون مایع دستشویی ۵۰۰ میلی‌لیتر", price: 35000, image: "https://placehold.co/400x400/eff6ff/3b82f6?text=صابون", categoryId: "11", unit: "میلی‌لیتر", description: "صابون مایع آنتی‌باکتریال.", brand: "شف", stock: 400 },
];

export function formatPrice(price: number): string { return price.toLocaleString("fa-IR"); }
export function getDiscountPercent(price: number, discountPrice: number): number { return Math.round(((price - discountPrice) / price) * 100); }
export function getProductsByCategory(categoryId: string): Product[] { return products.filter((p) => p.categoryId === categoryId); }
export function getOfferProducts(): Product[] { return products.filter((p) => p.discountPrice); }
export function getProductById(id: string): Product | undefined { return products.find((p) => p.id === id); }
export function getCategoryName(categoryId: string): string { return categories.find((c) => c.id === categoryId)?.name ?? ""; }

export const banners = [
  { id: "b1", title: "تخفیف ویژه میوه‌ها", subtitle: "تا ۴۰٪ تخفیف", bg: "from-green-500 to-emerald-600", emoji: "🥬" },
  { id: "b2", title: "جشنواره لبنیات", subtitle: "خرید ۲ تومان ۱ تومان", bg: "from-blue-500 to-cyan-500", emoji: "🧀" },
  { id: "b3", title: "ارسال رایگان", subtitle: "سفارش بالای ۵۰۰ هزار تومان", bg: "from-orange-500 to-amber-500", emoji: "🚚" },
  { id: "b4", title: "محصولات ارگانیک", subtitle: "سالم و تازه", bg: "from-lime-500 to-green-500", emoji: "🌿" },
];