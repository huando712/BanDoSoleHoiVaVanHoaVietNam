/**
 * AR Costume Virtual Try-On System
 * Sử dụng TensorFlow.js + PoseNet cho phát hiện tư thế cơ thể
 */

class ARCostumeSystem {
  constructor(canvasId, costumesData) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas with ID "${canvasId}" not found`);
      return;
    }
    
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.video = null;
    this.poseDetector = null;
    this.costumes = costumesData || [];
    this.selectedCostume = null;
    this.isRunning = false;
    this.frameCount = 0;
    this.smoothedPoses = null;
    
    // Performance settings
    this.detectionInterval = 1; // Every frame
    this.targetFPS = 30;
    this.lastFrameTime = 0;
  }

  /**
   * Khởi tạo TensorFlow.js và Pose Detection Model
   */
  async init() {
    try {
      // Load TensorFlow
      if (typeof tf === 'undefined') {
        throw new Error('TensorFlow.js not loaded. Include script tag: <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs"></script>');
      }

      // Load PoseNet
      if (typeof poseDetection === 'undefined') {
        throw new Error('PoseDetection not loaded. Include: <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection"></script>');
      }

      console.log('TensorFlow ready:', tf.version);
      console.log('Initializing pose detector...');

      const detectorConfig = {
        runtime: 'tfjs',
        enableSmoothing: true,
        modelType: 'full'
      };

      this.poseDetector = await poseDetection.createDetector(
        poseDetection.SupportedModels.BlazePose,
        detectorConfig
      );

      console.log('Pose detector initialized successfully');
      return true;
    } catch (err) {
      console.error('Initialization error:', err);
      alert('Lỗi khi tải model AR: ' + err.message);
      return false;
    }
  }

  /**
   * Bắt đầu truy cập camera
   */
  async startCamera() {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      this.video = document.createElement('video');
      this.video.srcObject = stream;
      this.video.onloadedmetadata = () => {
        console.log('Video loaded, starting pose detection');
        this.video.play();
        this.isRunning = true;
        this.detectPose();
      };
    } catch (err) {
      console.error('Camera error:', err);
      alert('Không thể truy cập camera. Vui lòng kiểm tra quyền trong cài đặt!');
      throw err;
    }
  }

  /**
   * Vòng lặp phát hiện tư thế
   */
  async detectPose() {
    const now = Date.now();
    const deltaTime = now - this.lastFrameTime;
    const frameDelay = 1000 / this.targetFPS;

    // Kiểm tra FPS limit
    if (deltaTime < frameDelay) {
      requestAnimationFrame(() => this.detectPose());
      return;
    }

    this.lastFrameTime = now;

    if (!this.isRunning || !this.video || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
      if (this.isRunning) {
        requestAnimationFrame(() => this.detectPose());
      }
      return;
    }

    try {
      // Vẽ video
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

      // Phát hiện tư thế
      if (this.poseDetector) {
        const poses = await this.poseDetector.estimatePoses(this.video);

        if (poses && poses.length > 0) {
          // Smoothing poses
          if (!this.smoothedPoses) {
            this.smoothedPoses = JSON.parse(JSON.stringify(poses));
          } else {
            this.smoothedPoses = this.smoothPoses(this.smoothedPoses, poses);
          }

          // Xử lý tư thế
          this.processPose(this.smoothedPoses[0]);

          // Debug: Vẽ keypoints (comment để tắt)
          if (false) {
            this.drawDebugPoints(poses[0]);
          }

          this.frameCount++;
        }
      }
    } catch (err) {
      console.error('Pose detection error:', err);
    }

    requestAnimationFrame(() => this.detectPose());
  }

  /**
   * Smoothing poses để giảm vibration
   */
  smoothPoses(prevPoses, currentPoses) {
    const alpha = 0.5; // Smoothing factor

    if (!prevPoses || prevPoses.length === 0) {
      return currentPoses;
    }

    return currentPoses.map((pose, idx) => {
      const prev = prevPoses[idx];
      if (!prev) return pose;

      const smoothedKeypoints = pose.keypoints.map((kp, kpIdx) => {
        const prevKp = prev.keypoints[kpIdx];
        if (!prevKp) return kp;

        return {
          x: prevKp.x * alpha + kp.x * (1 - alpha),
          y: prevKp.y * alpha + kp.y * (1 - alpha),
          score: (prevKp.score + kp.score) / 2,
          name: kp.name
        };
      });

      return {
        keypoints: smoothedKeypoints,
        score: pose.score
      };
    });
  }

  /**
   * Xử lý dữ liệu tư thế
   */
  processPose(pose) {
    if (!pose || !pose.keypoints) return;

    const keypoints = pose.keypoints;
    const minConfidence = 0.3;

    // Lấy các điểm chính
    const rightShoulder = keypoints[12]; // Right shoulder
    const leftShoulder = keypoints[11];  // Left shoulder
    const rightElbow = keypoints[14];
    const leftElbow = keypoints[13];
    const rightWrist = keypoints[16];
    const leftWrist = keypoints[15];
    const rightHip = keypoints[24];
    const leftHip = keypoints[23];
    const nose = keypoints[0];

    // Kiểm tra confidence
    if (!rightShoulder || !leftShoulder || 
        rightShoulder.score < minConfidence || 
        leftShoulder.score < minConfidence) {
      return;
    }

    // Vẽ costume
    if (this.selectedCostume) {
      this.drawCostume(
        pose,
        rightShoulder,
        leftShoulder,
        rightElbow,
        leftElbow,
        rightWrist,
        leftWrist,
        rightHip,
        leftHip,
        nose
      );
    }
  }

  /**
   * Vẽ costume lên cơ thể
   */
  drawCostume(pose, rightShoulder, leftShoulder, rightElbow, leftElbow, 
              rightWrist, leftWrist, rightHip, leftHip, nose) {
    const costume = this.selectedCostume;
    if (!costume) return;

    // Tính kích thước áo dựa trên khoảng cách vai
    const shoulderDistance = Math.sqrt(
      Math.pow(rightShoulder.x - leftShoulder.x, 2) + 
      Math.pow(rightShoulder.y - leftShoulder.y, 2)
    );

    const costumeWidth = shoulderDistance * 1.4;
    const costumeHeight = costumeWidth * 2.0;

    const topX = (rightShoulder.x + leftShoulder.x) / 2;
    const topY = Math.min(rightShoulder.y, leftShoulder.y) - costumeHeight * 0.15;
    const bottomY = topY + costumeHeight;

    // Tính tọa độ cuối áo (hip level)
    const hipY = (rightHip.y + leftHip.y) / 2;
    const actualHeight = Math.max(costumeHeight, hipY - topY);

    // Save context
    this.ctx.save();

    // Vẽ áo dài (trapezoid shape)
    this.drawAoDai(topX, topY, costumeWidth, actualHeight, costume);

    // Vẽ tay áo
    if (rightElbow.score > 0.3 && leftElbow.score > 0.3) {
      this.drawSleeves(
        rightShoulder, leftShoulder,
        rightElbow, leftElbow,
        rightWrist, leftWrist,
        costumeWidth, costume
      );
    }

    // Vẽ chi tiết
    this.drawDetails(topX, topY, costumeWidth, actualHeight, costume);

    this.ctx.restore();
  }

  /**
   * Vẽ áo dài chính
   */
  drawAoDai(x, y, width, height, costume) {
    const gradientEndY = y + height;

    // Tạo gradient
    const gradient = this.ctx.createLinearGradient(x, y, x, gradientEndY);
    
    const mainColor = costume.color || costume.primaryColor || '#ffffff';
    const accentColor = costume.accentColor || '#d94a2b';

    gradient.addColorStop(0, mainColor);
    gradient.addColorStop(0.5, this.blendColors(mainColor, accentColor, 0.1));
    gradient.addColorStop(1, this.darkenColor(mainColor, 0.15));

    this.ctx.fillStyle = gradient;

    // Vẽ áo dài theo kiểu trapezoid
    const bottomWidth = width * 0.75;
    const bottomLeft = x - bottomWidth / 2;
    const bottomRight = x + bottomWidth / 2;

    this.ctx.beginPath();
    this.ctx.moveTo(x - width / 2, y);           // Top left
    this.ctx.lineTo(x + width / 2, y);           // Top right
    this.ctx.quadraticCurveTo(
      bottomRight + 10,
      y + height * 0.3,
      bottomRight,
      gradientEndY
    );
    this.ctx.lineTo(bottomLeft, gradientEndY);
    this.ctx.quadraticCurveTo(
      bottomLeft - 10,
      y + height * 0.3,
      x - width / 2,
      y
    );
    this.ctx.closePath();
    this.ctx.fill();

    // Vẽ viền áo
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  /**
   * Vẽ tay áo
   */
  drawSleeves(rightShoulder, leftShoulder, rightElbow, leftElbow, 
              rightWrist, leftWrist, costumeWidth, costume) {
    const sleeveColor = this.darkenColor(costume.color || costume.primaryColor || '#ffffff', 0.2);
    const sleeveWidth = costumeWidth * 0.18;

    this.ctx.strokeStyle = sleeveColor;
    this.ctx.lineWidth = sleeveWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Tay phải
    this.ctx.beginPath();
    this.ctx.moveTo(rightShoulder.x, rightShoulder.y);
    this.ctx.quadraticCurveTo(
      (rightShoulder.x + rightElbow.x) / 2,
      (rightShoulder.y + rightElbow.y) / 2 - 10,
      rightElbow.x,
      rightElbow.y
    );
    this.ctx.stroke();

    // Kéo dài tay nếu có wrist
    if (rightWrist.score > 0.3) {
      this.ctx.beginPath();
      this.ctx.moveTo(rightElbow.x, rightElbow.y);
      this.ctx.quadraticCurveTo(
        (rightElbow.x + rightWrist.x) / 2,
        (rightElbow.y + rightWrist.y) / 2 - 5,
        rightWrist.x,
        rightWrist.y
      );
      this.ctx.stroke();
    }

    // Tay trái
    this.ctx.beginPath();
    this.ctx.moveTo(leftShoulder.x, leftShoulder.y);
    this.ctx.quadraticCurveTo(
      (leftShoulder.x + leftElbow.x) / 2,
      (leftShoulder.y + leftElbow.y) / 2 - 10,
      leftElbow.x,
      leftElbow.y
    );
    this.ctx.stroke();

    // Kéo dài tay trái
    if (leftWrist.score > 0.3) {
      this.ctx.beginPath();
      this.ctx.moveTo(leftElbow.x, leftElbow.y);
      this.ctx.quadraticCurveTo(
        (leftElbow.x + leftWrist.x) / 2,
        (leftElbow.y + leftWrist.y) / 2 - 5,
        leftWrist.x,
        leftWrist.y
      );
      this.ctx.stroke();
    }
  }

  /**
   * Vẽ chi tiết trang trí (thêu, hoa văn...)
   */
  drawDetails(x, y, width, height, costume) {
    if (costume.pattern === 'embroidered') {
      this.drawEmbroidery(x, y, width, height, costume);
    } else if (costume.pattern === 'geometric') {
      this.drawGeometric(x, y, width, height, costume);
    } else if (costume.pattern === 'vibrant') {
      this.drawVibrant(x, y, width, height, costume);
    }
  }

  /**
   * Vẽ hoa văn thêu
   */
  drawEmbroidery(x, y, width, height, costume) {
    const accentColor = costume.accentColor || '#ffd700';
    
    this.ctx.strokeStyle = accentColor;
    this.ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    this.ctx.shadowBlur = 8;
    this.ctx.lineWidth = 1.5;

    // Vẽ 3 đường thẳng dọc
    const spacing = width / 4;
    for (let i = 1; i < 3; i++) {
      const lineX = x - width / 2 + (i * spacing);
      this.ctx.beginPath();
      this.ctx.moveTo(lineX, y + height * 0.2);
      this.ctx.lineTo(lineX, y + height * 0.8);
      this.ctx.stroke();

      // Vẽ điểm trang trí dọc theo đường
      this.ctx.fillStyle = accentColor;
      for (let j = 0; j < 6; j++) {
        const dotY = y + height * 0.2 + (j * height * 0.12);
        this.ctx.beginPath();
        this.ctx.arc(lineX, dotY, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.shadowColor = 'transparent';
  }

  /**
   * Vẽ hoạ tiết hình học (Tây Nguyên style)
   */
  drawGeometric(x, y, width, height, costume) {
    const accentColor = costume.accentColor || '#8B0000';
    this.ctx.fillStyle = accentColor;
    this.ctx.globalAlpha = 0.4;

    const squareSize = 20;
    const startX = x - width / 2 + 20;
    const endX = x + width / 2 - 20;

    for (let px = startX; px < endX; px += squareSize * 1.5) {
      for (let py = y + 30; py < y + height - 30; py += squareSize * 1.5) {
        // Vẽ hình vuông
        this.ctx.fillRect(px, py, squareSize, squareSize);
        
        // Vẽ diamond bên trong
        this.ctx.fillStyle = costume.color || costume.primaryColor;
        this.ctx.beginPath();
        this.ctx.moveTo(px + squareSize / 2, py + 3);
        this.ctx.lineTo(px + squareSize - 3, py + squareSize / 2);
        this.ctx.lineTo(px + squareSize / 2, py + squareSize - 3);
        this.ctx.lineTo(px + 3, py + squareSize / 2);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.fillStyle = accentColor;
      }
    }

    this.ctx.globalAlpha = 1;
  }

  /**
   * Vẽ hoạ tiết sắc sỡ (Sài Gòn style)
   */
  drawVibrant(x, y, width, height, costume) {
    const colors = [costume.color, costume.accentColor, '#ffd700'];
    this.ctx.globalAlpha = 0.4;

    const stripeWidth = width / 5;
    for (let i = 0; i < 5; i++) {
      this.ctx.fillStyle = colors[i % colors.length];
      const startX = x - width / 2 + (i * stripeWidth);
      this.ctx.fillRect(startX, y + 40, stripeWidth * 0.6, height - 80);
    }

    this.ctx.globalAlpha = 1;
  }

  /**
   * Debug: Vẽ keypoints để kiểm tra
   */
  drawDebugPoints(pose) {
    if (!pose || !pose.keypoints) return;

    const keypoints = pose.keypoints;
    this.ctx.fillStyle = '#ff0000';

    keypoints.forEach((kp, idx) => {
      if (kp.score > 0.3) {
        this.ctx.beginPath();
        this.ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Vẽ text index
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px Arial';
        this.ctx.fillText(idx, kp.x + 5, kp.y - 5);
        this.ctx.fillStyle = '#ff0000';
      }
    });
  }

  /**
   * Chọn costume theo tỉnh
   */
  selectCostumeByRegion(region) {
    const costume = this.costumes.find(c =>
      c.regions && c.regions.includes(region)
    );
    if (costume) {
      this.selectedCostume = costume;
      return costume;
    }
    return null;
  }

  /**
   * Chọn costume theo ID
   */
  selectCostumeById(id) {
    const costume = this.costumes.find(c => c.id === id);
    if (costume) {
      this.selectedCostume = costume;
      return costume;
    }
    return null;
  }

  /**
   * Dừng camera
   */
  stopCamera() {
    this.isRunning = false;
    if (this.video && this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(track => track.stop());
      this.video = null;
    }
    this.smoothedPoses = null;
  }

  /**
   * Chụp ảnh (lấy canvas data)
   */
  captureImage() {
    return this.canvas.toDataURL('image/png');
  }

  /**
   * Helper: Làm tối một màu
   */
  darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) - amt));
    const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) - amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) - amt));
    return "#" + [R, G, B].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join('').toUpperCase();
  }

  /**
   * Helper: Trộn hai màu
   */
  blendColors(color1, color2, ratio) {
    const col1 = parseInt(color1.replace("#", ""), 16);
    const col2 = parseInt(color2.replace("#", ""), 16);

    const r1 = (col1 >> 16) & 0xff;
    const g1 = (col1 >> 8) & 0xff;
    const b1 = col1 & 0xff;

    const r2 = (col2 >> 16) & 0xff;
    const g2 = (col2 >> 8) & 0xff;
    const b2 = col2 & 0xff;

    const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
    const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
    const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

    return "#" + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join('').toUpperCase();
  }
}

// Export to global window object
window.ARCostumeSystem = ARCostumeSystem;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ARCostumeSystem;
}
