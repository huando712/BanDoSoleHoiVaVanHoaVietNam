/**
 * Dữ Liệu Đồng Phục Truyền Thống Theo Tỉnh
 * Sử dụng cho AR Costume Try-On Feature
 */

const traditionalCostumes = [
  // ========== MIỀN BẮC ==========
  {
    id: 1,
    name: "Áo Dài Trắng Truyền Thống",
    regions: ["Hà Nội", "Hải Phòng", "Phú Thọ", "Bắc Ninh", "Hà Nam", "Hà Giang"],
    color: "#ffffff",
    accentColor: "#d94a2b",
    pattern: "smooth",
    characteristics: ["elegant", "formal", "trang nhã"],
    description: "Áo dài trắng trang nhã, biểu tượng của phụ nữ Việt phương Bắc"
  },
  {
    id: 2,
    name: "Yếm Hà Nội",
    regions: ["Hà Nội", "Bắc Ninh"],
    primaryColor: "#5a4a42",
    accentColor: "#ffd700",
    pattern: "embroidered",
    characteristics: ["traditional", "cultural", "formal"],
    description: "Yếm cổ truyền phương Bắc với hoa văn thêu chi tiết"
  },

  // ========== MIỀN TRUNG ==========
  {
    id: 3,
    name: "Áo Dài Huế",
    regions: ["Thừa Thiên Huế", "Quảng Nam", "Quảng Ngãi", "Quảng Trị"],
    color: "#8B4513",
    accentColor: "#d4af37",
    pattern: "embroidered",
    characteristics: ["elegant", "royal", "sophisticated"],
    description: "Áo dài nước Huế với cẳng tay rộng, chiêu xéo đặc trưng"
  },
  {
    id: 4,
    name: "Áo Dài Đà Nẵng",
    regions: ["Đà Nẵng"],
    color: "#2a5434",
    accentColor: "#ffd700",
    pattern: "modern",
    characteristics: ["contemporary", "cultural", "elegant"],
    description: "Áo dài Đà Nẵng kết hợp truyền thống với hiện đại"
  },

  // ========== MIỀN NAM ==========
  {
    id: 5,
    name: "Áo Dài Sài Gòn",
    regions: ["TP.HCM", "Bình Dương", "Đồng Nai", "Bà Rịa - Vũng Tàu"],
    color: "#FF1493",
    accentColor: "#ffd700",
    pattern: "vibrant",
    characteristics: ["vibrant", "lively", "fashionable"],
    description: "Áo dài sắc sỡ của Sài Gòn với kỹ thuật thêu bắt mắt"
  },
  {
    id: 6,
    name: "Áo Dài Cần Thơ",
    regions: ["Cần Thơ", "An Giang", "Kiên Giang"],
    color: "#8B8000",
    accentColor: "#ffa500",
    pattern: "embroidered",
    characteristics: ["colorful", "regional", "cultural"],
    description: "Áo dài miền Tây sông nước với hoa văn độc đáo"
  },

  // ========== BIÊN GIỚI/SỰ KIỆN ==========
  {
    id: 7,
    name: "Áo Gấm Tây Nguyên",
    regions: ["Đắk Lắk", "Gia Lai", "Kon Tum", "Đắk Nông"],
    color: "#FF8C00",
    accentColor: "#8B0000",
    pattern: "geometric",
    characteristics: ["ethnic", "tribal", "colorful"],
    description: "Áo gấm dân tộc Tây Nguyên với hoạ tiết hình học"
  },
  {
    id: 8,
    name: "Áo Ba Ba",
    regions: ["Hồ Chí Minh", "Cần Thơ", "Bến Tre", "Tiền Giang"],
    color: "#4B0082",
    accentColor: "#ffd700",
    pattern: "traditional",
    characteristics: ["casual", "regional", "practical"],
    description: "Áo ba ba truyền thống miền Nam, mát mẻ và tiện dụng"
  },

  // ========== LỄ HỘI ĐẶC BIỆT ==========
  {
    id: 9,
    name: "Áo Dài Múa Rối",
    regions: ["Hà Nội", "Huế"],
    color: "#c41e3a",
    accentColor: "#ffd700",
    pattern: "embroidered",
    characteristics: ["artistic", "performative", "traditional"],
    description: "Áo dài trình diễn múa rối nước với thiết kế sân khấu"
  },
  {
    id: 10,
    name: "Áo Dài Khai Hạ",
    regions: ["Hà Nội", "Hải Phòng", "Quảng Ninh"],
    color: "#00CED1",
    accentColor: "#ffd700",
    pattern: "embroidered",
    characteristics: ["ceremonial", "festive", "elegant"],
    description: "Áo dài khai hạ lễ hội với màu xanh lam thanh tao"
  }
];

/**
 * Provinces mapping để dễ dàng tìm costume theo tỉnh
 */
const provinceToFestival = {
  "Hà Nội": ["Đền Hùng", "Chùa Hương", "Hội Lim"],
  "Hải Phòng": ["Chọi Trâu"],
  "Phú Thọ": ["Đền Hùng"],
  "Bắc Ninh": ["Hội Lim"],
  "Thừa Thiên Huế": ["Festival Huế"],
  "Quảng Nam": ["Hội An"],
  "TP.HCM": ["Tết Nguyên Đán", "Các lễ hội Sài Gòn"],
  "An Giang": ["Lễ hội Bà Chúa Xứ"],
  "Cần Thơ": ["Lễ hội sông nước"],
  "Kiên Giang": ["Tết Nguyên Đán"]
};

/**
 * Region categories
 */
const regionCategories = {
  north: {
    provinces: ["Hà Nội", "Hải Phòng", "Phú Thọ", "Bắc Ninh", "Hà Nam", "Hà Giang", "Hòa Bình"],
    character: "Trang nhã, kín đáo, thanh lịch"
  },
  central: {
    provinces: ["Thừa Thiên Huế", "Quảng Nam", "Quảng Ngãi", "Quảng Trị", "Đà Nẵng"],
    character: "Quyến rũ, sang trọng, hoàng gia"
  },
  south: {
    provinces: ["TP.HCM", "Bình Dương", "Đồng Nai", "Bà Rịa - Vũng Tàu", "Cần Thơ", "An Giang", "Kiên Giang"],
    character: "Sắc sỡ, vui tươi, tự do"
  },
  highland: {
    provinces: ["Đắk Lắk", "Gia Lai", "Kon Tum", "Đắk Nông"],
    character: "Đặc trưng dân tộc, rực rỡ, hình học"
  }
};

/**
 * Costume styles cho các loại sự kiện
 */
const costumesByEvent = {
  "Tết": [1, 2], // Áo dài trắng, Yếm
  "Lễ hội": [3, 4, 5, 6],
  "Múa rối": [9],
  "Lễ khai hạ": [10],
  "Dân gian": [7, 8]
};

/**
 * Helper function - Lấy costume theo tỉnh
 */
function getCostumesByProvince(province) {
  return traditionalCostumes.filter(c => c.regions.includes(province));
}

/**
 * Helper function - Lấy costume ngẫu nhiên
 */
function getRandomCostume() {
  return traditionalCostumes[Math.floor(Math.random() * traditionalCostumes.length)];
}

/**
 * Helper function - Lấy costume theo event
 */
function getCostumesByEvent(event) {
  const ids = costumesByEvent[event] || [];
  return traditionalCostumes.filter(c => ids.includes(c.id));
}

/**
 * Helper function - Lấy vùng theo costume
 */
function getRegionByCostume(costumeId) {
  const costume = traditionalCostumes.find(c => c.id === costumeId);
  return costume ? costume.regions[0] : null;
}

// Export to global window object for use in HTML scripts
window.traditionalCostumes = traditionalCostumes;
window.provinceToFestival = provinceToFestival;
window.regionCategories = regionCategories;
window.costumesByEvent = costumesByEvent;
window.getCostumesByProvince = getCostumesByProvince;
window.getRandomCostume = getRandomCostume;
window.getCostumesByEvent = getCostumesByEvent;
window.getRegionByCostume = getRegionByCostume;
