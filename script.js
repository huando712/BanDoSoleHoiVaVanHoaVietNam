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