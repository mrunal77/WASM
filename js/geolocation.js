window.geoLocation = {
  getCurrentPosition: function () {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject('Geolocation is not supported by your browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        function (position) {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        function (error) {
          reject(error.message || 'Unable to retrieve location.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }
};
