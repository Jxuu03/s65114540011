import React, { useState, useEffect, useCallback } from 'react';
import '../styles/dashboard.css';
import backButton from '../utils/Back Button.svg';
import * as API from '../utils/API.js';
import FeedControlModal from './feedControl.js';
import LightControlModal from './lightControl.js';
import ScheduleModal from './schedule.js';
import DrainageModal from './drainage.js';
import ReportModal from './reportModal.js';
import PreferencesModal from './preferencesModal.js';
import { Button, Modal, Collapse } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import mqtt from 'mqtt';

const Dashboard = () => {
  const [lightStatus, setLightStatus] = useState();
  const [latest_success, setLatest] = useState();
  const [sensorData, setSensorData] = useState({
    temp: '',
    ph: '',
    tds: '',
    waterLevel: '',
    eval: '',
  });
  const [preferences, setPreferences] = useState({
    minGrnTemp: '',
    maxGrnTemp: '',
    minGrnPh: '',
    maxGrnPh: '',
    minGrnTds: '',
    maxGrnTds: '',
  })
  const [bgColor, setBgColor] = useState('#8080807a');
  const [waterQual, setWaterQual] = useState('UNKNOWN');
  const [notificationParameters, setNotificationParameters] = useState([]);
  const { Panel } = Collapse;

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);

  // fecth statuses
  const fetchStatuses = useCallback(() => {
    API.fetchLightControlStatus()
      .then(lightStatus => setLightStatus(lightStatus.status))
      .catch(() => setLightStatus('Error'));

    API.fetchFeedingControlLatest()
      .then(latest => setLatest(latest))
      .catch(() => setLatest('Error'));
  }, []);

  const fetchAllData = useCallback(() => {
    fetchStatuses();

    API.fetchPreferences()
      .then(data => setPreferences(data))
      .catch(() => setPreferences('Error'));

    API.fetchSensorData()
      .then(data => {
        setSensorData(data);
        console.log(data)

        const toNotice = data.toNotice || [];
        setNotificationParameters(toNotice);

        switch (data.eval) {
          case 'Green':
            setBgColor('rgba(138, 235, 229, 0.75)');
            setWaterQual('NORMAL');
            break;
          case 'Orange':
            setBgColor('rgba(255, 154, 3, 0.945)');
            setWaterQual('CAUTION');
            break;
          case 'Red':
            setBgColor('#f54242');
            setWaterQual('DANGER');
            break;
          default:
            setBgColor('#8080807a');
            setWaterQual('UNKNOWN');
        }
      })
      .catch(() => {
        setSensorData({
          temp: 'Error',
          ph: 'Error',
          tds: 'Error',
          waterLevel: 'Error',
          eval: 'UNKNOWN',
        });
        setBgColor('#8080807a');
        setWaterQual('UNKNOWN');
        setNotificationParameters([]);
      });
  }, [fetchStatuses]);

  // fetch data every x seconds
  useEffect(() => {
    fetchAllData();

    const interval = setInterval(() => {
      fetchAllData();
    }, 120001);

    return () => clearInterval(interval);
  }, [fetchAllData]);

  // set no-scroll when open modal
  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
  }, [isModalOpen]);

  // handle fuction modal
  const handleFunctionClick = (type) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  // when close modal, fetch latest feed and light status again
  const handleModalClose = () => {
    API.fetchLightControlStatus()
      .then(lightStatus => setLightStatus(lightStatus.status))
      .catch(() => setLightStatus('Error'));

    API.fetchFeedingControlLatest()
      .then(latest => setLatest(latest))
      .catch(() => setLatest('Error'));

    setIsModalOpen(false);
    setModalType(null);
  };

  const handleSubmit = () => {
    console.log('Successfully submit');
  };

  const paramStyles = (parameter) => {
    let backgroundColor = 'transparent';
    const orange = 'rgba(255, 154, 3, 0.945)'
    const red = '#f54242'

    const notice = notificationParameters.find((notice) => notice.hasOwnProperty(parameter));
    if (notice) {
      const severity = notice[parameter];
      backgroundColor = severity === 'Red' ? red : severity === 'Orange' ? orange : 'transparent';
    }

    // Apply background color based on the level (Red or Orange)
    return {
      container: {
        backgroundColor: backgroundColor,
        border: backgroundColor === 'transparent' ? '1px solid #808080' : 'none',
        cursor: notice ? 'pointer' : 'default'
      },
      text: {
        color: notice ? 'white' : 'black',
      },
    }
  };


  // MQTT for checking if there's new action schedule ==> fecth and update status when there's any
  useEffect(() => {
    // Connect to HiveMQ's WebSocket MQTT broker
    const client = mqtt.connect("ws://test.mosquitto.org:8080/mqtt");

    client.on("connect", () => {
      console.log("Connected to HiveMQ MQTT broker");

      // Subscribe to both topics
      const topics = ["Freshyfishy/response", "Freshyfishy/display"];
      client.subscribe(topics, (err) => {
        if (!err) {
          console.log("Subscribed to topics:", topics);
        } else {
          console.error("Subscription error:", err);
        }
      });
    });

    // Handle incoming messages
    client.on("message", (topic, message) => {
      console.log(`Message received on ${topic}:`, message.toString());

      if (topic === "Freshyfishy/response" || topic === "Freshyfishy/display") {
        setTimeout(() => {
          fetchStatuses();
        }, 500);
      }
    });

    // Cleanup on unmount
    return () => {
      client.end();
    };
  }, [fetchStatuses]);



  const statusColor = waterQual === 'NORMAL' ? 'black' : 'white';

  const solutionText = (parameter) => {
    switch (parameter) {
      case 'Temperature':
        return (
          <Collapse accordion bordered={false} defaultActiveKey={['1']}>
            <Panel header="Effect" key="1">
              <p>Low temperatures result in slowed metabolic processes, lack of appetite, and generally weak health.</p>
              <p>High temperatures will easily deplete dissolved oxygen in the water and cause fish breathing problems.</p>
            </Panel>
            <Panel header="Treatment" key="2">
              <p>To raise the temperature, turn on the heater or doing frequent water changes using slightly warmer water, ensuring to raise the temperature slowly.</p>
              <p>To lower the temperature, open the aquarium cover and position a fan to blow across the surface of the water or perform small partial water changes with slightly cooler water.</p>
            </Panel>
            <Panel header="Prevention" key="3">
              <p>Avoid placing aquariums near sunny or drafty areas that can affect water temperature and providing enough water movement, as a consistent current will help keep temperatures steady.</p>
            </Panel>
          </Collapse>
        );
      case 'pH':
        return (
          <Collapse accordion bordered={false} defaultActiveKey={['1']}>
            <Panel header="Effect" key="1">
              <p>Low pH levels will enhance the toxicity of ammonia, which will have a negative effect on fish health.</p>
              <p>High pH levels will affect the respiratory and digestive functions of the fish, causing them to get sick or even die.</p>
            </Panel>
            <Panel header="Treatment" key="2">
              <p>To increase pH, add a buffer or decorate the aquarium with limestone or coral rock.</p>
              <p>To lower pH, adding peat to the aquarium or lowering the water temperature can be effective solutions.</p>
            </Panel>
            <Panel header="Prevention" key="3">
              <p>To prevent pH imbalance, avoid overfeeding and perform regular water changes.</p>
            </Panel>
          </Collapse>
        );
      case 'TDS':
        return (
          <Collapse accordion bordered={false} defaultActiveKey={['1']}>
            <Panel header="Effect" key="1">
              <p>Low TDS can result in a lack of essential trace elements in the water.</p>
              <p>High TDS can result in water that is too dense, which can make breathing and growing difficult for fish.</p>
            </Panel>
            <Panel header="Treatment" key="2">
              <p>For low TDS, add some salt that is suitable for your fish types or the right amount of water stabilizer. Performing partial water changes by adding water with higher TDS also helps.</p>
              <p>For high TDS, changing a partial amount of water or using reverse-osmosis or deionized water to mix aquarium water to reduce TDS.</p>
            </Panel>
            <Panel header="Prevention" key="3">
              <p>To prevent this, avoid overbreeding and overfeeding.</p>
            </Panel>
          </Collapse>
        );
      case 'Water Level':
        return (
          <Collapse accordion bordered={false} defaultActiveKey={['1']}>
            <Panel header="About This" key="1" showArrow={false}>
              <p>This water level parameter indicates a brief percentage of the amount of water in the aquarium according to the tank height setting in User Preferences.</p>
              <p>As it is being detected by an ultrasonic sensor directly on the water surface, the result is not 100% accurate.</p>
              <p>This parameter informs you of a brief water quality in each parameter within the amount of water level, you can use this information to help decide whether you are going to perform partial water changes or water refilling to improve water quality.</p>
            </Panel>
            <Panel header="Beware" key="2" >
              <p>If you notice the rapidly inappropriate change in this parameter, please make sure to check on the fish tank to see if there were any leaks or any other reason behind the changes to ensure it would not affect the fish.</p>
            </Panel>
          </Collapse>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dashboard">
      <div className="status" style={{ backgroundColor: bgColor }}>
        <span className="item-1" style={{ color: statusColor }}>Water Status:</span><br />
        <span className="item-2" style={{ color: statusColor }}>{waterQual}</span>
      </div>
      <div className='etc'>
        {/*
        <Button
          icon={<FileTextOutlined />}
          style={{ border: '1px solid gray' }}
          onClick={() => handleFunctionClick('report')}
        />
        */}
        <Button
          icon={<SettingOutlined />}
          style={{ border: '1px solid gray', marginLeft: '5px' }}
          onClick={() => handleFunctionClick('preferences')}
        />

      </div>
      <div className="water-parameter" style={{ marginTop: '10px' }}>
        <div className="container-row">

          {/* Temperature Container */}
          <div
            className="temp"
            style={paramStyles('Temperature').container}
            onClick={() => {
              if (notificationParameters.find((notice) => notice.hasOwnProperty('Temperature'))) {
                Modal.info({
                  centered: true,
                  title: 'Temperature Information',
                  content: (
                    solutionText('Temperature')
                  ),
                });
              }
            }}>
            <div className="container-data">
              <div className="data" style={paramStyles('Temperature').text}>
                {sensorData.temp}
              </div>
              <div className="unit" style={paramStyles('Temperature').text}>
                °C
              </div>
            </div>
            <span className="hint" style={paramStyles('Temperature').text}>
              Your preferences temperature for your fish is at {preferences.minGrnTemp} - {preferences.maxGrnTemp} °C
            </span>
          </div>

          {/* pH Container */}
          <div
            className="ph"
            style={paramStyles('pH').container}
            onClick={() => {
              if (notificationParameters.find((notice) => notice.hasOwnProperty('pH'))) {
                Modal.info({
                  centered: true,
                  title: 'pH Information',
                  content: solutionText('pH')
                });
              }
            }}>
            <div className="container-data">
              <div
                className="data"
                style={paramStyles('pH').text}
              >{sensorData.ph}</div>
              <div
                className='unit'
                style={{
                  fontSize: '18px',
                  marginBottom: '-5px',
                  marginLeft: '5px',
                  ...paramStyles('pH').text,
                }}
              >pH</div>
            </div>
            <span className="hint" style={paramStyles('pH').text}>
              Comfortable between {preferences.minGrnPh} - {preferences.maxGrnPh} pH
            </span>
          </div>

        </div>

        <div className="container-row">

          {/* TDS Container */}
          <div
            className="tds"
            style={{
              ...paramStyles('TDS').container,
              height: 126,
              width: 137.45,
            }}
            onClick={() => {
              if (notificationParameters.find((notice) => notice.hasOwnProperty('TDS'))) {
                Modal.info({
                  centered: true,
                  title: 'TDS Information',
                  content: solutionText('TDS'),
                });
              }
            }}>
            <div className="container-data">
              <div className="data" style={paramStyles('TDS').text}>{sensorData.tds}</div>
              <div className='unit'
                style={{
                  fontSize: '18px',
                  marginBottom: '-5px',
                  marginLeft: '5px',
                  ...paramStyles('TDS').text,
                }}>ppm</div>
            </div>
            <span className="hint" style={paramStyles('TDS').text}>
              {preferences.minGrnTds} - {preferences.maxGrnTds} ppm TDS are ideal for your fish
            </span>
          </div>

          {/* Water Level Container */}
          <div
            className="water-level"
            style={{
              ...paramStyles('Water Level').container,
            }}
            onClick={() => {
              if (notificationParameters.find((notice) => notice.hasOwnProperty('Water Level'))) {
                Modal.info({
                  centered: true,
                  title: 'Water Level Information',
                  content: solutionText('Water Level'),
                });
              }
            }}>
            <div className="container-data" style={{ margin: '0 0 5px 19px' }}>
              <div className="data" style={paramStyles('Water Level').text}>{sensorData.waterLevel}</div>
              <div className='unit' style={paramStyles('Water Level').text}>%</div>
            </div>
            <span className="hint" style={paramStyles('Water Level').text}>Water Level</span>
          </div>

        </div>
      </div>

      <div className="divider">
        <div className="line"></div>
        <span style={{ marginRight: '11px', fontWeight: 400, fontSize: '16px', color: '#808080' }}>Function</span>
        <div className="line"></div>
      </div>
      <div className="function">
        <div className="container-row">
          <div className="feed" style={{ cursor: "pointer" }} onClick={() => handleFunctionClick('feed')}>
            <div className="control-name">Feed<br />Control</div>
            <span style={{ fontSize: '14px', color: '#808080' }}>
              Latest Success:<br />{latest_success}
            </span>
          </div>
          <div className="light" style={{ cursor: "pointer" }} onClick={() => handleFunctionClick('light')}>
            <span className="control-name">Light Control</span>
            <span style={{ fontSize: '14px', color: '#808080' }}>
              Current Status: {lightStatus}
            </span>
          </div>
        </div>
        <div className="container-row">
          <div className="schedule" style={{ cursor: "pointer" }} onClick={() => handleFunctionClick('schedule')}>
            <div className="control-name" style={{ marginBottom: '15px' }}>Schedule</div>
            <div style={{ alignSelf: 'center', paddingBottom: '10px' }}>
              <img src={backButton} alt='Back Button' />
            </div>
          </div>
          <div className="drainage" style={{ cursor: "pointer", justifyContent: 'center', alignItems: 'center' }} onClick={() => handleFunctionClick('drainage')}>
            <div className="control-name">
              Drainage & Refilling
            </div>
          </div>
        </div>
      </div>

      {/* Conditionally render the modal based on modalType */}
      {
        modalType === 'feed' && (
          <FeedControlModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            onSubmit={handleSubmit}
          />
        )
      }
      {
        modalType === 'light' && (
          <LightControlModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            onSubmit={handleSubmit}
          />
        )
      }
      {
        modalType === 'schedule' && (
          <ScheduleModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            onSubmit={handleSubmit}
          />
        )
      }
      {
        modalType === 'drainage' && (
          <DrainageModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            onSubmit={handleSubmit}
          />
        )
      }
      {
        modalType === 'report' && (
          <ReportModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            onSubmit={handleSubmit}
          />
        )
      }
      {
        modalType === 'preferences' && (
          <PreferencesModal
            isOpen={isModalOpen}
            onSubmit={handleSubmit}
            onClose={() => {
              handleModalClose();
              fetchAllData();
            }}
          />
        )
      }

    </div >
  );
};

export default Dashboard;
