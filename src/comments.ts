// Lời bình sau mỗi minigame. {goi} là cách người chấm gọi người chơi (anh/con/cháu).
// Giọng cà khịa vừa phải: chê cho vui, không tục, bố mẹ đọc được.

export type Tier = "bad" | "ok" | "good";
export type GameId = "market" | "dishes" | "rice" | "laundry";

export const COMMENTS: Record<GameId, Record<Tier, string[]>> = {
  market: {
    bad: [
      "Dặn mua tỏi mà {goi} xách về củ hành, mắt để đâu thế?",
      "Đi chợ kiểu này thì tối nay cả nhà ăn mì tôm nhé.",
      "Trời ơi {goi}, bà bán rau nhìn là biết gặp con mồi ngon rồi.",
      "Danh sách có năm món mà nhớ được mỗi cái túi ni lông.",
      "Lần sau {goi} chụp ảnh danh sách lại hộ cái.",
      "Mua thế này thì để ra chợ ngồi bán lại còn hơn.",
    ],
    ok: [
      "Cũng tạm, nhưng vẫn quên một hai món đấy nhé.",
      "Được cái nhanh, còn đúng hay không thì để bàn sau.",
      "Không đến nỗi nào, chắc được bà hàng xóm chỉ cho.",
      "Mua gần đủ rồi, thiếu tí thì tự chạy ra chợ lần nữa.",
      "Tiến bộ đấy {goi}, tuần trước còn mua nhầm cả rau muống.",
    ],
    good: [
      "Ôi, đi chợ chuẩn như mẹ đi luôn, không sót món nào!",
      "Giỏi thế {goi}, có khi phải giao luôn việc đi chợ cả tháng.",
      "Mua đúng hết, lại còn nhanh, đúng là của hiếm.",
      "Bà bán cá còn phải nể vì {goi} nhớ giỏi quá.",
      "Thế này thì từ mai khỏi cần viết danh sách nữa.",
    ],
  },
  dishes: {
    bad: [
      "Rửa thế này thì để con mèo liếm còn sạch hơn.",
      "Vỡ bát rồi! Bộ bát cưới đấy {goi} ơi...",
      "Bát còn nguyên mỡ, rửa hay là xoa bóp cho nó thế?",
      "Cứ đà này thì nhà mình chuyển sang dùng bát nhựa thôi.",
      "Trời ơi {goi}, nước rửa bát cũng phải xót thay cho cái bát.",
      "Rửa xong mà nhìn còn bẩn hơn lúc chưa rửa.",
    ],
    ok: [
      "Sạch được tầm bảy phần, ba phần để mai rửa tiếp nhé.",
      "Cũng được, miễn là đừng đập thêm cái nào nữa.",
      "Tạm chấp nhận, nhưng lần sau nhẹ tay chút cho bát nó thở.",
      "Rửa ổn đấy, chỉ hơi chậm, nước nguội hết rồi.",
      "Không tệ, bát vẫn còn nguyên là mừng rồi.",
    ],
    good: [
      "Bát sạch bong kin kít, soi gương được luôn!",
      "Ai dạy {goi} rửa bát giỏi thế này, khai mau.",
      "Nhanh, sạch, không vỡ cái nào, đúng là nhân tài.",
      "Từ nay chậu bát là của {goi} nhé, không ai tranh đâu.",
      "Rửa thế này thì máy rửa bát cũng phải xin nghỉ việc.",
    ],
  },
  rice: {
    bad: [
      "Cơm khê thế này thì làm cơm cháy bán được đấy.",
      "Nấu cơm hay nấu cháo vậy {goi}?",
      "Ba chục năm nấu cơm chưa thấy nồi nào như nồi này.",
      "Nhà có nồi cơm điện mà {goi} vẫn làm hỏng được, tài thật.",
      "Cơm vừa sống vừa nhão, đúng là kỳ tích ẩm thực.",
      "Thôi tối nay gọi đồ ăn ngoài vậy.",
    ],
    ok: [
      "Cơm hơi khô tí, chan thêm canh là ăn được.",
      "Không đến nỗi, cả nhà cố gắng ăn hết cho {goi} vui.",
      "Hơi nhão nhưng mềm, ông bà răng yếu lại thích.",
      "Tạm ổn, lần sau đong nước cẩn thận hơn là ngon.",
      "Ăn được, mỗi tội nhìn hơi... nghệ thuật.",
    ],
    good: [
      "Cơm dẻo thơm, hạt nào ra hạt nấy, chuẩn luôn!",
      "Nồi cơm này mà mang đi thi là đoạt giải.",
      "Giỏi thế {goi}, nấu cơm ngon hơn cả mẹ rồi.",
      "Cả nhà ăn hết sạch nồi, không còn hạt nào.",
      "Đúng là cơm mẹ nấu... à nhầm, cơm {goi} nấu!",
    ],
  },
  laundry: {
    bad: [
      "Mưa ướt hết quần áo rồi, phơi lại từ đầu nhé {goi}.",
      "Trời kéo mây đen kịt mà {goi} vẫn đứng ngắm à?",
      "Quần áo ướt nhẹp, mai mặc gì đi làm đây?",
      "Phơi đồ mà như tưới cây, ướt hơn cả lúc giặt.",
      "Hàng xóm cất đồ xong từ lâu rồi, còn mỗi nhà mình.",
      "Lần sau xem dự báo thời tiết hộ cái {goi} ơi.",
    ],
    ok: [
      "Cứu được một nửa, nửa kia để mai phơi lại.",
      "Cũng nhanh tay đấy, chỉ ướt vài cái thôi.",
      "Tạm được, nhưng có cái chưa khô đã vội cất rồi.",
      "Không tệ, may mà mưa đến chậm.",
      "Được cái chăm, còn khô hay không là do trời.",
    ],
    good: [
      "Cất kịp hết trước mưa, khô cong thơm nắng!",
      "Nhanh như chớp, mây chưa kịp đen đồ đã vào nhà.",
      "Giỏi thế {goi}, đúng là bậc thầy đọc mây.",
      "Quần áo thơm tho, gấp vào là mặc được luôn.",
      "Hàng xóm còn phải sang hỏi bí quyết đấy.",
    ],
  },
};

export function tierOf(score: number): Tier {
  if (score >= 75) return "good";
  if (score >= 40) return "ok";
  return "bad";
}

export function pickComment(game: GameId, score: number, call: string, rand = Math.random): string {
  const list = COMMENTS[game][tierOf(score)];
  return list[Math.floor(rand() * list.length)].replaceAll("{goi}", call);
}

const TITLES: [number, string][] = [
  [85, "quốc dân"],
  [70, "có tâm"],
  [50, "tạm chấp nhận"],
  [30, "tập sự"],
  [0, "cần cải tạo gấp"],
];

/** Danh hiệu theo tổng điểm (0-100), vd. "Chồng quốc dân". */
export function titleFor(noun: string, score: number): string {
  const title = TITLES.find(([min]) => score >= min)![1];
  return `${noun} ${title}`;
}
