/// Copyright (c) Pascal Brand
/// MIT License
///

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet'
// import 'leaflet/dist/leaflet.css';

const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Pascal Brand'

// https://api.gouv.fr/documentation/api_hubeau_hydrometrie
// https://hubeau.eaufrance.fr/sites/default/files/api/demo/hydro_tr.htm



//   'https://hubeau.eaufrance.fr/api/v1/hydrometrie/observations_tr?code_entite=O9090010&size=20'


async function getHydroStations(north, east, south, west) {
  const uri = `https://hubeau.eaufrance.fr/api/v1/hydrometrie/referentiel/stations?bbox=${west},${south},${east},${north}&format=json`
  const get = await fetch(uri)
  const responses = await get.json();
  return responses.data;
}

async function getHydroObservation(stationCode) {
  const uri = `https://hubeau.eaufrance.fr/api/v1/hydrometrie/observations_tr?code_entite=${stationCode}&format=json&size=20`
  const get = await fetch(uri)
  const responses = await get.json();
  let result = { streamFlow: null, height: null }
  responses.data.forEach(e => {
    if (!result.height && e.grandeur_hydro === 'H') {
      result.height = e.resultat_obs;   // height in mm
    }
    if (!result.streamFlow && e.grandeur_hydro === 'Q') {
      result.streamFlow = e.resultat_obs / 1000;    // stream flow in m3 / s
    }
  });

  return result;
}

// https://hubeau.eaufrance.fr/api/v1/hydrometrie/observations_tr?code_entite=O9090010&size=20

// https://leafletjs.com/examples/quick-start/
// https://react-leaflet.js.org/docs/example-popup-marker/
function CoursEau() {
  const [stations, setStations] = useState(null)
  const observations = useRef({});

  function addObservation(stationCode, streamFlow, height) {
    if (observations.current[stationCode]) {
      return;
    }
    observations.current[stationCode] = { height, streamFlow }
  }

  function updateNewBound(e) {
    let newBounds = e.target.getBounds();
    getHydroStations(newBounds.getNorth(), newBounds.getEast(), newBounds.getSouth(), newBounds.getWest())
      .then((s) => {
        setStations(s)    // set all the stations inside this new bounds
        observations.current = {}   // reset all observations so that popups are fine
      });
  }

  function MyMapEvents() {
    const map = useMapEvents({
      // look at https://leafletjs.com/reference.html for events
      moveend: updateNewBound,
    });
  }

  function StationsMarkers() {
    if (stations) {     // we have fetched all stations
      return (
        stations.map((s, i) => {
          if (s.en_service) {
            return (
              <Marker
                key={s.code_station}
                position={[s.latitude_station, s.longitude_station]}
                eventHandlers={{
                  // look at https://leafletjs.com/reference.html for events
                  popupopen: (e) => {
                    if (!observations.current[s.code_station]) {
                      getHydroObservation(s.code_station)
                        .then(r => {
                          addObservation(s.code_station, r.streamFlow, r.height)
                          e.target.closePopup().unbindPopup();
                          e.target.bindPopup(`Débit: ${r.streamFlow}m3/h<br>Hauteur: ${r.height}mm`);
                          e.target.openPopup()
                        })
                    }
                  },
                }}
              >

                <Tooltip> {s.libelle_station} </Tooltip>
                <Popup> Recherche... </Popup>
              </Marker>
            );
          } else {
            return null;
          }
        }))
    } else {
      return null;
    }
  }

  return (
    <>
      <MapContainer center={[44.8702832, -0.6038162]} zoom={9} scrollWheelZoom={true} whenReady={updateNewBound}>
        <TileLayer
          attribution={attribution}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <StationsMarkers />

        <MyMapEvents />
      </MapContainer>
    </>
  )

}
export default CoursEau


// TODO: group markers
// TODO: history graph for a given station
// TODO: cote d'alerte
// TODO: getting the map example at https://react-leaflet.js.org/docs/example-external-state/
//       can be interesting
// TODO: lazy-load leaflet when used only
