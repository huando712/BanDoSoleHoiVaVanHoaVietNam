<!-- AR Feature Integration Guide -->
<!-- Quick Setup & Implementation Steps -->

# 📋 Hướng Dẫn Tích Hợp Tính Năng AR Truyền Thống

## 🚀 Quick Start

### Bước 1: Thêm Script vào index.html

Thêm các dòng sau vào `<head>` hoặc trước closing `</body>`:

```html
<!-- ===== AR Feature Files ===== -->

<!-- Data files -->
<script src="js/traditional-costumes.js" defer></script>

<!-- AR System core -->
<script src="js/ar-costume.js" defer></script>

<!-- Initialize & Event handlers -->
<script src="js/ar-init.js" defer></script>

<!-- TensorFlow & Models (required) -->
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs"></script>
<script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection"></script>

<!-- Optional: Include ar-ui.html or copy its HTML content into index.html -->
```

### Bước 2: Thêm HTML Component

Sao chép nội dung từ `ar-ui.html` và dán vào `index.html` (thường là trước closing `</body>` tag).

Hoặc sử dụng iframe:
```html
<iframe src="ar-ui.html" style="width: 100%; border: none;"></iframe>
```

### Bước 3: Thêm Navigation Button

Thêm button vào menu/navigation để người dùng truy cập AR feature:

```html
<button onclick="toggleARSection(true)">📷 AR Thô Phục</button>
```

## 📁 File Structure

```
project/
├── index.html                    # Main file
├── js/
│   ├── traditional-costumes.js   # Costume data
│   ├── ar-costume.js             # Core AR system class
│   └── ar-init.js                # Initialization & handlers
├── ar-ui.html                    # UI component (optional)
└── AR_FEATURE_GUIDE.md           # This file
```

## 🎯 Core Components Explained

### 1. **traditional-costumes.js**
- Chứa dữ liệu tất cả trang phục truyền thống
- Ánh xạ trang phục với các tỉnh/vùng
- Helper functions để tìm costume theo province, event, etc.

**Thêm costume mới:**
```javascript
{
  id: 11,
  name: "Áo Dài Mới",
  regions: ["Tỉnh A", "Tỉnh B"],
  color: "#FF0000",
  accentColor: "#FFD700",
  pattern: "embroidered",
  characteristics: ["elegant", "modern"],
  description: "Mô tả chi tiết..."
}
```

### 2. **ar-costume.js**
- Class `ARCostumeSystem` quản lý toàn bộ logic AR
- Xử lý camera, pose detection, vẽ costume

**Các method chính:**
```javascript
arSystem.init()                          // Khởi tạo pose detection
arSystem.startCamera()                   // Bắt đầu camera
arSystem.selectCostumeByRegion(region)  // Chọn costume theo province
arSystem.selectCostumeById(id)           // Chọn costume theo ID
arSystem.captureImage()                  // Chụp ảnh (trả về PNG data URL)
arSystem.stopCamera()                    // Dừng camera
```

### 3. **ar-init.js**
- Khởi tạo AR System
- Xử lý tất cả event listeners
- Share/Download ảnh

## 🎨 Tùy Chỉnh

### Thay đổi màu sắc theme

Trong `traditional-costumes.js`, cập nhật:
```javascript
const costume = {
  color: "#FF0000",        // Màu chính
  accentColor: "#FFD700",  // Màu phụ
  pattern: "embroidered"   // smooth, embroidered, geometric, vibrant
}
```

### Thay đổi kích thước áo

Trong `ar-costume.js`, tìm `drawAoDai()` method:
```javascript
const costumeWidth = shoulderDistance * 1.4;  // Thay 1.4 để điều chỉnh độ rộng
const costumeHeight = costumeWidth * 2.0;     // Thay 2.0 để điều chỉnh chiều dài
```

### Thêm hoạ tiết mới

Tạo method mới trong class `ARCostumeSystem`:
```javascript
drawCustomPattern(x, y, width, height, costume) {
  // Vẽ hoạ tiết custom
  this.ctx.fillStyle = costume.accentColor;
  // ...
}
```

Rồi gọi từ `drawDetails()`:
```javascript
if (costume.pattern === 'custom-pattern') {
  this.drawCustomPattern(x, y, width, height, costume);
}
```

## 🔧 Configuration

### Điều chỉnh độ nhạy pose detection

Trong `ar-costume.js`, `processPose()`:
```javascript
const minConfidence = 0.3;  // Thay giá trị (0.0-1.0)
```

### Điều chỉnh FPS

Trong `ar-costume.js`:
```javascript
this.targetFPS = 30;  // Thay thành 60 cho mượt hơn (tiêu tốn CPU hơn)
```

### Điều chỉnh smoothing

Trong `smoothPoses()`:
```javascript
const alpha = 0.5;  // Tăng (0.7) cho smoother, giảm (0.3) cho responsive hơn
```

## 🚫 Browser Requirements

- **Chrome 90+**
- **Firefox 88+**
- **Safari 14+**
- **Edge 90+**

⚠️ **IMPORTANT**: HTTPS required (hoặc localhost)

## 🎯 Performance Optimization

### 1. Reduce model size
```javascript
const detectorConfig = {
  runtime: 'tfjs',
  enableSmoothing: true,
  modelType: 'lite'  // Thay 'full' -> 'lite' để nhẹ hơn
};
```

### 2. Throttle detection
```javascript
this.detectionInterval = 2;  // Chỉ detect mỗi 2 frame
```

### 3. Optimize canvas
```javascript
this.ctx = this.canvas.getContext('2d', {
  willReadFrequently: true,
  desynchronized: true
});
```

## 🐛 Troubleshooting

### Camera không hoạt động
- Kiểm tra HTTPS (hoặc localhost)
- Kiểm tra quyền camera trong browser settings
- Thử browser khác

### Pose detection không chính xác
- Tăng ánh sáng
- Di chuyển xa camera hơn
- Mặc áo sáng màu

### Hiệu suất kém
- Giảm FPS từ 30 xuống 24
- Sử dụng 'lite' model
- Đóng tab khác đang chạy

### Canvas bị trắng
- Kiểm tra TensorFlow.js đã load
- Kiểm tra console errors
- Reload trang

## 📊 Analytics & Tracking

```javascript
// Track AR feature usage
function trackARUsage(action, costume) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'ar_action', {
      'event_category': 'ar_feature',
      'event_label': action,
      'costume_name': costume?.name,
      'costume_id': costume?.id
    });
  }
}

// Usage examples:
trackARUsage('camera_started', null);
trackARUsage('costume_selected', arSystem.selectedCostume);
trackARUsage('image_captured', arSystem.selectedCostume);
```

Thêm vào `ar-init.js`:
```javascript
async function handleStartCamera() {
  trackARUsage('camera_started', null);
  // ... existing code
}

function handleCaptureImage() {
  trackARUsage('image_captured', arSystem.selectedCostume);
  // ... existing code
}
```

## 🎓 Next Steps / Enhancements

1. **3D Models** - Sử dụng Three.js để import .glb models
2. **Multiple Persons** - Phát hiện và render cho 2+ người
3. **Animations** - Thêm animation áo bay, quay tay
4. **Filters** - Makeup, tóc, phụ kiện
5. **AR Effects** - Sparkles, particles, light effects
6. **Voice Guide** - Hướng dẫn bằng giọng nói
7. **Real-time Filters** - Filter tương tự Instagram/TikTok
8. **AI Costume Suggestion** - Auto-suggest dựa trên khuôn mặt/phong cách

## 📞 Support & Resources

- **TensorFlow.js Docs**: https://www.tensorflow.org/js
- **Pose Detection Models**: https://github.com/tensorflow/tfjs-models
- **Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **WebRTC**: https://webrtc.org/

## 📄 License

Sử dụng tự do cho dự án cá nhân và thương mại.

---

**Last Updated**: April 2026
**Version**: 1.0
