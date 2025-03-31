import React, { useState, useEffect } from 'react';
import * as API from '../utils/API.js';
import { Button, Radio, Pagination, Empty } from 'antd';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  defaults,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import moment from 'moment-timezone';

// Register Chart.js components
ChartJS.register(TimeScale, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
defaults.font.family = 'Inria Sans';

const ReportModal = ({ isOpen, onClose }) => {
  const [sensordata, setSensordata] = useState([]);
  const [lightData, setLightData] = useState([]);
  const [feedData, setFeedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedParam, setSelectedParam] = useState('temp');
  const [currentPage, setCurrentPage] = useState(1);
  const [groupedData, setGroupedData] = useState({});
  const [dataForCurrentDay, setDataForCurrentDay] = useState([]);

  const fetchReport = () => {
    setLoading(true);
    API.fetchReport()
      .then(data => {
        setSensordata(data.sensorData || []);
        setLightData(data.lightData || []);
        setFeedData(data.feedingData || []);
        setError(null);
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const parameterConfig = {
    temp: { max: 125, unit: '°C', value: 'Temperature' },
    ph: { max: 14, unit: 'pH', value: 'pH' },
    tds: { max: 1000, unit: 'ppm', value: 'TDS' },
    waterLv: { max: 100, unit: '%', value: 'Water Level' },
  };

  useEffect(() => {
    // Group the data by date after fetching
    const groupByDate = sensordata.reduce((acc, item) => {
      const date = item.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});

    setGroupedData(groupByDate);
  }, [sensordata]);

  useEffect(() => {
    if (groupedData) {
      const today = moment().tz('Asia/Bangkok');
      const recentDates = Array.from({ length: 7 }, (_, i) => {
        const date = today.clone().subtract(i, 'days');
        return date.format('YYYY-MM-DD');
      });

      const currentDate = recentDates[currentPage - 1];
      setDataForCurrentDay(groupedData[currentDate] || []);
    }
  }, [currentPage, groupedData]);

  const calculateHourlyMode = (data) => {
    const hourlyData = {};

    // Loop through data to group by hour and count occurrences of each value
    data.forEach(item => {
      const hour = moment(item.date + 'T' + item.time).hour(); // Get hour from timestamp
      const value = item[selectedParam];

      if (!hourlyData[hour]) {
        hourlyData[hour] = {};
      }

      if (!hourlyData[hour][value]) {
        hourlyData[hour][value] = 0;
      }

      hourlyData[hour][value] += 1; // Increment frequency of the value for that hour
    });

    // Calculate mode for each hour
    const hourlyMode = Object.keys(hourlyData).map(hour => {
      // Find the value with the highest frequency for each hour
      const values = hourlyData[hour];
      const modeValue = Object.keys(values).reduce((a, b) => values[a] > values[b] ? a : b);

      return {
        x: moment(data[0].date, 'YYYY-MM-DD').startOf('day').add(hour, 'hours').toDate(), // Set the time as the start of the day + hour
        y: parseFloat(modeValue), // Ensure mode is a number (if necessary)
      };
    });

    return hourlyMode;
  };

  // most 7 recent days
  const today = moment().tz('Asia/Bangkok');  // Set your timezone
  const recentDates = Array.from({ length: 7 }, (_, i) => {
    const date = today.clone().subtract(i, 'days');
    return date.format('YYYY-MM-DD');
  });

  // Get data for the current day
  const currentDate = recentDates[currentPage - 1];
  const hourlyData = calculateHourlyMode(dataForCurrentDay);

  // Exact timestamps for lightData
  const lightDataPoints = lightData
    .filter((data) => data.date === currentDate) // Filter for the current day
    .map((data) => ({
      x: `${data.date}T${data.time}`,
      y: data.status, // Map 'ON' to 1 and 'OFF' to 0
    }));

  const feedDataPoints = feedData
    .filter((data) => data.date === currentDate) // Filter for the current day
    .map((data) => ({
      x: `${data.date}T${data.time}`,
      y: 'ON',
    }));

  const chartData = {
    datasets: [
      {
        label: `${parameterConfig[selectedParam].value}`,
        data: hourlyData,
        backgroundColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1,
        fill: false,
        pointRadius: 3,
        yAxisID: 'ySensor', // Links this dataset to the 'ySensor' axis
      },
      {
        label: 'Light',
        data: lightDataPoints,
        backgroundColor: 'rgba(230, 255, 4, 0.5)',
        fill: false,
        showLine: false,
        pointStyle: 'rect',
        pointRadius: 5,
        yAxisID: 'yStatus', // Links this dataset to the 'yLight' axis
      },
      {
        label: 'Feed',
        data: feedDataPoints,
        backgroundColor: 'rgba(255, 1, 77, 0.5)',
        fill: false,
        showLine: false, // Only show points for feed events
        pointStyle: 'triangle',
        pointRadius: 5,
        yAxisID: 'yStatus', // Links this dataset to the 'yFeed' axis
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: `${parameterConfig[selectedParam].value} on ${currentDate}` },
    },
    scales: {
      x: {
        title: { display: true, text: 'Time' },
        type: 'time',
        time: {
          unit: 'hour',
          displayFormats: {
            hour: 'HH:mm',
          },
        },
        ticks: {
          maxRotation: 0,
          maxTicksLimit: 5,
        },
      },
      ySensor: {
        title: {
          display: true,
          text: `${parameterConfig[selectedParam].unit}`,
        },
        min: 0,
      },
      yStatus: {
        position: 'right',
        title: {
          display: true,
          text: 'Status',
        },
        type: 'category',
        grid: {
          drawOnChartArea: false, // only want the grid lines for one axis to show up
        },
        labels: ['ON', 'OFF'],
      },
    },
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" >
      <div className="modal-content">
        <h2>Water Quality Graph</h2>

        <Radio.Group
          value={selectedParam}
          onChange={e => setSelectedParam(e.target.value)}
          style={{ marginBottom: '16px' }}
        >
          <div>
            <Radio.Button value="temp">Temperature</Radio.Button>
            <Radio.Button value="ph">pH</Radio.Button>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <Radio.Button value="tds">TDS</Radio.Button>
            <Radio.Button value="waterLv">Water Level</Radio.Button>
          </div>
        </Radio.Group>

        {/* Line Graph */}
        <div style={{ marginBottom: '16px', height: '162px' }}>
          {loading ? (
            <p>Loading graph...</p>
          ) : error ? (
            <p>{error}</p>
          ) : dataForCurrentDay.length === 0 ? (
            <Empty
              description={`No data available for ${currentDate}`}
              style={{ fontFamily: 'Inria Sans' }} />
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>

        <Pagination
          align="center"
          current={currentPage}
          total={70}
          onChange={page => setCurrentPage(page)}
          size="small"
          showSizeChanger={false}
          style={{ fontFamily: 'Inria Sans' }}
        />

        <Button
          className="button"
          style={{ backgroundColor: 'white', border: '1px solid gray', width: '100%', marginTop: '16px' }}
          type="button"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div >
  );
};

export default ReportModal;
