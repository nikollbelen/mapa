const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'terrenos.geojson');

function toNumber(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
  return NaN;
}

function assign() {
  const raw = fs.readFileSync(filePath, 'utf8');
  const gj = JSON.parse(raw);
  if (!gj || !Array.isArray(gj.features)) throw new Error('GeoJSON inválido');

  gj.features.forEach((feat) => {
    const p = feat.properties || {};
    const area = toNumber(p.area) || 0;
    // Precio de referencia: $240 por m², redondeo al múltiplo de 100
    const total = Math.max(0, Math.round((area * 240) / 100) * 100);
    p.precio = String(total);
    // number = número del lote
    if (p.lote != null && p.lote !== '') {
      p.number = String(p.lote);
    } else if (p.number == null || p.number === '') {
      p.number = '';
    }
    feat.properties = p;
  });

  fs.writeFileSync(filePath, JSON.stringify(gj, null, 2));
  console.log('Precios asignados y number actualizado en:', filePath);
}

try { assign(); } catch (e) { console.error(e); process.exit(1); }


