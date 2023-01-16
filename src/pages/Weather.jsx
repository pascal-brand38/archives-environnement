/// Copyright (c) Pascal Brand
/// MIT License
///


import { useState } from 'react';
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
  responsive: true,
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
        variables: [
          {
            description: "Température Min",
            apiField: "&start_date=1959-01-01&end_date=2023-01-09&daily=temperature_2m_min",    // TODO: start and end dates
            getData: (jsonResponse) => jsonResponse.daily.temperature_2m_min,
            getLabels: (jsonResponse) => jsonResponse.daily.time,
          }
        ],
      }
    ],
  },
};

// TODO: be able to select the source and the variable to output
function getSrc() { return meteoConfig.archive.sources[0]; }
function getVariable() { return getSrc().variables[0]; }

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

  let lowNb = 0
  let highNb = 0
  datasPerDay.forEach((list, index) => {
    let low = list[5];
    let high = list[list.length-1-5]
    if (datasSelectedYear[index] < low) {
      lowNb ++;
      // console.log(`index=${index} Low value: ${datasSelectedYear[index]} < ${low}`)
    }
    if (datasSelectedYear[index] > high) {
      highNb ++
      // console.log(`index=${index} High value: ${datasSelectedYear[index]} > ${high}`)
    }
  })
  console.log(`lowNb=${lowNb}  highNb=${highNb}`)

  let histogram = new Array(datasPerDay[0].length).fill(0);
  datasSelectedYear.forEach((value, index) => histogram[datasPerDay[index].indexOf(value)]++)
  console.log(histogram)

  let labelsHistogram = new Array(datasPerDay[0].length).fill(0)
  labelsHistogram.forEach((value, index) => { labelsHistogram[index]=index} )
  console.log(labelsHistogram)

  return {
    labelsPerDay,   // array [0..365] containing the labels for 1 year (day-month)
    minPerDay,
    maxPerDay,
    averagePerDay,
    datasSelectedYear,
    labelsHistogram,
    histogram,
  }
}

async function getWeatherData(townInfo) {
  console.log(townInfo)
  const src = getSrc();
  const variable = getVariable();
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

function Weather() {
  var [graphData, setGraphData] = useState(null);
  var [townInfo, setTownInfo] = useState(null);
  var [year, setYear] = useState('2022');

  useEffect(() => {
    if (townInfo && year) {
      getWeatherData(townInfo).then(meteoData => {
        let labels = null;
        let datasets = [];

        const minMax = getStats(getVariable().getLabels(meteoData), getVariable().getData(meteoData), year);

        // labels = getVariable().getLabels(meteoData)
        // datasets.push({ data: getVariable().getData(meteoData)});
        labels = minMax.labelsPerDay;
        datasets.push({ data: minMax.minPerDay, borderColor: 'Blue', borderWidth: 1  });
        datasets.push({ data: minMax.maxPerDay, borderColor: 'Red', borderWidth: 1 });
        datasets.push({ data: minMax.datasSelectedYear, borderColor: 'Green', borderWidth: 1  });
        
        setGraphData({
          line: {
            labels: labels,
            datasets: datasets,
          },
          bar: {
            labels: minMax.labelsHistogram,
            datasets: [ { data: minMax.histogram}],
          }
        });
      })
    }
  }, [townInfo, year]);

  return (
    <div>
      Weather History

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--rch-margin-s)" }}>

        <RchGeoCoords
          defaultTownName= 'Bordeaux'
          newCoordsCallback= { (town) => setTownInfo(town)}
          countryFilter= { ['FR'] }
          />

        <RchDropdown
          type= 'dropdown'
          initialValue= '2022'
          list= { getListYear(2022, 1959) }
          valueFromItem= { (item) => item }
          onSelect= { ({ index, item }) => setYear(item) }
          />
      </div>
      
      { graphData && <Line options={chartjsOptions} data={graphData.line} /> }
      { /* graphData && <Bar  data={graphData.bar} />  */}
    </div>
  )
}
// TODO: add copyright to open data meteo

export default Weather;
