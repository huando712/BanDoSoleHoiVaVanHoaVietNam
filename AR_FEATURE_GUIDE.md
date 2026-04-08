# Hướng dẫn Tính Năng AR - Thay Đồng Phục Truyền Thống

## Tổng Quan
Tính năng này cho phép người dùng sử dụng camera để chụp ảnh, sau đó AR sẽ thay đồng phục truyền thống của địa phương tương ứng lên người dùng.

## Kiến Trúc Tính Năng

### 1. **Các Thư Viện Cần Sử Dụng**
```
- mlpose (TensorFlow.js + PoseNet): Phát hiện bộ xương cơ thể
- Three.js: Render 3D cho áo/đồng phục
- Webcam.js: Truy cập camera
- Canvas API: Xử lý hình ảnh
```

### 2. **Dữ Liệu Đồng Phục Theo Tỉnh**
Cấu trúc dữ liệu:
```json
{
  "id": 1,
  "provinceIds": ["TP.HCM", "Hà Nội"],
  "name": "Áo Dài Truyền Thống",
  "description": "Áo dài quen thuộc của Việt Nam",
  "colors": ["white", "red", "gold"],
  "style": "traditional",
  "region": "all",
  "modelUrl": "/models/traditional-ao-dai.glb",
  "preview": "/preview/ao-dai.jpg"
}
```

### 3. **Quy Trình Thực Hiện**
```
User Click AR Cam
    ↓
Load Camera + Pose Detection
    ↓
Detect Body Position (Shoulders, Arms, Torso)
    ↓
Select Traditional Costume for Local Area
    ↓
Overlay 3D Costume Model
    ↓
Display Result + Save/Share
```

## Chi Tiết Implement

### **Bước 1: Cài Đặt Thư Viện**
```bash
npm install @tensorflow/tfjs @tensorflow-models/pose-detection three
```

### **Bước 2: Dữ Liệu Đồng Phục (traditional-costumes.js)**

**Tỷ lệ phù hợp của các vùng:**
- **Miền Bắc**: Áo dài trắng trang nhã, Áo cộc tay, Yếm
- **Miền Trung**: Áo dài màu, Áo gấm, Áo ba ba
- **Miền Nam (TP.HCM, Cần Thơ)**: Áo tím nước, Áo gấm sặc sỡ
- **Các lễ hội đặc biệt**: Trang phục múa rối, Trang phục biểu diễn

**Danh sách chi tiết:**
```javascript
const traditionalCostumes = [
  {
    id: 1,
    name: "Áo Dài Trắng",
    regions: ["Hà Nội", "Hải Phòng", "Phú Thọ"],
    color: "#ffffff",
    pattern: "smooth",
    description: "Áo dài trắng trang nhã - biểu tượng văn hóa phương Bắc"
  },
  {
    id: 2,
    name: "Áo Dài Hue",
    regions: ["Thừa Thiên Huế", "Quảng Nam", "Quảng Ngãi"],
    color: "#8B4513",
    pattern: "embroidered",
    description: "Áo dài tỉnh Huế với cẳng tay rộng, chiêu xéo"
  },
  {
    id: 3,
    name: "Áo Dài Sài Gòn",
    regions: ["TP.HCM", "Bình Dương", "Đồng Nai"],
    color: "#FF1493",
    pattern: "vibrant",
    description: "Áo dài sắc sỡ với kỹ thuật thêu bắt mắt"
  },
  {
    id: 4,
    name: "Áo Gấm Tây Nguyên",
    regions: ["Đắk Lắk", "Gia Lai", "Kon Tum"],
    color: "#FF8C00",
    pattern: "geometric",
    description: "Áo gấm dân tộc Tây Nguyên"
  },
  {
    id: 5,
    name: "Yếm Hà Nội",
    regions: ["Hà Nội", "Bắc Ninh", "Hà Nam"],
    color: "#4B0082",
    pattern: "embroidered",
    description: "Yếm truyền thống phương Bắc"
  }
];
```

### **Bước 3: Module AR Camera (ar-costume.js)**

```javascript
class ARCostumeSystem {
  constructor(canvasId, costumesData) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.video = null;
    this.poseDetector = null;
    this.costumes = costumesData;
    this.selectedCostume = null;
    this.isRunning = false;
  }

  async init() {
    // Load TensorFlow + PoseNet
    await tf.ready();
    const detectorConfig = {
      runtime: 'tfjs',
      enableSmoothing: true
    };
    this.poseDetector = await poseDetection.createDetector(
      poseDetection.SupportedModels.BlazePose,
      detectorConfig
    );
  }

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      this.video = document.createElement('video');
      this.video.srcObject = stream;
      this.video.play();
      this.isRunning = true;
      this.detectPose();
    } catch (err) {
      console.error('Camera error:', err);
      alert('Không thể truy cập camera. Vui lòng kiểm tra quyền!');
    }
  }

  async detectPose() {
    while (this.isRunning && this.video?.readyState === this.video.HAVE_ENOUGH_DATA) {
      const poses = await this.poseDetector.estimatePoses(this.video);
      
      // Vẽ video lên canvas
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      
      // Xử lý pose nếu phát hiện được
      if (poses.length > 0) {
        this.processPose(poses[0]);
      }
      
      requestAnimationFrame(() => this.detectPose());
    }
  }

  processPose(pose) {
    // Lấy các điểm cơ bản: shoulders, arms, torso
    const keypoints = pose.keypoints;
    const rightShoulder = keypoints[12]; // Right shoulder
    const leftShoulder = keypoints[11];  // Left shoulder
    const rightElbow = keypoints[14];
    const leftElbow = keypoints[13];
    const rightWrist = keypoints[16];
    const leftWrist = keypoints[15];
    const torso = keypoints[23]; // Left hip (dùng làm gốc)

    // Kiểm tra confidence
    const minConfidence = 0.3;
    if (rightShoulder.score < minConfidence || leftShoulder.score < minConfidence) {
      return;
    }

    // Vẽ costume lên cơ thể
    if (this.selectedCostume) {
      this.drawCostume(
        keypoints,
        rightShoulder,
        leftShoulder,
        rightElbow,
        leftElbow,
        rightWrist,
        leftWrist
      );
    }
  }

  drawCostume(keypoints, rightShoulder, leftShoulder, rightElbow, leftElbow, rightWrist, leftWrist) {
    const costume = this.selectedCostume;
    
    // Tính toán độ rộng áo dựa trên khoảng cách vai
    const shoulderDistance = Math.sqrt(
      Math.pow(rightShoulder.x - leftShoulder.x, 2) + 
      Math.pow(rightShoulder.y - leftShoulder.y, 2)
    );
    
    const costumeWidth = shoulderDistance * 1.5;
    const costumeHeight = costumeWidth * 2.2; // Tỷ lệ áo dài
    
    const topX = (rightShoulder.x + leftShoulder.x) / 2;
    const topY = Math.min(rightShoulder.y, leftShoulder.y) - costumeHeight * 0.1;

    // Vẽ áo dài (hình chữ nhật với gradient)
    const gradient = this.ctx.createLinearGradient(topX, topY, topX, topY + costumeHeight);
    gradient.addColorStop(0, costume.color);
    gradient.addColorStop(1, this.darkenColor(costume.color, 0.2));

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    
    // Vẽ áo dài dạng trapezoid (rộng ở trên, hẹp ở dưới)
    const bottomWidth = costumeWidth * 0.8;
    this.ctx.moveTo(topX - costumeWidth / 2, topY); // Top left
    this.ctx.lineTo(topX + costumeWidth / 2, topY); // Top right
    this.ctx.lineTo(topX + bottomWidth / 2, topY + costumeHeight); // Bottom right
    this.ctx.lineTo(topX - bottomWidth / 2, topY + costumeHeight); // Bottom left
    this.ctx.closePath();
    this.ctx.fill();

    // Vẽ tay áo nếu có
    if (rightElbow.score > 0.3 && leftElbow.score > 0.3) {
      this.drawSleeves(rightShoulder, leftShoulder, rightElbow, leftElbow, costumeWidth);
    }

    // Vẽ chi tiết thêu/hoa văn nếu costume có pattern
    if (costume.pattern === 'embroidered') {
      this.drawEmbroidery(topX, topY, costumeWidth, costumeHeight);
    }
  }

  drawSleeves(rightShoulder, leftShoulder, rightElbow, leftElbow, costumeWidth) {
    const sleeveWidth = costumeWidth * 0.25;
    const sleeveColor = this.darkenColor(this.selectedCostume.color, 0.15);

    // Tay phải
    this.ctx.fillStyle = sleeveColor;
    this.ctx.beginPath();
    this.ctx.moveTo(rightShoulder.x, rightShoulder.y);
    this.ctx.quadraticCurveTo(
      (rightShoulder.x + rightElbow.x) / 2,
      (rightShoulder.y + rightElbow.y) / 2,
      rightElbow.x,
      rightElbow.y
    );
    this.ctx.lineWidth = sleeveWidth;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();

    // Tay trái
    this.ctx.beginPath();
    this.ctx.moveTo(leftShoulder.x, leftShoulder.y);
    this.ctx.quadraticCurveTo(
      (leftShoulder.x + leftElbow.x) / 2,
      (leftShoulder.y + leftElbow.y) / 2,
      leftElbow.x,
      leftElbow.y
    );
    this.ctx.stroke();
  }

  drawEmbroidery(x, y, width, height) {
    // Vẽ hoa văn thêu đơn giản
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    this.ctx.lineWidth = 2;

    // Vẽ 3 dòng hoa văn dọc
    for (let i = 0; i < 3; i++) {
      const xPos = x - width / 3 + (i * width / 3);
      this.ctx.beginPath();
      this.ctx.moveTo(xPos, y + height * 0.2);
      this.ctx.lineTo(xPos, y + height * 0.9);
      this.ctx.stroke();

      // Vẽ các điểm trang trí
      for (let j = 0; j < 5; j++) {
        const dotY = y + height * 0.2 + (j * height * 0.175);
        this.ctx.beginPath();
        this.ctx.arc(xPos, dotY, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
        this.ctx.fill();
      }
    }
  }

  selectCostumeByRegion(region) {
    const costume = this.costumes.find(c => c.regions.includes(region));
    if (costume) {
      this.selectedCostume = costume;
      return costume;
    }
    return null;
  }

  selectCostumeById(id) {
    const costume = this.costumes.find(c => c.id === id);
    if (costume) {
      this.selectedCostume = costume;
      return costume;
    }
    return null;
  }

  stopCamera() {
    this.isRunning = false;
    if (this.video) {
      this.video.srcObject.getTracks().forEach(track => track.stop());
      this.video = null;
    }
  }

  captureImage() {
    const image = this.canvas.toDataURL('image/png');
    return image;
  }

  darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  }
}
```

### **Bước 4: UI Component (ar-interface.html)**

```html
<!-- Thêm vào index.html hoặc file riêng -->
<section id="ar-costume-section" class="ar-section" style="display: none;">
  <div class="ar-container">
    <h2>AR Thay Đồng Phục Truyền Thống</h2>
    
    <!-- Camera Canvas -->
    <div class="ar-camera-wrapper">
      <canvas id="ar-canvas" width="1280" height="720"></canvas>
      <div id="ar-loading" class="ar-loading" style="display: none;">
        Đang tải mô hình phát hiện động tác...
      </div>
    </div>

    <!-- Costume Selection -->
    <div class="ar-controls">
      <div class="costume-selector">
        <label>Chọn Đồng Phục:</label>
        <select id="costume-select">
          <option value="">-- Chọn theo vùng --</option>
          <option value="Hà Nội">Áo Dài Miền Bắc</option>
          <option value="Thừa Thiên Huế">Áo Dài Huế</option>
          <option value="TP.HCM">Áo Dài Sài Gòn</option>
          <option value="Gia Lai">Áo Gấm Tây Nguyên</option>
        </select>
      </div>

      <div class="action-buttons">
        <button id="ar-start-btn" class="btn-primary">Bắt Đầu Camera</button>
        <button id="ar-capture-btn" class="btn-primary" style="display: none;">Chụp Ảnh</button>
        <button id="ar-stop-btn" class="btn-secondary" style="display: none;">Dừng</button>
      </div>
    </div>

    <!-- Result Display -->
    <div id="ar-result" class="ar-result" style="display: none;">
      <img id="ar-result-image" src="" alt="Captured with costume">
      <div class="result-actions">
        <button id="ar-download-btn" class="btn-primary">Tải Ảnh</button>
        <button id="ar-share-btn" class="btn-primary">Chia Sẻ</button>
        <button id="ar-try-again-btn" class="btn-secondary">Thử Lại</button>
      </div>
    </div>
  </div>
</section>
```

### **Bước 5: CSS Styling**

```css
.ar-section {
  padding: 40px 20px;
  background: var(--bg-cream);
  border-top: 1px solid var(--accent-line);
}

.ar-container {
  max-width: 1200px;
  margin: 0 auto;
}

.ar-camera-wrapper {
  position: relative;
  width: 100%;
  max-width: 900px;
  margin: 20px auto;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--card-shadow);
  background: black;
}

#ar-canvas {
  display: block;
  width: 100%;
  height: auto;
  background: #000;
}

.ar-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 20px 40px;
  border-radius: 12px;
  z-index: 10;
}

.ar-controls {
  display: flex;
  justify-content: center;
  gap: 30px;
  flex-wrap: wrap;
  margin: 30px 0;
  padding: 20px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 16px;
}

.costume-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.costume-selector select {
  padding: 10px 15px;
  border-radius: 8px;
  border: 1px solid var(--brand);
  background: white;
  cursor: pointer;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.btn-primary, .btn-secondary {
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: var(--brand);
  color: white;
}

.btn-primary:hover {
  background: var(--brand-dark);
  transform: translateY(-2px);
}

.btn-secondary {
  background: var(--muted);
  color: white;
}

.ar-result {
  margin: 30px auto;
  max-width: 600px;
  text-align: center;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: var(--card-shadow);
}

#ar-result-image {
  width: 100%;
  border-radius: 12px;
  margin-bottom: 20px;
}

.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .ar-controls {
    flex-direction: column;
    gap: 15px;
  }
  
  .action-buttons {
    width: 100%;
  }
  
  .btn-primary, .btn-secondary {
    flex: 1;
  }
}
```

### **Bước 6: Integration Script**

```javascript
// Initialize AR Costume System
const arSystem = new ARCostumeSystem('ar-canvas', traditionalCostumes);

// Event Listeners
document.getElementById('ar-start-btn').addEventListener('click', async () => {
  document.getElementById('ar-loading').style.display = 'block';
  await arSystem.init();
  await arSystem.startCamera();
  document.getElementById('ar-loading').style.display = 'none';
  document.getElementById('ar-start-btn').style.display = 'none';
  document.getElementById('ar-capture-btn').style.display = 'inline-block';
  document.getElementById('ar-stop-btn').style.display = 'inline-block';
});

document.getElementById('ar-capture-btn').addEventListener('click', () => {
  const image = arSystem.captureImage();
  document.getElementById('ar-result-image').src = image;
  document.getElementById('ar-result').style.display = 'block';
  arSystem.stopCamera();
  document.getElementById('ar-start-btn').style.display = 'inline-block';
  document.getElementById('ar-capture-btn').style.display = 'none';
  document.getElementById('ar-stop-btn').style.display = 'none';
});

document.getElementById('ar-stop-btn').addEventListener('click', () => {
  arSystem.stopCamera();
  document.getElementById('ar-start-btn').style.display = 'inline-block';
  document.getElementById('ar-capture-btn').style.display = 'none';
  document.getElementById('ar-stop-btn').style.display = 'none';
});

document.getElementById('costume-select').addEventListener('change', (e) => {
  const region = e.target.value;
  if (region) {
    arSystem.selectCostumeByRegion(region);
  }
});

document.getElementById('ar-download-btn').addEventListener('click', () => {
  const image = document.getElementById('ar-result-image').src;
  const a = document.createElement('a');
  a.href = image;
  a.download = `ao-dai-${Date.now()}.png`;
  a.click();
});

document.getElementById('ar-try-again-btn').addEventListener('click', () => {
  document.getElementById('ar-result').style.display = 'none';
  document.getElementById('ar-start-btn').style.display = 'inline-block';
});
```

## Tính Năng Bổ Sung

### **1. Phát Hiện Vị Trí Tự Động**
```javascript
// Sử dụng Geolocation API để phát hiện tỉnh của user
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude, longitude } = pos.coords;
    // Gọi API reverse geocoding để lấy tỉnh
    fetchProvinceFromCoords(latitude, longitude).then(province => {
      const costume = arSystem.selectCostumeByRegion(province);
      // Tự động chọn costume phù hợp
    });
  });
}
```

### **2. 3D Model Support** (Tùy chọn)
```javascript
// Sử dụng Three.js cho 3D models
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('/models/traditional-ao-dai.glb', (gltf) => {
  const model = gltf.scene;
  // Thêm vào scene
});
```

### **3. Hiệu Ứng Động**
- Áo dài tung bay khi di chuyển
- Hiệu ứng ánh sáng từ hoa văn
- Transition mượt mà khi thay đổi tư thế

### **4. Social Sharing**
```javascript
// Share trực tiếp lên Facebook, TikTok
async function shareToSocial(imageData, platform) {
  if (platform === 'facebook') {
    FB.ui({
      method: 'share',
      href: window.location.href,
      hashtag: '#áODàiVN #LễHộiViệtNam',
    });
  }
}
```

## Các Bước Thực Hiện

1. **Cài đặt TensorFlow.js và pose detection model**
2. **Tạo file `traditional-costumes.js` với dữ liệu đồng phục**
3. **Tạo class `ARCostumeSystem` trong `ar-costume.js`**
4. **Thêm UI vào `index.html`**
5. **Thêm CSS styling**
6. **Tích hợp event listeners**
7. **Test trên các thiết bị khác nhau (mobile & desktop)**
8. **Tối ưu hiệu suất (compression, lazy loading)**

## Yêu Cầu Kỹ Thuật
- **Truy cập Camera**: HTTPS hoặc localhost
- **Browser Support**: Chrome, Firefox, Safari, Edge (phiên bản mới)
- **GPU**: Khuyến nghị có GPU để smooth pose detection
- **Network**: May không cần internet sau khi tải mô hình

## Kiến Nghị Cải Thiện

1. **Thêm More Costumes**: Trang phục múa rối, trang phục lễ hội
2. **Machine Learning**: Train model phát hiện trang phục tự động
3. **Multiplayer**: Cho phép 2+ người trong frame
4. **Animation**: Thêm animation áo bay, tay quay
5. **Filters**: Makeup, hiệu ứng khuôn mặt
6. **Metrics**: Theo dõi sử dụng AR feature
