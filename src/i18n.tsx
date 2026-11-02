import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'vi' | 'en' | 'id';
const LANGUAGE_STORAGE_KEY = 'giatot-language';
type TranslationKey = keyof typeof translations.vi;

const translations = {
  vi: {
    home: 'Trang chủ', categories: 'Danh mục', featured: 'Sản phẩm nổi bật', blog: 'Blog', wishlist: 'Yêu thích', account: 'Tài khoản', searchPlaceholder: 'Tìm sản phẩm, thương hiệu...', searchSuggestionsUnavailable: 'Gợi ý tìm kiếm hiện không khả dụng.',
    smartShopping: 'Mua thông minh hơn', heroTitle: 'So sánh giá, mua đúng nơi,', heroAccent: 'tiết kiệm hơn mỗi ngày.', heroDescription: 'So sánh giá của hàng ngàn sản phẩm từ nhiều cửa hàng uy tín. Tìm được mức giá tốt nhất chỉ trong vài giây.', popularSearch: 'Tìm kiếm phổ biến:', iphone: 'iPhone', laptop: 'Laptop', headphones: 'Tai nghe', explore: 'Khám phá sản phẩm', compare: 'So sánh sản phẩm', bestPrice: 'Xem giá tốt nhất', goodPrice: 'Giá tốt',
    partnersTitle: 'Đối tác của chúng tôi', partnersSubtitle: 'Mua sắm cùng những nơi uy tín', trustFast: 'So sánh nhanh chóng', trustFastDesc: 'Tìm giá tốt trong vài giây', trustClear: 'Thông tin minh bạch', trustClearDesc: 'Dữ liệu cập nhật rõ ràng', trustTime: 'Tiết kiệm thời gian', trustTimeDesc: 'Đỡ phải mở nhiều tab', trustFree: 'Hoàn toàn miễn phí', trustFreeDesc: 'Luôn miễn phí cho bạn',
    newsletterEyebrow: 'Ưu đãi mỗi tuần', newsletterTitle: 'Nhận giá tốt trước mọi người.', newsletterDesc: 'Đăng ký để nhận sản phẩm nổi bật và deal mới nhất.', subscribe: 'Đăng ký', about: 'Về chúng tôi', exploreMenu: 'Khám phá', support: 'Hỗ trợ', signOut: 'Đăng xuất khỏi tài khoản', verified: 'Đã xác thực', quickAccess: 'Truy cập nhanh', accountManagement: 'Quản lý tài khoản',
  },
  en: {
    home: 'Home', categories: 'Categories', featured: 'Featured products', blog: 'Blog', wishlist: 'Wishlist', account: 'Account', searchPlaceholder: 'Search products, brands...', searchSuggestionsUnavailable: 'Search suggestions are currently unavailable.',
    smartShopping: 'Shop smarter', heroTitle: 'Compare prices, buy better,', heroAccent: 'save more every day.', heroDescription: 'Compare thousands of products from trusted stores and find the best price in seconds.', popularSearch: 'Popular searches:', iphone: 'iPhone', laptop: 'Laptop', headphones: 'Headphones', explore: 'Explore products', compare: 'Compare products', bestPrice: 'See best price', goodPrice: 'Best price',
    partnersTitle: 'Our partners', partnersSubtitle: 'Shop with trusted stores', trustFast: 'Compare faster', trustFastDesc: 'Find better prices in seconds', trustClear: 'Clear information', trustClearDesc: 'Fresh and transparent data', trustTime: 'Save your time', trustTimeDesc: 'No more opening many tabs', trustFree: 'Always free', trustFreeDesc: 'Free for every shopper',
    newsletterEyebrow: 'Weekly deals', newsletterTitle: 'Get the best prices first.', newsletterDesc: 'Subscribe for featured products and the latest deals.', subscribe: 'Subscribe', about: 'About us', exploreMenu: 'Explore', support: 'Support', signOut: 'Sign out', verified: 'Verified', quickAccess: 'Quick access', accountManagement: 'Account management',
  },
  id: {
    home: 'Beranda', categories: 'Kategori', featured: 'Produk unggulan', blog: 'Blog', wishlist: 'Favorit', account: 'Akun', searchPlaceholder: 'Cari produk, merek...', searchSuggestionsUnavailable: 'Saran pencarian saat ini tidak tersedia.',
    smartShopping: 'Belanja lebih cerdas', heroTitle: 'Bandingkan harga, beli lebih baik,', heroAccent: 'hemat setiap hari.', heroDescription: 'Bandingkan ribuan produk dari toko terpercaya dan temukan harga terbaik dalam hitungan detik.', popularSearch: 'Pencarian populer:', iphone: 'iPhone', laptop: 'Laptop', headphones: 'Headphone', explore: 'Jelajahi produk', compare: 'Bandingkan produk', bestPrice: 'Lihat harga terbaik', goodPrice: 'Harga terbaik',
    partnersTitle: 'Mitra kami', partnersSubtitle: 'Belanja di toko terpercaya', trustFast: 'Bandingkan lebih cepat', trustFastDesc: 'Temukan harga terbaik dalam hitungan detik', trustClear: 'Informasi transparan', trustClearDesc: 'Data selalu diperbarui', trustTime: 'Hemat waktu', trustTimeDesc: 'Tidak perlu membuka banyak tab', trustFree: 'Selalu gratis', trustFreeDesc: 'Gratis untuk semua pembeli',
    newsletterEyebrow: 'Penawaran mingguan', newsletterTitle: 'Dapatkan harga terbaik lebih dulu.', newsletterDesc: 'Berlangganan untuk mendapatkan produk pilihan dan penawaran terbaru.', subscribe: 'Berlangganan', about: 'Tentang kami', exploreMenu: 'Jelajahi', support: 'Bantuan', signOut: 'Keluar dari akun', verified: 'Terverifikasi', quickAccess: 'Akses cepat', accountManagement: 'Kelola akun',
  },
} as const;

interface LanguageContextValue { language: Language; setLanguage: (language: Language) => void; t: (key: TranslationKey) => string; }
const LanguageContext = createContext<LanguageContextValue | null>(null);

function readSavedLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved === 'vi' || saved === 'en' || saved === 'id' ? saved : 'vi';
  } catch {
    return 'vi';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readSavedLanguage);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = (next: Language) => {
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
