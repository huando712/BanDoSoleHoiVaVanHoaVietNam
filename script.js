var map = L.map('map').setView([16.2,107.5],5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
attribution:'© OpenStreetMap'
}).addTo(map);

// tải bản đồ Việt Nam
fetch("vietnam.geojson")
.then(res => res.json())
.then(data => {

L.geoJSON(data,{
style:{
color:"red",
weight:2,
fillColor:"#ffcc00",
fillOpacity:0.3
}
}).addTo(map);

});

// ─── Tải festival data từ API ────────────────────────────────────────────

async function loadFestivals() {
  try {
    const response = await fetch('/api/festivals');
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.warn('Chưa có dữ liệu lễ hội');
      return;
    }

    // Vẽ markers cho từng festival
    data.items.forEach(festival => {
      if (!festival.lat || !festival.lng) return;

      const marker = L.marker([festival.lat, festival.lng], {
        title: festival.name
      }).addTo(map);

      // Popup khi click
      marker.bindPopup(`
        <div style="font-family: Arial; width: 200px;">
          <h4 style="margin: 0 0 8px 0; color: #c41e3a;">${festival.name}</h4>
          <p style="margin: 0 0 4px 0;"><strong>Tỉnh:</strong> ${festival.province}</p>
          <p style="margin: 0; font-size: 12px; color: #666;">
            📍 ${festival.lat.toFixed(4)}, ${festival.lng.toFixed(4)}
          </p>
        </div>
      `);

      // Tooltip khi hover
      marker.bindTooltip(festival.name, { 
        permanent: false, 
        direction: 'top',
        offset: [0, -10]
      });
    });

    console.log(`✓ Đã tải ${data.items.length} lễ hội`);
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu lễ hội:', error);
  }
}

// Load festivals khi map sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadFestivals, 500);
});