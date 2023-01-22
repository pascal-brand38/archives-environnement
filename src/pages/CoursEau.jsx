/// Copyright (c) Pascal Brand
/// MIT License
///
/// Show a map with river stations (in france), and display levels on click
///
/// Useful links:
///   https://api.gouv.fr/documentation/api_hubeau_hydrometrie
///   https://hubeau.eaufrance.fr/sites/default/files/api/demo/hydro_tr.htm
///   https://hubeau.eaufrance.fr/api/v1/hydrometrie/observations_tr?code_entite=O9090010&size=20

import { HubeauMap } from '../components/Hubeau'

function observationToStr(observation) {
  let streamFlow=null
  let height=null
  observation.forEach(e => {
    if (!height && e.grandeur_hydro === 'H') {
      height = e.resultat_obs;   // height in mm
    }
    if (!streamFlow && e.grandeur_hydro === 'Q') {
      streamFlow = e.resultat_obs / 1000;    // stream flow in m3 / s
    }
  });
  return `Débit: ${streamFlow}m3/h<br>Hauteur: ${height}mm`;
}

const handles = {
  getStationCoords: (station) => [ station.latitude_station, station.longitude_station ],
  getStationDesc: (station) => station.libelle_station,
  getStationWorking: (station) => station.en_service,
  getHubeauStationsUri: (north, east, south, west) =>
    `https://hubeau.eaufrance.fr/api/v1/hydrometrie/referentiel/stations/?bbox=${west},${south},${east},${north}&format=json`,
  getStationId: (station) => station.code_station,
  getHubeauObservationUri: (station) => 
    `https://hubeau.eaufrance.fr/api/v1/hydrometrie/observations_tr?code_entite=${station.code_station}&format=json&size=20`,
  observationToStr: observationToStr,
}

function CoursEau() {
  return (
    <HubeauMap 
      handles={handles}
    />
  );
}
export default CoursEau
