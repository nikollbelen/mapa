const cesiumAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzZDMxYTY1NC0wMWFkLTQ4ZmYtOGY4Mi1kM2YzZGU3ZjI4ODgiLCJpZCI6MzQxNTYwLCJpYXQiOjE3NTc5NTY2Njd9.GS7RXm_KXu_B0oPkuyq9DGVQ32PhhTOOnbGdudD_jZY";

const targetLocation = {
  destination: Cesium.Cartesian3.fromDegrees(-71.897501999995606, -17.102390235314615, 100),
  orientation: {
    heading: Cesium.Math.toRadians(0.0),
    pitch: Cesium.Math.toRadians(-15.0),
  },
};
  
const openRouteServiceKey =
"eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJlOTVmNWNlOGI4MzQ4MWM5ODY2MmQ5MTIxMGYxY2NmIiwiaCI6Im11cm11cjY0In0=";

export { cesiumAccessToken, targetLocation, openRouteServiceKey };