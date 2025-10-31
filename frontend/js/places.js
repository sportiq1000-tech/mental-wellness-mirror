/**
 * Places Page Logic - MORE ROBUST VERSION
 * Handles HTTPS requirements and geolocation errors.
 */

// AUTHENTICATION CHECK
if (!window.authManager || !window.authManager.requireAuth()) {
  throw new Error('Authentication required');
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Places.js loaded');
  
  let map;
  let userMarker;
  let placeMarkers = [];
  let state = {
    currentLat: null,
    currentLng: null,
    currentCategory: 'parks',
    isLoading: false,
  };
  
  const stateOverlay = document.getElementById('stateOverlay');
  const stateTitle = document.getElementById('stateTitle');
  const stateMessage = document.getElementById('stateMessage');
  const stateSpinner = document.getElementById('stateSpinner');
  const filterBar = document.getElementById('filterBar');
  const placeList = document.getElementById('placeList');
  
  // INITIALIZATION
  getUserLocation();
  setupEventListeners();

  function setupEventListeners() {
    filterBar.addEventListener('click', (e) => {
      const button = e.target.closest('.filter-btn');
      if (button && !button.classList.contains('active')) {
        filterBar.querySelector('.active').classList.remove('active');
        button.classList.add('active');
        state.currentCategory = button.dataset.category;
        fetchAndRenderPlaces();
      }
    });

    placeList.addEventListener('click', (e) => {
      const item = e.target.closest('.place-item');
      if (item && map) {
        const lat = parseFloat(item.dataset.lat);
        const lng = parseFloat(item.dataset.lng);
        map.setView([lat, lng], 15);
        placeList.querySelector('.active')?.classList.remove('active');
        item.classList.add('active');
      }
    });
  }

  function getUserLocation() {
    updateStateOverlay('loading', 'Requesting Location...', 'Your browser will ask for permission.');

    // ⭐ 1. CHECK FOR SECURE CONTEXT (HTTPS)
    if (!navigator.geolocation) {
      updateStateOverlay('error', 'Location Not Supported', 'Your browser does not support geolocation.');
      return;
    }
    if (window.isSecureContext === false && window.location.protocol !== 'http:') {
      // Allow for localhost, but warn for non-secure remote contexts
      updateStateOverlay('error', 'Secure Connection Required', 'Location services require an HTTPS connection.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        state.currentLat = position.coords.latitude;
        state.currentLng = position.coords.longitude;
        console.log(`📍 Location found: ${state.currentLat}, ${state.currentLng}`);
        
        // If map isn't initialized yet, do it now.
        if (!map) {
          initMap(state.currentLat, state.currentLng);
        }
        
        fetchAndRenderPlaces();
      },
      // Error callback ⭐ 2. MORE DETAILED ERROR HANDLING
      (error) => {
        let title = 'Location Error';
        let message = 'Could not get your location. Please try again.';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            title = 'Location Access Denied';
            message = 'You have blocked location access. Please enable it in your browser settings for this site.';
            break;
          case error.POSITION_UNAVAILABLE:
            title = 'Location Unavailable';
            message = 'Your location information is currently unavailable.';
            break;
          case error.TIMEOUT:
            title = 'Location Request Timed Out';
            message = 'The request to get your location timed out.';
            break;
        }
        console.error(`Geolocation Error (${error.code}): ${error.message}`);
        updateStateOverlay('error', title, message);
      },
      // Options
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 0
      }
    );
  }

  function initMap(lat, lng) {
    if (document.getElementById('map') && !map) {
      map = L.map('map').setView([lat, lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const userIcon = L.divIcon({
          className: 'user-marker',
          html: '<i class="fas fa-user"></i>',
          iconSize: [30, 30]
      });

      userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map)
        .bindPopup('Your Location').openPopup();
    }
  }

  async function fetchAndRenderPlaces() {
    if (state.isLoading || !state.currentLat) {
      console.warn('Skipping fetch: already loading or no location.');
      return;
    }
    
    state.isLoading = true;
    updateStateOverlay('loading', 'Finding nearby places...');
    
    try {
      const response = await window.api.get('/api/places/nearby', {
        lat: state.currentLat,
        lng: state.currentLng,
        category: state.currentCategory
      });
      
      if (response.success) {
        renderPlaces(response.data.places);
        stateOverlay.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to fetch places:', error);
      updateStateOverlay('error', 'Could Not Find Places', 'There was an error finding places near you. Please try again later.');
    } finally {
      state.isLoading = false;
    }
  }

  function renderPlaces(places) {
    placeMarkers.forEach(marker => marker.remove());
    placeMarkers = [];
    placeList.innerHTML = '';
    
    if (places.length === 0) {
      placeList.innerHTML = '<li class="no-results">No places found in this category. Try another!</li>';
      return;
    }

    places.forEach(place => {
      const marker = L.marker([place.location.lat, place.location.lng])
        .addTo(map)
        .bindPopup(`<b>${place.name}</b><br>${place.category}`);
      placeMarkers.push(marker);

      const listItem = document.createElement('li');
      listItem.className = 'place-item';
      listItem.dataset.lat = place.location.lat;
      listItem.dataset.lng = place.location.lng;
      listItem.innerHTML = `
        <h4>${place.name}</h4>
        <p>${place.location.address}</p>
        <p class="place-category">${place.category}</p>
      `;
      placeList.appendChild(listItem);
    });
  }

  function updateStateOverlay(type, title, message) {
    if (!stateOverlay) return;
    stateOverlay.style.display = 'flex';
    if (stateTitle) stateTitle.textContent = title;
    if (stateMessage) stateMessage.textContent = message;
    if (stateSpinner) stateSpinner.style.display = (type === 'loading') ? 'block' : 'none';
    
    const iconEl = stateOverlay.querySelector('.state-icon');
    if (iconEl) {
      iconEl.className = (type === 'error') 
        ? 'fas fa-exclamation-triangle state-icon' 
        : 'fas fa-map-marker-alt state-icon';
    }
  }
});