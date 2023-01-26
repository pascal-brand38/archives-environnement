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

var today = new Date();
var dd = String(today.getDate()).padStart(2, '0');
var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
var yyyy = today.getFullYear();
const mainDates = {
  startDate: '1959-01-01',
  endDate: yyyy + '-' + mm + '-' + dd,
  firstYear: 1959,
  lastYear: yyyy
}



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
            apiField: `&start_date=${mainDates.startDate}&end_date=${mainDates.endDate}&daily=temperature_2m_min`,
            getData: (jsonResponse) => jsonResponse.daily.temperature_2m_min,
            getLabels: (jsonResponse) => jsonResponse.daily.time,
          },
          {
            description: "Température Max",
            apiField: `&start_date=${mainDates.startDate}&end_date=${mainDates.endDate}&daily=temperature_2m_max`,
            getData: (jsonResponse) => jsonResponse.daily.temperature_2m_max,
            getLabels: (jsonResponse) => jsonResponse.daily.time,
          },
          {
            description: "Précipitations",    // TODO: graphs for precipitations is not that good
            apiField: `&start_date=${mainDates.startDate}&end_date=${mainDates.endDate}&daily=precipitation_sum`,
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

  let labelsPerDay = []   // array [0..365] containing the labels for 1 year (day-month)
  let datasPerDay = []    // array [0..365] containing arrays of values for a given day
  let datasSelectedYear = []    // array [0..365] containing the value for a given day of the selected year

  let selectedYearInt = parseInt(selectedYearString)
  for (let i=0; i<365; i++) {
    labelsPerDay.push(removeYear(labels[i]))
    datasPerDay[i] = []
  }
  let currDay = 0;
  let currentYear = mainDates.firstYear;
  for (let i=0; i<labels.length; i++) {
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
    // TODO: min/max without taking 10 last years...
    // list = list.slice(0, mainDates.lastYear - mainDates.firstYear - 10 )
    list = list.filter((e) => (e!==null)).sort((a,b)=>a-b)
    minPerDay.push(list[0])
    maxPerDay.push(list[list.length - 1])
    
    averagePerDay.push(list.reduce((a, b) => a + b, 0) / list.length);
  })

  let histogramLabels = new Array(mainDates.lastYear - mainDates.firstYear + 1).fill(0)
  histogramLabels.forEach((item, index) => histogramLabels[index] = index + 159)
  let histogramLow = new Array(mainDates.lastYear - mainDates.firstYear + 1).fill(0);
  let histogramHigh = new Array(mainDates.lastYear - mainDates.firstYear + 1).fill(0);
  currentYear = 0;
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

function OpenMeteoCopyright() {
  return (
    <a 
      style={{fontSize: "var(--rch-size-xs", textDecoration: "none", color: "var(--rch-color-2)"}}
      href="https://open-meteo.com/"
    >
      Weather data by Open-Meteo.com
    </a>
  );
}

function Climat() {
  const [ townInfo, setTownInfo ] = useState(null);
  const [ year, setYear ] = useState(parseInt(mainDates.lastYear));
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
      .catch((error) => {
        setGraphData(null)
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

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "var(--rch-size-s)" }}>
        <RchGeoCoords
          defaultTownName= 'Bordeaux'
          defaultDisplay= 'Bordeaux - Gironde'
          newCoordsCallback= { setTownInfo}
          countryFilter= { ['FR'] }
          maxInList={10}
          />

        <RchDropdown
          type= 'dropdown'
          initialValue= { mainDates.lastYear }
          list= { getListYear(mainDates.lastYear, mainDates.firstYear) }
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
        <>
          <div style={{height: "60vh", width: "100%"}}>
            <Line redraw={true} options={chartjsOptions} data={graphData.line} />
          </div>
          <OpenMeteoCopyright />
        </>
      }
      { /* graphData && <Bar  data={graphData.bar} /> */ }

      { loading && <Loading /> }
    </div>
  )
}
export default Climat;


// TODO: rainfall graph is meaningless... should be stats on months, not days
// TODO: have a min/max on 50years only, not including the last years...
// TODO: do not reload when year / variableIndex change. Only update stats
