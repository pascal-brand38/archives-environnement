/// Copyright (c) Pascal Brand
/// MIT License
/// 
/// Utility component to display a map with Hubeau station (hydro, piezometry,...)
/// Takes an object of handles in input to:
/// - getStationCoords(station): return an array [latitude longitude] of the station position
/// - getStationDesc(station): return a string description of the station
/// - getStationWorking(station): return true if the station is still in use
/// - getHubeauStationsUri(north, east, south, west): return the api link to get the list of the station in a geo rectangle
/// - getStationId(station): return a unique id of the station
/// - getHubeauObservationUri(station): return the api link to get the observation from a station
/// - observationToStr(observation): return a string of the observation
///
/// Use react-leaflet:
///     https://leafletjs.com/examples/quick-start/
///     https://react-leaflet.js.org/docs/example-popup-marker/
///


// TODO: group markers when too many stations at the same place
// TODO: history graph for a given station
// TODO: cote d'alerte
// TODO: getting the map example at https://react-leaflet.js.org/docs/example-external-state/
//       can be interesting
// TODO: lazy-load leaflet when used only

import { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet'
// import 'leaflet/dist/leaflet.css';


const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Pascal Brand'

/// getUriData(): get response from an uri
///
async function getUriData(uri) {
  // console.log('uri= ', uri)
  const get = await fetch(uri)
  const responses = await get.json();
  // console.log(responses.data)
  return responses.data;
}

/// Show a map for Hubeau
/// apiStation: api to get all the stations. This has been tested with
///       /v1/hydrometrie/referentiel/stations
/// apiObservation: api to get an observation of a station. This has been tested with:
///       /v1/hydrometrie/observations_tr
///
function HubeauMap({ handles }) {
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
    getUriData(handles.getHubeauStationsUri(newBounds.getNorth(), newBounds.getEast(), newBounds.getSouth(), newBounds.getWest()))
      .then((s) => {
        setStations(s)    // set all the stations inside this new bounds
        observations.current = {}   // reset all observations so that popups are fine
      });
  }

  function MyMapEvents() {
    // look at https://leafletjs.com/reference.html for events
    useMapEvents({
      moveend: updateNewBound,
    });
  }

  // Display all stations
  function StationsMarkers() {
    if (stations) {     // we have fetched all stations
      return (
        stations.map((s, i) => {
          if (handles.getStationWorking(s)) {
            return (
              <Marker
                key={i}
                position={ handles.getStationCoords(s) }
                eventHandlers={{
                  // look at https://leafletjs.com/reference.html for events
                  popupopen: (e) => {
                    if (!observations.current[handles.getStationId(s)]) {
                      getUriData(handles.getHubeauObservationUri(s))
                        .then(r => {
                          // console.log(`station: ${JSON.stringify(s)}`)
                          addObservation(handles.getStationId(s), r)
                          e.target.closePopup().unbindPopup();
                          e.target.bindPopup(handles.observationToStr(observations.current[handles.getStationId(s)]));
                          e.target.openPopup()
                        })
                    }
                  },
                }}
              >

                <Tooltip> { handles.getStationDesc(s) } </Tooltip>
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
      <MapContainer style={{height: "75vh"}} center={[44.8702832, -0.6038162]} zoom={9} scrollWheelZoom={true} whenReady={updateNewBound}>
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

import PropTypes from 'prop-types';
HubeauMap.propTypes = {
  handles: PropTypes.object.isRequired
}
