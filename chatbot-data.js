const festivals = [
  { id: 1, name: "Lễ hội Đền Hùng", province: "Phú Thọ", start: "2026-04-21", end: "2026-04-23", desc: "Tưởng nhớ các Vua Hùng" },
  { id: 2, name: "Lễ hội Chùa Hương", province: "Hà Nội", start: "2026-02-12", end: "2026-03-06", desc: "Lễ hội hành hương Phật giáo" },
  { id: 3, name: "Hội Lim", province: "Bắc Ninh", start: "2026-02-12", end: "2026-02-14", desc: "Lễ hội Quan họ" },
  { id: 4, name: "Festival Huế", province: "Thừa Thiên Huế", start: "2026-04-26", end: "2026-05-02", desc: "Festival văn hóa Huế" },
  { id: 5, name: "Lễ hội Bà Chúa Xứ", province: "An Giang", start: "2026-04-23", end: "2026-04-27", desc: "Lễ hội tín ngưỡng Núi Sam" },
  { id: 10, name: "Lễ hội Chọi Trâu", province: "Hải Phòng", start: "2026-09-10", end: "2026-09-12", desc: "Lễ hội truyền thống Đồ Sơn" }
];

const foods = [
  { name: "Phở Bát Đàn", province: "Hà Nội", desc: "Phở truyền thống Hà Nội" },
  { name: "Bún chả Hàng Quạt", province: "Hà Nội", desc: "Bún chả than hoa đậm vị" },
  { name: "Bánh đa cua Cầu Đất", province: "Hải Phòng", desc: "Đặc sản bánh đa cua đất cảng" },
  { name: "Chả mực Hạ Long", province: "Quảng Ninh", desc: "Chả mực giã tay nổi tiếng" },
  { name: "Bún bò Huế O Cương", province: "Huế", desc: "Bún bò Huế vị truyền thống" },
  { name: "Bánh mì Phượng", province: "Quảng Nam", desc: "Bánh mì nổi tiếng miền Trung" },
  { name: "Mì Quảng Bà Mua", province: "Đà Nẵng", desc: "Mì Quảng chuẩn vị Đà Nẵng" },
  { name: "Bún cá Nha Trang", province: "Khánh Hòa", desc: "Bún cá thanh ngọt miền biển" },
  { name: "Hủ tiếu Nam Vang", province: "TP.HCM", desc: "Món hủ tiếu đặc sản Sài Gòn" },
  { name: "Cơm tấm Sài Gòn", province: "TP.HCM", desc: "Cơm tấm sườn bì chả" },
  { name: "Lẩu mắm Cần Thơ", province: "Cần Thơ", desc: "Lẩu mắm đậm chất miền Tây" },
  { name: "Bún kèn Phú Quốc", province: "Kiên Giang", desc: "Đặc sản bún kèn đảo ngọc" }
];

const entertainments = [
  { name: "Công viên nước Hồ Tây", province: "Hà Nội", desc: "Khu vui chơi mát mẻ gần Hà Nội" },
  { name: "VinWonders Wave Park", province: "Hà Nội", desc: "Công viên sóng và trò chơi nước" },
  { name: "Thiên Đường Bảo Sơn", province: "Hà Nội", desc: "Khu giải trí tổng hợp cho gia đình" },
  { name: "Sun World Hạ Long", province: "Quảng Ninh", desc: "Công viên chủ đề tại Hạ Long" },
  { name: "Tuần Châu Park", province: "Quảng Ninh", desc: "Khu vui chơi gần bến du thuyền" },
  { name: "Dragon Park", province: "Quảng Ninh", desc: "Công viên trò chơi cảm giác mạnh" },
  { name: "Cát Bà Adventure", province: "Hải Phòng", desc: "Tổ hợp vui chơi ngoài trời" },
  { name: "Sun World Bà Nà Hills", province: "Đà Nẵng", desc: "Khu giải trí nổi tiếng miền Trung" },
  { name: "Asia Park", province: "Đà Nẵng", desc: "Công viên giải trí trung tâm Đà Nẵng" },
  { name: "Mikazuki Water Park", province: "Đà Nẵng", desc: "Công viên nước trong nhà" },
  { name: "VinWonders Nam Hội An", province: "Quảng Nam", desc: "Khu vui chơi chủ đề văn hóa" },
  { name: "Suối khoáng nóng Núi Thần Tài", province: "Đà Nẵng", desc: "Khu nghỉ dưỡng và vui chơi nước nóng" },
  { name: "VinWonders Nha Trang", province: "Khánh Hòa", desc: "Công viên giải trí trên đảo" },
  { name: "I-Resort Nha Trang", province: "Khánh Hòa", desc: "Khu vui chơi nghỉ dưỡng khoáng nóng" },
  { name: "KDL Đại Nam", province: "Bình Dương", desc: "Khu du lịch giải trí quy mô lớn" },
  { name: "Suối Tiên", province: "TP.HCM", desc: "Khu vui chơi chủ đề văn hóa Việt" },
  { name: "Công viên Văn hóa Đầm Sen", province: "TP.HCM", desc: "Khu giải trí lớn ở Sài Gòn" },
  { name: "The Amazing Bay", province: "Đồng Nai", desc: "Công viên nước gần TP.HCM" },
  { name: "Làng du lịch Mỹ Khánh", province: "Cần Thơ", desc: "Điểm vui chơi miệt vườn miền Tây" },
  { name: "VinWonders Phú Quốc", province: "Kiên Giang", desc: "Công viên chủ đề lớn tại đảo ngọc" }
];

const provinces = Array.from(new Set([
  ...festivals.map((item) => item.province),
  ...foods.map((item) => item.province),
  ...entertainments.map((item) => item.province)
]));

module.exports = {
  festivals,
  foods,
  entertainments,
  provinces
};
