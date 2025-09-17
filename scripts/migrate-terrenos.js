const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'terrenos.geojson');

function parseManzanaLote(numberStr) {
  if (!numberStr || typeof numberStr !== 'string') return { manzana: '', lote: '' };
  const m = numberStr.match(/^([A-Za-zÁÉÍÓÚÑ])\s*-\s*(\d+)/);
  if (m) return { manzana: m[1].toUpperCase(), lote: m[2] };
  return { manzana: '', lote: '' };
}

function normalizeArea(areaVal) {
  if (typeof areaVal === 'number') return areaVal.toFixed(2);
  if (typeof areaVal === 'string') {
    const num = parseFloat(areaVal.replace(',', '.').replace(/\s*m2?$/i, ''));
    if (!isNaN(num)) return num.toFixed(2);
  }
  return '';
}

function migrate() {
  const raw = fs.readFileSync(filePath, 'utf8');
  const gj = JSON.parse(raw);
  if (!gj || !Array.isArray(gj.features)) {
    throw new Error('GeoJSON inválido: no hay features');
  }

  gj.features = gj.features.map((feat) => {
    const p = feat.properties || {};
    const { manzana, lote } = parseManzanaLote(p.number || '');
    const area = normalizeArea(p.area);
    const precio = p.precio != null ? String(p.precio) : '0';
    const estado = (p.estado || p.status || 'disponible').toString().toLowerCase();

    feat.properties = {
      fid: p.fid != null ? p.fid : feat.properties?.fid,
      number: p.number != null ? p.number : '',
      estado,
      lote: lote || (p.lote != null ? String(p.lote) : ''),
      manzana: manzana || (p.manzana != null ? String(p.manzana) : ''),
      area: area, // string sin unidad con 2 decimales
      precio: precio
    };
    return feat;
  });

  fs.writeFileSync(filePath, JSON.stringify(gj, null, 2));
  console.log('Migración completada:', filePath);
}

try {
  migrate();
} catch (e) {
  console.error('Error en la migración:', e);
  process.exit(1);
}


