// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.warn('Service Worker registration failed:', err);
        });
    });
}

// DOM Elements
const rawInput = document.getElementById('raw-input');
const latOutput = document.getElementById('lat-output');
const lngOutput = document.getElementById('lng-output');
const btnCopyLat = document.getElementById('btn-copy-lat');
const btnCopyLng = document.getElementById('btn-copy-lng');
const btnCopyBoth = document.getElementById('btn-copy-both');
const btnLocate = document.getElementById('btn-locate');
const btnAirspace = document.getElementById('btn-airspace');
const btnAirspaceConfig = document.getElementById('btn-airspace-config');
const btnMapMode = document.getElementById('btn-map-mode');
const mapModeIcon = document.getElementById('map-mode-icon');
const mapModeText = document.getElementById('map-mode-text');
const btnOfflineManager = document.getElementById('btn-offline-manager');
const modalOfflineMaps = document.getElementById('modal-offline-maps');
const btnCloseOfflineModal = document.getElementById('btn-close-offline-modal');
const btnCloseOfflineModalBtn = document.getElementById('btn-close-offline-modal-btn');
const btnDlBrazil = document.getElementById('btn-dl-brazil');
const selectUF = document.getElementById('select-uf');
const btnDlUF = document.getElementById('btn-dl-uf');
const btnPickFile = document.getElementById('btn-pick-file');
const fileInputGeojson = document.getElementById('file-input-geojson');
const savedMapsList = document.getElementById('saved-maps-list');
const offlineIndicator = document.getElementById('offline-indicator');
const modalAirspace = document.getElementById('modal-airspace');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnApplyModal = document.getElementById('btn-apply-modal');
const btnSelectAllLayers = document.getElementById('btn-select-all-layers');
const btnUnselectAllLayers = document.getElementById('btn-unselect-all-layers');
const airspaceLegend = document.getElementById('airspace-legend');
const layerCheckboxes = document.querySelectorAll('.layer-options input[type="checkbox"]');
const btnClear = document.getElementById('btn-clear');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const toastContainer = document.getElementById('toast-container');

// Map variables
let map;
let marker;
let currentTileLayer;
let deceaAirspaceLayer;
let isAirspaceActive = false;
let vectorLayer = null;
let currentVectorGeoJSON = null;
let currentMapMode = localStorage.getItem('geoloc_map_mode') || 'online'; // 'online' | 'offline'
let activeMapId = localStorage.getItem('geoloc_active_map_id') || 'brazil_base';

// IBGE State codes mapping
const IBGE_UF_CODES = {
    AC: 12, AL: 27, AP: 16, AM: 13, BA: 29, CE: 23, DF: 53, ES: 32, GO: 52,
    MA: 21, MT: 51, MS: 50, MG: 31, PA: 15, PB: 25, PR: 41, PE: 26, PI: 22,
    RJ: 33, RN: 24, RS: 43, RO: 11, RR: 14, SC: 42, SP: 35, SE: 28, TO: 17
};

// IndexedDB Helper for Offline Maps
const DB_NAME = 'geoloc_maps_db';
const DB_VERSION = 1;
const STORE_NAME = 'maps';

function openMapDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveMapToDB(id, name, type, geojson) {
    const db = await openMapDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ id, name, type, geojson, date: new Date().toISOString() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getMapFromDB(id) {
    const db = await openMapDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function getAllMapsFromDB() {
    const db = await openMapDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

async function deleteMapFromDB(id) {
    const db = await openMapDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    loadLayerPreferences();
    initMap();
    initAirspaceLayer();
    await initOfflineMaps();
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
    if (vectorLayer) {
        vectorLayer.setStyle(getVectorStyle());
    }
}

// Initialize Leaflet Map
function initMap() {
    const defaultLat = -15.793889;
    const defaultLng = -47.882778;
    const defaultZoom = 4;

    map = L.map('map', {
        zoomControl: true,
        tap: true
    }).setView([defaultLat, defaultLng], defaultZoom);

    // Standard OpenStreetMap tiles
    currentTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    });

    if (currentMapMode === 'online') {
        currentTileLayer.addTo(map);
    }

    tryGeolocation(true);
}

// Vector Layer Styling
function getVectorStyle() {
    const isLight = document.body.classList.contains('light-theme');
    return {
        fillColor: isLight ? '#0891b2' : '#06b6d4',
        weight: 1.5,
        opacity: 0.85,
        color: isLight ? '#0e7490' : '#22d3ee',
        fillOpacity: isLight ? 0.08 : 0.12,
        className: 'vector-state-polygon'
    };
}

// Render GeoJSON Vector Layer on Leaflet
function renderVectorLayer(geojsonData) {
    if (vectorLayer) {
        map.removeLayer(vectorLayer);
        vectorLayer = null;
    }
    if (!geojsonData) return;

    currentVectorGeoJSON = geojsonData;
    vectorLayer = L.geoJSON(geojsonData, {
        style: getVectorStyle,
        onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            const name = props.nome || props.name || props.NM_ESTADO || props.NM_MUN || props.CD_UF || props.id || 'Região';
            layer.bindTooltip(name, { sticky: true });
            layer.on('click', (e) => {
                handleMapClick(e);
            });
        }
    });

    if (currentMapMode === 'offline') {
        vectorLayer.addTo(map);
    }
}

// Load Active Vector Map from IndexedDB or local file
async function loadActiveVectorMap(targetMapId = null) {
    const mapIdToLoad = targetMapId || activeMapId;
    let mapData = await getMapFromDB(mapIdToLoad);

    if (!mapData) {
        // Fallback: try to fetch built-in brazil_base.json
        try {
            const resp = await fetch('./data/brazil_base.json');
            if (resp.ok) {
                const baseGeo = await resp.json();
                await saveMapToDB('brazil_base', '🇧🇷 Brasil Geral (Estados)', 'ibge_base', baseGeo);
                mapData = { id: 'brazil_base', geojson: baseGeo };
            }
        } catch (e) {
            console.warn('Could not load default brazil_base.json:', e);
        }
    }

    if (mapData && mapData.geojson) {
        activeMapId = mapData.id;
        localStorage.setItem('geoloc_active_map_id', activeMapId);
        renderVectorLayer(mapData.geojson);
        renderSavedMapsList();
    }
}

// Initialize Offline Maps Subsystem
async function initOfflineMaps() {
    await loadActiveVectorMap();
    setMapMode(currentMapMode, false);
}

// Map Mode Switcher (Online OSM <-> Offline Vector)
function setMapMode(mode, showNotification = true) {
    currentMapMode = mode;
    localStorage.setItem('geoloc_map_mode', mode);

    if (mode === 'offline') {
        if (currentTileLayer && map.hasLayer(currentTileLayer)) {
            map.removeLayer(currentTileLayer);
        }
        if (vectorLayer && !map.hasLayer(vectorLayer)) {
            vectorLayer.addTo(map);
        } else if (!vectorLayer) {
            loadActiveVectorMap();
        }
        if (btnMapMode) btnMapMode.classList.add('active');
        if (mapModeIcon) mapModeIcon.textContent = '📐';
        if (mapModeText) mapModeText.textContent = 'Vetorial';
        if (offlineIndicator) offlineIndicator.style.display = 'flex';
        if (showNotification) showToast('Modo Vetorial Offline ativado');
    } else {
        if (vectorLayer && map.hasLayer(vectorLayer)) {
            map.removeLayer(vectorLayer);
        }
        if (currentTileLayer && !map.hasLayer(currentTileLayer)) {
            currentTileLayer.addTo(map);
        }
        if (btnMapMode) btnMapMode.classList.remove('active');
        if (mapModeIcon) mapModeIcon.textContent = '🌐';
        if (mapModeText) mapModeText.textContent = 'Online';
        if (offlineIndicator) offlineIndicator.style.display = 'none';
        if (showNotification) showToast('Modo Online (OpenStreetMap) ativado');
    }
}

function toggleMapMode() {
    setMapMode(currentMapMode === 'online' ? 'offline' : 'online');
}

// Download Brazil Base Mesh from IBGE API
async function downloadBrazilBase() {
    btnDlBrazil.disabled = true;
    btnDlBrazil.textContent = 'Baixando... ⏳';
    try {
        const url = 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/json&qualidade=minima&intrarregiao=UF';
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Falha ao baixar dados do IBGE');
        const geojson = await resp.json();
        await saveMapToDB('brazil_base', '🇧🇷 Brasil Geral (Estados)', 'ibge_base', geojson);
        await loadActiveVectorMap('brazil_base');
        showToast('Mapa do Brasil salvo para uso offline!');
    } catch (e) {
        console.error(e);
        showToast('Erro ao baixar mapa do Brasil.', 'error');
    } finally {
        btnDlBrazil.disabled = false;
        btnDlBrazil.textContent = '🇧🇷 Baixar Mapa do Brasil (30 KB)';
    }
}

// Download State Municipalities from IBGE API
async function downloadStateMesh() {
    const uf = selectUF.value;
    if (!uf) return;

    const ufCode = IBGE_UF_CODES[uf];
    if (!ufCode) return;

    btnDlUF.disabled = true;
    btnDlUF.textContent = 'Baixando... ⏳';

    try {
        const url = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${ufCode}?formato=application/json&qualidade=minima&intrarregiao=municipio`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Falha ao baixar municípios de ${uf}`);
        const geojson = await resp.json();
        const mapId = `uf_${uf.toLowerCase()}`;
        const mapName = `📍 Municípios - ${uf}`;
        await saveMapToDB(mapId, mapName, 'ibge_uf', geojson);
        await loadActiveVectorMap(mapId);
        showToast(`Municípios de ${uf} baixados e ativados!`);
    } catch (e) {
        console.error(e);
        showToast(`Erro ao baixar municípios de ${uf}.`, 'error');
    } finally {
        btnDlUF.disabled = false;
        btnDlUF.textContent = 'Baixar Municípios';
    }
}

// Pick custom GeoJSON from local device storage
function handleCustomFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const geojson = JSON.parse(e.target.result);
            if (!geojson || (!geojson.type && !geojson.features)) {
                throw new Error('Arquivo não possui formato GeoJSON válido.');
            }
            const mapId = `custom_${Date.now()}`;
            const mapName = `📁 ${file.name}`;
            await saveMapToDB(mapId, mapName, 'custom', geojson);
            await loadActiveVectorMap(mapId);
            showToast(`Mapa "${file.name}" carregado com sucesso!`);
        } catch (err) {
            console.error(err);
            showToast('Erro ao ler arquivo GeoJSON.', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Render Saved Maps List in Offline Modal
async function renderSavedMapsList() {
    if (!savedMapsList) return;
    const maps = await getAllMapsFromDB();

    if (maps.length === 0) {
        savedMapsList.innerHTML = '<div class="empty-maps-msg">Nenhum mapa salvo adicional. O mapa base do Brasil está disponível.</div>';
        return;
    }

    savedMapsList.innerHTML = '';
    maps.forEach(m => {
        const item = document.createElement('div');
        const isActive = (m.id === activeMapId);
        item.className = `saved-map-item ${isActive ? 'active-map' : ''}`;

        const sizeKb = Math.round(JSON.stringify(m.geojson).length / 1024);

        item.innerHTML = `
            <div class="map-item-info">
                <span class="map-item-name">${m.name} ${isActive ? '<span style="color:var(--accent-color);font-size:0.75rem;">(Ativo)</span>' : ''}</span>
                <span class="map-item-meta">${sizeKb} KB • ${new Date(m.date).toLocaleDateString()}</span>
            </div>
            <div class="map-item-actions">
                ${!isActive ? `<button class="btn-map-use" data-id="${m.id}">Usar</button>` : ''}
                ${m.id !== 'brazil_base' ? `<button class="btn-map-delete" data-id="${m.id}">🗑️</button>` : ''}
            </div>
        `;

        const useBtn = item.querySelector('.btn-map-use');
        if (useBtn) {
            useBtn.addEventListener('click', async () => {
                await loadActiveVectorMap(m.id);
                showToast(`Mapa "${m.name}" ativado`);
            });
        }

        const delBtn = item.querySelector('.btn-map-delete');
        if (delBtn) {
            delBtn.addEventListener('click', async () => {
                await deleteMapFromDB(m.id);
                if (activeMapId === m.id) {
                    await loadActiveVectorMap('brazil_base');
                }
                renderSavedMapsList();
                showToast(`Mapa excluído`);
            });
        }

        savedMapsList.appendChild(item);
    });
}

// DECEA Airspace Management
function getActiveLayersList() {
    const activeLayers = [];
    layerCheckboxes.forEach(cb => {
        if (cb.checked && cb.dataset.layer) {
            activeLayers.push(cb.dataset.layer);
        }
    });
    return activeLayers.join(',');
}

function initAirspaceLayer() {
    const layersParam = getActiveLayersList() || 'ICA:eac_r,ICA:eac_p,ICA:eac_d';
    deceaAirspaceLayer = L.tileLayer.wms('https://geoaisweb.decea.mil.br/geoserver/wms', {
        layers: layersParam,
        format: 'image/png',
        transparent: true,
        opacity: 0.70,
        version: '1.1.1',
        maxZoom: 19,
        attribution: '&copy; <a href="https://geoaisweb.decea.mil.br/" target="_blank">DECEA/GeoAISWEB</a>'
    });
}

function updateAirspaceLayer() {
    const activeLayers = getActiveLayersList();
    if (deceaAirspaceLayer) {
        if (activeLayers) {
            deceaAirspaceLayer.setParams({ layers: activeLayers });
            if (isAirspaceActive && !map.hasLayer(deceaAirspaceLayer)) {
                map.addLayer(deceaAirspaceLayer);
            }
        } else {
            if (map.hasLayer(deceaAirspaceLayer)) {
                map.removeLayer(deceaAirspaceLayer);
            }
        }
    }
}

function toggleAirspace() {
    isAirspaceActive = !isAirspaceActive;

    if (isAirspaceActive) {
        const activeLayers = getActiveLayersList();
        if (!activeLayers) {
            showToast('Nenhuma camada selecionada na configuração.', 'error');
            isAirspaceActive = false;
            return;
        }
        if (!deceaAirspaceLayer) {
            initAirspaceLayer();
        } else {
            deceaAirspaceLayer.setParams({ layers: activeLayers });
        }
        map.addLayer(deceaAirspaceLayer);
        btnAirspace.classList.add('active');
        if (airspaceLegend) airspaceLegend.style.display = 'flex';
        showToast('Zonas de Restrição DECEA ativadas');
    } else {
        if (deceaAirspaceLayer && map.hasLayer(deceaAirspaceLayer)) {
            map.removeLayer(deceaAirspaceLayer);
        }
        btnAirspace.classList.remove('active');
        if (airspaceLegend) airspaceLegend.style.display = 'none';
        showToast('Zonas de Restrição DECEA desativadas');
    }
}

function saveLayerPreferences() {
    const prefs = {};
    layerCheckboxes.forEach(cb => {
        prefs[cb.id] = cb.checked;
    });
    localStorage.setItem('geoloc_decea_layers', JSON.stringify(prefs));
}

function loadLayerPreferences() {
    try {
        const saved = localStorage.getItem('geoloc_decea_layers');
        if (saved) {
            const prefs = JSON.parse(saved);
            layerCheckboxes.forEach(cb => {
                if (prefs[cb.id] !== undefined) {
                    cb.checked = prefs[cb.id];
                }
            });
        }
    } catch (e) {
        console.warn('Could not load layer preferences:', e);
    }
}

// Modal Handlers
function openModal() {
    if (modalAirspace) modalAirspace.style.display = 'flex';
}

function closeModal() {
    if (modalAirspace) modalAirspace.style.display = 'none';
    saveLayerPreferences();
    updateAirspaceLayer();
}

function openOfflineModal() {
    renderSavedMapsList();
    if (modalOfflineMaps) modalOfflineMaps.style.display = 'flex';
}

function closeOfflineModal() {
    if (modalOfflineMaps) modalOfflineMaps.style.display = 'none';
}

// Setup Event Listeners
function setupEventListeners() {
    rawInput.addEventListener('input', handleInputChange);
    rawInput.addEventListener('paste', () => setTimeout(handleInputChange, 10));

    map.on('click', handleMapClick);

    btnLocate.addEventListener('click', () => tryGeolocation(false));

    if (btnAirspace) btnAirspace.addEventListener('click', toggleAirspace);
    if (btnAirspaceConfig) btnAirspaceConfig.addEventListener('click', openModal);
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnApplyModal) btnApplyModal.addEventListener('click', closeModal);
    if (modalAirspace) {
        modalAirspace.addEventListener('click', (e) => {
            if (e.target === modalAirspace) closeModal();
        });
    }

    if (btnSelectAllLayers) {
        btnSelectAllLayers.addEventListener('click', () => {
            layerCheckboxes.forEach(cb => cb.checked = true);
        });
    }
    if (btnUnselectAllLayers) {
        btnUnselectAllLayers.addEventListener('click', () => {
            layerCheckboxes.forEach(cb => cb.checked = false);
        });
    }

    // Offline Map controls
    if (btnMapMode) btnMapMode.addEventListener('click', toggleMapMode);
    if (btnOfflineManager) btnOfflineManager.addEventListener('click', openOfflineModal);
    if (btnCloseOfflineModal) btnCloseOfflineModal.addEventListener('click', closeOfflineModal);
    if (btnCloseOfflineModalBtn) btnCloseOfflineModalBtn.addEventListener('click', closeOfflineModal);
    if (modalOfflineMaps) {
        modalOfflineMaps.addEventListener('click', (e) => {
            if (e.target === modalOfflineMaps) closeOfflineModal();
        });
    }

    if (btnDlBrazil) btnDlBrazil.addEventListener('click', downloadBrazilBase);
    if (selectUF) {
        selectUF.addEventListener('change', () => {
            btnDlUF.disabled = !selectUF.value;
        });
    }
    if (btnDlUF) btnDlUF.addEventListener('click', downloadStateMesh);

    if (btnPickFile) btnPickFile.addEventListener('click', () => fileInputGeojson.click());
    if (fileInputGeojson) fileInputGeojson.addEventListener('change', handleCustomFileUpload);

    // Auto-detect offline status
    window.addEventListener('offline', () => {
        showToast('Sem conexão de internet. Alternando para mapa vetorial...', 'error');
        setMapMode('offline');
    });

    window.addEventListener('online', () => {
        showToast('Conexão de internet restabelecida.');
    });

    btnThemeToggle.addEventListener('click', toggleTheme);
    btnClear.addEventListener('click', clearAll);

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
        clearOutputs();
    }
}

// Handle Map Clicks
function handleMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
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

// Parse Coordinates
function parseCoordinates(inputStr) {
    const cleanStr = inputStr
        .replace(/[()\[\]{}]/g, ' ')
        .replace(/;/g, ' ')
        .trim();
        
    const regexDecimal = /-?\d+\.\d+/g;
    let matches = cleanStr.match(regexDecimal);
    
    if (matches && matches.length >= 2) {
        return { lat: matches[0], lng: matches[1] };
    }
    
    const parsedWithCommaDecimals = cleanStr.replace(/,/g, '.');
    matches = parsedWithCommaDecimals.match(regexDecimal);
    
    if (matches && matches.length >= 2) {
        return { lat: matches[0], lng: matches[1] };
    }

    return null;
}

// Update Output Fields
function updateOutputs(latStr, lngStr) {
    const formattedLat = latStr.replace('.', ',');
    const formattedLng = lngStr.replace('.', ',');

    latOutput.value = formattedLat;
    lngOutput.value = formattedLng;

    btnCopyLat.disabled = false;
    btnCopyLng.disabled = false;
    btnCopyBoth.disabled = false;
}

// Clear Outputs
function clearOutputs() {
    latOutput.value = '';
    lngOutput.value = '';
    btnCopyLat.disabled = true;
    btnCopyLng.disabled = true;
    btnCopyBoth.disabled = true;
}

// Clear All
function clearAll() {
    rawInput.value = '';
    clearOutputs();
    btnClear.style.display = 'none';
    
    if (marker) {
        map.removeLayer(marker);
        marker = null;
    }
}

// Update Map Marker
function updateMapMarker(lat, lng, shouldPan = true, zoomLevel = null) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) return;

    if (marker) {
        marker.setLatLng([latNum, lngNum]);
    } else {
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
            const currentZoom = map.getZoom();
            map.setView([latNum, lngNum], Math.max(currentZoom, 12));
        }
    }
}

// Clipboard Helper
function copyToClipboard(text, triggerButton, successMessage) {
    if (!text) return;

    navigator.clipboard.writeText(text).then(
        () => {
            triggerButton.classList.add('copied');
            const originalHTML = triggerButton.innerHTML;
            
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

// Toast Notifications Helper
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

    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 2800);
}
