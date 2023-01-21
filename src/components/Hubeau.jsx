/// Copyright (c) Pascal Brand
/// MIT License
///
/// Use react-leaflet:
///     https://leafletjs.com/examples/quick-start/
///     https://react-leaflet.js.org/docs/example-popup-marker/

// TODO: group markers when too many stations at the same place
// TODO: history graph for a given station
// TODO: cote d'alerte
// TODO: getting the map example at https://react-leaflet.js.org/docs/example-external-state/
//       can be interesting
// TODO: lazy-load leaflet when used only

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet'

const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Pascal Brand'

/// getHubeauStations()
/// get the all the stations from Hubeau, for a given apiuri
/// This could be:
/// - /v1/hydrometrie/referentiel/stations
///       rivers streamflow, height,... - cf. https://hubeau.eaufrance.fr/page/api-hydrometrie
/// - /v1/niveaux_nappes/stations
//        piezometry (heigh,... of inground water) - cf. !https://hubeau.eaufrance.fr/page/api-piezometrie
/// north, east, south, west correspond to gps coordinate of the geo rectangle we want the stations for
/// 
/// it returns datas, as described in the Hubeau API.
/// Typically an array of json objects repreasenting stations containing:
/// - latitude_station
/// - longitude_station
/// - en_service: still working or not
///
async function getHubeauStations(apiuri, north, east, south, west) {
  const uri = `https://hubeau.eaufrance.fr/api/${apiuri}?bbox=${west},${south},${east},${north}&format=json`
  const get = await fetch(uri)
  const responses = await get.json();
  return responses.data;
}

/// getHubeauObservation
/// get hubeau observations of a stations, for a given apiuri
/// Tested with:
/// - /v1/hydrometrie/observations_tr
async function getHubeauObservation(apiuri, stationCode) {
  const uri = `https://hubeau.eaufrance.fr/api/${apiuri}?code_entite=${stationCode}&format=json&size=20`
  const get = await fetch(uri)
  const responses = await get.json();
  return responses.data;
}

/// Show a map for Hubeau
/// apiStation: api to get all the stations. This has been tested with
///       /v1/hydrometrie/referentiel/stations
/// apiObservation: api to get an observation of a station. This has been tested with:
///       /v1/hydrometrie/observations_tr
///
function HubeauMap({ apiStation, apiObservation, observationToStr }) {
  const [stations, setStations] = useState(null)
  const observations = useRef({});

  function addObservation(stationCode, observation) {
    if (observations.current[stationCode]) {
      return;
    }
    observations.current[stationCode] = observation
  }

  function updateNewBound(e) {
    let newBounds = e.target.getBounds();
    getHubeauStations(apiStation, newBounds.getNorth(), newBounds.getEast(), newBounds.getSouth(), newBounds.getWest())
      .then((s) => {
        setStations(s)    // set all the stations inside this new bounds
        observations.current = {}   // reset all observations so that popups are fine
      });
  }

  function MyMapEvents() {
    // look at https://leafletjs.com/reference.html for events
    const map = useMapEvents({
      moveend: updateNewBound,
    });
  }

  // Display all stations
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
                      getHubeauObservation(apiObservation, s.code_station)
                        .then(r => {
                          addObservation(s.code_station, r)
                          e.target.closePopup().unbindPopup();
                          e.target.bindPopup(observationToStr(observations.current[s.code_station]));
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

export {
  HubeauMap,
}
