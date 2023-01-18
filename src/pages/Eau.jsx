/// Copyright (c) Pascal Brand
/// MIT License
///

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css';


// https://api.gouv.fr/documentation/api_hubeau_hydrometrie

// async function getHydroStation() {
//   const get = await fetch('https://hubeau.eaufrance.fr/api/v1/hydrometrie/referentiel/stations?bbox=1.6194%2C47.7965%2C2.1910%2C47.9988&format=json&size=20')
//   const responses = await get.json();
//   return responses.data;
// }


async function getHydroStation(north, east, south, west) {
  const uri = `https://hubeau.eaufrance.fr/api/v1/hydrometrie/referentiel/stations?bbox=${west},${south},${east},${north}&format=json`
  //const enc = encodeURI(uri)
  //console.log(enc)
  const get = await fetch(uri)
  const responses = await get.json();
  return responses.data;
}

  
// https://leafletjs.com/examples/quick-start/
// https://react-leaflet.js.org/docs/example-popup-marker/
function Eau() {
  const [center, setCenter] = useState([44.8702832, -0.6038162])   // center of the map
  const [stations, setStations] = useState(null)

  // useEffect(() => {
  //   getHydroStation().then((s) => setStations(s));
  // }, [])

  const updateNewBound = (e) => {
    let newBounds = e.target.getBounds();
    console.log('Bounds ', newBounds);
  
    getHydroStation(newBounds.getNorth(), newBounds.getEast(), newBounds.getSouth(), newBounds.getWest() ).
    then((s) => { console.log(s); setStations(s)});

  }

  function MyMapEvents() {
    const map = useMapEvents({
      // look at https://leafletjs.com/reference.html for events
      moveend: updateNewBound,
    });
  }
  

  return (
    <>
      <MapContainer center={center} zoom={9} scrollWheelZoom={true} whenReady={updateNewBound}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {stations && stations.map((s, i) =>
          <Marker key={i} position={[s.latitude_station, s.longitude_station]}
            eventHandlers={{
              click: () => {
                console.log(`marker ${i} clicked`)
              },
            }}
          >

            <Tooltip>Tooltip for Marker {i} </Tooltip>
            <Popup>
              A pretty CSS3 popup. <br /> Easily customizable.
            </Popup>
          </Marker>
        )
        }
        <MyMapEvents />
      </MapContainer>
    </>
  )

}
export default Eau


// TODO: group markers
