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

function getNormalizedData(labels, data) {
  let normalizedData = []
  labels.forEach((l, index) => {
    let value = data[index]

    if (value !== null) {
      const date = l.split('-')
      let y = parseInt(date[0])
      let m = parseInt(date[1])
      let d = parseInt(date[2])
      if (m==1 && d==1) {
        normalizedData[y] = []  
      }
      if (d==1) {
        normalizedData[y][m] = []  
      }
      if ((d!=29) || (m!=2)) {
        normalizedData[y][m][d] = value
      }
    }
  })
  return normalizedData
}

function getStats(labels, datas, selectedYearString, cumul) {
  const removeYear = (label) => label.substring(5);

  // variables that are exported
  let perDay = {
    // per day stats
    xLabels: [],            // array [0..365] containing the x-labels for 1 year (mm-dd)
    minValue: [],           // array [0..365] containing the min value of this day
    titleMin: 'Min',        // title of the graph of the min
    maxValue: [],           // array [0..365] containing the max value of this day
    titleMax: 'Max',        // title of the graph of the max
    selectedYearValue: [],  // array [0..365] containing the value of this day on the selected year
    titleSelectedYear: selectedYearString,
  }
  let perMonth = {
    // per month stats: min of the average, max of the average, current year average

  }

  let normalizedData = getNormalizedData(labels, datas)
  let selectedYearInt = parseInt(selectedYearString)

  // compute perDay.xLabels
  normalizedData[2022].forEach((monthArray, mIndex) => {
    monthArray.forEach((dayValue, dIndex) => {
      perDay.xLabels.push(`${String(mIndex).padStart(2, '0')}-${String(dIndex).padStart(2, '0')}`)
    })
  })

  // compute perDay.selectedYearValue
  let cumulValue = 0
  normalizedData[selectedYearInt].forEach((monthArray, mIndex) => {
    monthArray.forEach((dayValue, dIndex) => {
      if (cumul) {
        cumulValue += dayValue
        perDay.selectedYearValue.push(cumulValue)
      } else {
        perDay.selectedYearValue.push(dayValue)
      }
    })
  })

  // compute perDay.minValue and maxValue
  if (cumul) {
    let minCumul = { yearIndex: 0, cumulValue: undefined }
    let maxCumul = { yearIndex: 0, cumulValue: 0 }
    normalizedData.forEach((yearArray, yearIndex) => {
      let cumulValue = 0
      let nbValues = 0
      yearArray.forEach((monthArray, monthIndex) => {
        monthArray.forEach((dayValue, dayIndex) => {
          cumulValue += dayValue
          nbValues ++
        })
      })

      if (nbValues > 360) {
        // in case this is the current year which is not finished
        if ((minCumul.cumulValue === undefined) || (cumulValue < minCumul.cumulValue)) {
          minCumul.cumulValue = cumulValue
          minCumul.yearIndex = yearIndex
        }
        if ((maxCumul.cumulValue === undefined) || (cumulValue > maxCumul.cumulValue)) {
          maxCumul.cumulValue = cumulValue
          maxCumul.yearIndex = yearIndex
        }
      }
    })

    let cumulValue = 0
    perDay.titleMin = `Min (${minCumul.yearIndex})`
    normalizedData[minCumul.yearIndex].forEach((monthArray, monthIndex) => {
      monthArray.forEach((dayValue, dayIndex) => {
          cumulValue += dayValue
          perDay.minValue.push(cumulValue)
      })
    })
  
    cumulValue = 0
    perDay.titleMax = `Max (${maxCumul.yearIndex})`
    normalizedData[maxCumul.yearIndex].forEach((monthArray, monthIndex) => {
      monthArray.forEach((dayValue, dayIndex) => {
          cumulValue += dayValue
          perDay.maxValue.push(cumulValue)
      })
    })
  } else {
    normalizedData.forEach((yearArray, yearIndex) => {
      let graphIndex = 0
      yearArray.forEach((monthArray, monthIndex) => {
        monthArray.forEach((dayValue, dayIndex) => {
          if (perDay.minValue[graphIndex] === undefined) {
            perDay.minValue[graphIndex] = dayValue
            perDay.maxValue[graphIndex] = dayValue
          } else {
            perDay.minValue[graphIndex] = Math.min(perDay.minValue[graphIndex], dayValue)
            perDay.maxValue[graphIndex] = Math.max(perDay.maxValue[graphIndex], dayValue)
          }
          graphIndex ++
        })
      })
    })
  }


  // let datasPerDay = []    // array [0..365] containing arrays of values for a given day
  // // cumulValue = 0

  // for (let i = 0; i < 365; i++) {
  //   //perDay.xLabels.push(removeYear(labels[i]))
  //   datasPerDay[i] = []
  // }
  // let currDay = 0;
  // let currentYear = mainDates.firstYear;
  // let cumulYearValue = 0
  // let cumulYear = [];   // array of cumul at end of year
  // for (let i = 0; i < labels.length; i++) {
  //   if (currDay === 31 + 29) {  // check it is not the 29th of February, that we skip
  //     if (removeYear(labels[i]) !== perDay.xLabels[currDay]) {
  //       continue
  //     }
  //   }
  //   cumulYearValue = cumulYearValue + datas[i]
  //   // if (selectedYearInt === currentYear) {
  //   //   if (cumul) {
  //   //     cumulValue += datas[i]
  //   //     perDay.selectedYearValue.push(cumulValue)
  //   //   } else {
  //   //     perDay.selectedYearValue.push(datas[i])
  //   //   }
  //   // }
  //   datasPerDay[currDay].push(datas[i])

  //   currDay = (currDay + 1) % 365;
  //   if (currDay === 0) {
  //     currentYear++
  //     cumulYear.push(cumulYearValue)
  //     cumulYearValue = 0
  //   }
  // }

  // if (cumul) {
  //   // get the min and max year
  //   let minIndex = cumulYear.indexOf(Math.min(...cumulYear))
  //   let maxIndex = cumulYear.indexOf(Math.max(...cumulYear))
  //   let minCumul = 0
  //   let maxCumul = 0
  //   perDay.titleMin = `Min (${minIndex + mainDates.firstYear})`
  //   perDay.titleMax = `Max (${maxIndex + mainDates.firstYear})`
  //   datasPerDay.forEach(list => {
  //     minCumul += list[minIndex]
  //     maxCumul += list[maxIndex]
  //     perDay.minValue.push(minCumul)
  //     perDay.maxValue.push(maxCumul)
  //   })
  // } else {
  //   // datasPerDay.forEach(list => {
  //   //   // TODO: min/max without taking 10 last years...
  //   //   // list = list.slice(0, mainDates.lastYear - mainDates.firstYear - 10 )
  //   //   // list = list.filter((e) => (e !== null)).sort((a, b) => a - b)
  //   //   // perDay.minValue.push(list[0])
  //   //   // perDay.maxValue.push(list[list.length - 1])

  //   //   // averagePerDay.push(list.reduce((a, b) => a + b, 0) / list.length);
  //   // })
  // }


  // per month stats: min of the average, max of the average, current year average
  perMonth.label = [ '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

  return {
    perDay,   // statistics perDay of the year
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

function displayGraph(meteoData, currentTownInfo, currentIndex, currentYear, callbackSetGraph) {
  if (meteoData === null) {
    callbackSetGraph(null)
    return
  }
  let labels = null;
  let datasets = [];

  const minMax = getStats(
    getVariable(currentIndex).getLabels(meteoData),
    getVariable(currentIndex).getData(meteoData),
    currentYear,
    getVariable(currentIndex).cumul);

  // labels = getVariable().getLabels(meteoData)
  // datasets.push({ data: getVariable().getData(meteoData)});
  labels = minMax.perDay.xLabels;
  datasets.push({
    data: minMax.perDay.minValue,
    label: minMax.perDay.titleMin,
    borderColor: 'Blue',
  });
  datasets.push({
    data: minMax.perDay.selectedYearValue,
    label: minMax.perDay.titleSelectedYear,
    borderColor: 'Green',
  });
  datasets.push({
    data: minMax.perDay.maxValue,
    label: minMax.perDay.titleMax,
    borderColor: 'Red',
  });
  chartjsOptions.plugins.title.text = getVariable(currentIndex).description;
  chartjsOptions.scales.y.ticks.callback = getVariable(currentIndex).yticks;

  callbackSetGraph({
    line: {
      labels: labels,
      datasets: datasets,
    },
  });
}

function getMeteoData(townInfo, index, year, callbackSetGraph) {
  let town = townInfo.name + ' - ' + townInfo.admin2
  if (meteoDataArray[town] === undefined) {
    meteoDataArray[town] = []
  }

  if (!meteoDataArray[town][index]) {
    getWeatherData(townInfo, index).then(meteoData => {
      meteoDataArray[town][index] = meteoData
      displayGraph(meteoData, townInfo, index, year, callbackSetGraph)
    }).catch(( /* error */ ) => {
      displayGraph(null, townInfo, index, year, callbackSetGraph)
    })
  } else {
    displayGraph(meteoDataArray[town][index], townInfo, index, year, callbackSetGraph)
  }
}

function Climat() {
  const [townInfo, setTownInfo] = useState(null);
  const [year, setYear] = useState(parseInt(mainDates.lastYear));
  const [variableIndex, setVariableIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState(null);

  function callbackSetGraph(graph) {
    setGraphData(graph);
    setLoading(false)
  }

  function newTownInfo(town) {
    setLoading(true)
    setTownInfo(town)
    getMeteoData(town, variableIndex, year, callbackSetGraph)
  }

  function newYear(currentYear) {
    setLoading(true)
    setYear(currentYear)
    getMeteoData(townInfo, variableIndex, currentYear, callbackSetGraph)
  }

  function newIndex(selectedIndex) {
    setLoading(true)
    setVariableIndex(selectedIndex)
    getMeteoData(townInfo, selectedIndex, year, callbackSetGraph)
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

      {loading && <Loading />}
    </div>
  )
}
export default Climat;


// TODO: rainfall stats on months
// TODO: have a min/max on 50years only, not including the last years...
// TODO: keep all meteo data loaded
