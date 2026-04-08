/**
 * AR Costume System - Initialization & Event Handlers
 * Quản lý các sự kiện và khởi tạo hệ thống AR
 */

let arSystem = null;
let currentSelectedRegion = null;

/**
 * Khởi tạo AR System dữ liệu từ traditional-costumes.js
 */
async function initARSystem() {
  console.log('Initializing AR System...');

  // Kiểm tra xem traditional-costumes.js đã được load
  if (typeof traditionalCostumes === 'undefined') {
    console.error('traditionalCostumes is not defined. Make sure traditional-costumes.js is loaded before ar-init.js');
    alert('Lỗi: Dữ liệu trang phục không được tải. Vui lòng tải lại trang.');
    return false;
  }

  // Kiểm tra xem ARCostumeSystem đã được load
  if (typeof ARCostumeSystem === 'undefined') {
    console.error('ARCostumeSystem is not defined. Make sure ar-costume.js is loaded before ar-init.js');
    alert('Lỗi: System AR không được tải. Vui lòng tải lại trang.');
    return false;
  }

  try {
    // Khởi tạo AR System
    arSystem = new ARCostumeSystem('ar-canvas', traditionalCostumes);
    await arSystem.init();
    console.log('AR System initialized successfully');

    // Populate costume dropdown
    populateCostumeDropdown();

    // Setup event listeners
    setupEventListeners();

    return true;
  } catch (err) {
    console.error('AR System initialization error:', err);
    alert('Lỗi khi khởi tạo AR: ' + err.message);
    return false;
  }
}

/**
 * Điền danh sách trang phục vào dropdown
 */
function populateCostumeDropdown() {
  const costumeSelect = document.getElementById('costume-select');
  if (!costumeSelect) return;

  costumeSelect.innerHTML = '<option value="">-- Chọn trang phục --</option>';

  traditionalCostumes.forEach(costume => {
    const option = document.createElement('option');
    option.value = costume.id;
    option.textContent = costume.name;
    costumeSelect.appendChild(option);
  });
}

/**
 * Setup tất cả event listeners
 */
function setupEventListeners() {
  // Camera controls
  const startBtn = document.getElementById('ar-start-btn');
  const captureBtn = document.getElementById('ar-capture-btn');
  const stopBtn = document.getElementById('ar-stop-btn');

  if (startBtn) startBtn.addEventListener('click', handleStartCamera);
  if (captureBtn) captureBtn.addEventListener('click', handleCaptureImage);
  if (stopBtn) stopBtn.addEventListener('click', handleStopCamera);

  // Costume selection
  const regionSelect = document.getElementById('region-select');
  const costumeSelect = document.getElementById('costume-select');
  const randomBtn = document.getElementById('random-costume-btn');

  if (regionSelect) regionSelect.addEventListener('change', handleRegionChange);
  if (costumeSelect) costumeSelect.addEventListener('change', handleCostumeChange);
  if (randomBtn) randomBtn.addEventListener('click', handleRandomCostume);

  // Result actions
  const downloadBtn = document.getElementById('ar-download-btn');
  const shareBtn = document.getElementById('ar-share-btn');
  const tryAgainBtn = document.getElementById('ar-try-again-btn');
  const closeResultBtn = document.getElementById('close-result-btn');

  if (downloadBtn) downloadBtn.addEventListener('click', handleDownloadImage);
  if (shareBtn) shareBtn.addEventListener('click', handleShareImage);
  if (tryAgainBtn) tryAgainBtn.addEventListener('click', handleTryAgain);
  if (closeResultBtn) closeResultBtn.addEventListener('click', handleCloseResult);
}

/**
 * Xử lý bắt đầu camera
 */
async function handleStartCamera() {
  const startBtn = document.getElementById('ar-start-btn');
  const captureBtn = document.getElementById('ar-capture-btn');
  const stopBtn = document.getElementById('ar-stop-btn');
  const loadingDiv = document.getElementById('ar-loading');
  const statusDiv = document.getElementById('ar-status');

  try {
    // Show loading
    if (loadingDiv) loadingDiv.style.display = 'flex';

    // Start camera
    await arSystem.startCamera();

    // Update UI
    if (startBtn) startBtn.style.display = 'none';
    if (captureBtn) captureBtn.style.display = 'inline-flex';
    if (stopBtn) stopBtn.style.display = 'inline-flex';
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (statusDiv) statusDiv.style.display = 'block';

    console.log('Camera started successfully');
  } catch (err) {
    console.error('Camera start error:', err);
    if (loadingDiv) loadingDiv.style.display = 'none';
  }
}

/**
 * Xử lý chụp ảnh
 */
function handleCaptureImage() {
  try {
    // Capture image from canvas
    const imageData = arSystem.captureImage();

    // Show result
    const resultImage = document.getElementById('ar-result-image');
    const resultSection = document.getElementById('ar-result-section');

    if (resultImage) resultImage.src = imageData;
    if (resultSection) resultSection.style.display = 'block';

    // Stop camera
    arSystem.stopCamera();

    // Update UI
    const startBtn = document.getElementById('ar-start-btn');
    const captureBtn = document.getElementById('ar-capture-btn');
    const stopBtn = document.getElementById('ar-stop-btn');
    const statusDiv = document.getElementById('ar-status');

    if (startBtn) startBtn.style.display = 'inline-flex';
    if (captureBtn) captureBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'none';
    if (statusDiv) statusDiv.style.display = 'none';

    console.log('Image captured successfully');
  } catch (err) {
    console.error('Capture error:', err);
    alert('Lỗi khi chụp ảnh: ' + err.message);
  }
}

/**
 * Xử lý dừng camera
 */
function handleStopCamera() {
  arSystem.stopCamera();

  // Update UI
  const startBtn = document.getElementById('ar-start-btn');
  const captureBtn = document.getElementById('ar-capture-btn');
  const stopBtn = document.getElementById('ar-stop-btn');
  const statusDiv = document.getElementById('ar-status');

  if (startBtn) startBtn.style.display = 'inline-flex';
  if (captureBtn) captureBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'none';
  if (statusDiv) statusDiv.style.display = 'none';

  console.log('Camera stopped');
}

/**
 * Xử lý thay đổi vùng miền
 */
function handleRegionChange(e) {
  const region = e.target.value;
  if (!region) return;

  currentSelectedRegion = region;

  // Select costume by region
  const costume = arSystem.selectCostumeByRegion(region);

  if (costume) {
    updateCostumeInfo(costume);
    // Update dropdown to match selected costume
    const costumeSelect = document.getElementById('costume-select');
    if (costumeSelect) costumeSelect.value = costume.id;
  }
}

/**
 * Xử lý thay đổi trang phục
 */
function handleCostumeChange(e) {
  const costumeId = parseInt(e.target.value);
  if (!costumeId) return;

  const costume = arSystem.selectCostumeById(costumeId);
  if (costume) {
    updateCostumeInfo(costume);
  }
}

/**
 * Xử lý chọn trang phục ngẫu nhiên
 */
function handleRandomCostume() {
  const randomIdx = Math.floor(Math.random() * traditionalCostumes.length);
  const costume = traditionalCostumes[randomIdx];

  arSystem.selectCostumeById(costume.id);
  updateCostumeInfo(costume);

  // Update dropdowns
  const costumeSelect = document.getElementById('costume-select');
  const regionSelect = document.getElementById('region-select');

  if (costumeSelect) costumeSelect.value = costume.id;
  if (regionSelect && costume.regions && costume.regions.length > 0) {
    regionSelect.value = costume.regions[0];
    currentSelectedRegion = costume.regions[0];
  }
}

/**
 * Cập nhật thông tin trang phục trên UI
 */
function updateCostumeInfo(costume) {
  const costumeInfo = document.getElementById('costume-info');
  const costumeName = document.getElementById('costume-name');
  const costumeDesc = document.getElementById('costume-desc');
  const costumeRegions = document.getElementById('costume-regions');
  const colorPreview = document.getElementById('color-preview');

  if (!costumeInfo) return;

  // Hiển thị thông tin
  if (costumeName) costumeName.textContent = costume.name;
  if (costumeDesc) costumeDesc.textContent = costume.description;

  if (costumeRegions) {
    const regionText = costume.regions ? costume.regions.join(', ') : 'N/A';
    costumeRegions.textContent = regionText;
  }

  // Cập nhật màu sắc
  const color = costume.color || costume.primaryColor || '#ffffff';
  if (colorPreview) {
    colorPreview.style.backgroundColor = color;
    colorPreview.style.borderColor = costume.accentColor || '#d94a2b';
  }

  costumeInfo.style.display = 'block';
}

/**
 * Xử lý tải ảnh
 */
function handleDownloadImage() {
  const resultImage = document.getElementById('ar-result-image');
  if (!resultImage || !resultImage.src) {
    alert('Không có ảnh để tải');
    return;
  }

  const a = document.createElement('a');
  a.href = resultImage.src;

  // Tạo tên file
  const costume = arSystem.selectedCostume;
  const filename = costume
    ? `ao-dai-${costume.name.replace(/\s+/g, '-')}-${Date.now()}.png`
    : `ar-costume-${Date.now()}.png`;

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log('Image downloaded:', filename);
}

/**
 * Xử lý chia sẻ ảnh
 */
function handleShareImage() {
  const shareOptions = document.getElementById('share-options');
  if (shareOptions) {
    shareOptions.style.display = shareOptions.style.display === 'none' ? 'block' : 'none';
  }
}

/**
 * Xử lý chụp lại
 */
function handleTryAgain() {
  const resultSection = document.getElementById('ar-result-section');
  const startBtn = document.getElementById('ar-start-btn');

  if (resultSection) resultSection.style.display = 'none';
  if (startBtn) startBtn.style.display = 'inline-flex';
}

/**
 * Xử lý đóng kết quả
 */
function handleCloseResult() {
  handleTryAgain();
}

/**
 * Share to Facebook
 */
window.shareToFacebook = function() {
  const resultImage = document.getElementById('ar-result-image');
  if (!resultImage || !resultImage.src) {
    alert('Không có ảnh để chia sẻ');
    return;
  }

  const costume = arSystem.selectedCostume;
  const title = costume
    ? `Tôi vừa thử ${costume.name} trên ứng dụng Lễ hội Văn hóa Việt Nam!`
    : 'Tôi vừa thử đồng phục truyền thống trên ứng dụng Lễ hội Văn hóa Việt Nam!';

  // Nếu có FB SDK
  if (typeof FB !== 'undefined') {
    FB.ui({
      method: 'share',
      href: window.location.href,
      hashtag: '#áODàiVN #LễHộiViệtNam',
      quote: title,
    }, function(){});
  } else {
    // Fallback: open Facebook share dialog
    const url = window.location.href;
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbShareUrl, '_blank', 'width=600,height=400');
  }
};

/**
 * Share to Twitter/X
 */
window.shareToTwitter = function() {
  const costume = arSystem.selectedCostume;
  const text = costume
    ? `Vừa thử ${costume.name} trên ứng dụng Lễ hội Văn hóa Việt Nam! 🎭🇻🇳 #áODài #LễHộiVN`
    : `Vừa thử đồng phục truyền thống trên ứng dụng Lễ hội Văn hóa Việt Nam! 🎭🇻🇳 #áODài`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
  window.open(twitterUrl, '_blank', 'width=550,height=420');
};

/**
 * Copy image to clipboard
 */
window.copyImageToClipboard = function() {
  const resultImage = document.getElementById('ar-result-image');
  if (!resultImage || !resultImage.src) {
    alert('Không có ảnh để sao chép');
    return;
  }

  // Fetch image and convert to blob
  fetch(resultImage.src)
    .then(res => res.blob())
    .then(blob => {
      const item = new ClipboardItem({ 'image/png': blob });
      navigator.clipboard.write([item]).then(() => {
        alert('Ảnh đã được sao chép vào clipboard!');
      }).catch(err => {
        console.error('Copy error:', err);
        alert('Lỗi khi sao chép ảnh');
      });
    })
    .catch(err => {
      console.error('Fetch error:', err);
      alert('Lỗi khi xử lý ảnh');
    });
};

/**
 * Detect user location and auto-select costume
 */
function detectLocationAndSelectCostume() {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      console.log(`User location: ${latitude}, ${longitude}`);

      try {
        // Use reverse geocoding API (example: OpenStreetMap Nominatim)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();

        // Extract province/region information
        const address = data.address;
        let province = address.state || address.province || null;

        if (province) {
          console.log(`Detected province: ${province}`);
          const regionSelect = document.getElementById('region-select');
          if (regionSelect) {
            // Try to find matching region
            const options = regionSelect.options;
            for (let opt of options) {
              if (opt.value && province.includes(opt.value.split('(')[0].trim())) {
                regionSelect.value = opt.value;
                regionSelect.dispatchEvent(new Event('change'));
                break;
              }
            }
          }
        }
      } catch (err) {
        console.error('Geolocation resolution error:', err);
      }
    },
    (error) => {
      console.warn('Geolocation error:', error);
    }
  );
}

/**
 * Show/Hide AR Section
 */
function toggleARSection(show = true) {
  const arSection = document.getElementById('ar-costume-section');
  if (arSection) {
    arSection.style.display = show ? 'block' : 'none';
  }
}

/**
 * Initialize when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing AR...');
  await initARSystem();
  // Uncomment to auto-detect user location
  // detectLocationAndSelectCostume();
});

// Export functions for external use
window.toggleARSection = toggleARSection;
window.initARSystem = initARSystem;
window.AR = {
  system: () => arSystem,
  init: initARSystem,
  getCurrentCostume: () => arSystem?.selectedCostume,
};
