/// Copyright (c) Pascal Brand
/// MIT License
///

// import 'leaflet/dist/leaflet.css';


import { HubeauMap } from '../components/Hubeau'


// https://api.gouv.fr/documentation/api_hubeau_hydrometrie
// https://hubeau.eaufrance.fr/sites/default/files/api/demo/hydro_tr.htm

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



// https://hubeau.eaufrance.fr/api/v1/hydrometrie/observations_tr?code_entite=O9090010&size=20

function CoursEau() {
  return (
    <HubeauMap 
      apiStation='/v1/hydrometrie/referentiel/stations/'
      apiObservation='/v1/hydrometrie/observations_tr'
      observationToStr={observationToStr}
    />
  );
}
export default CoursEau
