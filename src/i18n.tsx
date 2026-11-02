import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'vi' | 'en' | 'id';
const LANGUAGE_STORAGE_KEY = 'giatot-language';
type TranslationKey = keyof typeof translations.vi;

function isLanguage(value: unknown): value is Language {
  return value === 'vi' || value === 'en' || value === 'id';
}

const translations = {
  vi: {
    home: 'Trang chủ', categories: 'Danh mục', featured: 'Sản phẩm nổi bật', blog: 'Blog', wishlist: 'Yêu thích', account: 'Tài khoản', searchPlaceholder: 'Tìm sản phẩm, thương hiệu...', searchSuggestionsUnavailable: 'Gợi ý tìm kiếm hiện không khả dụng.',
    smartShopping: 'Mua thông minh hơn', heroTitle: 'So sánh giá, mua đúng nơi,', heroAccent: 'tiết kiệm hơn mỗi ngày.', heroDescription: 'So sánh giá của hàng ngàn sản phẩm từ nhiều cửa hàng uy tín. Tìm được mức giá tốt nhất chỉ trong vài giây.', popularSearch: 'Tìm kiếm phổ biến:', iphone: 'iPhone', laptop: 'Laptop', headphones: 'Tai nghe', explore: 'Khám phá sản phẩm', compare: 'So sánh sản phẩm', bestPrice: 'Xem giá tốt nhất', goodPrice: 'Giá tốt',
    partnersTitle: 'Đối tác của chúng tôi', partnersSubtitle: 'Mua sắm cùng những nơi uy tín', trustFast: 'So sánh nhanh chóng', trustFastDesc: 'Tìm giá tốt trong vài giây', trustClear: 'Thông tin minh bạch', trustClearDesc: 'Dữ liệu cập nhật rõ ràng', trustTime: 'Tiết kiệm thời gian', trustTimeDesc: 'Đỡ phải mở nhiều tab', trustFree: 'Hoàn toàn miễn phí', trustFreeDesc: 'Luôn miễn phí cho bạn',
    newsletterEyebrow: 'Ưu đãi mỗi tuần', newsletterTitle: 'Nhận giá tốt trước mọi người.', newsletterDesc: 'Đăng ký để nhận sản phẩm nổi bật và deal mới nhất.', subscribe: 'Đăng ký', about: 'Về chúng tôi', exploreMenu: 'Khám phá', support: 'Hỗ trợ', signOut: 'Đăng xuất khỏi tài khoản', verified: 'Đã xác thực', quickAccess: 'Truy cập nhanh', accountManagement: 'Quản lý tài khoản',
    search: 'Tìm kiếm', homeSearchPlaceholder: 'Tìm sản phẩm, thương hiệu...', emailAddress: 'Nhập email của bạn', madeForSmarterShopping: 'Mua sắm thông minh hơn', partnerLink: 'Đối tác', noImage: 'Chưa có hình ảnh', from: 'Từ', storesSelling: 'cửa hàng đang bán', viewPrice: 'Xem giá', discover: 'Khám phá', popularCategories: 'Danh mục phổ biến', viewAll: 'Xem tất cả', oneProduct: '{count} sản phẩm', manyProducts: '{count} sản phẩm', loadingCategories: 'Đang tải danh mục...', noCategories: 'Chưa có danh mục', featuredEyebrow: 'Được quan tâm', featuredProducts: 'Sản phẩm nổi bật', loadingProducts: 'Đang tải sản phẩm...', noFeaturedProducts: 'Chưa có sản phẩm nổi bật', promoEyebrow: 'Một sản phẩm, nhiều lựa chọn', promoTitle: 'Giá tốt hơn khi bạn so sánh.', promoDescription: 'Không bỏ lỡ ưu đãi từ các shop uy tín.', exploreNow: 'Khám phá ngay', forYou: 'Dành cho bạn', featuredComputers: 'Máy tính được quan tâm', noCategoryProducts: 'Chưa có sản phẩm trong danh mục này', homeLoadError: 'Không thể tải dữ liệu trang chủ', tryAgain: 'Thử lại', featuredProduct: 'Sản phẩm nổi bật', comparePricesFromStores: 'So sánh giá sản phẩm', compareEasily: 'So sánh dễ dàng', chooseTheRightProduct: 'Chọn sản phẩm phù hợp', trustedPlaces: 'Mua sắm cùng những nơi uy tín', partnerDescription: 'Giá được tổng hợp từ các cửa hàng và sàn thương mại điện tử hàng đầu.', marketplace: 'Sàn thương mại', ecommerce: 'Thương mại điện tử', technology: 'Công nghệ', newsletterStoreTagline: 'So sánh giá thông minh', footerTagline: 'So sánh giá - Mua đúng nơi - Tiết kiệm hơn mỗi ngày.', compareProducts: 'So sánh sản phẩm', trackPrices: 'Theo dõi giá', helpCenter: 'Trung tâm trợ giúp', terms: 'Điều khoản', privacyPolicy: 'Chính sách bảo mật', allRightsReserved: 'Tất cả quyền được bảo lưu.',
  },
  en: {
    home: 'Home', categories: 'Categories', featured: 'Featured products', blog: 'Blog', wishlist: 'Wishlist', account: 'Account', searchPlaceholder: 'Search products, brands...', searchSuggestionsUnavailable: 'Search suggestions are currently unavailable.',
    smartShopping: 'Shop smarter', heroTitle: 'Compare prices, buy better,', heroAccent: 'save more every day.', heroDescription: 'Compare thousands of products from trusted stores and find the best price in seconds.', popularSearch: 'Popular searches:', iphone: 'iPhone', laptop: 'Laptop', headphones: 'Headphones', explore: 'Explore products', compare: 'Compare products', bestPrice: 'See best price', goodPrice: 'Best price',
    partnersTitle: 'Our partners', partnersSubtitle: 'Shop with trusted stores', trustFast: 'Compare faster', trustFastDesc: 'Find better prices in seconds', trustClear: 'Clear information', trustClearDesc: 'Fresh and transparent data', trustTime: 'Save your time', trustTimeDesc: 'No more opening many tabs', trustFree: 'Always free', trustFreeDesc: 'Free for every shopper',
    newsletterEyebrow: 'Weekly deals', newsletterTitle: 'Get the best prices first.', newsletterDesc: 'Subscribe for featured products and the latest deals.', subscribe: 'Subscribe', about: 'About us', exploreMenu: 'Explore', support: 'Support', signOut: 'Sign out', verified: 'Verified', quickAccess: 'Quick access', accountManagement: 'Account management',
    search: 'Search', homeSearchPlaceholder: 'Search the catalog...', emailAddress: 'Enter your email address', madeForSmarterShopping: 'Made for smarter shopping', partnerLink: 'Partners', noImage: 'No image available', from: 'From', storesSelling: 'stores selling', viewPrice: 'See price', discover: 'Discover', popularCategories: 'Popular categories', viewAll: 'View all', oneProduct: '{count} product', manyProducts: '{count} products', loadingCategories: 'Loading categories...', noCategories: 'No categories yet', featuredEyebrow: 'Popular now', featuredProducts: 'Featured products', loadingProducts: 'Loading products...', noFeaturedProducts: 'No featured products yet', promoEyebrow: 'One product, more choices', promoTitle: 'Get better prices when you compare.', promoDescription: 'Do not miss deals from trusted stores.', exploreNow: 'Explore now', forYou: 'Picked for you', featuredComputers: 'Popular computers', noCategoryProducts: 'No products in this category yet', homeLoadError: 'Could not load home page data', tryAgain: 'Try again', featuredProduct: 'Featured product', comparePricesFromStores: 'Compare store prices', compareEasily: 'Compare with ease', chooseTheRightProduct: 'Choose the right product', trustedPlaces: 'Shop with trusted stores', partnerDescription: 'Prices are collected from leading stores and marketplaces.', marketplace: 'Marketplace', ecommerce: 'E-commerce', technology: 'Technology', newsletterStoreTagline: 'Smart price comparison', footerTagline: 'Compare prices - Buy better - Save more every day.', compareProducts: 'Compare products', trackPrices: 'Track prices', helpCenter: 'Help center', terms: 'Terms', privacyPolicy: 'Privacy policy', allRightsReserved: 'All rights reserved.',
  },
  id: {
    home: 'Beranda', categories: 'Kategori', featured: 'Produk unggulan', blog: 'Blog', wishlist: 'Favorit', account: 'Akun', searchPlaceholder: 'Cari produk, merek...', searchSuggestionsUnavailable: 'Saran pencarian saat ini tidak tersedia.',
    smartShopping: 'Belanja lebih cerdas', heroTitle: 'Bandingkan harga, beli lebih baik,', heroAccent: 'hemat setiap hari.', heroDescription: 'Bandingkan ribuan produk dari toko terpercaya dan temukan harga terbaik dalam hitungan detik.', popularSearch: 'Pencarian populer:', iphone: 'iPhone', laptop: 'Laptop', headphones: 'Headphone', explore: 'Jelajahi produk', compare: 'Bandingkan produk', bestPrice: 'Lihat harga terbaik', goodPrice: 'Harga terbaik',
    partnersTitle: 'Mitra kami', partnersSubtitle: 'Belanja di toko terpercaya', trustFast: 'Bandingkan lebih cepat', trustFastDesc: 'Temukan harga terbaik dalam hitungan detik', trustClear: 'Informasi transparan', trustClearDesc: 'Data selalu diperbarui', trustTime: 'Hemat waktu', trustTimeDesc: 'Tidak perlu membuka banyak tab', trustFree: 'Selalu gratis', trustFreeDesc: 'Gratis untuk semua pembeli',
    newsletterEyebrow: 'Penawaran mingguan', newsletterTitle: 'Dapatkan harga terbaik lebih dulu.', newsletterDesc: 'Berlangganan untuk mendapatkan produk pilihan dan penawaran terbaru.', subscribe: 'Berlangganan', about: 'Tentang kami', exploreMenu: 'Jelajahi', support: 'Bantuan', signOut: 'Keluar dari akun', verified: 'Terverifikasi', quickAccess: 'Akses cepat', accountManagement: 'Kelola akun',
    search: 'Cari', homeSearchPlaceholder: 'Cari produk dan merek...', emailAddress: 'Masukkan alamat email', madeForSmarterShopping: 'Belanja lebih cerdas', partnerLink: 'Mitra', noImage: 'Gambar tidak tersedia', from: 'Mulai', storesSelling: 'toko menjual', viewPrice: 'Lihat harga', discover: 'Jelajahi', popularCategories: 'Kategori populer', viewAll: 'Lihat semua', oneProduct: '{count} produk', manyProducts: '{count} produk', loadingCategories: 'Memuat kategori...', noCategories: 'Belum ada kategori', featuredEyebrow: 'Populer sekarang', featuredProducts: 'Produk unggulan', loadingProducts: 'Memuat produk...', noFeaturedProducts: 'Belum ada produk unggulan', promoEyebrow: 'Satu produk, lebih banyak pilihan', promoTitle: 'Bandingkan untuk harga lebih baik.', promoDescription: 'Jangan lewatkan penawaran dari toko tepercaya.', exploreNow: 'Jelajahi sekarang', forYou: 'Pilihan untuk Anda', featuredComputers: 'Komputer populer', noCategoryProducts: 'Belum ada produk dalam kategori ini', homeLoadError: 'Tidak dapat memuat data beranda', tryAgain: 'Coba lagi', featuredProduct: 'Produk unggulan', comparePricesFromStores: 'Bandingkan harga toko', compareEasily: 'Bandingkan dengan mudah', chooseTheRightProduct: 'Pilih produk yang tepat', trustedPlaces: 'Belanja di toko terpercaya', partnerDescription: 'Harga dikumpulkan dari toko dan marketplace terkemuka.', marketplace: 'Marketplace', ecommerce: 'E-commerce', technology: 'Teknologi', newsletterStoreTagline: 'Perbandingan harga cerdas', footerTagline: 'Bandingkan harga - Beli lebih baik - Hemat setiap hari.', compareProducts: 'Bandingkan produk', trackPrices: 'Pantau harga', helpCenter: 'Pusat bantuan', terms: 'Ketentuan', privacyPolicy: 'Kebijakan privasi', allRightsReserved: 'Hak cipta dilindungi.',
  },
} as const;

interface LanguageContextValue { language: Language; setLanguage: (language: Language) => void; t: (key: TranslationKey) => string; }
const LanguageContext = createContext<LanguageContextValue | null>(null);

function readSavedLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(saved) ? saved : 'vi';
  } catch {
    return 'vi';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readSavedLanguage);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = (next: Language) => {
    if (!isLanguage(next)) return;
    setLanguageState(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Keep the selection usable for this session if browser storage is unavailable.
    }
  };
  const value = useMemo(() => ({ language, setLanguage, t: (key: TranslationKey) => translations[language][key] }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { const context = useContext(LanguageContext); if (!context) throw new Error('useLanguage must be used inside LanguageProvider'); return context; }
