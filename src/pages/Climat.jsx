/// Copyright (c) Pascal Brand
/// MIT License
///


import { useState } from 'react';
import PbrSEO from '../components/PbrSeo';
import RchDropdown from 'react-components-helper/components/RchDropdown'
import RchGeoCoords from 'react-components-helper/components/RchGeoCoords'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { useEffect } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

var chartjsOptions = {
  //responsive: false,
  maintainAspectRatio: false,
  color: "White",
  plugins: {
    legend: {
      position: "top",
    },
    title: {
      display: true,
      color: "White",
    },
  },
  elements: {
    point: {
      pointStyle: false,
    },
    line: {
      borderWidth: 1,
    },
  },
  scales: {
    // checks https://www.chartjs.org/docs/latest/axes/labelling.html#creating-custom-tick-formats
    x: {
      ticks: {
        autoskip: false,
        // callback: function (value, index, ticks) {
        //   if ((index + 12) % 24 == 0) {
        //     const reYearMonth = /[0-9]{4}-[0-9]{2}-/g;
        //     const reT = /T/g;
        //     return this.getLabelForValue(value)
        //       .replace(reYearMonth, "")
        //       .replace(reT, " ");
        //   } else {
        //     return "";
        //   }
        // },
      },
    },
    y: {
      ticks: {
        callback: function (value, index, ticks) {
          return value + "°";   // TODO: use suffix there
        },
      },
    },
  },
};

// from https://open-meteo.com/en/docs/meteofrance-api
const meteoConfig = {
  archive: {
    // sources: list of the sources to get data. Contains
    // - url: url of the api to get datas
    // - apiTownInfo: function to get the fields to add to the api to get datas for a given town (longitude and latitude)
    // as well as the description of the source to be set in graph
    sources: [
      { // https://open-meteo.com/en/docs/historical-weather-api
        url: "https://archive-api.open-meteo.com/v1/archive?timezone=Europe%2FBerlin",
        apiTownInfo: (townInfo) => { return "&latitude=" + townInfo.latitude + "&longitude=" + townInfo.longitude },
        description: "Historique",
        availableVariables: [ 
          "Température Min",
          "Température Max",
          "Précipitations"
        ],
        variables: [
          {
            description: "Température Min",
            apiField: "&start_date=1959-01-01&end_date=2023-01-09&daily=temperature_2m_min",    // TODO: start and end dates
            getData: (jsonResponse) => jsonResponse.daily.temperature_2m_min,
            getLabels: (jsonResponse) => jsonResponse.daily.time,
          },
          {
            description: "Température Max",
            apiField: "&start_date=1959-01-01&end_date=2023-01-09&daily=temperature_2m_max",    // TODO: start and end dates
            getData: (jsonResponse) => jsonResponse.daily.temperature_2m_max,
            getLabels: (jsonResponse) => jsonResponse.daily.time,
          },
          {
            description: "Précipitations",    // TODO: graphs for precipitations is not that good
            apiField: "&start_date=1959-01-01&end_date=2023-01-09&daily=precipitation_sum",    // TODO: start and end dates
            getData: (jsonResponse) => jsonResponse.daily.precipitation_sum,
            getLabels: (jsonResponse) => jsonResponse.daily.time,
          },
        ],
      }
    ],
  },
};

function getSrc() { return meteoConfig.archive.sources[0]; }
function getVariable(index) { return getSrc().variables[index]; }

function getStats(labels, datas, selectedYearString) {
  const removeYear = (label) => label.substring(5);
  const getYear = (label) => label.substring(0,4);

  let labelsPerDay = []   // array [0..365] containing the labels for 1 year (day-month)
  let datasPerDay = []    // array [0..365] containing arrays of values for a given day
  let datasSelectedYear = []    // array [0..365] containing the value for a given day of the selected year

  let selectedYearInt = parseInt(selectedYearString)
  for (let i=0; i<365; i++) {
    labelsPerDay.push(removeYear(labels[i]))
    datasPerDay.push([ datas[i] ])
  }
  let currDay = 0;
  let currentYear = 1959+1;   // TODO: hardcoded value
  for (let i=365; i<labels.length; i++) {
    if (currDay === 31 + 29) {  // check it is not the 29th of February, that we skip
      if (removeYear(labels[i]) !== labelsPerDay[currDay]) {
        continue
      }
    }
    if (selectedYearInt === currentYear) {
      datasSelectedYear.push(datas[i])
    }
    datasPerDay[currDay].push(datas[i])

    currDay = (currDay + 1) % 365;
    if (currDay === 0) {
      currentYear ++
    }
  }

  let minPerDay = []
  let maxPerDay = []
  let averagePerDay = [];
  datasPerDay.forEach((list, index) => {
    list.sort((a,b)=>a-b)
    minPerDay.push(list[0])
    maxPerDay.push(list[list.length - 1])
    
    averagePerDay.push(list.reduce((a, b) => a + b, 0) / list.length);
  })

  let histogramLabels = new Array(2023 - 1959 + 1).fill(0)
  histogramLabels.forEach((item, index) => histogramLabels[index] = index + 159)
  let histogramLow = new Array(2023 - 1959 + 1).fill(0);
  let histogramHigh = new Array(2023 - 1959 + 1).fill(0);
  currentYear = 0;   // TODO: hardcoded value
  currDay = 0
  for (let i=0; i<datas.length; i++) {
    if (currDay === 31 + 29) {  // check it is not the 29th of February, that we skip
      if (removeYear(labels[i]) !== labelsPerDay[currDay]) {
        continue
      }
    }

    let low = datasPerDay[currDay][3];
    let high = datasPerDay[currDay][datasPerDay[currDay].length-1-3]

    if (datas[i] < low) {
      histogramLow[currentYear]--;
    }
    if (datas[i] > high) {
      histogramHigh[currentYear]++;
    }
    currDay = (currDay + 1) % 365;
    if (currDay === 0) {
      currentYear ++
    }
  }


  return {
    labelsPerDay,   // array [0..365] containing the labels for 1 year (day-month)
    minPerDay,
    maxPerDay,
    averagePerDay,
    datasSelectedYear,
    histogramLabels,
    histogramLow,
    histogramHigh,
  }
}

async function getWeatherData(townInfo, variableIndex) {
  const src = getSrc();
  const variable = getVariable(variableIndex);
  const get = await fetch(src.url + src.apiTownInfo(townInfo) + variable.apiField);
  const responses = await get.json();
  return responses;
}

function getListYear(from, to) {
  let list = [];
  for (let y=from; y>=to; y--) {
    list.push(y.toString())
  }
  return list
}

import logo from "../img/sun.svg"
function Loading() {
  return (
    <div className="rch-flex rch-modal ">
      <div className="rch-loading-rotate"> 
        <img src={logo} width={50} />
      </div>
    </div>
  );
}

function Climat() {
  const [ townInfo, setTownInfo ] = useState(null);
  const [ year, setYear ] = useState('2023');
  const [ variableIndex, setVariableIndex ] = useState(0)
  const [ loading, setLoading ] = useState(true)
  const [ graphData, setGraphData ] = useState(null);
 
  useEffect(() => {
    if (townInfo) {
      if (!loading) {
        setLoading(true)
      }
      getWeatherData(townInfo, variableIndex).then(meteoData => {
        let labels = null;
        let datasets = [];

        const minMax = getStats(
          getVariable(variableIndex).getLabels(meteoData),
          getVariable(variableIndex).getData(meteoData),
          year);

        // labels = getVariable().getLabels(meteoData)
        // datasets.push({ data: getVariable().getData(meteoData)});
        labels = minMax.labelsPerDay;
        datasets.push({
          data: minMax.minPerDay,
          label: "Min", 
          borderColor: 'Blue',
        });
        datasets.push({
          data: minMax.maxPerDay,
          label: "Max", 
          borderColor: 'Red',
        });
        datasets.push({
          data: minMax.datasSelectedYear,
          label: year,
          borderColor: 'Green',
        });
        chartjsOptions.plugins.title.text = getVariable(variableIndex).description;
        
        setGraphData({
          line: {
            labels: labels,
            datasets: datasets,
          },
          bar: {
            labels: minMax.histogramLabels,
            datasets: [ { data: minMax.histogramLow, backgroundColor:'Blue' }, { data: minMax.histogramHigh, backgroundColor:'Red' } ],
          }
        });
        setLoading(false)
      })
    }
  }, [townInfo, year, variableIndex]);

  return (
    <div>
      <PbrSEO
        title='Archives Environnement | Climat'
        description='Graphe sur les archives climatiques: température min et max, précipitations,...'
        canonical='/'
        addFacebookTag={true}
      />

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "var(--rch-margin-s)" }}>
        <RchGeoCoords
          defaultTownName= 'Bordeaux'
          defaultDisplay= 'Bordeaux - Gironde'
          newCoordsCallback= { setTownInfo}
          countryFilter= { ['FR'] }
          maxInList={10}
          />

        <RchDropdown
          type= 'dropdown'
          initialValue= '2023'
          list= { getListYear(2023, 1959) }
          valueFromItem= { (item) => item }
          onSelect= { ({ index, item }) => setYear(item) }
          maxNbInCol= {20}
          />

        <RchDropdown
          type= 'dropdown'
          initialValue= { getSrc().availableVariables[0] }
          list= { getSrc().availableVariables }
          valueFromItem= { (item) => item }
          onSelect= { ({ index, item }) => setVariableIndex(index) }
          />
      </div>
      
      { graphData && 
        <div style={{height: "60vh", width: "100%"}}>
          <Line redraw={true} options={chartjsOptions} data={graphData.line} />
        </div>
      }
      { /* graphData && <Bar  data={graphData.bar} /> */ }

      { loading && <Loading /> }
    </div>
  )
}
// TODO: add copyright to open data meteo

export default Climat;


// TODO: dropdown is too long for years!
// TODO: hard-coded values 2023 and 1959... should be dynamic or const
// TODO: rainfall graph is meaningless... should be stats on months, not days
