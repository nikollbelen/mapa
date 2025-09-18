import { cesiumAccessToken, targetLocation, url } from "./cesiumConfig.js";
import { trees } from "./coordinates.js";
import { createModel } from "./CesiumFun.js";

function reiniciarMenu() {
  document.getElementById('fotos').classList.remove('active');
  document.getElementById('areas').classList.remove('active');
  document.getElementById('lotes').classList.remove('active');
  document.getElementById('entorno').classList.remove('active');

  // Cerrar todos los modales
  document.getElementById('commonAreasModalOverlay').style.display = 'none';
  document.getElementById('locationModalOverlay').style.display = 'none';
  
  // Cerrar modal de búsqueda de lotes si está abierto
  const lotSearchModal = document.getElementById('lotSearchModalOverlay');
  if (lotSearchModal) {
    lotSearchModal.style.display = 'none';
  }
  
  // Cerrar modal de lote si está abierto
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.style.display = 'none';
  }
  
  // Limpiar estado del lote seleccionado usando la función global
  if (window.cesiumClearSelection) {
    window.cesiumClearSelection();
  }
  
  // Cerrar modal usando la función global
  if (window.cesiumOnModalClosed) {
    window.cesiumOnModalClosed();
  }
  
  // Ocultar botones del entorno
  if (window.hideEntornoButtons) {
    window.hideEntornoButtons();
  }
  
  // Limpiar TODOS los marcadores cuando se cambia de modo
  const allEntitiesToRemove = viewer.entities.values.filter(entity =>
    entity.id && (
      entity.id.startsWith("area_comun_") ||
      entity.id.startsWith("foto_") ||
      entity.id.startsWith("entorno_") ||
      entity.id === "marcador_1" ||
      entity.id === "marcador_2"
    )
  );
  allEntitiesToRemove.forEach(entity => viewer.entities.remove(entity));
  
  // Limpiar ruta anterior si existe
  if (window.currentRoute) {
    viewer.entities.remove(window.currentRoute);
    window.currentRoute = null;
  }
  
  // Limpiar hover de fotos 360°
  if (highlightedFoto && highlightedFotoOriginalScale !== null) {
    highlightedFoto.billboard.scale = highlightedFotoOriginalScale;
  }
  highlightedFoto = null;
  highlightedFotoOriginalScale = null;
  
  // Limpiar hover del entorno
  if (highlightedEntorno && highlightedEntornoOriginalScale !== null) {
    highlightedEntorno.billboard.scale = highlightedEntornoOriginalScale;
  }
  highlightedEntorno = null;
  highlightedEntornoOriginalScale = null;
  
  viewer.scene.canvas.style.cursor = "default";
}

// No necesitamos variables globales para los marcadores ya que se manejan a través de viewer.entities// Funciones específicas para cada tipo de visualización
const handleAreasComunes = async () => {
  reiniciarMenu();
  document.getElementById('areas').classList.add('active');

  // Cerrar todos los otros modales
  if (window.closeAllModalsExcept) {
    window.closeAllModalsExcept('commonAreasModalOverlay');
  }

  // Remover marcadores existentes de áreas comunes
  const entitiesToRemove = viewer.entities.values.filter(entity =>
    entity.id && (entity.id.startsWith("area_comun_") || entity.id.startsWith("foto_") || entity.id === "marcador_1" || entity.id === "marcador_2")
  );
  entitiesToRemove.forEach(entity => viewer.entities.remove(entity));

  let areasComunesData = null;
  
  try {
    // Cargar datos del archivo areas_comunes.geojson
    const response = await fetch('./data/areas_comunes.geojson');
    areasComunesData = await response.json();
    
    if (areasComunesData && areasComunesData.features) {
      const positions = [];
      
      // Crear marcadores para cada feature en el GeoJSON
      areasComunesData.features.forEach(feature => {
        const fid = feature.properties.fid;
        const name = feature.properties.name;
        const image = feature.properties.image;
        const coordinates = feature.geometry.coordinates;
        
        console.log(`Creando marcador área común ${fid}: ${name} en coordenadas:`, coordinates);
        
        // Crear marcador con imagen areas_comunes.svg
        const entity = viewer.entities.add({
          id: `area_comun_${fid}`,
          position: Cesium.Cartesian3.fromDegrees(coordinates[0], coordinates[1]),
          billboard: {
            image: "img/areas_comunes.svg",
            width: 45,
            height: 58,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            color: Cesium.Color.WHITE,
            scale: 1.0,
            show: true,
            scaleByDistance: new Cesium.NearFarScalar(100.0, 1.0, 2000.0, 0.5),
            alignedAxis: Cesium.Cartesian3.ZERO,
            pixelOffset: Cesium.Cartesian2.ZERO,
            eyeOffset: Cesium.Cartesian3.ZERO,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          },
          label: {
            text: name,
            font: 'bold 12pt sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, 10),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 2000.0)
          },
          properties: {
            type: 'area_comun',
            fid: fid,
            name: name,
            image: image,
            coordinates: coordinates
          }
        });
        
        console.log(`Marcador área común creado:`, entity);
        positions.push(Cesium.Cartesian3.fromDegrees(coordinates[0], coordinates[1]));
      });

      // Calcular centro y hacer zoom a las áreas comunes
      if (positions.length > 0) {
        const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
        viewer.camera.flyToBoundingSphere(boundingSphere, {
          duration: 2.0,
          offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), boundingSphere.radius * 2)
        });
      }
    }
  } catch (error) {
    console.error('Error al cargar las áreas comunes:', error);
  }

  // Llenar el modal con los datos del GeoJSON
  if (areasComunesData) {
    populateCommonAreasModal(areasComunesData);
  }

  // Abrir el modal de áreas comunes
  document.getElementById('commonAreasModalOverlay').style.display = 'flex';
};

// Función para llenar el modal de áreas comunes con datos del GeoJSON
function populateCommonAreasModal(areasComunesData) {
  const grid = document.getElementById('commonAreasGrid');
  
  if (!grid || !areasComunesData || !areasComunesData.features) {
    console.error('No se pudo llenar el modal de áreas comunes');
    return;
  }

  // Limpiar el grid
  grid.innerHTML = '';

  // Crear tarjetas para cada área común
  areasComunesData.features.forEach(feature => {
    const fid = feature.properties.fid;
    const name = feature.properties.name;
    const image = feature.properties.image;
    
    console.log(`Creando tarjeta para área común ${fid}: ${name} con imagen: ${image}`);
    
    // Crear la tarjeta
    const card = document.createElement('div');
    card.className = 'common-areas-card';
    card.setAttribute('data-marker', `area_comun_${fid}`);
    
    // Crear el contenido de la tarjeta
    card.innerHTML = `
      <div class="common-areas-card-image" style="background-image: url('${image}');">
      </div>
      <div class="common-areas-card-title">${name}</div>
      <div class="common-areas-card-buttons">
        <button class="common-areas-card-button" style="background-color: #948f8f80;" onclick="openAreasComunesImagesModal('${image}')">
          <span>Ver imágenes</span>
        </button>
        <button class="common-areas-card-button" onclick="flyToAreaComun(${fid})">
          <span>Ver en el mapa</span>
        </button>
      </div>
    `;
    
    // Agregar la tarjeta al grid
    grid.appendChild(card);
  });
}

// Función temporal para detectar movimiento de cámara y mostrar coordenadas/zoom
window.enableCameraDebug = function() {
  console.log("🔍 Modo debug de cámara activado - Mueve la cámara para ver coordenadas y zoom");
  
  // Evento que se dispara cuando la cámara se mueve
  viewer.camera.moveEnd.addEventListener(function() {
    const camera = viewer.camera;
    const position = camera.position;
    const cartographic = Cesium.Cartographic.fromCartesian(position);
    
    // Convertir a grados
    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
    const height = cartographic.height;
    
    // Obtener el zoom (altura de la cámara)
    const zoom = height;
    
    console.log("📍 Posición de la cámara:");
    console.log(`   Longitud: ${longitude.toFixed(6)}°`);
    console.log(`   Latitud: ${latitude.toFixed(6)}°`);
    console.log(`   Altura/Zoom: ${zoom.toFixed(2)} metros`);
    console.log("---");
  });
};

// Función para desactivar el debug de cámara
window.disableCameraDebug = function() {
  console.log("🔍 Modo debug de cámara desactivado");
  viewer.camera.moveEnd.removeEventListener();
};

// Función para volar a un área común específica - disponible globalmente
window.flyToAreaComun = function(fid) {
  const entity = viewer.entities.getById(`area_comun_${fid}`);
  if (entity) {
    console.log(`Volando a área común ${fid}:`, entity);
    
    // Obtener la posición de la entidad
    const position = entity.position.getValue(viewer.clock.currentTime);
    
    if (position) {
      // Crear un bounding sphere pequeño centrado en la posición
      const boundingSphere = new Cesium.BoundingSphere(position, 54);
      
      viewer.camera.flyToBoundingSphere(boundingSphere, {
        duration: 1.5,
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 0)
      });
      console.log(`Zoom automático a área común ${fid} completado`);
    } else {
      console.error(`No se pudo obtener la posición del área común ${fid}`);
    }
  } else {
    console.error(`No se encontró el área común con fid ${fid}`);
  }
};

const handleLotes = () => {
  reiniciarMenu();
  document.getElementById('lotes').classList.add('active');
  
  // Cerrar todos los otros modales
  if (window.closeAllModalsExcept) {
    window.closeAllModalsExcept('lotSearchModalOverlay');
  }
  try {
    // Convertir coordenadas del centro a radianes
    const centerLon = Cesium.Math.toRadians(polygonCenter.longitude);
    const centerLat = Cesium.Math.toRadians(polygonCenter.latitude);

    // Altura para vista superior (ajusta según necesites)
    const viewHeight = 500.0; // metros sobre el terreno

    // Volar a la vista superior del polígono
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromRadians(centerLon, centerLat, viewHeight),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),    // Norte arriba
        pitch: Cesium.Math.toRadians(-93.0),    // Vista completamente vertical (nadir)
        roll: 0.0,                              // Sin rotación
      },
      duration: 2.0, // Duración de la animación en segundos
    });

    console.log(`Volando a vista superior del polígono: ${polygonCenter.longitude}, ${polygonCenter.latitude}`);

  } catch (error) {
    console.error('Error al volar a la vista superior:', error);
  }
  // Abrir el modal de búsqueda de lotes
  if (window.openLotSearchModal) {
    window.openLotSearchModal();
  }
  
  // Remover solo los marcadores del entorno
  const entitiesToRemove = viewer.entities.values.filter(entity =>
    entity.id === "marcador_1" || entity.id === "marcador_2" || (entity.id && entity.id.startsWith("foto_"))
  );
  entitiesToRemove.forEach(entity => viewer.entities.remove(entity));
};

const handleEntorno = async () => {
  reiniciarMenu();
  document.getElementById('entorno').classList.add('active'); 
  
  // Mostrar botones del entorno
  if (window.showEntornoButtons) {
    window.showEntornoButtons();
  }
  
  // Configurar event listeners de los botones del entorno
  setupEntornoButtonsListeners();
  
  // Cerrar todos los otros modales
  if (window.closeAllModalsExcept) {
    window.closeAllModalsExcept('none'); // No hay modal específico para entorno
  }

  // Remover marcadores existentes
  const entitiesToRemove = viewer.entities.values.filter(entity =>
    entity.id && (entity.id.startsWith("entorno_") || entity.id.startsWith("area_comun_") || entity.id.startsWith("foto_"))
  );
  entitiesToRemove.forEach(entity => viewer.entities.remove(entity));

  // Cargar todos los marcadores desde entorno.geojson
  await loadEntornoMarkers();
  
  // Activar botón "Todos" inicialmente
  updateEntornoButtonsState("Todos");
};

// Función para manejar las fotos 360°
const handleFotos = async () => {
  reiniciarMenu();
  document.getElementById('fotos').classList.add('active');
  
  // Cerrar todos los otros modales
  if (window.closeAllModalsExcept) {
    window.closeAllModalsExcept('none');
  }

  // Remover marcadores existentes de fotos
  const entitiesToRemove = viewer.entities.values.filter(entity =>
    entity.id && entity.id.startsWith("foto_")
  );
  entitiesToRemove.forEach(entity => viewer.entities.remove(entity));

  try {
    // Cargar datos del archivo areas.geojson
    const response = await fetch('./data/areas.geojson');
    const areasData = await response.json();
    
    if (areasData && areasData.features) {
      const positions = [];
      
      // Crear marcadores para cada feature en el GeoJSON
      areasData.features.forEach(feature => {
        const fid = feature.properties.fid;
        const coordinates = feature.geometry.coordinates;
        
        console.log(`Creando marcador foto_${fid} en coordenadas:`, coordinates);
        console.log(`Intentando cargar imagen: img/360.svg`);
        
        // Crear marcador con imagen 360.svg
        const entity = viewer.entities.add({
          id: `foto_${fid}`,
          position: Cesium.Cartesian3.fromDegrees(coordinates[0], coordinates[1]),
          billboard: {
            image: "img/360.svg",
            width: 45,
            height: 58,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            color: Cesium.Color.WHITE,
            scale: 1.0,
            show: true,
            scaleByDistance: new Cesium.NearFarScalar(100.0, 1.0, 2000.0, 0.5),
            alignedAxis: Cesium.Cartesian3.ZERO,
            pixelOffset: Cesium.Cartesian2.ZERO,
            eyeOffset: Cesium.Cartesian3.ZERO,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          },
          properties: {
            type: 'foto',
            fid: fid,
            name: feature.properties.name || `Foto ${fid}`,
            coordinates: coordinates,
            kuulaUrl: feature.properties.kuula_url || "https://kuula.co/share/hhSPW?logo=1&info=1&fs=1&vr=0&sd=1&thumbs=1"
          }
        });
        
        console.log(`Marcador creado:`, entity);
        positions.push(Cesium.Cartesian3.fromDegrees(coordinates[0], coordinates[1]));
      });

      // Configurar eventos de hover y click para marcadores de fotos
      setupFotos360Interactions();

      // Calcular centro y hacer zoom a las fotos
      if (positions.length > 0) {
        const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
        
        // Ajustar la vista para mostrar todos los marcadores
        viewer.camera.flyToBoundingSphere(boundingSphere, {
          duration: 1.5,
          offset: new Cesium.HeadingPitchRange(
            0.0,
            Cesium.Math.toRadians(-45),
            boundingSphere.radius * 3.0
          )
        });
      }
    }
  } catch (error) {
    console.error('Error al cargar las fotos 360°:', error);
  }
};

// Variables para manejar el hover de marcadores de fotos 360°
let highlightedFoto = null;
let highlightedFotoOriginalScale = null;

// Variables para manejar el hover de marcadores del entorno
let highlightedEntorno = null;
let highlightedEntornoOriginalScale = null;

// Función para configurar interacciones de hover y click para marcadores de fotos 360°
function setupFotos360Interactions() {
  // Evento de hover para cambiar cursor y escala
  viewer.screenSpaceEventHandler.setInputAction(function onMouseMove(movement) {
    // 1) Intento rápido con drillPick
    const picked = viewer.scene.drillPick(movement.endPosition) || [];
    let entity = picked.map((p) => p.id).find((id) => id && id.id && id.id.startsWith("foto_")) || null;

    // Restaurar hover si nos movimos fuera o a otra entidad
    if (highlightedFoto && highlightedFoto !== entity) {
      // Restaurar escala original
      if (highlightedFotoOriginalScale !== null) {
        highlightedFoto.billboard.scale = highlightedFotoOriginalScale;
      }
      highlightedFoto = null;
      highlightedFotoOriginalScale = null;
      viewer.scene.requestRender();
    }

    if (entity && entity.id && entity.id.startsWith("foto_")) {
      // Aplicar hover si no es el mismo marcador
      if (highlightedFoto !== entity) {
        highlightedFoto = entity;
        // Guardar la escala original
        highlightedFotoOriginalScale = entity.billboard.scale._value || 1.0;
        // Hacer el marcador un poco más grande
        entity.billboard.scale = highlightedFotoOriginalScale * 1.2;
        viewer.scene.requestRender();
      }
      
      // Establecer cursor pointer
      viewer.scene.canvas.style.cursor = "pointer";
      console.log("Cursor cambiado a pointer para foto");
    } else {
      // Si no hay marcador de foto bajo el mouse, volver cursor a default
      viewer.scene.canvas.style.cursor = "default";
      console.log("Cursor cambiado a default - no hay foto");
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // Evento de click para abrir el modal
  viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(click) {
    const pickedObject = viewer.scene.pick(click.position);
    
    console.log("Click detectado, objeto seleccionado:", pickedObject);
    
    if (pickedObject && pickedObject.id) {
      const entity = pickedObject.id;
      const entityId = entity.id;
      
      console.log("ID de la entidad:", entityId);
      
      if (entityId && entityId.startsWith("foto_")) {
        console.log("Es un marcador de foto, abriendo modal...");
        
        // Obtener la URL específica de Kuula del marcador
        const kuulaUrl = entity.properties.kuulaUrl._value;
        console.log("URL de Kuula del marcador:", kuulaUrl);
        
        // Abrir el modal con la URL específica de Kuula
        openFotos360Modal(kuulaUrl);
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}// Configuración de los botones de navegación

const setupNavButtons = () => {
  const navButtons = document.querySelectorAll('.nav-button');
  const entornoButton = document.querySelector('.entorno-button');

  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (window.cleanupAll) {
        window.cleanupAll();
      }
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      entornoButton.classList.remove('active');

      if (button.textContent.trim() === 'Áreas Comunes') {
        handleAreasComunes();
      } else if (button.textContent.trim() === 'Lotes') {
        handleLotes();
      }
    });
  });

  // Agregar evento click al botón de Entorno
  if (entornoButton) {
    entornoButton.addEventListener('click', () => {
      if (window.cleanupAll) {
        window.cleanupAll();
      }
      navButtons.forEach(btn => btn.classList.remove('active'));
      entornoButton.classList.add('active');
      handleEntorno();
    });
  }
};

// Inicializar los botones cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  setupNavButtons();
  document.getElementById('fotos').addEventListener('click', handleFotos);
  document.getElementById('areas').addEventListener('click', handleAreasComunes);
  document.getElementById('lotes').addEventListener('click', handleLotes);
  document.getElementById('entorno').addEventListener('click', handleEntorno);
  loadLocationData(); // Cargar los datos de ubicaciones

  // Agregar manejadores de clic para los elementos del menú de áreas comunes
  const menuItems = document.querySelectorAll('#commonAreasModalOverlay .menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const markerId = item.getAttribute('data-marker');
      if (markerId) {
        focusOnMarker(`area_comun_${markerId}`);
        console.log("Click en el marcador: ", `area_comun_${markerId}`);
      }
    });
  });
});

// Función para enfocar un marcador por su ID
function focusOnMarker(markerId) {
  const entity = viewer.entities.getById(markerId);
  if (entity && entity.position) {
    // Obtener la posición del marcador
    const position = entity.position.getValue(Cesium.JulianDate.now());

    // Crear un bounding sphere alrededor del marcador
    const boundingSphere = new Cesium.BoundingSphere(position, 100);

    // Mover la cámara al marcador con una animación suave
    viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 1.0,
      offset: new Cesium.HeadingPitchRange(
        0.0, // heading (0 = norte)
        Cesium.Math.toRadians(-45), // pitch (ángulo de visión hacia abajo)
        150  // distancia desde el marcador
      )
    });

    // Resaltar el marcador seleccionado
    if (entity.billboard) {
      // Guardar el estilo original si no existe
      if (!entity.originalBillboardScale) {
        entity.originalBillboardScale = entity.billboard.scale.getValue();
      }

      // Animación de resaltado
      entity.billboard.scale = new Cesium.ConstantProperty(entity.originalBillboardScale * 1.5);

      // Restaurar el tamaño original después de un tiempo
      setTimeout(() => {
        if (entity.billboard && entity.originalBillboardScale !== undefined) {
          entity.billboard.scale = new Cesium.ConstantProperty(entity.originalBillboardScale);
        }
      }, 1000);
    }
  }
}

// Your access token can be found at: https://ion.cesium.com/tokens.
// This is the default access token from your ion account
Cesium.Ion.defaultAccessToken = cesiumAccessToken;
const startLonLat = [-71.8968, -17.1000];
const comisariaLonLat = [-71.9050, -17.1022];
const plazaLonLat = [-71.9046, -17.1017];
// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Cesium.Viewer("cesiumContainer", {
  animation: false,
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  infoBox: false,
  sceneModePicker: false,
  selectionIndicator: false,
  timeline: false,
  navigationHelpButton: false,
  fullscreenButton: false,
  // requestRenderMode mejora rendimiento si la escena es estática
  requestRenderMode: true,
});

// Asegurarse de que el terreno esté cargado antes de añadir la línea
// Primero, verifiquemos que Cesium se haya cargado correctamente
console.log('Cesium está cargado:', typeof Cesium !== 'undefined');
const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJlOTVmNWNlOGI4MzQ4MWM5ODY2MmQ5MTIxMGYxY2NmIiwiaCI6Im11cm11cjY0In0=";

// Función para calcular y mostrar la ruta
async function calculateRoute(start, end, tipo = null) {
  try {
    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?` +
      `api_key=${API_KEY}&` +
      `start=${start[0]},${start[1]}&` +
      `end=${end[0]},${end[1]}`
    );

    if (!response.ok) {
      throw new Error(`Error en la petición: ${response.status}`);
    }

    const data = await response.json();
    const coords = data.features[0].geometry.coordinates;
    const positions = [];
    coords.forEach(coord => {
      positions.push(coord[0], coord[1]);
    });

    // Extraer información de tiempo y distancia
    const duration = data.features[0].properties.summary.duration; // en segundos
    const distance = data.features[0].properties.summary.distance; // en metros
    const durationMinutes = Math.round(duration / 60); // convertir a minutos

    console.log(`⏱️ Tiempo estimado: ${durationMinutes} minutos`);
    console.log(`📏 Distancia: ${Math.round(distance)} metros`);

    // Eliminar ruta anterior si existe
    if (window.currentRoute) {
      viewer.entities.remove(window.currentRoute);
    }
    
    // Seleccionar color según el tipo
    const colorMap = {
      'Playas': new Cesium.Color(251/255, 224/255, 73/255, 1.0),      // Amarillo
      'Restaurantes': new Cesium.Color(29/255, 183/255, 121/255, 1.0), // Verde
      'Hoteles': new Cesium.Color(251/255, 195/255, 145/255, 1.0),     // Naranja claro
      'Turismo': new Cesium.Color(251/255, 73/255, 73/255, 1.0),       // Rojo
      'Seguridad': new Cesium.Color(73/255, 156/255, 251/255, 1.0)     // Azul
    };
    
    const routeColor = tipo && colorMap[tipo] ? colorMap[tipo] : new Cesium.Color(0.1, 0.1, 0.1, 1.0);
    
    const boundingSphere = Cesium.BoundingSphere.fromPoints(Cesium.Cartesian3.fromDegreesArray(positions));
    // Crear la nueva ruta
    window.currentRoute = viewer.entities.add({
      name: 'Ruta',
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(positions),
        width: 15, // Aumentado el grosor de la línea
        material: routeColor,
        clampToGround: true,
        shadows: Cesium.ShadowMode.DISABLED
      }
    });


    // Movemos la cámara para encuadrar todo
    viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 2, // segundos de animación
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(0), // orientación horizontal
        Cesium.Math.toRadians(-30), // inclinación hacia abajo
        boundingSphere.radius * 2.5 // distancia para que quepa toda la ruta
      )
    });
    
    // Retornar información de la ruta
    return {
      success: true,
      duration: durationMinutes,
      distance: Math.round(distance)
    };
  } catch (error) {
    console.error('Error al calcular la ruta:', error);
    return false;
  }
}

// Función simplificada para crear ruta desde un punto hacia el Pórtico de ingreso
async function createRouteToDestination(startCoordinates) {
  try {
    console.log('🚗 Calculando ruta desde:', startCoordinates, 'hacia el Pórtico de ingreso');
    
    // Usar el Pórtico de ingreso como punto de destino fijo
    const endPoint = startLonLat; // [-71.8968, -17.1000] - Pórtico de ingreso
    
    // Calcular la ruta usando la función existente
    const result = await calculateRoute(startCoordinates, endPoint);
    
    if (result && result.success) {
      console.log('✅ Ruta calculada y mostrada exitosamente');
      console.log(`⏱️ Tiempo: ${result.duration} minutos`);
      console.log(`📏 Distancia: ${result.distance} metros`);
      return result;
    } else {
      console.error('❌ Error al calcular la ruta');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en createRouteToDestination:', error);
    return false;
  }
}

// Hacer la función global para uso externo
window.createRouteToDestination = createRouteToDestination;

// Función para filtrar marcadores del entorno por tipo
async function filterEntornoByType(tipo) {
  // Cerrar modal de ubicación si está abierto
  const locationModal = document.getElementById('locationModalOverlay');
  if (locationModal) {
    locationModal.style.display = 'none';
  }
  
  // Limpiar ruta anterior si existe
  if (window.currentRoute) {
    viewer.entities.remove(window.currentRoute);
    window.currentRoute = null;
  }
  
  // Limpiar hover del entorno
  if (highlightedEntorno && highlightedEntornoOriginalScale !== null) {
    highlightedEntorno.billboard.scale = highlightedEntornoOriginalScale;
  }
  highlightedEntorno = null;
  highlightedEntornoOriginalScale = null;
  
  // Remover marcadores del entorno existentes
  const entitiesToRemove = viewer.entities.values.filter(entity =>
    entity.id && entity.id.startsWith("entorno_")
  );
  entitiesToRemove.forEach(entity => viewer.entities.remove(entity));
  
  // Si es "Todos", cargar sin filtro, sino filtrar por tipo
  const filterType = tipo === "Todos" ? null : tipo;
  await loadEntornoMarkers(filterType);
  
  // Actualizar estado visual de los botones
  updateEntornoButtonsState(tipo);
}

// Función para actualizar el estado visual de los botones del entorno
function updateEntornoButtonsState(activeType) {
  const buttons = document.querySelectorAll('#entornoButtonsContainer .entorno-button');
  
  buttons.forEach(button => {
    const buttonText = button.querySelector('.entorno-button-text').textContent;
    
    if (buttonText === activeType) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

// Función para cargar marcadores del entorno desde entorno.geojson
async function loadEntornoMarkers(filterType = null) {
  try {
    const response = await fetch('./data/entorno.geojson');
    const entornoData = await response.json();
    
    if (entornoData && entornoData.features) {
      const positions = [];
      
      // Filtrar features por tipo si se especifica
      const filteredFeatures = filterType 
        ? entornoData.features.filter(feature => feature.properties.tipo === filterType)
        : entornoData.features;
      
      filteredFeatures.forEach(feature => {
        const fid = feature.properties.fid;
        const tipo = feature.properties.tipo;
        const nombre = feature.properties.nombre;
        const icono = feature.properties.icono;
        const coordinates = feature.geometry.coordinates;

        const entity = viewer.entities.add({
          id: `entorno_${fid}`,
          position: Cesium.Cartesian3.fromDegrees(coordinates[0], coordinates[1]),
          billboard: {
            image: icono,
            height: 80,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            color: Cesium.Color.WHITE,
            scale: 1.0,
            show: true,
            // Forzar visibilidad a cualquier distancia
            scaleByDistance: new Cesium.NearFarScalar(0.0, 1.0, Number.POSITIVE_INFINITY, 1.0),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, Number.POSITIVE_INFINITY),
            alignedAxis: Cesium.Cartesian3.ZERO,
            pixelOffset: Cesium.Cartesian2.ZERO,
            eyeOffset: Cesium.Cartesian3.ZERO,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          },
          properties: {
            type: 'entorno',
            fid: fid,
            tipo: tipo,
            nombre: nombre,
            coordinates: coordinates
          }
        });
        
        positions.push(Cesium.Cartesian3.fromDegrees(coordinates[0], coordinates[1]));
      });
      
      // Configurar interacciones para los marcadores del entorno
      setupEntornoInteractions();
      
      // Ajustar la cámara para mostrar todos los marcadores
      if (positions.length > 0) {
        const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
        viewer.camera.flyToBoundingSphere(boundingSphere, {
          duration: 2.0,
          offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), boundingSphere.radius * 4)
        });
      }
      
    }
  } catch (error) {
    console.error('Error al cargar los marcadores del entorno:', error);
  }
}

// Función para configurar interacciones de los marcadores del entorno
function setupEntornoInteractions() {
  // Evento de hover para cambiar cursor y escala
  viewer.screenSpaceEventHandler.setInputAction(function onMouseMove(movement) {
    // 1) Intento rápido con drillPick
    const picked = viewer.scene.drillPick(movement.endPosition) || [];
    let entity = picked.map((p) => p.id).find((id) => id && id.id && id.id.startsWith("entorno_")) || null;

    // Restaurar hover si nos movimos fuera o a otra entidad
    if (highlightedEntorno && highlightedEntorno !== entity) {
      // Restaurar escala original
      if (highlightedEntornoOriginalScale !== null) {
        highlightedEntorno.billboard.scale = highlightedEntornoOriginalScale;
      }
      highlightedEntorno = null;
      highlightedEntornoOriginalScale = null;
      viewer.scene.requestRender();
    }

    if (entity && entity.id && entity.id.startsWith("entorno_")) {
      // Aplicar hover si no es el mismo marcador
      if (highlightedEntorno !== entity) {
        highlightedEntorno = entity;
        // Guardar la escala original
        highlightedEntornoOriginalScale = entity.billboard.scale._value || 1.0;
        // Hacer el marcador un poco más grande
        entity.billboard.scale = highlightedEntornoOriginalScale * 1.2;
        viewer.scene.requestRender();
      }
      
      // Establecer cursor pointer
      viewer.scene.canvas.style.cursor = "pointer";
    } else {
      // Si no hay marcador del entorno bajo el mouse, volver cursor a default
      viewer.scene.canvas.style.cursor = "default";
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // Evento de click para marcadores del entorno
  viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(movement) {
    const pickedObject = viewer.scene.pick(movement.position);

    // Si no se clicó sobre nada, salir
    if (!Cesium.defined(pickedObject)) return;

    // Verificar si el clic fue sobre un Entity con billboard
    if (pickedObject.id && pickedObject.id.billboard) {
      const locationId = pickedObject.id.id;
      const locationProperties = pickedObject.id.properties;
      
      // Si es un marcador del entorno, mostrar modal
      if (locationId && locationId.startsWith("entorno_")) {
        console.log("Se hizo clic en el marcador del entorno:", locationId);
        const position = locationProperties.coordinates._value;
        const nombre = locationProperties.nombre._value;
        const tipo = locationProperties.tipo._value;
        
        // Mostrar modal con información del lugar
        showLocationModal(nombre, `${tipo} - ${nombre}`, position, tipo);
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// Función para crear la línea
async function createLine() {
  try {
    console.log('Iniciando marcadores...');

    // Eliminar ruta anterior si existe
    if (window.currentRoute) {
      viewer.entities.remove(window.currentRoute);
      window.currentRoute = null;
    }

    // if (!locationData) {
    //   await loadLocationData();
    // }

    // Crear marcadores para cada ubicación en el JSON
    Object.values(locationData.locations).forEach(location => {
      viewer.entities.add({
        id: location.id,
        name: location.name,
        position: Cesium.Cartesian3.fromDegrees(location.coordinates[0], location.coordinates[1]),
        billboard: {
          image: location.imageMarker,
          width: 100,
          height: 100,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: location.name,
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 5000.0)
        },
        properties: {
          type: location.id,
          title: location.title,
          description: location.description,
          position: location.coordinates
        }
      });
    });

    // Escuchar clics
    viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(movement) {
      const pickedObject = viewer.scene.pick(movement.position);

      // Si no se clicó sobre nada, salir
      if (!Cesium.defined(pickedObject)) return;

      // Verificar si el clic fue sobre un Entity con billboard
      if (pickedObject.id && pickedObject.id.billboard) {
        const locationId = pickedObject.id.id;
        const locationProperties = pickedObject.id.properties;
        
        // Si es un marcador del entorno (marcador_1 o marcador_2), mostrar solo el modal
        if (locationId === "marcador_1" || locationId === "marcador_2") {
          console.log("Se hizo clic en el marcador del entorno:", locationId);
          const position = locationProperties.position._value;
          
          // Solo mostrar el modal con información (la ruta se creará al presionar el botón)
          const title = locationProperties.title._value;
          const description = locationProperties.description._value;
          showLocationModal(title, description, position);
        }
        // Si es un marcador de área común, mostrar solo el modal
        else if (locationId.startsWith("area_comun_")) {
          console.log("Se hizo clic en el marcador de área común:", locationId);
          const title = locationProperties.title._value;
          const description = locationProperties.description._value;
          const position = locationProperties.position._value;
          showLocationModal(title, description, position);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    return true;
  } catch (error) {
    console.error('Error al crear la ruta:', error);
    return null;
  }
}

console.log('Terreno cargado correctamente');

// Ocultar créditos de Cesium (solo el globo)
viewer.cesiumWidget.creditContainer.style.display = "none";

// Cargar datos de ubicaciones
let locationData = null;

async function loadLocationData() {
  try {
    const response = await fetch('./data/locations.json');
    locationData = await response.json();
  } catch (error) {
    console.error('Error loading location data:', error);
  }
}

// Cargar los datos cuando se inicia la aplicación
loadLocationData();
function showCommonAreasModal() {
  document.getElementById('commonAreasModalOverlay').style.display = 'flex';
}
// Función para mostrar el modal de ubicación
function showLocationModal(title, description, coordinates, tipo = null) {
  // Eliminar ruta anterior si existe
  if (window.currentRoute) {
    viewer.entities.remove(window.currentRoute);
    window.currentRoute = null;
    console.log('Ruta anterior eliminada');
  }

  const modal = document.getElementById('locationModalOverlay');
  const titleEl = document.getElementById('locationModalTitle');
  const addressEl = document.getElementById('locationModalAddress');
  const timeEl = document.getElementById('locationModalTime');
  const locationModalTimeEstimate = document.getElementById('locationModalTimeEstimate');
  const routeBtn = document.getElementById('calculateRouteBtn');
  locationModalTimeEstimate.style.display = 'none';


  if (modal && titleEl && addressEl && timeEl && routeBtn) {
    titleEl.textContent = title;
    addressEl.textContent = coordinates; // Mostrar coordenadas en lugar de descripción
    timeEl.textContent = ""; // No mostrar tiempo inicialmente

    // Clonar y reemplazar el botón para limpiar listeners anteriores
    const newRouteBtn = routeBtn.cloneNode(true);
    routeBtn.parentNode.replaceChild(newRouteBtn, routeBtn);

    // Agregar evento click al botón de ruta
    newRouteBtn.addEventListener('click', async () => {
      console.log('Calculando ruta hacia:', title);
      timeEl.textContent = "Calculando...";
      
      const result = await calculateRoute(startLonLat, coordinates, tipo);
      
      if (result && result.success) {
  locationModalTimeEstimate.style.display = 'flex';
        timeEl.textContent = `A ${result.duration} min (${Math.round(result.distance/1000)} km)`;
        console.log(`✅ Tiempo actualizado: ${result.duration} min`);
      } else {
        timeEl.textContent = "Error al calcular";
        console.error('❌ Error al calcular la ruta');
      }
      
      // NO cerrar el modal - mantenerlo abierto
    }); 
    modal.style.display = 'flex';
  } else {
    console.error('No se encontraron los elementos del modal. Verifica los IDs en index.html.');
  }
}


// Mejorar picking sobre materiales translúcidos
viewer.scene.pickTranslucentDepth = true;


// Ocultar modal al cargar; se mostrará al hacer click en un polígono (excepto fid=1)
const modalEl = document.getElementById("modalOverlay");
if (modalEl) modalEl.style.display = "none";

// trees.features.forEach((feature) => {
//   createModel(
//     viewer,
//     url.treeGlb,
//     feature.geometry.coordinates[0],
//     feature.geometry.coordinates[1],
//     0
//   );
// });

const disponible = Cesium.Color.fromCssColorString('#22c55e').withAlpha(0.7);

// Load terreno polygon from GeoJSON
Cesium.GeoJsonDataSource.load("./data/terrenos.geojson", {
  clampToGround: true,
  stroke: Cesium.Color.fromCssColorString('#000000'),
  fill: disponible.withAlpha(0.3),
  strokeWidth: 4,
})
  .then((ds) => {
    // Add labels to each terrain polygon
    const entities = ds.entities.values;
    const polygonLabels = [];
    entities.forEach(entity => {
      // Only process if it's a polygon and has a number property
      if (entity.polygon && entity.properties && entity.properties.number) {
        // Get the polygon positions
        const positions = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now()).positions;

        // Calculate the center of the polygon
        const center = Cesium.BoundingSphere.fromPoints(positions).center;

        // Get the number from properties
        const number = entity.properties.number.getValue();

        // Add a label at the center of the polygon
        const labelEntity = viewer.entities.add({
          position: center,
          label: {
            text: entity.properties.manzana && entity.properties.number ? `${entity.properties.manzana}${entity.properties.number}` : '',
            font: '900 9pt Arial, sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.GRAY,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            pixelOffset: new Cesium.Cartesian2(0, 0),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scale: 1.0,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            show: !!number, // Only show label if number exists
            // scaleByDistance: new Cesium.NearFarScalar(
            //   100.0, 2.0,    // 👈 A 100 metros o menos → escala 2x
            //   101.0, 1.0     // 👈 A partir de 101 metros → escala normal (1x)
            // )
          }
        });
        polygonLabels.push(labelEntity);
      }
    });
    const referencePoint = Cesium.Cartesian3.fromDegrees(-71.89764735370906, -17.099287141165803);
    // Rango fijo donde deben mostrarse (ej: hasta 1000 km de altura)
    const MAX_DISTANCE = 550;
    // Crear marcador Mykonos con nueva imagen SVG
    const mykonosMarker = viewer.entities.add({
      id: "mykonos_marker",
      name: "Mykonos",
      position: Cesium.Cartesian3.fromDegrees(-71.89764735370906, -17.099287141165803),
      billboard: {
        image: "img/mikonos_marker.svg",
        width: 150,
        height: 200,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        alignedAxis: Cesium.Cartesian3.ZERO,
        pixelOffset: Cesium.Cartesian2.ZERO,
        eyeOffset: Cesium.Cartesian3.ZERO,
        scaleByDistance: new Cesium.NearFarScalar(100.0, 1.0, 2000.0, 0.5),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        show: true
      },
    });
    // Umbral de distancia
    const NEAR_DISTANCE = 200.0;  // < 100 m → agrandar
    const FAR_DISTANCE = 201.0;

    // Evento que se ejecuta antes de cada frame
    viewer.scene.preRender.addEventListener(function () {
      // Obtenemos la distancia de la cámara al punto de referencia
      const distance = Cesium.Cartesian3.distance(
        viewer.camera.positionWC,
        referencePoint
      );

      // Controlar visibilidad de labels de lotes
      polygonLabels.forEach(entity => {
        const show = distance < MAX_DISTANCE;
        if (entity.label) {
          entity.label.show = show;
          if (distance <= NEAR_DISTANCE) {
            entity.label.scale = 1.5;
          } else if (distance >= FAR_DISTANCE) {
            entity.label.scale = 1.0;
          }
        }
      });

      // Controlar visibilidad del marcador Mykonos
      if (mykonosMarker && mykonosMarker.billboard) {
        // Mostrar Mykonos solo cuando estás lejos (>=550m, misma distancia donde desaparecen los labels)
        mykonosMarker.billboard.show = distance >= MAX_DISTANCE;
      }

      // Controlar visibilidad de todos los marcadores excepto entorno
      const allEntities = viewer.entities.values;
      allEntities.forEach(entity => {
        // Excluir marcadores de entorno y el marcador Mykonos
        if (entity.id && 
            !entity.id.startsWith("marcador_") && 
            !entity.id.startsWith("entorno_") && 
            entity.id !== "mykonos_marker" &&
            entity.billboard) {
          
          // Mostrar marcadores cuando estás a menos de 550m (misma distancia que los labels)
          entity.billboard.show = distance < MAX_DISTANCE;
          
          // También controlar labels si existen
          if (entity.label) {
            entity.label.show = distance < MAX_DISTANCE;
          }
        }
      });
    });
    // Add the data source to the viewer after processing
    viewer.dataSources.add(ds);
    // Estilizar: polígono con fid=1 en gris, el resto en naranja
    try {
      const entities = ds.entities.values.filter((e) => e.polygon);
      entities.forEach((e) => {
        // Leer fid desde las propiedades del GeoJSON
        let fid;
        if (e.properties && e.properties.fid) {
          fid = typeof e.properties.fid.getValue === "function" ? e.properties.fid.getValue() : e.properties.fid;
        }
        const isLargest = fid === 0;
        e.polygon.material = isLargest ? Cesium.Color.GRAY.withAlpha(0) : fid === 3 ? disponible.withAlpha(0) : disponible;
        e.polygon.outline = true;
        e.polygon.outlineColor = isLargest ? Cesium.Color.DARKGRAY.withAlpha(0) : fid === 3 ? disponible.withAlpha(0) : disponible;
        e.polygon.height = 0.1;
        e.polygon.heightReference = Cesium.HeightReference.RELATIVE_TO_GROUND
        // Guardar material base para restaurar correctamente tras hover/selección
        e._baseMaterial = e.polygon.material;
      });
    } catch (err) {
      console.error("Error aplicando estilos a terreno.geojson (por fid):", err);
    }
    // Opcional: ajustar vista a todos los polígonos
    // viewer.zoomTo(ds);

    // Interacción: hover para resaltar y click para abrir modal (excluye fid=1)
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    const getFid = (entity) => {
      if (!entity || !entity.properties) return undefined;
      const p = entity.properties.fid;
      return typeof p?.getValue === "function" ? p.getValue() : p;
    };

    const getNumber = (entity) => {
      if (!entity || !entity.properties) return undefined;
      const number = entity.properties.number;
      return typeof number?.getValue === "function" ? number.getValue() : number;
    };

    const getDireccion = (entity) => {
      if (!entity || !entity.properties) return undefined;
      const props = entity.properties;
      const direccion = props.direccion;
      // Compatibilidad nueva: construir desde manzana/lote si existe
      const manzana = props.manzana;
      const lote = props.lote;
      const valDireccion = typeof direccion?.getValue === "function" ? direccion.getValue() : direccion;
      const valManzana = typeof manzana?.getValue === "function" ? manzana.getValue() : manzana;
      const valLote = typeof lote?.getValue === "function" ? lote.getValue() : lote;
      if (!valDireccion && (valManzana || valLote)) {
        const mz = valManzana ? String(valManzana).trim() : '';
        const lt = valLote ? String(valLote).trim() : '';
        return `Mz. ${mz} - Lote ${lt}`.trim();
      }
      return valDireccion;
    };

    const getArea = (entity) => {
      if (!entity || !entity.properties) return undefined;
      const area = entity.properties.area;
      const raw = typeof area?.getValue === "function" ? area.getValue() : area;
      if (typeof raw === 'string') {
        const match = raw.replace(',', '.').match(/[0-9]+(?:\.[0-9]+)?/);
        return match ? `${parseFloat(match[0]).toFixed(2)} m²` : raw;
      }
      if (typeof raw === 'number') {
        return `${raw.toFixed(2)} m²`;
      }
      return raw;
    };

    const getEstado = (entity) => {
      if (!entity || !entity.properties) return undefined;
      const estado = entity.properties.estado || entity.properties.status;
      return typeof estado?.getValue === "function" ? estado.getValue() : estado;
    };

    const getPrecio = (entity) => {
      if (!entity || !entity.properties) return undefined;
      const precio = entity.properties.precio || entity.properties.price;
      const val = typeof precio?.getValue === "function" ? precio.getValue() : precio;
      if (val == null || val === '') return undefined;
      const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
      return isNaN(num) ? undefined : num;
    };

    // Helpers: obtener posiciones del polígono y prueba punto-en-polígono
    const getPolygonPositionsCartographic = (entity) => {
      const now = Cesium.JulianDate.now();
      const hierarchy = Cesium.Property.getValueOrDefault(entity.polygon.hierarchy, now);
      if (!hierarchy) return [];
      const positions = hierarchy.positions || hierarchy;
      return positions.map((pos) => Cesium.Cartographic.fromCartesian(pos));
    };

    // Ray casting 2D lon/lat (en radianes)
    const pointInPolygon = (pointCarto, polyCartos) => {
      if (!pointCarto || !polyCartos || polyCartos.length < 3) return false;
      const x = pointCarto.longitude; // radianes
      const y = pointCarto.latitude;  // radianes
      let inside = false;
      for (let i = 0, j = polyCartos.length - 1; i < polyCartos.length; j = i++) {
        const xi = polyCartos[i].longitude, yi = polyCartos[i].latitude;
        const xj = polyCartos[j].longitude, yj = polyCartos[j].latitude;
        const intersect = ((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    let highlighted = null;
    let highlightedOriginalMaterial = null;
    let selected = null;
    let selectedOriginalMaterial = null;
    let modalOpen = false;
    let hoverSuppressUntil = 0; // timestamp (ms) para evitar hover inmediato tras cerrar modal

    // Crear una pared alrededor del polígono con fid = 0 (ahora que helpers están definidos)
    try {
      const poly0 = ds.entities.values.find((e) => e.polygon && getFid(e) === 0);
      if (poly0) {
        // Obtener anillo del polígono en cartográfico (rad)
        const ring = getPolygonPositionsCartographic(poly0);
        // Eliminar punto duplicado de cierre si existe
        let cartos = ring.slice();
        if (cartos.length >= 2) {
          const first = cartos[0];
          const last = cartos[cartos.length - 1];
          const almostEqual = (a, b) => Math.abs(a - b) < 1e-10;
          if (almostEqual(first.latitude, last.latitude) && almostEqual(first.longitude, last.longitude)) {
            cartos = cartos.slice(0, -1);
          }
        }

        // Construir posiciones a nivel del suelo y alturas de la pared
        const positions = cartos.map((c) => Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, 0.0));
        const minimumHeights = new Array(positions.length).fill(0.0);
        const wallHeightMeters = 1.0; // Altura de la pared (ajusta aquí a la altura real de tu pared)
        const maximumHeights = new Array(positions.length).fill(wallHeightMeters);

        // Calcular perímetro para ajustar el tileado y mantener cuadrados
        let perimeterMeters = 0.0;
        for (let i = 0; i < cartos.length; i++) {
          const a = cartos[i];
          const b = cartos[(i + 1) % cartos.length];
          const g = new Cesium.EllipsoidGeodesic(a, b);
          perimeterMeters += g.surfaceDistance;
        }
        // Tamaño del tile en metros: igual a la altura de la pared para que 1 tile = altura completa (cuadrado)
        const tileSizeMeters = wallHeightMeters;
        const repeatX = Math.max(1.0, perimeterMeters / Math.max(0.1, tileSizeMeters));
        const repeatY = Math.max(1.0, wallHeightMeters / Math.max(0.1, tileSizeMeters));

        const wallEntity = viewer.entities.add({
          name: "Pared fid=0",
          wall: {
            positions,
            minimumHeights,
            maximumHeights,
            // Textura desde tu archivo local SVG (cuadrado). Se calcula repeat para que quede en tiles cuadrados.
            material: new Cesium.ImageMaterialProperty({
              image: './img/pared.svg',
              repeat: new Cesium.Cartesian2(repeatX, repeatY),
              color: Cesium.Color.WHITE.withAlpha(1.0)
            }),
            outline: true,
            outlineColor: Cesium.Color.BLACK,
          },
        });
        // Log y acercar para asegurar visibilidad
        console.log('Pared creada para fid=0:', wallEntity);
        try { viewer.zoomTo(wallEntity); } catch (_) { /* noop */ }
        // Forzar render en requestRenderMode
        try { viewer.scene.requestRender(); } catch (_) { /* noop */ }
      }
    } catch (e) {
      console.error("No se pudo crear la pared para fid=0:", e);
    }

    // Utilidades de formato y cálculo
    const metersToML = (m) => `${m.toFixed(2)} ML`;
    const sqm = (m2) => `${m2.toFixed(2)} m²`;

    const getCentroidCartesian = (positions) => {
      // promedio simple en cartesiano
      let x = 0, y = 0, z = 0;
      positions.forEach((p) => { x += p.x; y += p.y; z += p.z; });
      const n = positions.length;
      return new Cesium.Cartesian3(x / n, y / n, z / n);
    };

    const computeAreaAndEdges = (entity) => {
      const now = Cesium.JulianDate.now();
      const hierarchy = Cesium.Property.getValueOrDefault(entity.polygon.hierarchy, now);
      const positions = (hierarchy?.positions || hierarchy) ?? [];
      if (!positions || positions.length < 3) {
        return { area: 0, edges: [] };
      }

      // Marco ENU local en el centroide para planarizar
      const centroid = getCentroidCartesian(positions);
      const enuFrame = Cesium.Transforms.eastNorthUpToFixedFrame(centroid);
      const invEnu = Cesium.Matrix4.inverse(enuFrame, new Cesium.Matrix4());

      const pts2D = positions.map((p) => {
        const local = Cesium.Matrix4.multiplyByPoint(invEnu, p, new Cesium.Cartesian3());
        return { x: local.x, y: local.y };
      });

      // Área por fórmula del polígono (shoelace)
      let area2 = 0;
      for (let i = 0, j = pts2D.length - 1; i < pts2D.length; j = i++) {
        area2 += (pts2D[j].x * pts2D[i].y) - (pts2D[i].x * pts2D[j].y);
      }
      const area = Math.abs(area2) * 0.5; // m²

      // Edges por geodésica sobre elipsoide
      const cartos = positions.map((p) => Cesium.Cartographic.fromCartesian(p));
      const edges = [];
      for (let i = 0; i < cartos.length; i++) {
        const a = cartos[i];
        const b = cartos[(i + 1) % cartos.length];
        const geo = new Cesium.EllipsoidGeodesic(a, b);
        edges.push(geo.surfaceDistance);
      }
      return { area, edges };
    };

    const updateModalWithEntity = (entity) => {
      const fid = getFid(entity);
      const number = getNumber(entity);
      const direccion = getDireccion(entity);
      const areaLote = getArea(entity);
      const props = entity.properties || {};

      const lotEl = document.getElementById('modalLot');
      const statusEl = document.getElementById('modalStatus');
      const priceEl = document.getElementById('modalPrice');
      const areaEl = document.getElementById('modalArea');
      const leftEl = document.getElementById('modalLeft');
      const rightEl = document.getElementById('modalRight');
      const frontEl = document.getElementById('modalFront');
      const backEl = document.getElementById('modalBack');

      // Información del lote
      if (lotEl) lotEl.textContent = direccion || 'Lote sin identificar';

      // Status y precio desde propiedades
      const statusVal = getEstado(entity) || 'Disponible';
      const priceNum = getPrecio(entity);
      if (statusEl) {
        statusEl.textContent = statusVal || 'Disponible';
        // Aplicar clase CSS según el estado
        statusEl.className = 'status-badge';
        if (statusVal.toLowerCase() === 'vendido') {
          statusEl.style.backgroundColor = '#ef4444';
        } else if (statusVal.toLowerCase() === 'reservado') {
          statusEl.style.backgroundColor = '#eab308';
        } else {
          statusEl.style.backgroundColor = '#22c55e';
        }
      }
      
      if (priceEl) {
        priceEl.textContent = (typeof priceNum === 'number') ? `$ ${priceNum.toLocaleString()}` : '$ 0';
      }

      // Área
      if (areaEl) areaEl.textContent = areaLote || '0.00 m²';

      // Calcular lados del polígono
      const { area, edges } = computeAreaAndEdges(entity);
      
      // Asignar lados si hay al menos 4
      if (edges.length >= 4) {
        // Ordenar por longitud y asignar los más largos como frente/fondo
        const sortedEdges = edges.map((v, i) => ({ i, v })).sort((a, b) => b.v - a.v);
        const frontLen = sortedEdges[0].v;
        const backLen = sortedEdges[1].v;
        const others = edges.filter((_, k) => k !== sortedEdges[0].i && k !== sortedEdges[1].i);
        const leftLen = others[0] || 0;
        const rightLen = others[1] || 0;

        if (frontEl) frontEl.textContent = metersToML(frontLen);
        if (backEl) backEl.textContent = metersToML(backLen);
        if (leftEl) leftEl.textContent = metersToML(leftLen);
        if (rightEl) rightEl.textContent = metersToML(rightLen);
      } else {
        if (frontEl) frontEl.textContent = '0.00ML';
        if (backEl) backEl.textContent = '0.00ML';
        if (leftEl) leftEl.textContent = '0.00ML';
        if (rightEl) rightEl.textContent = '0.00ML';
      }
    };

    // Hover: resaltar en amarillo (siempre activo)
    handler.setInputAction((movement) => {
      // Evitar hover por una ventana corta después de cerrar el modal
      if (Date.now() < hoverSuppressUntil) {
        if (highlighted && highlighted !== selected) {
          const base = highlighted._baseMaterial || highlightedOriginalMaterial;
          if (base) highlighted.polygon.material = base;
        }
        highlighted = null;
        highlightedOriginalMaterial = null;
        viewer.scene.canvas.style.cursor = "default";
        return;
      }

      // 1) Intento rápido con drillPick
      const picked = viewer.scene.drillPick(movement.endPosition) || [];
      let entity = picked.map((p) => p.id).find((id) => id && id.polygon) || null;

      // 2) Si no hay pick, probar con punto-en-polígono usando posición bajo el mouse
      if (!entity) {
        const cartOnGlobe = viewer.scene.pickPosition(movement.endPosition);
        if (cartOnGlobe) {
          const carto = Cesium.Cartographic.fromCartesian(cartOnGlobe);
          // Buscar el primer polígono (excepto fid=1 y fid=0) cuyo relleno contenga el punto
          const polyEntity = ds.entities.values.find((e) => {
            if (!e.polygon) return false;
            const fid = getFid(e);
            if (fid === 1 || fid === 0) return false;
            const ring = getPolygonPositionsCartographic(e);
            return pointInPolygon(carto, ring);
          });
          if (polyEntity) entity = polyEntity;
        }
      }

      // Restaurar hover si nos movimos fuera o a otra entidad
      if (highlighted && highlighted !== entity) {
        // No tocar si es el seleccionado
        if (highlighted !== selected) {
          const base = highlighted._baseMaterial || highlightedOriginalMaterial;
          if (base) highlighted.polygon.material = base;
        }
        highlighted = null;
        highlightedOriginalMaterial = null;
        // Solo cambiar cursor a default si no estamos en modo fotos
        if (!document.getElementById('fotos').classList.contains('active')) {
          viewer.scene.canvas.style.cursor = "default";
        }
        viewer.scene.requestRender();
      }

      if (entity) {
        const fid = getFid(entity);
        if (fid !== 3 && fid !== undefined) {
          // Solo cambiar cursor a pointer si no estamos en modo fotos
          if (!document.getElementById('fotos').classList.contains('active')) {
            viewer.scene.canvas.style.cursor = "pointer";
          }
          // Evitar resaltar si ya es el seleccionado
          if (highlighted !== entity && entity !== selected) {
            highlighted = entity;
            // Guardar el material base como referencia para restaurar
            highlightedOriginalMaterial = entity._baseMaterial || entity.polygon.material;
            entity.polygon.material = disponible.withAlpha(0.5);
            viewer.scene.requestRender();
          }
        } else {
          // Solo cambiar cursor a default si no estamos en modo fotos
          if (!document.getElementById('fotos').classList.contains('active')) {
            viewer.scene.canvas.style.cursor = "default";
          }
        }
      } else {
        // Solo cambiar cursor a default si no estamos en modo fotos
        if (!document.getElementById('fotos').classList.contains('active')) {
          viewer.scene.canvas.style.cursor = "default";
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Gestión de selección persistente (cuando el modal está abierto)
    const selectEntity = (entity) => {
      if (!entity || entity === selected) return;
      // Restaurar selección previa
      if (selected) {
        const prevBase = selected._baseMaterial || selectedOriginalMaterial;
        if (prevBase) selected.polygon.material = prevBase;
      }
      selected = entity;
      // Usar siempre el material base para restaurar luego
      selectedOriginalMaterial = entity._baseMaterial || entity.polygon.material;
      // Si estaba en hover, limpiar ese estado para no mezclar colores
      if (highlighted === entity) {
        highlighted = null;
        highlightedOriginalMaterial = null;
      }
      // Color de selección persistente (#a6d83b)
      entity.polygon.material = Cesium.Color.fromCssColorString('#a6d83b').withAlpha(0.7);
      viewer.scene.requestRender();
    };

    const clearSelection = () => {
      if (selected) {
        const base = selected._baseMaterial || selectedOriginalMaterial;
        if (base) selected.polygon.material = base;
      }
      selected = null;
      selectedOriginalMaterial = null;
      viewer.scene.requestRender();
    };
    // Exponer utilidades para que las invoque el modal (index.html)
    const onModalClosed = () => {
      modalOpen = false;
      // suprimir hover por un instante para no resaltar inmediatamente el mismo polígono bajo el cursor
      hoverSuppressUntil = Date.now() + 300;
      // limpiar hover y selección al cerrar
      if (highlighted && highlighted !== selected) {
        const base = highlighted._baseMaterial || highlightedOriginalMaterial;
        if (base) highlighted.polygon.material = base;
      }
      highlighted = null;
      highlightedOriginalMaterial = null;
      clearSelection();
      viewer.scene.canvas.style.cursor = "default";
      viewer.scene.requestRender();
    };
    window.cesiumClearSelection = clearSelection;
    window.cesiumOnModalClosed = onModalClosed;

    // Exponer función para ajustar la opacidad de los lotes (disponibles)
    // alpha debe ser un número entre 0 y 1. Ej.: 0 → transparente, 0.7 → visible
    window.setTerrenosAlpha = (alpha) => {
      try {
        const entitiesAll = ds.entities.values.filter((e) => e.polygon);
        entitiesAll.forEach((e) => {
          const fid = getFid(e);
          if (fid === 0) return; // omitir polígono perimetral
          // Mantener transparente el fid=3 según estilo original
          const newMaterial = (fid === 3)
            ? disponible.withAlpha(0)
            : disponible.withAlpha(alpha);
          // Actualizar base material para que hover/restauración funcionen
          e._baseMaterial = newMaterial;
          // No sobrescribir el color de selección activo
          if (selected !== e) {
            e.polygon.material = newMaterial;
          }
        });
        viewer.scene.requestRender?.();
      } catch (err) {
        console.error('No se pudo ajustar la opacidad de lotes:', err);
      }
    };

    handler.setInputAction((click) => {
      const picked = viewer.scene.drillPick(click.position) || [];
      let entity = picked.map((p) => p.id).find((id) => id && id.polygon) || null;

      // Fallback por punto-en-polígono
      if (!entity) {
        const cart = viewer.scene.pickPosition(click.position);
        if (cart) {
          const carto = Cesium.Cartographic.fromCartesian(cart);
          const polyEntity = ds.entities.values.find((e) => {
            if (!e.polygon) return false;
            const fid = getFid(e);
            if (fid === 0) return false;
            const ring = getPolygonPositionsCartographic(e);
            return pointInPolygon(carto, ring);
          });
          if (polyEntity) entity = polyEntity;
        }
      }

      if (!entity) return;
      const fid = getFid(entity);
      if (fid === undefined) return; // excluir
      console.log("fid " + fid);

      // Limpiar todos los modales, marcadores y elementos de sidebar-menu
      reiniciarMenu();

      // Actualizar modal y mostrar
      updateModalWithEntity(entity);
      // Marcar selección activa
      selectEntity(entity);
      modalOpen = true;
      const overlay = document.getElementById('modalOverlay');
      if (overlay) overlay.style.display = 'flex';
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  })
  .catch((err) => console.error("Error cargando terreno.geojson:", err));

// Fly the camera to San Francisco at the given longitude, latitude, and height.
viewer.camera.flyTo(targetLocation);

try {
  const imageryLayer = viewer.imageryLayers.addImageryProvider(
    await Cesium.IonImageryProvider.fromAssetId(3729751),
  );
  
  await viewer.zoomTo(imageryLayer);
} catch (error) {
  console.log(error);
}




// Coordenadas del polígono
const polygonCoordinates = [
  [-71.898877985447115, -17.098770803958921],
  [-71.897965133484803, -17.098126203614402],
  [-71.896422217120715, -17.099625276093949],
  [-71.897406406809651, -17.100330704154146],
  [-71.898878026501848, -17.098770927123116]
];

// Función para calcular el centro del polígono
function calculatePolygonCenter(coordinates) {
  let sumLon = 0;
  let sumLat = 0;
  const numPoints = coordinates.length;

  coordinates.forEach(coord => {
    sumLon += coord[0]; // longitud
    sumLat += coord[1]; // latitud
  });

  return {
    longitude: sumLon / numPoints,
    latitude: sumLat / numPoints
  };
}

// Calcular el centro del polígono
const polygonCenter = calculatePolygonCenter(polygonCoordinates);


// Controles: pan arriba/abajo y zoom in/out mediante botones de la UI
(() => {
  const cam = viewer.camera;
  const scene = viewer.scene;

  const byId = (id) => document.getElementById(id);
  const btnUp = byId('up');
  const btnDown = byId('down');
  const btnZoomIn = byId('zoomIn');
  const btnZoomOut = byId('zoomOut');
  const btnHome = byId('home');
  const btnView3D = byId('view3d');

  // Factor de movimiento basado en la altura actual para que sea proporcional
  const getStep = () => Math.max(5.0, cam.positionCartographic.height * 0.10);
  const getZoomStep = () => Math.max(1.0, cam.positionCartographic.height * 0.15);

  const safeRequestRender = () => {
    try { scene.requestRender(); } catch (e) { /* noop */ }
  };

  if (btnUp) {
    btnUp.addEventListener('click', () => {
      cam.moveUp(getStep());
      safeRequestRender();
    });
  }

  if (btnDown) {
    btnDown.addEventListener('click', () => {
      cam.moveDown(getStep());
      safeRequestRender();
    });
  }

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      cam.zoomIn(getZoomStep());
      safeRequestRender();
    });
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      cam.zoomOut(getZoomStep());
      safeRequestRender();
    });
  }

  // Vista superior (nadir) al presionar Home
  if (btnHome) {
    btnHome.addEventListener('click', () => {
      try {
        // Convertir coordenadas del centro a radianes
        const centerLon = Cesium.Math.toRadians(polygonCenter.longitude);
        const centerLat = Cesium.Math.toRadians(polygonCenter.latitude);

        // Altura para vista superior (ajusta según necesites)
        const viewHeight = 500.0; // metros sobre el terreno

        // Volar a la vista superior del polígono
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromRadians(centerLon, centerLat, viewHeight),
          orientation: {
            heading: Cesium.Math.toRadians(0.0),    // Norte arriba
            pitch: Cesium.Math.toRadians(-93.0),    // Vista completamente vertical (nadir)
            roll: 0.0,                              // Sin rotación
          },
          duration: 2.0, // Duración de la animación en segundos
        });

        console.log(`Volando a vista superior del polígono: ${polygonCenter.longitude}, ${polygonCenter.latitude}`);

      } catch (error) {
        console.error('Error al volar a la vista superior:', error);

        // Fallback alternativo
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            polygonCenter.longitude,
            polygonCenter.latitude,
            1000.0
          ),
          orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-90.0),
            roll: 0.0,
          },
        });
      }
    });
  }

  // Vista oblicua inicial al presionar View 3D
  if (btnView3D) {
    btnView3D.addEventListener('click', () => {
      viewer.camera.flyTo(targetLocation);
    });
  }

  // Botón GRID: toggle de opacidad de lotes
  const btnGrid = byId('grid');
  if (btnGrid) {
    btnGrid.addEventListener('click', () => {
      // Toggle de modo grid
      window.isGridModeActive = !window.isGridModeActive;
      if (window.setTerrenosAlpha) {
        try {
          if (window.isGridModeActive) {
            window.setTerrenosAlpha(0.0);
            btnGrid.classList.add('active');
          } else {
            window.setTerrenosAlpha(0.7);
            btnGrid.classList.remove('active');
          }
        } catch (_) { /* noop */ }
      }
    });
  }
})();

// Función para configurar event listeners de los botones del entorno
function setupEntornoButtonsListeners() {
  const entornoButtons = document.querySelectorAll('#entornoButtonsContainer .entorno-button');
  
  entornoButtons.forEach((button, index) => {
    // Remover listeners anteriores si existen
    button.removeEventListener('click', button._entornoClickHandler);
    
    // Crear nuevo handler
    button._entornoClickHandler = () => {
      const buttonText = button.querySelector('.entorno-button-text').textContent;
      
      // Filtrar marcadores por tipo
      filterEntornoByType(buttonText);
    };
    
    // Agregar el nuevo listener
    button.addEventListener('click', button._entornoClickHandler);
  });
}
