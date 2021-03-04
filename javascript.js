var map = L.map('map').setView([47.5086,-122.3551], 14);
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidG9tdHJ1b25nMDYyMzk5IiwiYSI6ImNraG13cWVscTB0bWQzNW85YWNrdDN1cHkifQ.yHyazdWzemx0rGc7560vWw', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 20,
    id: 'mapbox/satellite-streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoidG9tdHJ1b25nMDYyMzk5IiwiYSI6ImNraG13cWVscTB0bWQzNW85YWNrdDN1cHkifQ.yHyazdWzemx0rGc7560vWw'
}).addTo(map);

L.easyButton('fas fa-info', function(){
  alert("The purpose of this map is to report any sidewalks that are in need of any maintenance/repair in the neighborhood of White Center. To use this application, either click on the point or line button below to pinpoint or pinpoint an area that has a sidewalk that is needing attention.");
}).addTo(map);

var drawnItems = L.featureGroup().addTo(map);

var cartoData = L.layerGroup().addTo(map);
var url = "https://tomtruong062399.carto.com/api/v2/sql";
var urlGeoJSON = url + "?format=GeoJSON&q=";
var sqlQuery = "SELECT the_geom, name, date, hazard, urgency, image, notes FROM lab_3c_tom";
function addPopup(feature, layer) {
  layer.bindPopup(
    "<b>" + feature.properties.name + "</b><br>" +
    feature.properties.date + "<br>" +
    "<u>Hazard</u>: " +
    feature.properties.hazard + "<br>" +
    "<u>Urgency</u>: " +
    feature.properties.urgency + " out of 5.<br>" +
    "<u>Image</u>: " +
    feature.properties.image + "<br>" +
    "<u>Notes</u>: " +
    feature.properties.notes
  );
}

fetch(urlGeoJSON + sqlQuery)
  .then(function(response) {
  return response.json();
  })
  .then(function(data) {
    L.geoJSON(data, {onEachFeature: addPopup}).addTo(cartoData);
  });

new L.Control.Draw({
  draw: {
    polygon: false,
    polyline: true,
    rectangle: false,
    circle: false,
    circlemarker: false,
    marker: true
  },
  edit: {
    featureGroup: drawnItems
  }
}).addTo(map);

function createFormPopup() {
  var popupContent =
    '<form>' +
    '<label for="name">User\'s Name/Alias:</label><br>' +
    '<input type="text" id="input_name" name="name"><br>' +
    '<label for="date">Today\'s Date:</label>' +
    '<strong><abbr title="required">*</abbr></strong><br>' +
    '<input type="date" id="input_date" name="date"><br>' +
    '<label for="hazard">What is unsafe about this sidewalk?</label>' +
    '<strong><abbr title="required">*</abbr></strong><br>' +
    '<input type="text" id="input_hazard" name="hazard"><br>' +
    '<label for="urgency">How urgent is maintenance/repair needed?</label><br>' +
    '<input type="range" id="input_urgency" name="urgency" min="1" max="5"><br>' +
    '<label for="image">Submit an image:</label><br>' +
    '<input type="file" id="input_image" name="image" accept="image/png, image/jpeg"><br>' +
    '<label for="notes">Additional Notes:</label><br>' +
    '<input type="text" id="input_notes" name="notes"><br>' +
    '<input type="button" id="submit" value="Submit">' +
    '<input type="reset">' +
    '</form>'
  drawnItems.bindPopup(popupContent).openPopup();
}

map.addEventListener("draw:created", function(e) {
  e.layer.addTo(drawnItems);
  createFormPopup();
});

function setData(e) {
  if(e.target && e.target.id == "submit") {

    // Get user name and description
    var enteredName = document.getElementById("input_name").value;
    var enteredDate = document.getElementById("input_date").value;
    var enteredHazard = document.getElementById("input_hazard").value;
    var enteredUrgency = document.getElementById("input_urgency").value;
    var enteredImage = document.getElementById("input_image").value;
    var enteredNotes = document.getElementById("input_notes").value;

    // For each drawn layer
    drawnItems.eachLayer(function(layer) {
      // Create SQL expression to insert layer
      var drawing = JSON.stringify(layer.toGeoJSON().geometry);
      var sql =
        "INSERT INTO lab_3c_tom (the_geom, name, date, hazard, urgency, image, notes) " +
        "VALUES (ST_SetSRID(ST_GeomFromGeoJSON('" +
        drawing + "'), 4326), '" +
        enteredName + "', '" +
        enteredDate + "', '" +
        enteredHazard + "', '" +
        enteredUrgency + "', '" +
        enteredImage + "', '" +
        enteredNotes + "')";
      console.log(sql);

      // Send the data
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
          body: "q=" + encodeURI(sql)
      })
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        console.log("Data saved:", data);
      })
      .catch(function(error) {
        console.log("Problem saving the data:", error);
      });

    // Transfer submitted drawing to the CARTO layer
    // so it persists on the map without you having to refresh the page
    var newData = layer.toGeoJSON();
    newData.properties.name = enteredName;
    newData.properties.date = enteredDate;
    newData.properties.hazard = enteredHazard;
    newData.properties.urgency = enteredUrgency;
    newData.properties.image = enteredImage;
    newData.properties.notes = enteredNotes;
    L.geoJSON(newData, {onEachFeature: addPopup}).addTo(cartoData);
  });

    // Clear drawn items layer
    drawnItems.closePopup();
    drawnItems.clearLayers();
  }
}

document.addEventListener("click", setData);

map.addEventListener("draw:editstart", function(e) {
  drawnItems.closePopup();
});
map.addEventListener("draw:deletestart", function(e) {
  drawnItems.closePopup();
});
map.addEventListener("draw:editstop", function(e) {
  drawnItems.closePopup();
});
map.addEventListener("draw:deletestop", function(e) {
  if(drawnItems.getLayers().length > 0) {
    drawnItems.openPopup();
  }
});
