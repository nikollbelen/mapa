const cesiumAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhZjZhYjQzYy1mZjQ4LTQ2ZmQtODA1Ny0zMGE4NzBlZWU0MmYiLCJpZCI6MzI4ODA5LCJpYXQiOjE3NTQzNzQwMTl9.A8xim5ZBXQjGV4LSozE15K9lx8TsKDgTiPv1AemSRE8";

const targetLocation = {
  destination: Cesium.Cartesian3.fromDegrees(-71.897501999995606, -17.102390235314615, 100),
  orientation: {
    heading: Cesium.Math.toRadians(0.0),
    pitch: Cesium.Math.toRadians(-15.0),
  },
};

const url = {
    'treeGlb' : './glbData/tree.glb'
}

export { cesiumAccessToken, targetLocation, url };