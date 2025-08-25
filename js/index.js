import { cesiumAccessToken, targetLocation, url } from "./cesiumConfig.js";
import { trees } from "./coordinates.js";
import { createModel } from "./CesiumFun.js";

// No necesitamos variables globales para los marcadores ya que se manejan a través de viewer.entities// Funciones específicas para cada tipo de visualización
const handleAreasComunes = async () => {
  if (!locationData) {
    await loadLocationData();
  }

  document.getElementById('commonAreasModalOverlay').style.display = 'flex';
  // Remover marcadores existentes de áreas comunes
  const entitiesToRemove = viewer.entities.values.filter(entity =>
    entity.id && entity.id.startsWith("area_comun_") || entity.id === "marcador_1" || entity.id === "marcador_2"
  );
  entitiesToRemove.forEach(entity => viewer.entities.remove(entity));

  if (locationData && locationData.common_areas) {
    // Crear marcadores para cada área común
    Object.entries(locationData.common_areas).forEach(([key, location]) => {
      viewer.entities.add({
        id: `area_comun_${key}`,
        position: Cesium.Cartesian3.fromDegrees(location.coordinates[0], location.coordinates[1]),
        billboard: {
          image: location.marker_image || "assets/placeholder.png",
          width: 80,
          height: 80,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM
        },
        label: {
          text: location.title,
          font: 'bold 12pt sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, 10),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 3000.0)
        }
      });
    });

    // Calcular centro y hacer zoom a las áreas comunes
    const coordinates = Object.values(locationData.common_areas).map(loc => loc.coordinates);
    const centerLon = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
    const centerLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;

    // Crear un boundingSphere que incluya todos los marcadores
    const positions = coordinates.map(coord =>
      Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
    );
    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);

    // Ajustar la vista para mostrar todos los marcadores
    viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 1.5,
      offset: new Cesium.HeadingPitchRange(
        0.0,
        Cesium.Math.toRadians(-45),
        boundingSphere.radius * 2.5
      )
    });
  }
};

const handleLotes = () => {
  // Remover solo los marcadores del entorno
  const entitiesToRemove = viewer.entities.values.filter(entity =>
    entity.id === "marcador_1" || entity.id === "marcador_2"
  );
  entitiesToRemove.forEach(entity => viewer.entities.remove(entity));
};
const handleEntorno = async () => {
  if (!locationData) {
    await loadLocationData();
  }

  // Remover solo los marcadores del entorno si existen
  const entitiesToRemove = viewer.entities.values.filter(entity =>
    entity.id === "marcador_1" || entity.id === "marcador_2" || entity.id.startsWith("area_comun_")
  );
  entitiesToRemove.forEach(entity => viewer.entities.remove(entity));

  // Crear los marcadores usando createLine
  const success = await createLine();

  if (success && locationData) {
    // Obtener las coordenadas de los marcadores
    const positions = Object.values(locationData.locations).map(location => {
      return Cesium.Cartesian3.fromDegrees(location.coordinates[0], location.coordinates[1]);
    });
    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);

    // Usamos flyToBoundingSphere para centrar y ajustar el zoom
    viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 2.0, // tiempo de animación (segundos)
      offset: new Cesium.HeadingPitchRange(
        0.0,     // heading (0 = mirando norte relativo)
        -0.5,    // pitch (negativo = mirando hacia abajo)
        3000  // range: aquí defines qué tan lejos estará la cámara
      )
    });
  } else {
    console.error("Error al crear la línea o cargar los datos de ubicación.");
  }
};// Configuración de los botones de navegación
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
async function calculateRoute(start, end) {
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

    // Eliminar ruta anterior si existe
    if (window.currentRoute) {
      viewer.entities.remove(window.currentRoute);
    }
    const boundingSphere = Cesium.BoundingSphere.fromPoints(Cesium.Cartesian3.fromDegreesArray(positions));
    // Crear la nueva ruta
    window.currentRoute = viewer.entities.add({
      name: 'Ruta',
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(positions),
        width: 15, // Aumentado el grosor de la línea
        material: new Cesium.Color(0.1, 0.1, 0.1, 1.0), // Gris muy oscuro
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
    return true;
  } catch (error) {
    console.error('Error al calcular la ruta:', error);
    return false;
  }
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
          font: 'bold 16px sans-serif',
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
        if (locationId.startsWith("marcador_") || locationId.startsWith("area_comun_")) {
          console.log("Se hizo clic en el marcador:", locationId);
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
function showLocationModal(title, description, coordinates) {
  const modal = document.getElementById('locationModalOverlay');
  const titleEl = document.getElementById('locationModalTitle');
  const addressEl = document.getElementById('locationModalAddress');
  const timeEl = document.getElementById('locationModalTime');
  const routeBtn = document.getElementById('calculateRouteBtn');

  if (modal && titleEl && addressEl && timeEl && routeBtn) {
    titleEl.textContent = title;
    addressEl.textContent = description;
    timeEl.textContent = "5-10 min";

    // Clonar y reemplazar el botón para limpiar listeners anteriores
    const newRouteBtn = routeBtn.cloneNode(true);
    routeBtn.parentNode.replaceChild(newRouteBtn, routeBtn);

    // Agregar evento click al botón de ruta
    newRouteBtn.addEventListener('click', () => {
      console.log('Calculando ruta hacia:', title);
      calculateRoute(startLonLat, coordinates);
      closeLocationModal(); // Cierra el modal después de iniciar el cálculo
    }); modal.style.display = 'flex';
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

const disponible = Cesium.Color.fromCssColorString('#4CAF50');

// Load terreno polygon from GeoJSON
Cesium.GeoJsonDataSource.load("./data/terrenos.geojson", {
  clampToGround: true,
  stroke: Cesium.Color.fromCssColorString('#000000'),
  fill: disponible,
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
            text: number ? number.toString() : '',
            font: '9pt sans-serif',
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
    viewer.entities.add({
      name: "Mykonos",
      position: Cesium.Cartesian3.fromDegrees(-71.89764735370906, -17.099287141165803),
      billboard: {
        image: "assets/mykonos_marker.webp",
        width: 150,
        height: 150,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(550, 1000000)
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
      const direccion = entity.properties.direccion;
      return typeof direccion?.getValue === "function" ? direccion.getValue() : direccion;
    };

    const getArea = (entity) => {
      if (!entity || !entity.properties) return undefined;
      const area = entity.properties.area;
      return typeof area?.getValue === "function" ? area.getValue() : area;
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

      const titleEl = document.getElementById('modalTitle');
      const lotEl = document.getElementById('modalLot');
      const statusEl = document.getElementById('modalStatus');
      const priceEl = document.getElementById('modalPrice');
      const areaEl = document.getElementById('modalArea');
      const leftEl = document.getElementById('modalLeft');
      const rightEl = document.getElementById('modalRight');
      const frontEl = document.getElementById('modalFront');
      const backEl = document.getElementById('modalBack');

      // Títulos básicos
      if (titleEl) titleEl.textContent = `MIKONOS`.trim();
      if (lotEl) lotEl.textContent = `${direccion ?? ''}`;

      // Status y precio desde propiedades si existen
      const statusVal = typeof props.status?.getValue === 'function' ? props.status.getValue() : props.status;
      const priceVal = typeof props.price?.getValue === 'function' ? props.price.getValue() : props.price;
      if (statusEl) statusEl.textContent = statusVal || 'Disponible';
      if (priceEl) priceEl.textContent = priceVal ? `${priceVal}` : '$ 27,947.50';

      // Área y lados
      const { area, edges } = computeAreaAndEdges(entity);
      if (areaEl) areaEl.textContent = areaLote;

      // Asignar lados si hay al menos 4
      if (edges.length >= 4) {
        // Heurística: ordenar índices por longitud y tomar dos más largos como frente/fondo
        const idxs = edges.map((v, i) => ({ i, v })).sort((a, b) => b.v - a.v);
        const frontLen = idxs[0].v;
        const backLen = idxs[1].v;
        // Los otros dos como izquierda/derecha (no necesariamente orientación real)
        const others = edges.filter((_, k) => k !== idxs[0].i && k !== idxs[1].i);
        const leftLen = others[0];
        const rightLen = others[1];

        if (frontEl) frontEl.textContent = metersToML(frontLen);
        if (backEl) backEl.textContent = metersToML(backLen);
        if (leftEl) leftEl.textContent = metersToML(leftLen);
        if (rightEl) rightEl.textContent = metersToML(rightLen);
      } else {
        if (frontEl) frontEl.textContent = '-';
        if (backEl) backEl.textContent = '-';
        if (leftEl) leftEl.textContent = '-';
        if (rightEl) rightEl.textContent = '-';
      }
    };

    // Hover: resaltar en amarillo (activo incluso con modal abierto, excepto sobre el seleccionado)
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
        viewer.scene.canvas.style.cursor = "default";
        viewer.scene.requestRender();
      }

      if (entity) {
        const fid = getFid(entity);
        if (fid !== 3 && fid !== undefined) {
          viewer.scene.canvas.style.cursor = "pointer";
          // Evitar resaltar si ya es el seleccionado
          if (highlighted !== entity && entity !== selected) {
            highlighted = entity;
            // Guardar el material base como referencia para restaurar
            highlightedOriginalMaterial = entity._baseMaterial || entity.polygon.material;
            entity.polygon.material = disponible.withAlpha(0.5);
            viewer.scene.requestRender();
          }
        } else {
          viewer.scene.canvas.style.cursor = "default";
        }
      } else {
        viewer.scene.canvas.style.cursor = "default";
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

const coordinates = [
  -71.898877985447115, -17.098770803958921,
  -71.897965133484803, -17.098126203614402,
  -71.896422217120715, -17.099625276093949,
  -71.897406406809651, -17.100330704154146,
  -71.898878026501848, -17.098770927123116
];

// Carga la imagen como un material. Usa la ruta a tu archivo .png
const mykonoMaterial = new Cesium.ImageMaterialProperty({
  image: './img/img.jpg',
  repeat: new Cesium.Cartesian2(1.0, 1.0) // Asegura que la imagen no se repita
});

// Agrega la entidad de polígono al visor
const mykonoLotEntity = viewer.entities.add({
  polygon: {
    // Convierte el array de coordenadas en un objeto de jerarquía de polígono
    hierarchy: Cesium.Cartesian3.fromDegreesArray(coordinates),
    // Asigna el material de imagen
    material: mykonoMaterial,
    // Esto hace que el polígono se adhiera al terreno
    classificationType: Cesium.ClassificationType.TERRAIN
  }
});

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
})();
