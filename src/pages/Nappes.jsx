/// Copyright (c) Pascal Brand
/// MIT License
///


import { HubeauMap } from '../components/Hubeau'

// https://hubeau.eaufrance.fr/page/api-piezometrie

const handles = {
  getStationCoords: (station) => [ station.y, station.x ],
  getStationDesc: (station) => station.libelle_pe,
  getStationWorking: (station) => (station.date_fin_mesure >= "2022-07-01"),
  getHubeauStationsUri: (north, east, south, west) =>
    `https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/stations/?bbox=${west},${south},${east},${north}&format=json`,
  getStationId: (station) => station.bss_id,
  getHubeauObservationUri: (station) =>
    `https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/chroniques_tr?bss_id=${station.bss_id}&size=20`,
  observationToStr: (observation) => (observation && observation[0]) ? `Profondeur: ${observation[0].profondeur_nappe}m` : `Aucune Mesure`,
}



// https://hubeau.eaufrance.fr/api/v1/hydrometrie/observations_tr?code_entite=O9090010&size=20

function Nappes() {
  return (
    <HubeauMap 
      handles={handles}
    />
  );
}
export default Nappes
