window.wasmMap = {
  initMap: (elemId, lat, lon, zoom) => {
    if (!window.L) return;
    const mapElem = document.getElementById(elemId);
    if (!mapElem) return;
    mapElem.style.height = '400px';
    const map = L.map(mapElem).setView([lat || 0, lon || 0], zoom || 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    if (lat && lon) {
      L.marker([lat, lon]).addTo(map).bindPopup('You are here').openPopup();
    }
    return true;
  }
};
