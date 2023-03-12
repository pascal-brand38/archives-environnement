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
import { Line, /* Bar */ } from "react-chartjs-2";
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
        callback: null    // is dynamic - depends on the data displayed
      }
    }
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
            cumul: false,
            yticks: (value /*, index, ticks */) => value + "°",
          },
          {
            description: "Température Max",
            apiField: `&start_date=${mainDates.startDate}&end_date=${mainDates.endDate}&daily=temperature_2m_max`,
            getData: (jsonResponse) => jsonResponse.daily.temperature_2m_max,
            getLabels: (jsonResponse) => jsonResponse.daily.time,
            cumul: false,
            yticks: (value /*, index, ticks */) => value + "°",
          },
          {
            description: "Cumul Précipitations",
            apiField: `&start_date=${mainDates.startDate}&end_date=${mainDates.endDate}&daily=precipitation_sum`,
            getData: (jsonResponse) => jsonResponse.daily.precipitation_sum,
            getLabels: (jsonResponse) => jsonResponse.daily.time,
            cumul: true,
            yticks: (value /*, index, ticks */) => value + "mm",
          },
        ],
      }
    ],
  },
};

function getSrc() { return meteoConfig.archive.sources[0]; }
function getVariable(index) { return getSrc().variables[index]; }

function getStats(labels, datas, selectedYearString, cumul) {
  const removeYear = (label) => label.substring(5);

  let labelsPerDay = []   // array [0..365] containing the labels for 1 year (day-month)
  let datasPerDay = []    // array [0..365] containing arrays of values for a given day
  let datasSelectedYear = []    // array [0..365] containing the value for a given day of the selected year
  let cumulValue = 0
  let labelMin
  let labelMax

  let selectedYearInt = parseInt(selectedYearString)
  for (let i = 0; i < 365; i++) {
    labelsPerDay.push(removeYear(labels[i]))
    datasPerDay[i] = []
  }
  let currDay = 0;
  let currentYear = mainDates.firstYear;
  let cumulYearValue = 0
  let cumulYear = [];   // array of cumul at end of year
  for (let i = 0; i < labels.length; i++) {
    if (currDay === 31 + 29) {  // check it is not the 29th of February, that we skip
      if (removeYear(labels[i]) !== labelsPerDay[currDay]) {
        continue
      }
    }
    cumulYearValue = cumulYearValue + datas[i]
    if (selectedYearInt === currentYear) {
      if (cumul) {
        cumulValue += datas[i]
        datasSelectedYear.push(cumulValue)
      } else {
        datasSelectedYear.push(datas[i])
      }
    }
    datasPerDay[currDay].push(datas[i])

    currDay = (currDay + 1) % 365;
    if (currDay === 0) {
      currentYear++
      cumulYear.push(cumulYearValue)
      cumulYearValue = 0
    }
  }

  let minPerDay = []
  let maxPerDay = []
  let averagePerDay = [];
  if (cumul) {
    // get the min and max year
    let minIndex = cumulYear.indexOf(Math.min(...cumulYear))
    let maxIndex = cumulYear.indexOf(Math.max(...cumulYear))
    let minCumul = 0
    let maxCumul = 0
    labelMin = `Min (${minIndex + mainDates.firstYear})`
    labelMax = `Max (${maxIndex + mainDates.firstYear})`
    datasPerDay.forEach(list => {
      minCumul += list[minIndex]
      maxCumul += list[maxIndex]
      minPerDay.push(minCumul)
      maxPerDay.push(maxCumul)
    })
  } else {
    labelMin = 'Min'
    labelMax = 'Max'
    datasPerDay.forEach(list => {
      // TODO: min/max without taking 10 last years...
      // list = list.slice(0, mainDates.lastYear - mainDates.firstYear - 10 )
      list = list.filter((e) => (e !== null)).sort((a, b) => a - b)
      minPerDay.push(list[0])
      maxPerDay.push(list[list.length - 1])

      averagePerDay.push(list.reduce((a, b) => a + b, 0) / list.length);
    })
  }

  let histogramLabels = new Array(mainDates.lastYear - mainDates.firstYear + 1).fill(0)
  histogramLabels.forEach((item, index) => histogramLabels[index] = index + 159)
  let histogramLow = new Array(mainDates.lastYear - mainDates.firstYear + 1).fill(0);
  let histogramHigh = new Array(mainDates.lastYear - mainDates.firstYear + 1).fill(0);
  currentYear = 0;
  currDay = 0
  for (let i = 0; i < datas.length; i++) {
    if (currDay === 31 + 29) {  // check it is not the 29th of February, that we skip
      if (removeYear(labels[i]) !== labelsPerDay[currDay]) {
        continue
      }
    }

    let low = datasPerDay[currDay][3];
    let high = datasPerDay[currDay][datasPerDay[currDay].length - 1 - 3]

    if (datas[i] < low) {
      histogramLow[currentYear]--;
    }
    if (datas[i] > high) {
      histogramHigh[currentYear]++;
    }
    currDay = (currDay + 1) % 365;
    if (currDay === 0) {
      currentYear++
    }
  }


  return {
    labelsPerDay,   // array [0..365] containing the labels for 1 year (day-month)
    minPerDay,
    labelMin,
    maxPerDay,
    labelMax,
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
  for (let y = from; y >= to; y--) {
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
      style={{ fontSize: "var(--rch-size-xs", textDecoration: "none", color: "var(--rch-color-2)" }}
      href="https://open-meteo.com/"
    >
      Weather data by Open-Meteo.com
    </a>
  );
}

// populated array meteoDataArray[town][variableindex] populated on the fly on request
let meteoDataArray = {}

async function getMeteoData(townInfo, index, year, callback) {
  let town = townInfo.name + ' - ' + townInfo.admin2
  console.log(town)
  console.log(meteoDataArray[town])
  if (meteoDataArray[town] === undefined) {
    console.log('1')
    meteoDataArray[town] = []
    for (let i = 0; i < getSrc().availableVariables.length; i++) {
      meteoDataArray[town].push(null)
    }
    console.log(`meteoDataArray[town]= ${meteoDataArray[town]}`)
  }

  if (meteoDataArray[town][index] === null) {
    getWeatherData(townInfo, index).then(meteoData => {
      meteoDataArray[town][index] = meteoData
      console.log(meteoData)
      callback(meteoData, townInfo, index, year)
    })
  } else {
    callback(meteoDataArray[town][index], townInfo, index, year)
  }
}

function Climat() {
  const [townInfo, setTownInfo] = useState(null);
  const [year, setYear] = useState(parseInt(mainDates.lastYear));
  const [variableIndex, setVariableIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState(null);

  function setGraphFromMeteoData(meteoData, currentTownInfo, currentIndex, currentYear) {
    console.log(`setGraphFromMeteoData ${meteoData}`)
    let labels = null;
    let datasets = [];

    const minMax = getStats(
      getVariable(currentIndex).getLabels(meteoData),
      getVariable(currentIndex).getData(meteoData),
      currentYear,
      getVariable(currentIndex).cumul);

    // labels = getVariable().getLabels(meteoData)
    // datasets.push({ data: getVariable().getData(meteoData)});
    labels = minMax.labelsPerDay;
    datasets.push({
      data: minMax.minPerDay,
      label: minMax.labelMin,
      borderColor: 'Blue',
    });
    datasets.push({
      data: minMax.datasSelectedYear,
      label: currentYear,
      borderColor: 'Green',
    });
    datasets.push({
      data: minMax.maxPerDay,
      label: minMax.labelMax,
      borderColor: 'Red',
    });
    chartjsOptions.plugins.title.text = getVariable(currentIndex).description;
    chartjsOptions.scales.y.ticks.callback = getVariable(currentIndex).yticks;

    setGraphData({
      line: {
        labels: labels,
        datasets: datasets,
      },
      bar: {
        labels: minMax.histogramLabels,
        datasets: [{ data: minMax.histogramLow, backgroundColor: 'Blue' }, { data: minMax.histogramHigh, backgroundColor: 'Red' }],
      }
    });
    setLoading(false)
  }

  function newTownInfo(town) {
    setLoading(true)
    setTownInfo(town)
    getMeteoData(town, variableIndex, year, setGraphFromMeteoData)
  }

  function newYear(currentYear) {
    setLoading(true)
    setYear(currentYear)
    getMeteoData(townInfo, variableIndex, currentYear, setGraphFromMeteoData)
  }

  function newIndex(selectedIndex) {
    setLoading(true)
    setVariableIndex(selectedIndex)
    getMeteoData(townInfo, selectedIndex, year, setGraphFromMeteoData)
  }

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
          defaultTownName='Bordeaux'
          defaultDisplay='Bordeaux - Gironde'
          newCoordsCallback={newTownInfo}
          countryFilter={['FR']}
          maxInList={10}
        />

        <RchDropdown
          type='dropdown'
          initialValue={mainDates.lastYear.toString()}
          list={getListYear(mainDates.lastYear, mainDates.firstYear)}
          valueFromItem={(item) => item}
          onSelect={({ /* index, */ item }) => newYear(item)}
          maxNbInCol={20}
        />

        <RchDropdown
          type='dropdown'
          initialValue={getSrc().availableVariables[0]}
          list={getSrc().availableVariables}
          valueFromItem={(item) => item}
          onSelect={({ index /*, item */ }) => newIndex(index)}
        />
      </div>

      {graphData &&
        <>
          <div style={{ height: "60vh", width: "100%" }}>
            <Line redraw={true} options={chartjsOptions} data={graphData.line} />
          </div>
          <OpenMeteoCopyright />
        </>
      }
      { /* graphData && <Bar  data={graphData.bar} /> */}

      {loading && <Loading />}
    </div>
  )
}
export default Climat;


// TODO: rainfall stats on months
// TODO: have a min/max on 50years only, not including the last years...
// TODO: keep all meteo data loaded
