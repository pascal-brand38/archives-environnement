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
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useEffect } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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

function getStats(labels, datas, year) {
  const removeYear = (label) => label.substring(5);
  const getYear = (label) => label.substring(0,4);
  let days = [];
  let datasMin = [];
  let datasMax = [];
  let datasNow = [];
  for (let i=0; i<365; i++) {
    days.push(removeYear(labels[i]))
    datasMin.push(datas[i])
    datasMax.push(datas[i])
  }
  let curr = 0;
  for (let i=365; i<labels.length; i++) {
    if (removeYear(labels[i]) !== days[curr]) {
      // console.log(labels[i], days[curr])
      continue
    }
    if (getYear(labels[i]) === year) {
      datasNow.push(datas[i])
    }

    if (datasMin[curr] > datas[i]) {
      datasMin[curr] = datas[i]
    }
    if (datasMax[curr] < datas[i]) {
      datasMax[curr] = datas[i]
    }

    curr = (curr + 1) % 365;
  }

  return { days, datasMin, datasMax, datasNow }
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
    console.log(`useeffect ${year} ${townInfo}`)
    if (townInfo && year) {
      console.log('useeffect in action')
      getWeatherData(townInfo).then(meteoData => {
        let labels = null;
        let datasets = [];

        const minMax = getStats(getVariable().getLabels(meteoData), getVariable().getData(meteoData), year);

        // labels = getVariable().getLabels(meteoData)
        // datasets.push({ data: getVariable().getData(meteoData)});
        labels = minMax.days;
        datasets.push({ data: minMax.datasMin, borderColor: 'Blue', borderWidth: 1  });
        datasets.push({ data: minMax.datasMax, borderColor: 'Red', borderWidth: 1 });
        datasets.push({ data: minMax.datasNow, borderColor: 'Green', borderWidth: 1  });
        
        setGraphData({
          labels: labels,
          datasets: datasets,
        });
      })
    }
  }, [townInfo, year]);

  const coords = RchGeoCoords({
    defaultTownName: 'Bordeaux',
    newCoordsCallback: (town) => setTownInfo(town),
    countryFilter: ['FR']
  })

  return (
    <div>
      Weather History

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--rch-margin-s)" }}>

        { coords.render() }

        <RchDropdown
          type= 'dropdown'
          initialValue= '2022'
          list= { getListYear(2022, 1959) }
          valueFromItem= { (item) => item }
          onSelect= { ({ index, item }) => setYear(item) }
          />
      </div>
      
      { graphData && <Line options={chartjsOptions} data={graphData} /> }
    </div>
  )
}

export default Weather;
