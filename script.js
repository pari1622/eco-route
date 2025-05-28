let map;
let vehicleMarker = null;

const depot = { lat: 28.6139, lng: 77.209 };
const binLocations = [
  { lat: 28.62, lng: 77.21, label: "A", status: "Full" },
  { lat: 28.63, lng: 77.22, label: "B", status: "Medium" },
  { lat: 28.615, lng: 77.2, label: "C", status: "Empty" },
  { lat: 28.61, lng: 77.215, label: "D", status: "Full" },
];

let directionsService, directionsRenderer;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: depot,
  });

  // 🟢 Add real-time traffic layer
  const trafficLayer = new google.maps.TrafficLayer();
  trafficLayer.setMap(map);

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map: map });

  // Initial display
  displayBinsAndRoute("All");

  // Status filter listener
  document.getElementById("statusFilter").addEventListener("change", (e) => {
    displayBinsAndRoute(e.target.value);
  });
}
document
  .getElementById("refreshBtn")
  .addEventListener("click", updateBinStatuses);

function displayBinsAndRoute(statusFilter = "All") {
  // Recreate the map to reset markers and layers
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: depot,
  });

  // 🟢 Re-add traffic layer after map reset
  const trafficLayer = new google.maps.TrafficLayer();
  trafficLayer.setMap(map);

  directionsRenderer.setMap(map);

  // Depot marker
  new google.maps.Marker({
    position: depot,
    map: map,
    title: "Depot",
    icon: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  });

  // Filter bins
  const filteredBins = binLocations.filter(
    (bin) => statusFilter === "All" || bin.status === statusFilter
  );

  // Add bin markers
  filteredBins.forEach((bin) => {
    let iconUrl =
      bin.status === "Full"
        ? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
        : bin.status === "Medium"
        ? "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
        : "https://maps.google.com/mapfiles/ms/icons/green-dot.png";

    const marker = new google.maps.Marker({
      position: { lat: bin.lat, lng: bin.lng },
      map: map,
      label: bin.label,
      icon: iconUrl,
      title: `Bin ${bin.label}`,
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `<strong>Bin ${bin.label}</strong><br>Status: ${bin.status}`,
    });

    marker.addListener("click", () => {
      infoWindow.open(map, marker);
    });
  });

  // Draw optimized route
  if (filteredBins.length > 0) {
    const waypoints = filteredBins.slice(1).map((bin) => ({
      location: { lat: bin.lat, lng: bin.lng },
      stopover: true,
    }));

    const routeRequest = {
      origin: depot,
      destination: { lat: filteredBins[0].lat, lng: filteredBins[0].lng },
      waypoints: waypoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(routeRequest, (result, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(result);
        simulateVehicleMovement(result.routes[0]);

        // Distance and ETA
        let totalDistance = 0;
        let totalDuration = 0;
        result.routes[0].legs.forEach((leg) => {
          totalDistance += leg.distance.value;
          totalDuration += leg.duration.value;
        });

        document.getElementById("summary").innerText = `Bins shown: ${
          filteredBins.length
        } | Distance: ${(totalDistance / 1000).toFixed(
          2
        )} km | ETA: ${Math.round(totalDuration / 60)} mins`;
      } else {
        console.error("Directions request failed: " + status);
      }
    });
  } else {
    document.getElementById("summary").innerText =
      "No bins found for selected status.";
  }
}

// 🔁 Simulate live updates
//setInterval(() => {
//binLocations.forEach((bin) => {
// const random = Math.random();
//if (random < 0.33) {
//  bin.status = "Full";
// } else if (random < 0.66) {
bin.status = "Medium";
// } else {
//   bin.status = "Empty";
//}
//});

//const selectedStatus = document.getElementById("statusFilter").value;
// displayBinsAndRoute(selectedStatus);
//}, 10000);
function showMyLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        new google.maps.Marker({
          position: userLocation,
          map: map,
          title: "Your Location",
          icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        });

        map.setCenter(userLocation);
        map.setZoom(14);
      },
      () => {
        alert("Location access denied.");
      }
    );
  } else {
    alert("Geolocation is not supported by your browser.");
  }
}
function simulateVehicleMovement(route) {
  const path = [];

  route.legs.forEach((leg) => {
    leg.steps.forEach((step) => {
      const points = step.path;
      points.forEach((point) => {
        path.push(point);
      });
    });
  });

  let index = 0;

  // Create or reset vehicle marker
  if (vehicleMarker) {
    vehicleMarker.setMap(null);
  }

  vehicleMarker = new google.maps.Marker({
    position: path[0],
    map: map,
    icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    title: "Garbage Truck",
  });

  const interval = setInterval(() => {
    if (index >= path.length) {
      clearInterval(interval);
      return;
    }
    vehicleMarker.setPosition(path[index]);
    index++;
  }, 500); // Adjust speed here (lower = faster)
}
function updateBinStatuses() {
  binLocations.forEach((bin) => {
    const random = Math.random();
    if (random < 0.33) {
      bin.status = "Full";
    } else if (random < 0.66) {
      bin.status = "Medium";
    } else {
      bin.status = "Empty";
    }
  });

  const selectedStatus = document.getElementById("statusFilter").value;
  displayBinsAndRoute(selectedStatus);
}
