export type BlogCategory = 'Kinh nghiệm mua sắm' | 'Đánh giá sản phẩm' | 'Xu hướng thị trường';

export type BlogContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'image'; caption: string }
  | { type: 'quote'; text: string };

export interface BlogArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  author: string;
  initials: string;
  publishedAt: string;
  readingMinutes: number;
  featured?: boolean;
  tags: string[];
  content: BlogContentBlock[];
}

const articleSeeds: Array<Pick<BlogArticle, 'title' | 'excerpt' | 'category' | 'author' | 'initials' | 'readingMinutes' | 'tags'>> = [
  { title: '10 mẹo so sánh giá giúp bạn tiết kiệm đến 30% khi mua sắm online', excerpt: 'Tổng hợp những nguyên tắc so sánh giá đơn giản nhưng hiệu quả, từ việc theo dõi lịch sử giá đến chọn đúng thời điểm săn khuyến mãi.', category: 'Kinh nghiệm mua sắm', author: 'Minh Anh', initials: 'AN', readingMinutes: 6, tags: ['so-sánh-giá', 'mua-sắm-thông-minh', 'tiết-kiệm'] },
  { title: 'So sánh tai nghe không dây tầm giá dưới 2 triệu', excerpt: 'Đánh giá pin, chất âm và khả năng chống ồn để tìm mẫu tai nghe đáng tiền trong tầm giá phổ thông.', category: 'Đánh giá sản phẩm', author: 'Thanh Hà', initials: 'TH', readingMinutes: 5, tags: ['tai-nghe', 'đánh-giá'] },
  { title: '5 sai lầm thường gặp khiến bạn mua hớ khi săn sale cuối năm', excerpt: 'Nhận biết các chiêu giảm giá ảo và kiểm tra giá trước khi quyết định mua.', category: 'Kinh nghiệm mua sắm', author: 'Lan Ngọc', initials: 'LN', readingMinutes: 4, tags: ['săn-sale', 'kinh-nghiệm'] },
  { title: 'Smartphone tầm trung 2026: đâu là chiếc máy đáng mua nhất?', excerpt: 'So sánh camera, hiệu năng và thời lượng pin của những mẫu smartphone nổi bật.', category: 'Đánh giá sản phẩm', author: 'Việt Hùng', initials: 'VH', readingMinutes: 7, tags: ['smartphone', 'đánh-giá'] },
  { title: 'Cách đọc lịch sử giá để biết khi nào nên xuống tiền', excerpt: 'Dùng biểu đồ lịch sử giá để phân biệt mức giảm thật và chọn thời điểm mua hợp lý.', category: 'Kinh nghiệm mua sắm', author: 'Phương Thảo', initials: 'PT', readingMinutes: 5, tags: ['lịch-sử-giá', 'tiết-kiệm'] },
  { title: 'Thương mại điện tử Việt Nam: những xu hướng đáng chú ý', excerpt: 'Nhìn lại những thay đổi trong thói quen mua sắm trực tuyến và các nhóm hàng tăng trưởng.', category: 'Xu hướng thị trường', author: 'Gia Tốt', initials: 'GT', readingMinutes: 6, tags: ['thương-mại-điện-tử', 'xu-hướng'] },
  { title: 'Nồi chiên không dầu nào bền và dễ vệ sinh?', excerpt: 'Đặt các mẫu nồi phổ biến cạnh nhau để so sánh dung tích, công suất và cách vệ sinh.', category: 'Đánh giá sản phẩm', author: 'Hoài My', initials: 'HM', readingMinutes: 8, tags: ['đồ-gia-dụng', 'đánh-giá'] },
  { title: 'Mua hàng trả góp 0%: cần đọc kỹ điều khoản nào?', excerpt: 'Những khoản phí và điều kiện thường bị bỏ qua trong hợp đồng trả góp.', category: 'Kinh nghiệm mua sắm', author: 'Quang Tuấn', initials: 'QT', readingMinutes: 4, tags: ['trả-góp', 'kinh-nghiệm'] },
  { title: 'TV 55 inch dịp cuối năm: nên mua ngay hay chờ Tết?', excerpt: 'So sánh chu kỳ giảm giá để chọn thời điểm mua TV phù hợp với nhu cầu.', category: 'Xu hướng thị trường', author: 'Bảo Trâm', initials: 'BT', readingMinutes: 5, tags: ['tivi', 'xu-hướng'] },
  { title: 'Máy lọc không khí có thực sự cần thiết?', excerpt: 'So sánh các phân khúc và những tính năng hữu ích theo diện tích phòng.', category: 'Đánh giá sản phẩm', author: 'Ngọc Hân', initials: 'NH', readingMinutes: 6, tags: ['máy-lọc-không-khí', 'đánh-giá'] },
  { title: 'Cách kiểm tra shop uy tín trước khi đặt hàng online', excerpt: 'Năm dấu hiệu nhận biết cửa hàng đáng tin và cách đọc đánh giá khách hàng.', category: 'Kinh nghiệm mua sắm', author: 'Trọng Lâm', initials: 'TL', readingMinutes: 4, tags: ['cửa-hàng', 'kinh-nghiệm'] },
  { title: 'Laptop học tập và làm việc: chọn cấu hình nào vừa đủ?', excerpt: 'Các tiêu chí cần cân nhắc để chọn laptop phù hợp mà không chi quá ngân sách.', category: 'Đánh giá sản phẩm', author: 'Mai Linh', initials: 'ML', readingMinutes: 7, tags: ['laptop', 'tư-vấn'] },
  { title: 'Mua sắm đa kênh đang thay đổi trải nghiệm khách hàng ra sao?', excerpt: 'Người mua kết hợp cửa hàng trực tuyến và trực tiếp để tìm giá tốt như thế nào.', category: 'Xu hướng thị trường', author: 'Đức Anh', initials: 'DA', readingMinutes: 5, tags: ['bán-lẻ', 'xu-hướng'] },
  { title: 'Máy tính bảng cho sinh viên: chọn màn hình và dung lượng ra sao?', excerpt: 'Gợi ý cấu hình máy tính bảng phục vụ ghi chú, học trực tuyến và giải trí.', category: 'Đánh giá sản phẩm', author: 'Khánh Vy', initials: 'KV', readingMinutes: 6, tags: ['máy-tính-bảng', 'tư-vấn'] },
  { title: 'Mua hàng chính hãng trên sàn: kiểm tra những thông tin nào?', excerpt: 'Cách kiểm tra nhãn hàng, nhà bán và chính sách đổi trả trước khi thanh toán.', category: 'Kinh nghiệm mua sắm', author: 'Hải Nam', initials: 'HN', readingMinutes: 4, tags: ['chính-hãng', 'kinh-nghiệm'] },
  { title: 'Người Việt ưu tiên tiêu chí nào khi chọn điện thoại mới?', excerpt: 'Camera, pin và giá bán tiếp tục định hình lựa chọn smartphone của người dùng.', category: 'Xu hướng thị trường', author: 'Thu Hà', initials: 'TH', readingMinutes: 5, tags: ['smartphone', 'thị-trường'] },
  { title: 'Máy hút bụi không dây: so sánh lực hút và thời lượng pin', excerpt: 'Những khác biệt quan trọng giữa các dòng máy hút bụi phổ biến hiện nay.', category: 'Đánh giá sản phẩm', author: 'Bảo Ngọc', initials: 'BN', readingMinutes: 7, tags: ['đồ-gia-dụng', 'đánh-giá'] },
  { title: 'Lập ngân sách mua sắm để tránh chi tiêu ngoài kế hoạch', excerpt: 'Một vài bước đơn giản giúp bạn theo dõi nhu cầu và kiểm soát khoản mua online.', category: 'Kinh nghiệm mua sắm', author: 'Tuấn Kiệt', initials: 'TK', readingMinutes: 4, tags: ['ngân-sách', 'tiết-kiệm'] },
  { title: 'Các thương hiệu điện máy mở rộng ưu đãi trực tuyến', excerpt: 'Chương trình bán hàng đa kênh mang đến thêm lựa chọn cho người mua.', category: 'Xu hướng thị trường', author: 'Hồng Phúc', initials: 'HP', readingMinutes: 5, tags: ['điện-máy', 'xu-hướng'] },
  { title: 'Bàn phím cơ cho dân văn phòng: cảm giác gõ nào phù hợp?', excerpt: 'So sánh thiết kế, switch và độ ồn để tìm bàn phím hợp với không gian làm việc.', category: 'Đánh giá sản phẩm', author: 'Gia Bảo', initials: 'GB', readingMinutes: 6, tags: ['bàn-phím', 'đánh-giá'] },
  { title: 'Săn mã giảm giá hiệu quả mà không mua thêm món không cần thiết', excerpt: 'Kết hợp mã ưu đãi với danh sách mua sắm để tiết kiệm đúng mục tiêu.', category: 'Kinh nghiệm mua sắm', author: 'Thảo Nhi', initials: 'TN', readingMinutes: 4, tags: ['mã-giảm-giá', 'kinh-nghiệm'] },
  { title: 'Thiết bị nhà thông minh ngày càng phổ biến trong gia đình trẻ', excerpt: 'Các sản phẩm kết nối đang trở nên dễ tiếp cận hơn với nhiều mức giá.', category: 'Xu hướng thị trường', author: 'Minh Khoa', initials: 'MK', readingMinutes: 5, tags: ['nhà-thông-minh', 'xu-hướng'] },
  { title: 'Camera an ninh gia đình: ba mẫu dễ lắp đặt đáng cân nhắc', excerpt: 'So sánh chất lượng hình ảnh, góc quan sát và lưu trữ của camera trong nhà.', category: 'Đánh giá sản phẩm', author: 'Ngọc Mai', initials: 'NM', readingMinutes: 6, tags: ['camera', 'đánh-giá'] },
  { title: 'Đổi trả hàng online: lưu lại bằng chứng và theo dõi tiến độ', excerpt: 'Chuẩn bị thông tin cần thiết để yêu cầu hỗ trợ đổi trả thuận tiện hơn.', category: 'Kinh nghiệm mua sắm', author: 'Quốc Bảo', initials: 'QB', readingMinutes: 4, tags: ['đổi-trả', 'kinh-nghiệm'] },
];

const makeContent = (title: string, excerpt: string): BlogContentBlock[] => [
  { type: 'paragraph', text: excerpt },
  { type: 'heading', text: 'Điều cần biết trước khi lựa chọn' },
  { type: 'paragraph', text: `Khi tìm hiểu ${title.toLocaleLowerCase('vi')}, hãy bắt đầu từ nhu cầu sử dụng và mức ngân sách phù hợp. Đối chiếu thông tin từ nhiều nguồn giúp bạn có góc nhìn rõ ràng hơn.` },
  { type: 'image', caption: 'So sánh thông tin trước khi đưa ra quyết định mua sắm.' },
  { type: 'heading', text: 'So sánh để chọn đúng giá trị' },
  { type: 'paragraph', text: 'Đừng chỉ nhìn vào giá niêm yết. Chính sách bảo hành, phí giao hàng và uy tín cửa hàng cũng ảnh hưởng đến giá trị thực tế của mỗi lựa chọn.' },
  { type: 'quote', text: 'Một lựa chọn tốt là lựa chọn phù hợp với nhu cầu và ngân sách của bạn.' },
  { type: 'heading', text: 'Kết luận' },
  { type: 'paragraph', text: 'Dành thêm thời gian kiểm tra giá và thông tin sản phẩm sẽ giúp bạn mua sắm tự tin, tiết kiệm hơn.' },
];

const createArticle = (seed: typeof articleSeeds[number], index: number): BlogArticle => {
  const isFeatured = index === 0;
  return {
    ...seed,
    slug: isFeatured ? '10-meo-so-sanh-gia' : `${seed.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${index + 1}`,
    publishedAt: new Date(Date.UTC(2026, 10, 12 - index)).toISOString(),
    featured: isFeatured,
    content: isFeatured ? [
      { type: 'paragraph', text: 'Mua sắm online ngày càng phổ biến, nhưng không phải ai cũng biết cách so sánh giá để chọn được mức tốt nhất. Dưới đây là những mẹo đơn giản giúp bạn tiết kiệm đáng kể mỗi lần xuống tiền.' },
      { type: 'heading', text: '1. Theo dõi lịch sử giá trước khi mua' },
      { type: 'paragraph', text: 'Đừng vội mua ngay khi thấy biển giảm giá. Dùng công cụ theo dõi lịch sử giá để biết đâu là mức giá thực sự tốt.' },
      { type: 'image', caption: 'Biểu đồ lịch sử giá giúp nhận biết thời điểm mua tốt nhất.' },
      { type: 'heading', text: '2. So sánh giá giữa nhiều cửa hàng' },
      { type: 'paragraph', text: 'Cùng một sản phẩm nhưng mỗi cửa hàng có thể có mức giá khác nhau. Hãy kiểm tra nhiều nguồn, đồng thời xem kỹ phí giao hàng và chính sách bảo hành.' },
      { type: 'quote', text: 'Tiết kiệm không nằm ở việc mua rẻ nhất, mà ở việc mua đúng giá trị tại đúng thời điểm.' },
      { type: 'heading', text: '3. Tận dụng các đợt sale theo mùa' },
      { type: 'paragraph', text: 'Lên danh sách sản phẩm cần mua từ sớm và đặt cảnh báo giá để chủ động hơn trong các đợt khuyến mãi lớn.' },
    ] : makeContent(seed.title, seed.excerpt),
  };
};

export const blogArticles: BlogArticle[] = Array.from({ length: 26 }, (_, index) => createArticle(articleSeeds[index % articleSeeds.length], index));
export const blogCategories = ['Tất cả', 'Kinh nghiệm mua sắm', 'Đánh giá sản phẩm', 'Xu hướng thị trường'] as const;
export const blogPageSize = 12;
