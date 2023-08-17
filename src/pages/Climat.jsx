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
    tooltip: {
      callbacks: {
        footer: (context) => {
          if (context[0].dataset.extraTooltip && context[0].dataset.extraTooltip[context[0].dataIndex]) {
            return context[0].dataset.extraTooltip[context[0].dataIndex]
          }
        },
        label: (context) => {
          // cf. https://www.chartjs.org/docs/latest/configuration/tooltip.html#label-callback
          // console.log(context)
          // console.log(context.dataset.extraTooltip)
        }
      },
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
}

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
  // variables that are exported
  let perDay = {
    // per day stats
    xLabels: [],            // array [0..365] containing the x-labels for 1 year (mm-dd)
    min: {                  
      values: [],           // array [0..365] containing the min value of this day
      title: 'Min',   
      extraTooltip: [],   
    },  
    max: {                  
      values: [],
      title: 'Max',   
      extraTooltip: [],   
    },  
    selectedYear: {                  
      values: [],
      title: selectedYearString,   
      extraTooltip: [],   
    },  
  }
  let perMonth = {
    // per month stats: min of the average, max of the average, current year average
    xLabels: [ '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
    min: {                  
      values: [],           // array [0..11] containing the average min value of this month
      title: 'Min',   
      extraTooltip: [],   
    },  
    max: {                  
      values: [],
      title: 'Max',   
      extraTooltip: [],   
    },  
    selectedYear: {                  
      values: [],
      title: selectedYearString,   
      extraTooltip: [],   
    },  
  }

  let normalizedData = getNormalizedData(labels, datas)
  let selectedYearInt = parseInt(selectedYearString)

  // compute perDay.xLabels
  normalizedData[2022].forEach((monthArray, mIndex) => {
    monthArray.forEach((dayValue, dIndex) => {
      perDay.xLabels.push(`${String(mIndex).padStart(2, '0')}-${String(dIndex).padStart(2, '0')}`)
    })
  })

  // compute perDay.selectedYear.values  and  perMonth.selectedYear.values
  let cumulValue = 0
  normalizedData[selectedYearInt].forEach((monthArray, mIndex) => {
    let cumulMonth = 0
    let nbMonthValues = 0

    monthArray.forEach((dayValue, dIndex) => {
      nbMonthValues ++
      cumulMonth += dayValue
      if (cumul) {
        cumulValue += dayValue
        perDay.selectedYear.values.push(cumulValue)
      } else {
        perDay.selectedYear.values.push(dayValue)
        perDay.selectedYear.extraTooltip.push(1)   // the rank
      }
    })

    if (cumul) {
      perMonth.selectedYear.values.push(cumulMonth)
    } else {
      perMonth.selectedYear.values.push(cumulMonth / nbMonthValues)   // average value
    }
  })

  // compute min.values and max.values
  if (cumul) {
    let minCumul = { yearIndex: 0, cumulValue: undefined }
    let maxCumul = { yearIndex: 0, cumulValue: 0 }
    normalizedData.forEach((yearArray, yearIndex) => {
      let cumulValue = 0
      let nbValues = 0
      yearArray.forEach((monthArray, monthIndex) => {
        let cumulMonth = 0
        monthArray.forEach((dayValue, dayIndex) => {
          cumulValue += dayValue
          cumulMonth += dayValue
          nbValues ++
        })
        // TODO
        // if (cumulValue > perDay.selectedYear.values[graphIndex]) {
        //   perDay.selectedYear.extraTooltip[graphIndex] ++
        // }

        if ((perMonth.min.values[monthIndex-1] === undefined) || (cumulMonth < perMonth.min.values[monthIndex-1])) {
          perMonth.min.values[monthIndex-1] = cumulMonth
          perMonth.min.extraTooltip[monthIndex-1] = yearIndex
        }
        if ((perMonth.max.values[monthIndex-1] === undefined) || (cumulMonth > perMonth.max.values[monthIndex-1])) {
          perMonth.max.values[monthIndex-1] = cumulMonth
          perMonth.max.extraTooltip[monthIndex-1] = yearIndex
        }
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
    perDay.min.title = `Min (${minCumul.yearIndex})`
    normalizedData[minCumul.yearIndex].forEach((monthArray, monthIndex) => {
      monthArray.forEach((dayValue, dayIndex) => {
          cumulValue += dayValue
          perDay.min.values.push(cumulValue)
          perDay.min.extraTooltip.push(minCumul.yearIndex)
      })
    })
  
    cumulValue = 0
    perDay.max.title = `Max (${maxCumul.yearIndex})`
    normalizedData[maxCumul.yearIndex].forEach((monthArray, monthIndex) => {
      monthArray.forEach((dayValue, dayIndex) => {
          cumulValue += dayValue
          perDay.max.values.push(cumulValue)
          perDay.max.extraTooltip.push(maxCumul.yearIndex)
      })
    })
  } else {
    normalizedData.forEach((yearArray, yearIndex) => {
      let graphIndex = 0
      yearArray.forEach((monthArray, monthIndex) => {
        let nbMonthValues = 0
        let cumulMonth = 0
        monthArray.forEach((dayValue, dayIndex) => {
          cumulMonth += dayValue
          nbMonthValues ++

          if (dayValue > perDay.selectedYear.values[graphIndex]) {
            perDay.selectedYear.extraTooltip[graphIndex] ++
          }
    
          if (perDay.min.values[graphIndex] === undefined) {
            perDay.min.values[graphIndex] = dayValue
            perDay.max.values[graphIndex] = dayValue
            perDay.min.extraTooltip[graphIndex] = yearIndex
            perDay.max.extraTooltip[graphIndex] = yearIndex
          } else {
            if (perDay.min.values[graphIndex] > dayValue) {
              perDay.min.values[graphIndex] = dayValue
              perDay.min.extraTooltip[graphIndex] = yearIndex
            }
            if (perDay.max.values[graphIndex] < dayValue) {
              perDay.max.values[graphIndex] = dayValue
              perDay.max.extraTooltip[graphIndex] = yearIndex
            }
          }
          graphIndex ++
        })

        cumulMonth = cumulMonth / nbMonthValues
        if ((perMonth.min.values[monthIndex-1] === undefined) || (cumulMonth < perMonth.min.values[monthIndex-1])) {
          perMonth.min.values[monthIndex-1] = cumulMonth
          perMonth.min.extraTooltip[monthIndex-1] = yearIndex
        }
        if ((perMonth.max.values[monthIndex-1] === undefined) || (cumulMonth > perMonth.max.values[monthIndex-1])) {
          perMonth.max.values[monthIndex-1] = cumulMonth
          perMonth.max.extraTooltip[monthIndex-1] = yearIndex
        }

      })
    })
  }

  perDay.selectedYear.extraTooltip = perDay.selectedYear.extraTooltip.map(rank => 'Rank: ' + rank)
  perMonth.selectedYear.extraTooltip = perMonth.selectedYear.extraTooltip.map(rank => 'Rank: ' + rank)


  // per month stats: min of the average, max of the average, current year average
  return {
    perDay,   // statistics perDay of the year
    perMonth,   // statistics per month
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
    data: minMax.perDay.min.values,
    label: minMax.perDay.min.title,
    borderColor: 'Blue',
    extraTooltip: minMax.perDay.min.extraTooltip,
  });
  datasets.push({
    data: minMax.perDay.selectedYear.values,
    label: minMax.perDay.selectedYear.title,
    borderColor: 'Green',
    extraTooltip: minMax.perDay.selectedYear.extraTooltip,
  });
  datasets.push({
    data: minMax.perDay.max.values,
    label: minMax.perDay.max.title,
    borderColor: 'Red',
    extraTooltip: minMax.perDay.max.extraTooltip,
  });
  chartjsOptions.plugins.title.text = getVariable(currentIndex).description;
  chartjsOptions.scales.y.ticks.callback = getVariable(currentIndex).yticks;

  let perMonth = {}
  perMonth.xLabels = minMax.perMonth.xLabels
  perMonth.datasets = []
  perMonth.datasets.push({
    data: minMax.perMonth.min.values,
    label: minMax.perMonth.min.title,
    borderColor: 'Blue',
    extraTooltip: minMax.perMonth.min.extraTooltip,
  });
  perMonth.datasets.push({
    data: minMax.perMonth.selectedYear.values,
    label: minMax.perMonth.selectedYear.title,
    borderColor: 'Green',
    extraTooltip: minMax.perMonth.selectedYear.extraTooltip,
  });
  perMonth.datasets.push({
    data: minMax.perMonth.max.values,
    label: minMax.perMonth.max.title,
    borderColor: 'Red',
    extraTooltip: minMax.perMonth.max.extraTooltip,
  });

  callbackSetGraph({
    line: {
      labels: labels,
      datasets: datasets,
    },
    perMonth: {
      labels: perMonth.xLabels,
      datasets: perMonth.datasets,
    }
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
      {graphData &&
        <>
          <div style={{ height: "60vh", width: "100%" }}>
            <Line redraw={true} options={chartjsOptions} data={graphData.perMonth} />
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
