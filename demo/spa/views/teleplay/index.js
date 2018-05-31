$(document).ready(function(){

var wmsSource = new ol.source.ImageWMS({
  url: 'https://ahocevar.com/geoserver/wms',
  params: {'LAYERS': 'ne:ne'},
  serverType: 'geoserver',
  crossOrigin: 'anonymous'
});

var wmsLayer = new ol.layer.Image({
  source: wmsSource
});

var view = new ol.View({
  center: [0, 0],
  zoom: 1
});

var map = new ol.Map({
  layers: [wmsLayer],
  target: 'map',
  view: view
});

})