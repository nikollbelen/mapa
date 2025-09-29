import {
  cesiumAccessToken,
  targetLocation,
  openRouteServiceKey,
} from "./Config.js";

// Configuración de Cesium

Cesium.Ion.defaultAccessToken = cesiumAccessToken;
// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Cesium.Viewer("cesium-container", {
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
  requestRenderMode: true,
  pickTranslucentDepth: true,
});

// Configuración de pagina

// Splash Screen
function hideSplashScreen() {
  const splashScreen = document.getElementById("splash-screen");
  splashScreen.classList.add("fade-out");

  setTimeout(() => {
    splashScreen.remove();
  }, 800);
}
window.addEventListener("load", () => {
  setTimeout(hideSplashScreen, 2000);
});

// Instrucciones de navegación
document
  .getElementById("instructions-close-button")
  .addEventListener("click", () => {
    const instructionsOverlay = document.getElementById("instructions-overlay");
    instructionsOverlay.classList.add("fade-out");
    setTimeout(() => {
      instructionsOverlay.remove();
    }, 500);
  });

// Funciones globales

// Variables para manejar el hover
let highlightedMarcador = null;
let highlightedMarcadorOriginalScale = null;

function hoverMarcadores() {
  viewer.screenSpaceEventHandler.setInputAction(function onMouseMove(movement) {
    const picked = viewer.scene.drillPick(movement.endPosition) || [];
    let entity =
      picked
        .map((p) => p.id)
        .find((id) => id && id.id && id.id.startsWith("marcador_")) || null;

    // Restaurar hover si nos movimos fuera o a otra entidad
    if (highlightedMarcador && highlightedMarcador !== entity) {
      // Restaurar escala original
      if (highlightedMarcadorOriginalScale !== null) {
        highlightedMarcador.billboard.scale = highlightedMarcadorOriginalScale;
      }
      highlightedMarcador = null;
      highlightedMarcadorOriginalScale = null;
      viewer.scene.requestRender();
    }

    if (entity && entity.id && entity.id.startsWith("marcador_")) {
      // Aplicar hover si no es el mismo marcador
      if (highlightedMarcador !== entity) {
        highlightedMarcador = entity;
        // Guardar la escala original
        highlightedMarcadorOriginalScale = entity.billboard.scale._value || 1.0;
        // Hacer el marcador un poco más grande
        entity.billboard.scale = highlightedMarcadorOriginalScale * 1.2;
        viewer.scene.requestRender();
      }

      viewer.scene.canvas.style.cursor = "pointer";
    } else {
      viewer.scene.canvas.style.cursor = "default";
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
}

// Limpiar ruta
function clearRoute() {
  if (window.currentRoute) {
    viewer.entities.remove(window.currentRoute);
    window.currentRoute = null;
  }
}

// Calcular centro y hacer zoom
function flyToView(positions) {
  const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
  // Ajustar la vista para mostrar todos los marcadores
  viewer.camera.flyToBoundingSphere(boundingSphere, {
    duration: 1.5,
    offset: new Cesium.HeadingPitchRange(
      0.0,
      Cesium.Math.toRadians(-90),
      boundingSphere.radius * 5.0
    ),
  });
}

// Función para volar a la vista de todos los lotes
function flyToLotesView() {
  if (lotesPositions && lotesPositions.length > 0) {
    flyToView(lotesPositions);
  } else {
    console.warn("No hay posiciones de lotes disponibles para volar");
    // Fallback a coordenadas fijas si no hay posiciones
    const fallbackPositions = [
      Cesium.Cartesian3.fromDegrees(-71.8976, -17.0995),
      Cesium.Cartesian3.fromDegrees(-71.8964, -17.0996),
      Cesium.Cartesian3.fromDegrees(-71.8974, -17.1003),
    ];
    flyToView(fallbackPositions);
  }
}

// Sidebar

// Inicializar los botones cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("fotos").addEventListener("click", handleFotos);
  document
    .getElementById("areas")
    .addEventListener("click", handleAreasComunes);
  document.getElementById("lotes").addEventListener("click", handleLotes);
  document.getElementById("entorno").addEventListener("click", handleEntorno);
  document.getElementById("video").addEventListener("click", handleVideo);
});

// Reiniciar menu

function reiniciarMenu() {
  document.getElementById("fotos").classList.remove("active");
  document.getElementById("areas").classList.remove("active");
  document.getElementById("lotes").classList.remove("active");
  document.getElementById("entorno").classList.remove("active");
  document.getElementById("video").classList.remove("active");

  document.getElementById("modalOverlay").style.display = "none";
  document.getElementById("overlay360").style.display = "none";
  document.getElementById("commonAreasModalOverlay").style.display = "none";
  document.getElementById("lotSearchModalOverlay").style.display = "none";
  document.getElementById("aroundButtonsContainer").style.display = "none";
  document.getElementById("aroundModalOverlay").style.display = "none";

  // Limpiar estado del lote seleccionado usando la función global
  if (window.cesiumClearSelection) {
    window.cesiumClearSelection();
  }

  // Limpiar TODOS los marcadores cuando se cambia de modo
  const allEntitiesToRemove = viewer.entities.values.filter(
    (entity) =>
      entity.id &&
      (entity.id.startsWith("marcador_foto_") ||
        entity.id.startsWith("area_comun_") ||
        entity.id.startsWith("marcador_entorno_"))
  );
  allEntitiesToRemove.forEach((entity) => viewer.entities.remove(entity));

  // Limpiar ruta anterior si existe
  clearRoute();

  flyToLotesView();
}

// Fotos 360°
const handleFotos = async () => {
  reiniciarMenu();
  document.getElementById("fotos").classList.add("active");

  try {
    const response = await fetch("./data/fotos.geojson");
    const fotosData = await response.json();

    if (fotosData && fotosData.features) {
      const positions = [];

      fotosData.features.forEach((feature) => {
        const fid = feature.properties.fid;
        const kuulaUrl = feature.properties.kuula_url;
        const coordinates = feature.geometry.coordinates;

        viewer.entities.add({
          id: `marcador_foto_${fid}`,
          position: Cesium.Cartesian3.fromDegrees(
            coordinates[0],
            coordinates[1]
          ),
          billboard: {
            image: "img/sidebar/360/360.png",
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
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          properties: {
            coordinates: coordinates,
            kuulaUrl: kuulaUrl,
          },
        });

        positions.push(
          Cesium.Cartesian3.fromDegrees(coordinates[0], coordinates[1])
        );
      });

      // Configurar eventos de hover para marcadores
      hoverMarcadores();
      // Configurar click para marcadores
      clickMarcadores360();

      if (positions.length > 0) {
        flyToView(positions);
      }
    }
  } catch (error) {
    console.error("Error al cargar las fotos 360°:", error);
  }
};

function clickMarcadores360() {
  viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(click) {
    const pickedObject = viewer.scene.pick(click.position);

    if (pickedObject && pickedObject.id) {
      const entity = pickedObject.id;
      const entityId = entity.id;

      if (entityId && entityId.startsWith("marcador_foto_")) {
        const kuulaUrl = entity.properties.kuulaUrl._value;
        openOverlay360(kuulaUrl);
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

function openOverlay360(kuulaUrl) {
  const modal = document.getElementById("overlay360");
  const iframe = document.getElementById("overlay360Iframe");

  if (modal && iframe) {
    iframe.src = kuulaUrl;
    modal.style.display = "flex";
    modal.offsetHeight;
    modal.classList.add("show");
  } else {
    console.error("No se encontraron los elementos del modal");
  }
}

document
  .getElementById("overlay-360-close-btn")
  .addEventListener("click", () => {
    const modal = document.getElementById("overlay360");
    const iframe = document.getElementById("overlay360Iframe");

    if (modal && iframe) {
      modal.classList.remove("show");

      setTimeout(() => {
        modal.style.display = "none";
        iframe.src = "";
      }, 400);
    }
  });

// Áreas comunes
const handleAreasComunes = async () => {
  reiniciarMenu();
  document.getElementById("areas").classList.add("active");

  let areasData = null;

  try {
    const response = await fetch("./data/areas.geojson");
    areasData = await response.json();

    if (areasData && areasData.features) {
      const positions = [];

      // Crear marcadores para cada feature en el GeoJSON
      areasData.features.forEach((feature) => {
        const fid = feature.properties.fid;
        const name = feature.properties.name;
        const marker = feature.properties.marker;
        const image = feature.properties.image;
        const coordinates = feature.geometry.coordinates;

        // Crear marcador con imagen areas_comunes.svg
        const entity = viewer.entities.add({
          id: `area_comun_${fid}`,
          position: Cesium.Cartesian3.fromDegrees(
            coordinates[0],
            coordinates[1]
          ),
          billboard: {
            image: marker,
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
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: name,
            font: "bold 12pt sans-serif",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, 10),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
              0.0,
              2000.0
            ),
          },
          properties: {
            fid: fid,
            name: name,
            image: image,
            coordinates: coordinates,
          },
        });

        positions.push(
          Cesium.Cartesian3.fromDegrees(coordinates[0], coordinates[1])
        );
      });

      if (positions.length > 0) {
        flyToView(positions);
      }
    }
  } catch (error) {
    console.error("Error al cargar las áreas comunes:", error);
  }

  if (areasData) {
    populateAreasModal(areasData);
  }

  document.getElementById("commonAreasModalOverlay").style.display = "flex";
};

// Función para llenar el modal de áreas comunes con datos del GeoJSON
function populateAreasModal(areasData) {
  const grid = document.getElementById("commonAreasGrid");

  if (!grid || !areasData || !areasData.features) {
    console.error("No se pudo llenar el modal de áreas comunes");
    return;
  }

  grid.innerHTML = "";

  areasData.features.forEach((feature) => {
    const fid = feature.properties.fid;
    const name = feature.properties.name;
    const image = feature.properties.image;

    const card = document.createElement("div");
    card.className = "common-areas-card";
    card.setAttribute("data-marker", `area_comun_${fid}`);

    card.innerHTML = `
      <div class="common-areas-card-image" style="background-image: url('${image}');">
      </div>
      <div class="common-areas-card-title">${name}</div>
      <div class="common-areas-card-buttons">
        <button class="common-areas-card-button" style="background-color: #948f8f80;" onclick="openAreasComunesImage('${image}')">
          <span>Ver imágenes</span>
        </button>
        <button class="common-areas-card-button" onclick="flyToAreaComun(${fid})">
          <span>Ver en el mapa</span>
        </button>
      </div>
    `;

    grid.appendChild(card);
  });
}

window.openAreasComunesImage = function (imageUrl) {
  const modal = document.getElementById("areasComunesImagesModalOverlay");
  const img = document.getElementById("areasComunesImage");

  if (modal && img) {
    img.src = imageUrl;
    modal.style.display = "flex";
    modal.offsetHeight;
    modal.classList.add("show");
  } else {
    console.error("No se encontraron los elementos del modal de imagen");
  }
};

window.flyToAreaComun = function (fid) {
  const entity = viewer.entities.getById(`area_comun_${fid}`);
  if (entity) {
    const position = entity.position.getValue(viewer.clock.currentTime);

    if (position) {
      const boundingSphere = new Cesium.BoundingSphere(position, 54);

      viewer.camera.flyToBoundingSphere(boundingSphere, {
        duration: 1.5,
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 0),
      });
    } else {
      console.error(`No se pudo obtener la posición del área común ${fid}`);
    }
  } else {
    console.error(`No se encontró el área común con fid ${fid}`);
  }
};

document
  .getElementById("areasComunesImagesCloseBtn")
  .addEventListener("click", () => {
    const modal = document.getElementById("areasComunesImagesModalOverlay");
    const img = document.getElementById("areasComunesImage");

    if (modal && img) {
      // Remover la clase show para iniciar la animación de cierre
      modal.classList.remove("show");

      // Esperar a que termine la animación antes de ocultar
      setTimeout(() => {
        modal.style.display = "none";
        img.src = ""; // Limpiar la imagen
      }, 400); // 400ms para que coincida con la duración de la animación
    }
  });

// Lotes
const handleLotes = () => {
  reiniciarMenu();
  document.getElementById("lotes").classList.add("active");
  flyToLotesView();
  document.getElementById("lotSearchModalOverlay").style.display = "flex";
  loadLotData();
};

async function loadLotData() {
  try {
    if (!processedLots || processedLots.length === 0) {
      console.error(
        "Datos de lotes procesados no están disponibles. Asegúrate de que loadLotesData() se ejecute primero."
      );
      return;
    }

    // Actualizar los sliders de precio con el valor real (solo si es la primera carga)
    const priceMinSlider = document.querySelector('input[name="priceMin"]');
    const priceMaxSlider = document.querySelector('input[name="priceMax"]');
    if (priceMinSlider && priceMaxSlider && maxPrice > 0) {
      priceMinSlider.max = maxPrice;
      priceMaxSlider.max = maxPrice;
      // Solo establecer los valores si no se han tocado los sliders
      if (!priceMinSlider.getAttribute("data-initial-value")) {
        priceMinSlider.value = 0;
        priceMaxSlider.value = maxPrice;
        priceMinSlider.setAttribute("data-initial-value", 0);
        priceMaxSlider.setAttribute("data-initial-value", maxPrice);
      }
      updatePriceLabels();
    }

    // Actualizar los sliders de área con el valor real (solo si es la primera carga)
    const areaMinSlider = document.querySelector('input[name="areaMin"]');
    const areaMaxSlider = document.querySelector('input[name="areaMax"]');
    if (areaMinSlider && areaMaxSlider && maxArea > 0) {
      areaMinSlider.max = Math.ceil(maxArea);
      areaMaxSlider.max = Math.ceil(maxArea);
      // Solo establecer los valores si no se han tocado los sliders
      if (!areaMinSlider.getAttribute("data-initial-value")) {
        areaMinSlider.value = 90;
        areaMaxSlider.value = Math.ceil(maxArea);
        areaMinSlider.setAttribute("data-initial-value", 90);
        areaMaxSlider.setAttribute("data-initial-value", Math.ceil(maxArea));
      }
      updateAreaLabels();
    }
  } catch (e) {
    console.error("No se pudo procesar datos de lotes", e);
  }

  // Aplicar filtros
  const filteredLots = applyFilters(processedLots);

  // Apply sorting
  const sortedLots = applySorting(filteredLots);

  // Update results count
  document.getElementById(
    "resultsCount"
  ).textContent = `Mostrando (${sortedLots.length}) lotes`;

  // Render lot cards
  renderLotCards(sortedLots);
}

// Price sliders (min and max)
const priceMin = document.querySelector('input[name="priceMin"]');
const priceMax = document.querySelector('input[name="priceMax"]');
if (priceMin && priceMax) {
  // Función para manejar los sliders de precio
  [priceMin, priceMax].forEach((slider) => {
    slider.addEventListener("input", function () {
      updatePriceLabels();
      loadLotData();
    });
    slider.addEventListener("mouseup", function () {
      this.blur();
    });
    slider.addEventListener("mousedown", function () {
      updatePriceLabels();
    });
  });
  // Inicializar los sliders
  updatePriceLabels();
}

// Area sliders (min and max)
const areaMin = document.querySelector('input[name="areaMin"]');
const areaMax = document.querySelector('input[name="areaMax"]');
if (areaMin && areaMax) {
  // Función para manejar los sliders de área
  [areaMin, areaMax].forEach((slider) => {
    slider.addEventListener("input", function () {
      updateAreaLabels();
      loadLotData();
    });
    slider.addEventListener("mouseup", function () {
      this.blur();
    });
    slider.addEventListener("mousedown", function () {
      updateAreaLabels();
    });
  });
  // Inicializar los sliders
  updateAreaLabels();
}

// Status buttons
document.querySelectorAll(".status-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    // Remove active from all status buttons
    document
      .querySelectorAll(".status-btn")
      .forEach((b) => b.classList.remove("active"));
    // Add active to clicked button
    this.classList.add("active");
    loadLotData();
  });
});

// Sort dropdown
const sortSelect = document.getElementById("sortSelect");
if (sortSelect) {
  sortSelect.addEventListener("change", function () {
    loadLotData();
  });
}

function updatePriceLabels() {
  const priceMin = document.querySelector('input[name="priceMin"]');
  const priceMax = document.querySelector('input[name="priceMax"]');
  const priceOutputMin = document.querySelector(".price-output-min");
  const priceOutputMax = document.querySelector(".price-output-max");
  const priceInclRange = document.querySelector(
    ".price-range-slider .incl-range"
  );

  if (
    priceMin &&
    priceMax &&
    priceOutputMin &&
    priceOutputMax &&
    priceInclRange
  ) {
    updateRangeSlider(
      priceMin,
      priceMax,
      priceOutputMin,
      priceOutputMax,
      priceInclRange,
      (value) => `$${parseInt(value).toLocaleString()}`
    );
  }
}

function updateAreaLabels() {
  const areaMin = document.querySelector('input[name="areaMin"]');
  const areaMax = document.querySelector('input[name="areaMax"]');
  const areaOutputMin = document.querySelector(".area-output-min");
  const areaOutputMax = document.querySelector(".area-output-max");
  const areaInclRange = document.querySelector(
    ".area-range-slider .incl-range"
  );

  if (areaMin && areaMax && areaOutputMin && areaOutputMax && areaInclRange) {
    updateRangeSlider(
      areaMin,
      areaMax,
      areaOutputMin,
      areaOutputMax,
      areaInclRange,
      (value) => `${parseInt(value)} m²`
    );
  }
}

// Función para actualizar sliders de rango dual
function updateRangeSlider(
  minInput,
  maxInput,
  minOutput,
  maxOutput,
  inclRange,
  formatValue
) {
  const minValue = parseInt(minInput.value);
  const maxValue = parseInt(maxInput.value);
  const maxRange = parseInt(minInput.getAttribute("max"));
  const minRange = parseInt(minInput.getAttribute("min"));

  // Actualizar outputs (solo el contenido, no la posición)
  minOutput.innerHTML = formatValue(minValue);
  maxOutput.innerHTML = formatValue(maxValue);

  // Actualizar rango incluido
  if (minValue > maxValue) {
    inclRange.style.width =
      ((minValue - maxValue) / (maxRange - minRange)) * 100 + "%";
    inclRange.style.left =
      ((maxValue - minRange) / (maxRange - minRange)) * 100 + "%";
  } else {
    inclRange.style.width =
      ((maxValue - minValue) / (maxRange - minRange)) * 100 + "%";
    inclRange.style.left =
      ((minValue - minRange) / (maxRange - minRange)) * 100 + "%";
  }
}

// Funciones de filtrado y búsqueda de lotes
function applyFilters(lots) {
  const priceMin = parseInt(
    document.querySelector('input[name="priceMin"]').value
  );
  const priceMax = parseInt(
    document.querySelector('input[name="priceMax"]').value
  );
  const areaMin = parseInt(
    document.querySelector('input[name="areaMin"]').value
  );
  const areaMax = parseInt(
    document.querySelector('input[name="areaMax"]').value
  );

  const selectedStatus = Array.from(
    document.querySelectorAll(".status-btn.active")
  ).map((btn) => btn.getAttribute("data-status"));

  return lots.filter((lot) => {
    // Price filter - rango de precio
    if (lot.price < priceMin || lot.price > priceMax) return false;

    // Area filter - rango de área
    if (lot.area < areaMin || lot.area > areaMax) return false;

    // Status filter
    if (!selectedStatus.includes(lot.status)) return false;

    return true;
  });
}

function applySorting(lots) {
  const sortSelect = document.getElementById("sortSelect");
  const sortValue = sortSelect ? sortSelect.value : "area-asc";

  return lots.sort((a, b) => {
    switch (sortValue) {
      case "area-asc":
        return a.area - b.area;
      case "area-desc":
        return b.area - a.area;
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "number-asc":
        const numA = parseInt(a.number) || 0;
        const numB = parseInt(b.number) || 0;
        return numA - numB;
      case "number-desc":
        const numA_desc = parseInt(a.number) || 0;
        const numB_desc = parseInt(b.number) || 0;
        return numB_desc - numA_desc;
      default:
        return 0;
    }
  });
}

function renderLotCards(lots) {
  const container = document.getElementById("lotCardsContainer");
  if (!container) return;

  container.innerHTML = "";

  lots.forEach((lot) => {
    const card = document.createElement("div");
    card.className = "lot-card";
    card.innerHTML = `
      <div class="lot-card-header">${lot.number}</div>
      <div class="lot-card-separator"></div>
      <div class="lot-card-status">${
        lot.status.charAt(0).toUpperCase() + lot.status.slice(1)
      }</div>
      <div class="lot-card-details">
        <span class="lot-card-label">Precio</span>
        <span class="lot-card-value">$ ${lot.price.toLocaleString()}</span>
      </div>
      <div class="lot-card-details">
        <span class="lot-card-label">Área</span>
        <span class="lot-card-value">${lot.area.toFixed(2)} m²</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// Event listener for clear filters button
document.getElementById("clearFiltersBtn").addEventListener("click", () => {
  // Reset price sliders
  const priceMinSlider = document.querySelector('input[name="priceMin"]');
  const priceMaxSlider = document.querySelector('input[name="priceMax"]');
  if (priceMinSlider && priceMaxSlider) {
    // Reset to initial values
    priceMinSlider.value = 0;
    priceMaxSlider.value = 60000; // Default max value
    updatePriceLabels();
  }

  // Reset area sliders
  const areaMinSlider = document.querySelector('input[name="areaMin"]');
  const areaMaxSlider = document.querySelector('input[name="areaMax"]');
  if (areaMinSlider && areaMaxSlider) {
    // Reset to initial values
    areaMinSlider.value = 90;
    areaMaxSlider.value = 500; // Default max value
    updateAreaLabels();
  }

  // Reset amenity buttons
  document
    .querySelectorAll(".amenity-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelector('.amenity-btn[data-amenity="juegos"]')
    .classList.add("active");

  // Reset status buttons
  document
    .querySelectorAll(".status-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelector('.status-btn[data-status="disponible"]')
    .classList.add("active");

  // Reset sort dropdown
  document.getElementById("sortSelect").value = "area-asc";

  // Reload data immediately
  loadLotData();
});

// Entorno
const handleEntorno = async () => {
  reiniciarMenu();
  document.getElementById("entorno").classList.add("active");

  // Mostrar botones del entorno
  const container = document.getElementById("aroundButtonsContainer");
  container.style.display = "flex";

  // Configurar event listeners de los botones del entorno
  const entornoButtons = document.querySelectorAll(
    "#aroundButtonsContainer .around-button"
  );
  entornoButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const buttonText = button.querySelector(
        ".around-button span"
      ).textContent;
      filterEntornoByType(buttonText);
    });
  });

  // Cargar todos los marcadores desde entorno.geojson
  await loadEntornoMarkers();

  // Activar botón "Todos" inicialmente
  updateEntornoButtonsState("Todos");
};

// Función para filtrar marcadores del entorno por tipo
async function filterEntornoByType(tipo) {
  // Cerrar modal de ubicación si está abierto
  const locationModal = document.getElementById("aroundModalOverlay");
    locationModal.style.display = "none";

  // Limpiar ruta anterior si existe
  clearRoute();

  // Remover marcadores del entorno existentes
  const entitiesToRemove = viewer.entities.values.filter(
    (entity) => entity.id && entity.id.startsWith("marcador_entorno_")
  );
  entitiesToRemove.forEach((entity) => viewer.entities.remove(entity));

  // Si es "Todos", cargar sin filtro, sino filtrar por tipo
  const filterType = tipo === "Todos" ? null : tipo;
  await loadEntornoMarkers(filterType);

  // Actualizar estado visual de los botones
  updateEntornoButtonsState(tipo);
}

// Función para cargar marcadores del entorno desde entorno.geojson
async function loadEntornoMarkers(filterType = null) {
  try {
    const response = await fetch("./data/entorno.geojson");
    const entornoData = await response.json();

    if (entornoData && entornoData.features) {
      const positions = [];

      // Filtrar features por tipo si se especifica
      const filteredFeatures = filterType
        ? entornoData.features.filter(
            (feature) => feature.properties.tipo === filterType
          )
        : entornoData.features;

      filteredFeatures.forEach((feature) => {
        const fid = feature.properties.fid;
        const tipo = feature.properties.tipo;
        const nombre = feature.properties.nombre;
        const icono = feature.properties.icono;
        const coordinates = feature.geometry.coordinates;

        viewer.entities.add({
          id: `marcador_entorno_${fid}`,
          position: Cesium.Cartesian3.fromDegrees(
            coordinates[0],
            coordinates[1]
          ),
          billboard: {
            image: icono,
            height: 80,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            color: Cesium.Color.WHITE,
            scale: 1.0,
            show: true,
            alignedAxis: Cesium.Cartesian3.ZERO,
            pixelOffset: Cesium.Cartesian2.ZERO,
            eyeOffset: Cesium.Cartesian3.ZERO,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          properties: {
            type: "entorno",
            fid: fid,
            tipo: tipo,
            nombre: nombre,
            coordinates: coordinates,
          },
        });

        positions.push(
          Cesium.Cartesian3.fromDegrees(coordinates[0], coordinates[1])
        );
      });

      // Hover marcadores
      hoverMarcadores()

      // Click marcadores entorno
      clickMarcadoresAround();

      // Ajustar la cámara para mostrar todos los marcadores
      flyToView(positions);
    }
  } catch (error) {
    console.error("Error al cargar los marcadores del entorno:", error);
  }
}

// Función para configurar interacciones de los marcadores del entorno
function clickMarcadoresAround() {

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
      if (locationId && locationId.startsWith("marcador_entorno_")) {
        const position = locationProperties.coordinates._value;
        const nombre = locationProperties.nombre._value;
        const tipo = locationProperties.tipo._value;

        // Mostrar modal con información del lugar
        showLocationModal(nombre, position, tipo);
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// Función para mostrar el modal de ubicación
function showLocationModal(title, coordinates, tipo = null) {
  // Eliminar ruta anterior si existe
  clearRoute();

  const modal = document.getElementById("aroundModalOverlay");
  const titleEl = document.getElementById("aroundCardTitle");
  const addressEl = document.getElementById("aroundModalAddress");
  const timeEl = document.getElementById("aroundModalTime");
  const aroundModalTimeEstimate = document.getElementById(
    "aroundModalTimeEstimate"
  );
  const routeBtn = document.getElementById("calculateRouteBtn");
  aroundModalTimeEstimate.style.display = "none";

  if (modal && titleEl && addressEl && timeEl && routeBtn) {
    titleEl.textContent = title;
    addressEl.textContent = coordinates; 
    timeEl.textContent = ""; 

    // Clonar y reemplazar el botón para limpiar listeners anteriores
    const newRouteBtn = routeBtn.cloneNode(true);
    routeBtn.parentNode.replaceChild(newRouteBtn, routeBtn);

    // Agregar evento click al botón de ruta
    newRouteBtn.addEventListener("click", async () => {
      timeEl.textContent = "Calculando...";

      const result = await calculateRoute(startLonLat, coordinates, tipo);

      if (result && result.success) {
        aroundModalTimeEstimate.style.display = "flex";
        timeEl.textContent = `A ${result.duration} min (${Math.round(
          result.distance / 1000
        )} km)`;
      } else {
        timeEl.textContent = "Error al calcular";
      }
    });
    modal.style.display = "flex";
  } else {
    console.error(
      "No se encontraron los elementos del modal. Verifica los IDs en index.html."
    );
  }
}

// Función para calcular y mostrar la ruta
async function calculateRoute(start, end, tipo = null) {
  try {
    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?` +
        `api_key=${openRouteServiceKey}&` +
        `start=${start[0]},${start[1]}&` +
        `end=${end[0]},${end[1]}`
    );

    if (!response.ok) {
      throw new Error(`Error en la petición: ${response.status}`);
    }

    const data = await response.json();
    const coords = data.features[0].geometry.coordinates;
    const positions = [];
    coords.forEach((coord) => {
      positions.push(coord[0], coord[1]);
    });

    // Extraer información de tiempo y distancia
    const duration = data.features[0].properties.summary.duration; // en segundos
    const distance = data.features[0].properties.summary.distance; // en metros
    const durationMinutes = Math.round(duration / 60); // convertir a minutos

    // Eliminar ruta anterior si existe
    clearRoute();

    // Seleccionar color según el tipo
    const colorMap = {
      Playas: new Cesium.Color(251 / 255, 224 / 255, 73 / 255, 1.0), 
      Restaurantes: new Cesium.Color(29 / 255, 183 / 255, 121 / 255, 1.0), 
      Hoteles: new Cesium.Color(251 / 255, 195 / 255, 145 / 255, 1.0), 
      Turismo: new Cesium.Color(251 / 255, 73 / 255, 73 / 255, 1.0), 
      Seguridad: new Cesium.Color(73 / 255, 156 / 255, 251 / 255, 1.0), 
    };

    const routeColor =
      tipo && colorMap[tipo]
        ? colorMap[tipo]
        : new Cesium.Color(0.1, 0.1, 0.1, 1.0);

    const boundingSphere = Cesium.BoundingSphere.fromPoints(
      Cesium.Cartesian3.fromDegreesArray(positions)
    );
    // Crear la nueva ruta
    window.currentRoute = viewer.entities.add({
      name: "Ruta",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(positions),
        width: 15, 
        material: routeColor,
        clampToGround: true,
        shadows: Cesium.ShadowMode.DISABLED,
      },
    });

    // Movemos la cámara para encuadrar todo
    viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 2,
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(0), // orientación horizontal
        Cesium.Math.toRadians(-30), // inclinación hacia abajo
        boundingSphere.radius * 3 // distancia para que quepa toda la ruta
      ),
    });

    // Retornar información de la ruta
    return {
      success: true,
      duration: durationMinutes,
      distance: Math.round(distance),
    };
  } catch (error) {
    console.error("Error al calcular la ruta:", error);
    return false;
  }
}

// Función para actualizar el estado visual de los botones del entorno
function updateEntornoButtonsState(activeType) {
  const buttons = document.querySelectorAll(
    "#aroundButtonsContainer .around-button"
  );

  buttons.forEach((button) => {
    const buttonText = button.querySelector(".around-button span").textContent;

    if (buttonText === activeType) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}

document.getElementById("closeAroundModal").addEventListener("click", handleEntorno);

// Video
const handleVideo = () => {
  reiniciarMenu();
  document.getElementById("video").classList.add("active");

  console.log("Abriendo modal de video");

  const modal = document.getElementById("videoModalOverlay");
  const video = document.getElementById("videoPlayer");

  console.log("Modal encontrado:", modal);
  console.log("Video encontrado:", video);

  if (modal && video) {
    // Hacer paneo a la vista de home (vista superior)
    flyToHomeView();

    // Mostrar el modal
    modal.style.display = "flex";

    // Forzar reflow para que la animación funcione
    modal.offsetHeight;

    // Agregar la clase show para activar la animación
    modal.classList.add("show");

    // Resetear el video al inicio
    video.currentTime = 0;

    // Forzar la reproducción del video con un pequeño delay
    setTimeout(() => {
      video
        .play()
        .then(() => {
          console.log("Video iniciado automáticamente");
        })
        .catch((error) => {
          console.log("Error al iniciar video automáticamente:", error);
          // Si falla el autoplay, mostrar mensaje o intentar de nuevo
        });
    }, 100); // Pequeño delay para asegurar que el video esté listo

    console.log("Modal de video abierto correctamente");
  } else {
    console.error("No se encontraron los elementos del modal de video");
  }
};

// Función para volar a la vista de home (vista superior)
function flyToHomeView() {
  try {
    // Usar flyToLotesView() para centrar en todos los lotes
    flyToLotesView();
  } catch (error) {
    console.error("Error al volar a la vista de home:", error);
  }
}








const disponible = Cesium.Color.fromCssColorString("#22c55e").withAlpha(0.5);
const reservado = Cesium.Color.fromCssColorString("#FFFF00").withAlpha(1);
const vendido = Cesium.Color.fromCssColorString("#FF0000").withAlpha(0.5);

// Load terreno polygon from GeoJSON using fetch
let lotesDataSource = null;
let polygonLabels = [];
let lotesDataGlobal = null; // Variable global para almacenar datos de lotes
let processedLots = []; // Variable global para almacenar lotes ya procesados
let maxPrice = 0;
let maxArea = 0;

// Variable para almacenar el centro calculado dinámicamente
let polygonCenter = { longitude: -71.8976, latitude: -17.0995 }; // Valores por defecto
let lotesPositions = []; // Variable para almacenar todas las posiciones de los lotes

async function loadLotesData() {
  try {
    const response = await fetch("./data/lotes.geojson");
    const lotesData = await response.json();

    // Guardar datos globalmente para reutilizar
    lotesDataGlobal = lotesData;

    // Calcular el centro dinámicamente basado en todos los lotes
    polygonCenter = calculateLotesCenter(lotesData);
    console.log("Centro calculado dinámicamente:", polygonCenter);

    // Extraer todas las posiciones de los polígonos para flyToView
    lotesPositions = extractLotesPositions(lotesData);
    console.log("Posiciones extraídas:", lotesPositions.length);

    // Procesar y formatear los datos de lotes una sola vez
    const feats = lotesData.features || [];
    processedLots = feats
      .filter((f) => f && f.properties)
      .filter((f) => {
        const p = f.properties || {};
        // Excluir jardines y lotes sin número válido
        const number = p.number || "";
        const lote = p.lote || "";
        return (
          number !== "Jardín" &&
          (lote !== "" || (number !== "" && !isNaN(parseInt(number))))
        );
      })
      .map((f, idx) => {
        const p = f.properties || {};
        // Normalizar área (ya viene como número o string numérico en nuevo esquema)
        let areaNum = 0;
        if (typeof p.area === "string") {
          areaNum = parseFloat(p.area.replace(",", ".")) || 0;
        } else if (typeof p.area === "number") {
          areaNum = p.area;
        }
        // Precio
        let precioNum = 0;
        if (typeof p.precio === "string") {
          precioNum = parseFloat(p.precio.replace(",", ".")) || 0;
        } else if (typeof p.precio === "number") {
          precioNum = p.precio;
        }

        // Calcular precio máximo
        if (precioNum > maxPrice) {
          maxPrice = precioNum;
        }

        // Calcular área máxima
        if (areaNum > maxArea) {
          maxArea = areaNum;
        }

        const estado = p.estado || "disponible";
        const manzana = p.manzana || "";
        const lote = p.lote || "";
        return {
          id: p.direccion || `lote-${idx}`,
          number:
            p.direccion ||
            (manzana || lote
              ? `Mz. ${manzana} - Lote ${lote}`
              : p.number || `Lote ${idx + 1}`),
          price: precioNum,
          area: areaNum,
          status: String(estado).toLowerCase(),
        };
      });

    // Create Cesium data source from the loaded data
    lotesDataSource = new Cesium.GeoJsonDataSource();
    await lotesDataSource.load(lotesData);

    // Add labels to each terrain polygon
    const entities = lotesDataSource.entities.values;
    polygonLabels = [];

    entities.forEach((entity) => {
      console.log(entity);
      if (entity.polygon && entity.properties && entity.properties.number) {
        const positions = entity.polygon.hierarchy.getValue(
          Cesium.JulianDate.now()
        ).positions;

        // Calculate the center of the polygon
        const center = Cesium.BoundingSphere.fromPoints(positions).center;

        // Get the number from properties
        const number = entity.properties.number.getValue();

        // Add a label at the center of the polygon
        const labelEntity = viewer.entities.add({
          position: center,
          label: {
            text:
              entity.properties.manzana && entity.properties.number
                ? `${entity.properties.manzana}${entity.properties.number}`
                : "",
            font: "900 9pt Arial, sans-serif",
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
          },
        });
        polygonLabels.push(labelEntity);
      }
    });

    const referencePoint = Cesium.Cartesian3.fromDegrees(
      -71.89764735370906,
      -17.099287141165803
    );
    // Rango fijo donde deben mostrarse (ej: hasta 1000 km de altura)
    const MAX_DISTANCE = 550;
    // Crear marcador Mykonos con nueva imagen SVG
    const mykonosMarker = viewer.entities.add({
      id: "mykonos_marker",
      name: "Mykonos",
      position: Cesium.Cartesian3.fromDegrees(
        -71.89764735370906,
        -17.099287141165803
      ),
      billboard: {
        image: "img/mikonos_marker.png",
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
        show: true,
      },
    });
    // Umbral de distancia
    const NEAR_DISTANCE = 200.0; // < 100 m → agrandar
    const FAR_DISTANCE = 201.0;

    // Evento que se ejecuta antes de cada frame
    viewer.scene.preRender.addEventListener(function () {
      // Obtenemos la distancia de la cámara al punto de referencia
      const distance = Cesium.Cartesian3.distance(
        viewer.camera.positionWC,
        referencePoint
      );

      // Controlar visibilidad de labels de lotes
      polygonLabels.forEach((entity) => {
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
      allEntities.forEach((entity) => {
        // Excluir marcadores de entorno y el marcador Mykonos
        if (
          entity.id &&
          !entity.id.startsWith("marcador_entorno_") &&
          entity.id !== "mykonos_marker" &&
          entity.billboard
        ) {
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
    viewer.dataSources.add(lotesDataSource);
    // Estilizar: polígono con fid=1 en gris, el resto en naranja
    try {
      const entities = lotesDataSource.entities.values.filter((e) => e.polygon);
      entities.forEach((e) => {
        // Leer fid desde las propiedades del GeoJSON
        let fid;
        if (e.properties && e.properties.fid) {
          fid =
            typeof e.properties.fid.getValue === "function"
              ? e.properties.fid.getValue()
              : e.properties.fid;
        }
        e.polygon.material = disponible;
        e.polygon.outline = true;
        e.polygon.outlineColor = disponible;
        e.polygon.height = 0.1;
        e.polygon.heightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;
        // Guardar material base para restaurar correctamente tras hover/selección
        e._baseMaterial = e.polygon.material;
      });
    } catch (err) {
      console.error(
        "Error aplicando estilos a terreno.geojson (por fid):",
        err
      );
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
      return typeof number?.getValue === "function"
        ? number.getValue()
        : number;
    };

    const getDireccion = (entity) => {
      if (!entity || !entity.properties) return undefined;
      const props = entity.properties;
      const direccion = props.direccion;
      // Compatibilidad nueva: construir desde manzana/lote si existe
      const manzana = props.manzana;
      const lote = props.lote;
      const valDireccion =
        typeof direccion?.getValue === "function"
          ? direccion.getValue()
          : direccion;
      const valManzana =
        typeof manzana?.getValue === "function" ? manzana.getValue() : manzana;
      const valLote =
        typeof lote?.getValue === "function" ? lote.getValue() : lote;
      if (!valDireccion && (valManzana || valLote)) {
        const mz = valManzana ? String(valManzana).trim() : "";
        const lt = valLote ? String(valLote).trim() : "";
        return `Mz. ${mz} - Lote ${lt}`.trim();
      }
      return valDireccion;
    };

    const getArea = (entity) => {
      if (!entity || !entity.properties) return undefined;
      const area = entity.properties.area;
      const raw = typeof area?.getValue === "function" ? area.getValue() : area;
      if (typeof raw === "string") {
        const match = raw.replace(",", ".").match(/[0-9]+(?:\.[0-9]+)?/);
        return match ? `${parseFloat(match[0]).toFixed(2)} m²` : raw;
      }
      if (typeof raw === "number") {
        return `${raw.toFixed(2)} m²`;
      }
      return raw;
    };

    const getEstado = (entity) => {
      if (!entity || !entity.properties) return undefined;
      const estado = entity.properties.estado || entity.properties.status;
      return typeof estado?.getValue === "function"
        ? estado.getValue()
        : estado;
    };

    const getPrecio = (entity) => {
      if (!entity || !entity.properties) return undefined;
      const precio = entity.properties.precio || entity.properties.price;
      const val =
        typeof precio?.getValue === "function" ? precio.getValue() : precio;
      if (val == null || val === "") return undefined;
      const num =
        typeof val === "string" ? parseFloat(val.replace(",", ".")) : val;
      return isNaN(num) ? undefined : num;
    };

    // Helpers: obtener posiciones del polígono y prueba punto-en-polígono
    const getPolygonPositionsCartographic = (entity) => {
      const now = Cesium.JulianDate.now();
      const hierarchy = Cesium.Property.getValueOrDefault(
        entity.polygon.hierarchy,
        now
      );
      if (!hierarchy) return [];
      const positions = hierarchy.positions || hierarchy;
      return positions.map((pos) => Cesium.Cartographic.fromCartesian(pos));
    };

    // Ray casting 2D lon/lat (en radianes)
    const pointInPolygon = (pointCarto, polyCartos) => {
      if (!pointCarto || !polyCartos || polyCartos.length < 3) return false;
      const x = pointCarto.longitude; // radianes
      const y = pointCarto.latitude; // radianes
      let inside = false;
      for (
        let i = 0, j = polyCartos.length - 1;
        i < polyCartos.length;
        j = i++
      ) {
        const xi = polyCartos[i].longitude,
          yi = polyCartos[i].latitude;
        const xj = polyCartos[j].longitude,
          yj = polyCartos[j].latitude;
        const intersect =
          yi > y !== yj > y &&
          x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
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
      const poly0 = lotesDataSource.entities.values.find(
        (e) => e.polygon && getFid(e) === 0
      );
      if (poly0) {
        // Obtener anillo del polígono en cartográfico (rad)
        const ring = getPolygonPositionsCartographic(poly0);
        // Eliminar punto duplicado de cierre si existe
        let cartos = ring.slice();
        if (cartos.length >= 2) {
          const first = cartos[0];
          const last = cartos[cartos.length - 1];
          const almostEqual = (a, b) => Math.abs(a - b) < 1e-10;
          if (
            almostEqual(first.latitude, last.latitude) &&
            almostEqual(first.longitude, last.longitude)
          ) {
            cartos = cartos.slice(0, -1);
          }
        }

        // Construir posiciones a nivel del suelo y alturas de la pared
        const positions = cartos.map((c) =>
          Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, 0.0)
        );
        const minimumHeights = new Array(positions.length).fill(0.0);
        const wallHeightMeters = 1.0; // Altura de la pared (ajusta aquí a la altura real de tu pared)
        const maximumHeights = new Array(positions.length).fill(
          wallHeightMeters
        );

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
        const repeatX = Math.max(
          1.0,
          perimeterMeters / Math.max(0.1, tileSizeMeters)
        );
        const repeatY = Math.max(
          1.0,
          wallHeightMeters / Math.max(0.1, tileSizeMeters)
        );

        const wallEntity = viewer.entities.add({
          name: "Pared fid=0",
          wall: {
            positions,
            minimumHeights,
            maximumHeights,
            // Textura desde tu archivo local SVG (cuadrado). Se calcula repeat para que quede en tiles cuadrados.
            material: new Cesium.ImageMaterialProperty({
              image: "./img/pared.svg",
              repeat: new Cesium.Cartesian2(repeatX, repeatY),
              color: Cesium.Color.WHITE.withAlpha(1.0),
            }),
            outline: true,
            outlineColor: Cesium.Color.BLACK,
          },
        });
        // Log y acercar para asegurar visibilidad
        console.log("Pared creada para fid=0:", wallEntity);
        try {
          viewer.zoomTo(wallEntity);
        } catch (_) {
          /* noop */
        }
        // Forzar render en requestRenderMode
        try {
          viewer.scene.requestRender();
        } catch (_) {
          /* noop */
        }
      }
    } catch (e) {
      console.error("No se pudo crear la pared para fid=0:", e);
    }

    // Utilidades de formato y cálculo
    const metersToML = (m) => `${m.toFixed(2)} ML`;
    const sqm = (m2) => `${m2.toFixed(2)} m²`;

    const getCentroidCartesian = (positions) => {
      // promedio simple en cartesiano
      let x = 0,
        y = 0,
        z = 0;
      positions.forEach((p) => {
        x += p.x;
        y += p.y;
        z += p.z;
      });
      const n = positions.length;
      return new Cesium.Cartesian3(x / n, y / n, z / n);
    };

    const computeAreaAndEdges = (entity) => {
      const now = Cesium.JulianDate.now();
      const hierarchy = Cesium.Property.getValueOrDefault(
        entity.polygon.hierarchy,
        now
      );
      const positions = (hierarchy?.positions || hierarchy) ?? [];
      if (!positions || positions.length < 3) {
        return { area: 0, edges: [] };
      }

      // Marco ENU local en el centroide para planarizar
      const centroid = getCentroidCartesian(positions);
      const enuFrame = Cesium.Transforms.eastNorthUpToFixedFrame(centroid);
      const invEnu = Cesium.Matrix4.inverse(enuFrame, new Cesium.Matrix4());

      const pts2D = positions.map((p) => {
        const local = Cesium.Matrix4.multiplyByPoint(
          invEnu,
          p,
          new Cesium.Cartesian3()
        );
        return { x: local.x, y: local.y };
      });

      // Área por fórmula del polígono (shoelace)
      let area2 = 0;
      for (let i = 0, j = pts2D.length - 1; i < pts2D.length; j = i++) {
        area2 += pts2D[j].x * pts2D[i].y - pts2D[i].x * pts2D[j].y;
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

      const lotEl = document.getElementById("modalLot");
      const statusEl = document.getElementById("modalStatus");
      const priceEl = document.getElementById("modalPrice");
      const areaEl = document.getElementById("modalArea");
      const leftEl = document.getElementById("modalLeft");
      const rightEl = document.getElementById("modalRight");
      const frontEl = document.getElementById("modalFront");
      const backEl = document.getElementById("modalBack");

      // Información del lote
      if (lotEl) lotEl.textContent = direccion || "Lote sin identificar";

      // Status y precio desde propiedades
      const statusVal = getEstado(entity) || "Disponible";
      const priceNum = getPrecio(entity);
      if (statusEl) {
        statusEl.textContent = statusVal || "Disponible";
        // Aplicar clase CSS según el estado
        statusEl.className = "lot-status-badge";
        if (statusVal.toLowerCase() === "vendido") {
          statusEl.style.backgroundColor = "#ef4444";
        } else if (statusVal.toLowerCase() === "reservado") {
          statusEl.style.backgroundColor = "#eab308";
        } else {
          statusEl.style.backgroundColor = "#22c55e";
        }
      }

      if (priceEl) {
        priceEl.textContent =
          typeof priceNum === "number"
            ? `$ ${priceNum.toLocaleString()}`
            : "$ 0";
      }

      // Área
      if (areaEl) areaEl.textContent = areaLote || "0.00 m²";

      // Calcular lados del polígono
      const { area, edges } = computeAreaAndEdges(entity);

      // Asignar lados si hay al menos 4
      if (edges.length >= 4) {
        // Ordenar por longitud y asignar los más largos como frente/fondo
        const sortedEdges = edges
          .map((v, i) => ({ i, v }))
          .sort((a, b) => b.v - a.v);
        const frontLen = sortedEdges[0].v;
        const backLen = sortedEdges[1].v;
        const others = edges.filter(
          (_, k) => k !== sortedEdges[0].i && k !== sortedEdges[1].i
        );
        const leftLen = others[0] || 0;
        const rightLen = others[1] || 0;

        if (frontEl) frontEl.textContent = metersToML(frontLen);
        if (backEl) backEl.textContent = metersToML(backLen);
        if (leftEl) leftEl.textContent = metersToML(leftLen);
        if (rightEl) rightEl.textContent = metersToML(rightLen);
      } else {
        if (frontEl) frontEl.textContent = "0.00ML";
        if (backEl) backEl.textContent = "0.00ML";
        if (leftEl) leftEl.textContent = "0.00ML";
        if (rightEl) rightEl.textContent = "0.00ML";
      }
    };

    // Hover: resaltar en amarillo (siempre activo)
    handler.setInputAction((movement) => {

      // 1) Intento rápido con drillPick
      const picked = viewer.scene.drillPick(movement.endPosition) || [];
      let entity =
        picked.map((p) => p.id).find((id) => id && id.polygon) || null;

      // Restaurar hover si nos movimos fuera o a otra entidad
      if (highlighted && highlighted !== entity) {
        // No tocar si es el seleccionado
        if (highlighted !== selected) {
          const base = highlighted._baseMaterial || highlightedOriginalMaterial;
          if (base) highlighted.polygon.material = base;
        }
        highlighted = null;
        highlightedOriginalMaterial = null; 
        viewer.scene.requestRender();
      }

      if (entity) {
        const fid = getFid(entity);
        if (fid !== undefined) {
            viewer.scene.canvas.style.cursor = "pointer";
          // Evitar resaltar si ya es el seleccionado
          if (highlighted !== entity && entity !== selected) {
            highlighted = entity;
            // Guardar el material base como referencia para restaurar
            highlightedOriginalMaterial =
              entity._baseMaterial || entity.polygon.material;
            entity.polygon.material = disponible.withAlpha(0.5);
            viewer.scene.requestRender();
          }
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
      selectedOriginalMaterial =
        entity._baseMaterial || entity.polygon.material;
      // Si estaba en hover, limpiar ese estado para no mezclar colores
      if (highlighted === entity) {
        highlighted = null;
        highlightedOriginalMaterial = null;
      }
      // Color de selección persistente (#a6d83b)
      entity.polygon.material =
        Cesium.Color.fromCssColorString("#a6d83b").withAlpha(0.7);
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
    window.cesiumClearSelection = clearSelection;

    // Exponer función para ajustar la opacidad de los lotes (disponibles)
    // alpha debe ser un número entre 0 y 1. Ej.: 0 → transparente, 0.7 → visible
    window.setTerrenosAlpha = (alpha) => {
      try {
        const entitiesAll = lotesDataSource.entities.values.filter(
          (e) => e.polygon
        );
        entitiesAll.forEach((e) => {
          const fid = getFid(e);
          if (fid === 0) return; // omitir polígono perimetral
          // Mantener transparente el fid=3 según estilo original
          const newMaterial =
            fid === 3 ? disponible.withAlpha(0) : disponible.withAlpha(alpha);
          // Actualizar base material para que hover/restauración funcionen
          e._baseMaterial = newMaterial;
          // No sobrescribir el color de selección activo
          if (selected !== e) {
            e.polygon.material = newMaterial;
          }
        });
        viewer.scene.requestRender?.();
      } catch (err) {
        console.error("No se pudo ajustar la opacidad de lotes:", err);
      }
    };

    handler.setInputAction((click) => {
      const picked = viewer.scene.drillPick(click.position) || [];
      let entity =
        picked.map((p) => p.id).find((id) => id && id.polygon) || null;

      // Fallback por punto-en-polígono
      if (!entity) {
        const cart = viewer.scene.pickPosition(click.position);
        if (cart) {
          const carto = Cesium.Cartographic.fromCartesian(cart);
          const polyEntity = lotesDataSource.entities.values.find((e) => {
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
      const overlay = document.getElementById("modalOverlay");
      if (overlay) overlay.style.display = "flex";
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  } catch (error) {
    console.error("Error cargando lotes.geojson:", error);
  }
}

// Cargar los datos de lotes al inicializar
loadLotesData();

// Fly the camera to San Francisco at the given longitude, latitude, and height.
viewer.camera.flyTo(targetLocation);

try {
  viewer.imageryLayers.addImageryProvider(
    await Cesium.IonImageryProvider.fromAssetId(3810048)
  );
} catch (error) {
  console.log(error);
}

// Función para extraer todas las posiciones de los polígonos de lotes
function extractLotesPositions(lotesData) {
  const positions = [];

  if (!lotesData || !lotesData.features) {
    console.warn("No hay datos de lotes para extraer posiciones");
    return positions;
  }

  lotesData.features.forEach((feature) => {
    if (feature.geometry && feature.geometry.coordinates) {
      const coords = feature.geometry.coordinates;

      // Manejar diferentes tipos de geometría
      if (feature.geometry.type === "Polygon") {
        // Para polígonos, usar el primer anillo (exterior)
        const ring = coords[0];
        ring.forEach((coord) => {
          positions.push(Cesium.Cartesian3.fromDegrees(coord[0], coord[1]));
        });
      } else if (feature.geometry.type === "Point") {
        // Para puntos
        positions.push(Cesium.Cartesian3.fromDegrees(coords[0], coords[1]));
      }
    }
  });

  return positions;
}

// Función para calcular el centro de todos los lotes
function calculateLotesCenter(lotesData) {
  if (!lotesData || !lotesData.features) {
    console.warn("No hay datos de lotes para calcular el centro");
    return { longitude: -71.8976, latitude: -17.0995 }; // Valores por defecto
  }

  let sumLon = 0;
  let sumLat = 0;
  let validPoints = 0;

  lotesData.features.forEach((feature) => {
    if (feature.geometry && feature.geometry.coordinates) {
      const coords = feature.geometry.coordinates;

      // Manejar diferentes tipos de geometría
      if (feature.geometry.type === "Polygon") {
        // Para polígonos, usar el primer anillo (exterior)
        const ring = coords[0];
        ring.forEach((coord) => {
          sumLon += coord[0];
          sumLat += coord[1];
          validPoints++;
        });
      } else if (feature.geometry.type === "Point") {
        // Para puntos
        sumLon += coords[0];
        sumLat += coords[1];
        validPoints++;
      }
    }
  });

  if (validPoints === 0) {
    console.warn("No se encontraron coordenadas válidas en los lotes");
    return { longitude: -71.8976, latitude: -17.0995 }; // Valores por defecto
  }

  return {
    longitude: sumLon / validPoints,
    latitude: sumLat / validPoints,
  };
}

// Controles: pan arriba/abajo y zoom in/out mediante botones de la UI
(() => {
  const cam = viewer.camera;
  const scene = viewer.scene;

  const byId = (id) => document.getElementById(id);
  const btnUp = byId("up");
  const btnDown = byId("down");
  const btnZoomIn = byId("zoomIn");
  const btnZoomOut = byId("zoomOut");
  const btnHome = byId("home");
  const btnView3D = byId("view3d");

  // Factor de movimiento basado en la altura actual para que sea proporcional
  const getStep = () => Math.max(5.0, cam.positionCartographic.height * 0.1);
  const getZoomStep = () =>
    Math.max(1.0, cam.positionCartographic.height * 0.15);

  const safeRequestRender = () => {
    try {
      scene.requestRender();
    } catch (e) {
      /* noop */
    }
  };

  if (btnUp) {
    btnUp.addEventListener("click", () => {
      cam.moveUp(getStep());
      safeRequestRender();
    });
  }

  if (btnDown) {
    btnDown.addEventListener("click", () => {
      cam.moveDown(getStep());
      safeRequestRender();
    });
  }

  if (btnZoomIn) {
    btnZoomIn.addEventListener("click", () => {
      cam.zoomIn(getZoomStep());
      safeRequestRender();
    });
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener("click", () => {
      cam.zoomOut(getZoomStep());
      safeRequestRender();
    });
  }

  // Vista superior (nadir) al presionar Home
  if (btnHome) {
    btnHome.addEventListener("click", () => {
      try {
        // Usar flyToLotesView() para centrar en todos los lotes
        flyToLotesView();
      } catch (error) {
        console.error("Error al volar a la vista superior:", error);
      }
    });
  }

  // Vista oblicua inicial al presionar View 3D
  if (btnView3D) {
    btnView3D.addEventListener("click", () => {
      viewer.camera.flyTo(targetLocation);
    });
  }

  // Botón GRID: toggle de opacidad de lotes
  const btnGrid = byId("grid");
  if (btnGrid) {
    btnGrid.addEventListener("click", () => {
      // Toggle de modo grid
      window.isGridModeActive = !window.isGridModeActive;
      if (window.setTerrenosAlpha) {
        try {
          if (window.isGridModeActive) {
            window.setTerrenosAlpha(0.0);
            btnGrid.classList.add("active");
          } else {
            window.setTerrenosAlpha(0.7);
            btnGrid.classList.remove("active");
          }
        } catch (_) {
          /* noop */
        }
      }
    });
  }
})();

// Función para eliminar rutas
function hideRoutes() {
  // Buscar y eliminar completamente cualquier entidad de ruta en el viewer
  if (viewer && viewer.entities) {
    const routesToRemove = [];

    // Buscar entidades que puedan ser rutas
    viewer.entities.values.forEach((entity) => {
      // Buscar por nombre, id, o propiedades que indiquen que es una ruta
      const entityName = entity.name || "";
      const entityId = entity.id || "";

      if (
        entityName.includes("route") ||
        entityName.includes("ruta") ||
        entityName.includes("path") ||
        entityId.includes("route") ||
        entityId.includes("ruta") ||
        entityId.includes("path") ||
        entityName.includes("directions") ||
        entityName.includes("direcciones") ||
        entityId.includes("directions") ||
        entityId.includes("direcciones")
      ) {
        routesToRemove.push(entity);
      }
    });

    // También buscar polylines que puedan ser rutas
    viewer.entities.values.forEach((entity) => {
      if (entity.polyline && entity.polyline.show) {
        // Si es una polyline visible, probablemente es una ruta
        routesToRemove.push(entity);
      }
    });

    // Eliminar todas las rutas encontradas
    routesToRemove.forEach((entity) => {
      viewer.entities.remove(entity);
    });

    console.log(`Se eliminaron ${routesToRemove.length} rutas`);

    // Forzar actualización del viewer
    viewer.scene.requestRender();
  }
}

// Función para volar a la vista inicial de entorno
function flyToEntornoView() {
  try {
    // Simular exactamente lo que hace el botón de entorno
    // El botón de entorno no cambia la vista de cámara, solo muestra marcadores
    // Por lo tanto, usamos la vista actual o la vista de home
    flyToHomeView();
  } catch (error) {
    console.error("Error al volar a la vista de entorno:", error);
  }
}
window.reiniciarMenu = reiniciarMenu;
window.flyToHomeView = flyToHomeView;
window.hideRoutes = hideRoutes;
window.flyToEntornoView = flyToEntornoView;

export { reiniciarMenu };
