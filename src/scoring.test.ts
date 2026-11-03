import { describe, expect, it } from "vitest";
import { pickComment, tierOf, titleFor } from "./comments";
import { average, dishesScore, laundryScore, marketScore, riceScore } from "./scoring";

describe("chấm điểm", () => {
  it("đi chợ", () => {
    expect(marketScore(5, 0)).toBe(100);
    expect(marketScore(4, 1)).toBe(70);
    expect(marketScore(0, 7)).toBe(0);
  });

  it("rửa bát", () => {
    expect(dishesScore(3, 0, 0)).toBe(100);
    expect(dishesScore(1, 0.5, 1)).toBe(36);
    expect(dishesScore(0, 0, 4)).toBe(0);
  });

  it("nấu cơm", () => {
    expect(riceScore(0, 0)).toBe(100);
    expect(riceScore(4, 0)).toBe(80);
    expect(riceScore(20, 30)).toBe(0);
  });

  it("phơi đồ", () => {
    expect(laundryScore(6, 0, 6)).toBe(100);
    expect(laundryScore(2, 2, 6)).toBe(50);
  });

  it("điểm trung bình", () => {
    expect(average([100, 50, 0, 50])).toBe(50);
    expect(average([])).toBe(0);
  });
});

describe("lời bình và danh hiệu", () => {
  it("phân hạng theo điểm", () => {
    expect(tierOf(10)).toBe("bad");
    expect(tierOf(40)).toBe("ok");
    expect(tierOf(75)).toBe("good");
  });

  it("thay cách gọi vào lời bình", () => {
    const text = pickComment("rice", 90, "cháu", () => 0.99);
    expect(text).not.toContain("{goi}");
    expect(text).toContain("cháu");
  });

  it("danh hiệu", () => {
    expect(titleFor("Chồng", 90)).toBe("Chồng quốc dân");
    expect(titleFor("Sinh viên", 10)).toBe("Sinh viên cần cải tạo gấp");
  });
});
