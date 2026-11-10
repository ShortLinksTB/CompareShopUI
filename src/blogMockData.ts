export const BLOG_CATEGORIES = ['Kinh nghiệm mua sắm', 'Đánh giá sản phẩm', 'Xu hướng thị trường'] as const;
export type BlogCategory = typeof BLOG_CATEGORIES[number];

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  author: string;
  initials: string;
  publishedAt: string;
  readingMinutes: number;
  tags: string[];
  content: Array<{ type: 'paragraph' | 'heading' | 'image' | 'quote'; text: string }>;
}

const titles = [
  ['So sánh tai nghe không dây tầm giá dưới 2 triệu: đâu là lựa chọn đáng tiền nhất?', 'Đánh giá chi tiết 5 mẫu tai nghe phổ biến về chất âm, pin và độ bền.', 'Đánh giá sản phẩm'],
  ['Giá laptop văn phòng biến động ra sao trong quý cuối năm 2026?', 'Phân tích xu hướng giá theo dữ liệu thu thập từ hơn 20 cửa hàng.', 'Xu hướng thị trường'],
  ['5 sai lầm thường gặp khiến bạn mua hớ khi săn sale cuối năm', 'Nhận biết khuyến mãi ảo và chọn đúng thời điểm mua sắm.', 'Kinh nghiệm mua sắm'],
  ['Smartphone tầm trung 2026: đâu là chiếc máy đáng mua nhất?', 'So sánh camera, hiệu năng và pin trong tầm giá phổ biến.', 'Đánh giá sản phẩm'],
  ['10 mẹo so sánh giá giúp bạn tiết kiệm đến 30% khi mua sắm online', 'Tổng hợp những nguyên tắc so sánh giá đơn giản nhưng hiệu quả, từ lịch sử giá đến chọn đúng thời điểm săn khuyến mãi.', 'Kinh nghiệm mua sắm'],
  ['Thị trường điện máy trước mùa mua sắm cuối năm', 'Những thay đổi đáng chú ý về giá và nhu cầu tiêu dùng.', 'Xu hướng thị trường'],
  ['Chọn máy lọc không khí phù hợp với diện tích căn hộ', 'Các thông số cần xem trước khi quyết định mua thiết bị.', 'Đánh giá sản phẩm'],
  ['Mẹo tìm mã giảm giá và cộng dồn ưu đãi hiệu quả', 'Tối ưu ưu đãi từ sàn, cửa hàng và chương trình thành viên.', 'Kinh nghiệm mua sắm'],
  ['Xu hướng thiết bị gia dụng thông minh năm 2026', 'Các sản phẩm kết nối đang thay đổi thói quen trong gia đình.', 'Xu hướng thị trường'],
  ['Đánh giá pin dự phòng nhỏ gọn cho chuyến đi dài ngày', 'So sánh tốc độ sạc, dung lượng thực tế và độ tiện dụng.', 'Đánh giá sản phẩm'],
  ['Lập ngân sách mua sắm để tránh chi tiêu quá tay', 'Một kế hoạch đơn giản giúp cân bằng nhu cầu và chi phí.', 'Kinh nghiệm mua sắm'],
  ['Thời điểm nào trong năm mua điện thoại có giá tốt?', 'Nhìn lại chu kỳ ra mắt và các đợt giảm giá lớn.', 'Xu hướng thị trường'],
  ['So sánh robot hút bụi phổ thông trong tầm giá 5 triệu', 'Những khác biệt về điều hướng, lực hút và bảo trì.', 'Đánh giá sản phẩm'],
  ['Kiểm tra bảo hành và đổi trả trước khi đặt hàng online', 'Danh sách điều cần xác nhận để mua sắm an tâm hơn.', 'Kinh nghiệm mua sắm'],
  ['Laptop AI và tác động đến lựa chọn máy tính cá nhân', 'Những thay đổi sản phẩm người mua có thể thấy trong năm nay.', 'Xu hướng thị trường'],
  ['Chọn màn hình làm việc tại nhà theo nhu cầu thực tế', 'Kích thước, độ phân giải và kết nối cần ưu tiên.', 'Đánh giá sản phẩm'],
  ['So sánh tổng chi phí thay vì chỉ nhìn giá niêm yết', 'Phí vận chuyển, quà tặng và bảo hành cũng ảnh hưởng giá trị.', 'Kinh nghiệm mua sắm'],
  ['Thị trường smartphone gập đang tiến đến đâu?', 'Cập nhật thiết kế, giá bán và mức độ phổ biến của dòng máy.', 'Xu hướng thị trường'],
  ['Đánh giá bàn phím cơ không dây cho góc làm việc', 'Cảm giác gõ, kết nối và thời lượng pin qua trải nghiệm.', 'Đánh giá sản phẩm'],
  ['Bí quyết chọn cửa hàng online uy tín', 'Tìm hiểu đánh giá, chính sách và thông tin người bán.', 'Kinh nghiệm mua sắm'],
  ['Các hãng điều chỉnh giá sản phẩm công nghệ dịp cuối năm', 'Tổng quan các chương trình ra mắt và kích cầu tiêu dùng.', 'Xu hướng thị trường'],
  ['Máy tính bảng học tập: những điểm cần so sánh', 'Màn hình, bút cảm ứng và hệ sinh thái ứng dụng.', 'Đánh giá sản phẩm'],
  ['Tạo danh sách theo dõi để không bỏ lỡ giá tốt', 'Theo dõi món hàng cần mua giúp bạn tránh quyết định vội vàng.', 'Kinh nghiệm mua sắm'],
  ['Thiết bị đeo thông minh ngày càng chú trọng sức khỏe', 'Các tính năng theo dõi và lựa chọn theo lối sống.', 'Xu hướng thị trường'],
] as const;

export const BLOG_POSTS: BlogPost[] = [
  ...titles.map(([title, excerpt, category], index): BlogPost => {
    const slug = `blog-${index + 1}`;
    const author = ['Minh Anh', 'Thanh Hà', 'Đức Khang', 'Lan Ngọc'][index % 4];
    return {
      slug, title, excerpt, category: category as BlogCategory, author,
      initials: author.split(' ').map(part => part[0]).join(''),
      publishedAt: new Date(Date.UTC(2026, 10, 12 - index)).toISOString(),
      readingMinutes: 4 + index % 5,
      tags: ['so-sánh-giá', 'mua-sắm-thông-minh', 'tiết-kiệm'],
      content: [
        { type: 'paragraph', text: excerpt },
        { type: 'heading', text: 'Tìm hiểu trước khi lựa chọn' },
        { type: 'paragraph', text: 'So sánh các lựa chọn dựa trên nhu cầu thực tế, mức giá ở nhiều cửa hàng và chính sách hậu mãi. Chuẩn bị thông tin trước sẽ giúp bạn chọn được sản phẩm phù hợp.' },
        { type: 'image', text: 'Minh họa cách so sánh lựa chọn và lịch sử giá.' },
        { type: 'quote', text: 'Mua sắm thông minh bắt đầu từ việc hiểu rõ điều mình cần.' },
        { type: 'heading', text: 'Chọn đúng thời điểm mua' },
        { type: 'paragraph', text: 'Theo dõi biến động giá và cân nhắc các ưu đãi đi kèm. Đừng quên đọc kỹ điều kiện giao hàng, đổi trả và bảo hành trước khi đặt mua.' },
      ],
    };
  }),
];

export const FEATURED_POST = {
  ...BLOG_POSTS[4],
  slug: BLOG_POSTS[4].slug,
  title: '10 mẹo so sánh giá giúp bạn tiết kiệm đến 30% khi mua sắm online',
  excerpt: 'Tổng hợp những nguyên tắc so sánh giá đơn giản nhưng hiệu quả, từ việc theo dõi lịch sử giá đến chọn đúng thời điểm săn khuyến mãi.',
  author: 'Minh Anh', initials: 'AN', readingMinutes: 6,
};

export function formatBlogDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function getBlogPosts() { return BLOG_POSTS; }
