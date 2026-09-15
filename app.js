// DOM Elements
const rawInput = document.getElementById('raw-input');
const latOutput = document.getElementById('lat-output');
const lngOutput = document.getElementById('lng-output');
const btnCopyLat = document.getElementById('btn-copy-lat');
const btnCopyLng = document.getElementById('btn-copy-lng');
const btnCopyBoth = document.getElementById('btn-copy-both');
const btnLocate = document.getElementById('btn-locate');
const btnClear = document.getElementById('btn-clear');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const toastContainer = document.getElementById('toast-container');

// Map variables
let map;
let marker;
let currentTileLayer;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMap();
    setupEventListeners();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Initialize Leaflet Map
function initMap() {
    // Standard starting coordinates centered in Brazil (Brasília)
    const defaultLat = -15.793889;
    const defaultLng = -47.882778;
    const defaultZoom = 4;

    // Create the map
    map = L.map('map', {
        zoomControl: true,
        tap: true // Enables touch events on mobile
    }).setView([defaultLat, defaultLng], defaultZoom);

    // Standard OpenStreetMap tiles - 100% free and open, zero API key required anywhere
    currentTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Try to auto-locate user on startup for convenience
    tryGeolocation(true);
}

// Setup Event Listeners
function setupEventListeners() {
    // Capture input in real-time
    rawInput.addEventListener('input', handleInputChange);
    
    // Paste handler to trim and trigger parsing
    rawInput.addEventListener('paste', () => {
        setTimeout(handleInputChange, 10);
    });

    // Map click capturing coordinates
    map.on('click', handleMapClick);

    // Locate button action
    btnLocate.addEventListener('click', () => {
        tryGeolocation(false);
    });

    // Theme toggle button action
    btnThemeToggle.addEventListener('click', toggleTheme);

    // Clear all action
    btnClear.addEventListener('click', clearAll);

    // Copy actions
    btnCopyLat.addEventListener('click', () => copyToClipboard(latOutput.value, btnCopyLat, 'Latitude copiada!'));
    btnCopyLng.addEventListener('click', () => copyToClipboard(lngOutput.value, btnCopyLng, 'Longitude copiada!'));
    btnCopyBoth.addEventListener('click', () => {
        const textToCopy = `${latOutput.value}\n${lngOutput.value}`;
        copyToClipboard(textToCopy, btnCopyBoth, 'Ambas coordenadas copiadas!');
    });
}

// Handle Manual Inputs
function handleInputChange() {
    const value = rawInput.value.trim();
    
    if (value === '') {
        clearOutputs();
        btnClear.style.display = 'none';
        return;
    }

    btnClear.style.display = 'inline-block';
    const coords = parseCoordinates(value);

    if (coords) {
        updateOutputs(coords.lat, coords.lng);
        updateMapMarker(coords.lat, coords.lng, true);
    } else {
        // Clear outputs if coordinates format is invalid
        clearOutputs();
    }
}

// Handle Map Clicks
function handleMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // Set raw input text to show standard dot format
    rawInput.value = `${lat.toFixed(14)}, ${lng.toFixed(14)}`;
    btnClear.style.display = 'inline-block';
    
    updateOutputs(lat.toString(), lng.toString());
    updateMapMarker(lat, lng, false);
}

// Geolocation Handling
function tryGeolocation(isSilentOnFail = false) {
    if (!navigator.geolocation) {
        if (!isSilentOnFail) showToast('Geolocalização não é suportada pelo seu navegador.', 'error');
        return;
    }

    // Set high accuracy and a reasonable timeout
    const options = {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            rawInput.value = `${lat.toFixed(14)}, ${lng.toFixed(14)}`;
            btnClear.style.display = 'inline-block';
            
            updateOutputs(lat.toString(), lng.toString());
            updateMapMarker(lat, lng, true, 16);
            showToast('Localização encontrada com sucesso!');
        },
        (error) => {
            console.warn(`Geolocation error (${error.code}): ${error.message}`);
            if (!isSilentOnFail) {
                let errorMsg = 'Não foi possível obter sua localização.';
                if (error.code === error.PERMISSION_DENIED) {
                    errorMsg = 'Permissão de localização negada pelo usuário.';
                } else if (error.code === error.TIMEOUT) {
                    errorMsg = 'Tempo limite de geolocalização esgotado.';
                }
                showToast(errorMsg, 'error');
            }
        },
        options
    );
}

// Parse input coordinates and extract numeric segments
function parseCoordinates(inputStr) {
    // Normalizes input standard (replaces semicolons, brackets, etc.)
    const cleanStr = inputStr
        .replace(/[()\[\]{}]/g, ' ') // remove brackets
        .replace(/;/g, ' ')          // replace semicolons with space
        .trim();
        
    // Regex matches coordinate numbers like -20.464431 or 12.3456
    // We target both standard decimals and coordinates with comma (if already formatted)
    const regexDecimal = /-?\d+\.\d+/g;
    let matches = cleanStr.match(regexDecimal);
    
    if (matches && matches.length >= 2) {
        return {
            lat: matches[0],
            lng: matches[1]
        };
    }
    
    // Fallback: If they use commas as decimal point and space/semicolon as separator
    // Ex: "-20,464431 -45,951409"
    const parsedWithCommaDecimals = cleanStr.replace(/,/g, '.');
    matches = parsedWithCommaDecimals.match(regexDecimal);
    
    if (matches && matches.length >= 2) {
        return {
            lat: matches[0],
            lng: matches[1]
        };
    }

    return null;
}

// Update UI output fields
function updateOutputs(latStr, lngStr) {
    // Convert dot decimals to Portuguese/BR comma format
    const formattedLat = latStr.replace('.', ',');
    const formattedLng = lngStr.replace('.', ',');

    latOutput.value = formattedLat;
    lngOutput.value = formattedLng;

    // Enable Buttons
    btnCopyLat.disabled = false;
    btnCopyLng.disabled = false;
    btnCopyBoth.disabled = false;
}

// Clear outputs and reset state
function clearOutputs() {
    latOutput.value = '';
    lngOutput.value = '';
    
    btnCopyLat.disabled = true;
    btnCopyLng.disabled = true;
    btnCopyBoth.disabled = true;
}

// Clear all inputs and reset marker
function clearAll() {
    rawInput.value = '';
    clearOutputs();
    btnClear.style.display = 'none';
    
    if (marker) {
        map.removeLayer(marker);
        marker = null;
    }
}

// Manage Map Marker placement and pan
function updateMapMarker(lat, lng, shouldPan = true, zoomLevel = null) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) return;

    if (marker) {
        marker.setLatLng([latNum, lngNum]);
    } else {
        // Create custom neon-blue icon to match premium visual design
        const customIcon = L.divIcon({
            className: 'custom-map-pin',
            html: `<div style="
                width: 14px; 
                height: 14px; 
                background-color: var(--accent-color); 
                border: 2px solid white; 
                border-radius: 50%;
                box-shadow: 0 0 10px var(--accent-color);
            "></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });

        marker = L.marker([latNum, lngNum], { icon: customIcon }).addTo(map);
    }

    if (shouldPan) {
        if (zoomLevel) {
            map.setView([latNum, lngNum], zoomLevel);
        } else {
            // Pan smoothly, auto increase zoom if it's too far out
            const currentZoom = map.getZoom();
            map.setView([latNum, lngNum], Math.max(currentZoom, 12));
        }
    }
}

// Copy values to clipboard
function copyToClipboard(text, triggerButton, successMessage) {
    if (!text) return;

    // Use Modern Clipboard API
    navigator.clipboard.writeText(text).then(
        () => {
            // Visual feedback on button
            triggerButton.classList.add('copied');
            const originalHTML = triggerButton.innerHTML;
            
            // Temporary replacement
            triggerButton.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Copiado!</span>
            `;

            showToast(successMessage);

            setTimeout(() => {
                triggerButton.classList.remove('copied');
                triggerButton.innerHTML = originalHTML;
            }, 2000);
        },
        (err) => {
            console.error('Failed to copy text: ', err);
            showToast('Erro ao copiar coordenada.', 'error');
        }
    );
}

// Toast notification helper
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    
    const iconSVG = type === 'success' 
        ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="toast-icon toast-success-icon">
             <circle cx="12" cy="12" r="10"></circle>
             <polyline points="12 8 12 12 16 14"></polyline>
           </svg>`
        : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="toast-icon toast-error-icon">
             <circle cx="12" cy="12" r="10"></circle>
             <line x1="15" y1="9" x2="9" y2="15"></line>
             <line x1="9" y1="9" x2="15" y2="15"></line>
           </svg>`;

    toast.innerHTML = `
        ${iconSVG}
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Auto-remove after animation finishes
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 2800);
}
