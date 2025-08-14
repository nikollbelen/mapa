import { cesiumAccessToken, targetLocation, url } from "./cesiumConfig.js";
import { trees } from "./coordinates.js";
import { createModel } from "./CesiumFun.js";

// Your access token can be found at: https://ion.cesium.com/tokens.
// This is the default access token from your ion account
Cesium.Ion.defaultAccessToken = cesiumAccessToken;

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

// Función para crear la línea
async function createLine() {
  try {
    console.log('Iniciando creación de la línea...');

    // Coordenadas de inicio y fin
    const startLon = -71.9053;
    const startLat = -17.1005;
    const endLon = -71.9082;
    const endLat = -17.0985;

    console.log('Coordenadas de la línea:');
    console.log('Inicio:', startLon, startLat);
    console.log('Fin:', endLon, endLat);

    // Crear puntos en los extremos para verificar las posiciones
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(startLon, startLat),
      point: { pixelSize: 15, color: Cesium.Color.RED }
    });

    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(endLon, endLat),
      point: { pixelSize: 15, color: Cesium.Color.BLUE }
    });

    // Obtener la ruta de OpenRouteService 2000 diarios
    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?` +
      `api_key=${API_KEY}&` +
      `start=${startLon},${startLat}&` +
      `end=${endLon},${endLat}`
    );

    if (!response.ok) {
      throw new Error(`Error en la petición: ${response.status}`);
    }

    const data = await response.json();

    // Extraer coordenadas de la ruta
    const coords = data.features[0].geometry.coordinates; // Array de [lon, lat]

    // Convertir a formato para Cesium (array plano de [lon, lat, lon, lat, ...])
    const positions = [];
    coords.forEach(coord => {
      positions.push(coord[0], coord[1]);
    });

    // Crear la polilínea con la ruta obtenida
    const line = viewer.entities.add({
      name: 'Ruta optimizada',
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(positions),
        width: 5,
        material: new Cesium.PolylineGlowMaterialProperty({
          color: Cesium.Color.YELLOW.withAlpha(0.8),
          glowPower: 0.2,
          taperPower: 0.5
        }),
        clampToGround: true,
        shadows: Cesium.ShadowMode.DISABLED,
        depthFailMaterial: Cesium.Color.RED.withAlpha(0.5)
      }
    });

    console.log('Ruta creada con éxito:', line);

    // Acercar la cámara para ver toda la ruta
    viewer.zoomTo(viewer.entities);

    return line;
  } catch (error) {
    console.error('Error al crear la ruta:', error);
    return null;
  }
}

console.log('Terreno cargado correctamente');
const line = createLine();
if (line) {
  console.log('Línea creada exitosamente');
} else {
  console.error('No se pudo crear la línea');
}

// Ocultar créditos de Cesium (solo el globo)
viewer.cesiumWidget.creditContainer.style.display = "none";

// Mejorar picking sobre materiales translúcidos
viewer.scene.pickTranslucentDepth = true;



// Ocultar modal al cargar; se mostrará al hacer click en un polígono (excepto fid=1)
const modalEl = document.getElementById("modalOverlay");
if (modalEl) modalEl.style.display = "none";

trees.features.forEach((feature) => {
  createModel(
    viewer,
    url.treeGlb,
    feature.geometry.coordinates[0],
    feature.geometry.coordinates[1],
    0
  );
});

// Load terreno polygon from GeoJSON
Cesium.GeoJsonDataSource.load("./data/terrenos.geojson", {
  clampToGround: true,
  stroke: Cesium.Color.ORANGE,
  fill: Cesium.Color.ORANGE.withAlpha(0.4),
  strokeWidth: 2,
})
  .then((ds) => {
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
        e.polygon.material = (isLargest ? Cesium.Color.GRAY : Cesium.Color.ORANGE).withAlpha(0.5);
        e.polygon.outline = true;
        e.polygon.outlineColor = isLargest ? Cesium.Color.DARKGRAY : Cesium.Color.ORANGE;
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
      if (titleEl) titleEl.textContent = `Lote ${fid ?? ''}`.trim();
      if (lotEl) lotEl.textContent = `FID ${fid ?? '-'}`;

      // Status y precio desde propiedades si existen
      const statusVal = typeof props.status?.getValue === 'function' ? props.status.getValue() : props.status;
      const priceVal = typeof props.price?.getValue === 'function' ? props.price.getValue() : props.price;
      if (statusEl) statusEl.textContent = statusVal || 'Disponible';
      if (priceEl) priceEl.textContent = priceVal ? `${priceVal}` : '$ -';

      // Área y lados
      const { area, edges } = computeAreaAndEdges(entity);
      if (areaEl) areaEl.textContent = sqm(area);

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
          // Buscar el primer polígono (excepto fid=1) cuyo relleno contenga el punto
          const polyEntity = ds.entities.values.find((e) => {
            if (!e.polygon) return false;
            const fid = getFid(e);
            if (fid === 1) return false;
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
        if (fid !== 1) {
          viewer.scene.canvas.style.cursor = "pointer";
          // Evitar resaltar si ya es el seleccionado
          if (highlighted !== entity && entity !== selected) {
            highlighted = entity;
            // Guardar el material base como referencia para restaurar
            highlightedOriginalMaterial = entity._baseMaterial || entity.polygon.material;
            entity.polygon.material = Cesium.Color.YELLOW.withAlpha(0.6);
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

    // Click: abrir modal con datos del polígono
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
            if (fid === 1) return false;
            const ring = getPolygonPositionsCartographic(e);
            return pointInPolygon(carto, ring);
          });
          if (polyEntity) entity = polyEntity;
        }
      }

      if (!entity) return;
      const fid = getFid(entity);
      if (fid === 1) return; // excluir

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
        const carto = Cesium.Cartographic.fromCartesian(targetLocation.destination);
        const height = Math.max(400.0, (carto.height || 100.0) * 3.0);
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromRadians(carto.longitude + 0.0001, carto.latitude + 0.0001, height),
          orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-90.0), // top-down
            roll: 0.0,
          },
          duration: 1.0,
        });
      } catch (e) {
        // Fallback si falla el cálculo
        viewer.camera.setView({
          destination: targetLocation.destination,
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
