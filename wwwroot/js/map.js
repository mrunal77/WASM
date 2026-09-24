window.wasmMap = {
  _map: null,
  _marker: null,

  initMap: (elemId, lat, lon, zoom) => {
    if (!window.L) return false;
    const mapElem = document.getElementById(elemId);
    if (!mapElem) return false;
    mapElem.style.height = '400px';

    const api = window.wasmMap;

    // Reuse an existing map instance instead of re-initializing the same
    // container (Leaflet throws "Map container is already initialized").
    if (api._map) {
      api._map.setView([lat || 0, lon || 0], zoom || 2);
      if (lat && lon) {
        if (api._marker) {
          api._marker.setLatLng([lat, lon]);
        } else {
          api._marker = L.marker([lat, lon]).addTo(api._map);
        }
        api._marker.bindPopup('You are here').openPopup();
      } else if (api._marker) {
        api._map.removeLayer(api._marker);
        api._marker = null;
      }
      return true;
    }

    const map = L.map(mapElem).setView([lat || 0, lon || 0], zoom || 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    api._map = map;
    if (lat && lon) {
      api._marker = L.marker([lat, lon]).addTo(map).bindPopup('You are here').openPopup();
    }
    return true;
  }
};