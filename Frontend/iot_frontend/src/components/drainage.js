import React, { useState, useEffect } from 'react';
import mqtt from 'mqtt';
import '../styles/Modal.css';
import { Space, Switch, Button, Radio, Collapse } from 'antd';

const { Panel } = Collapse;

const DrainageModal = ({ isOpen, onClose }) => {
  const [mqttClient, setMqttClient] = useState(null);
  const [selectedWaterLV, setSelectedWaterLV] = useState(null);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [draining, setDraining] = useState(false);
  const [refilling, setRefilling] = useState(false);

  // Initialize MQTT client
  useEffect(() => {
    const client = mqtt.connect("ws://test.mosquitto.org:8080/mqtt");
    setMqttClient(client);

    client.on('connect', () => {
      console.log('MQTT connected');
      client.subscribe('Freshyfishy/pump');
    });

    client.on('message', (topic, message) => {
      if (topic === 'Freshyfishy/pump') {
        console.log('Drainage response received:', message.toString());
        setDraining(false);
        setRefilling(false);
      }
    });

    return () => {
      client.end();
    };
  }, []);

  const handleDrainageStart = () => {
    const command = autoEnabled && selectedWaterLV
      ? `Drainage/${selectedWaterLV}`
      : 'Drainage/Start';

    console.log('Publishing command:', command);

    mqttClient.publish('Freshyfishy/command', command);
    setDraining(true);
  };

  const handleDrainageStop = () => {
    console.log('Publishing Stop command');
    mqttClient.publish('Freshyfishy/command', 'Drainage/Stop');
    setDraining(false);
  };

  const handleRefillingStart = () => {
    console.log('Publishing Refilling Start command');
    mqttClient.publish('Freshyfishy/command', 'Refilling/Start');
    setRefilling(true);
  };

  const handleRefillingStop = () => {
    console.log('Publishing Stop command');
    mqttClient.publish('Freshyfishy/command', 'Refilling/Stop');
    setRefilling(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Drainage & Refilling</h2>

        <Collapse accordion bordered={false}>
          {/* Drainage Section */}
          <Panel header="Drainage" key="1">
            <div className="content">
              Water Level Setting:
              <Space direction="vertical" className="custom-switch">
                <Switch
                  checkedChildren="ON"
                  unCheckedChildren="OFF"
                  style={{ marginBottom: '15px' }}
                  onChange={(checked) => {
                    setAutoEnabled(checked);
                    if (!checked) setSelectedWaterLV(null);
                  }}
                />
              </Space>
            </div>

            <div className={`modal-form ${!autoEnabled ? 'hidden' : ''}`}>
              <Radio.Group
                className="content"
                onChange={(e) => setSelectedWaterLV(e.target.value)}
                value={selectedWaterLV}
              >
                <Radio value="30">
                  <span style={{ color: 'black', fontWeight: 'bold', fontSize: '15px' }}>30% Off</span>
                  <div style={{ fontSize: '11.5px', color: 'gray', textWrap: 'balance' }}>
                    Routine maintenance to keep the tank clean and stable.
                  </div>
                </Radio>
                <Radio value="100">
                  <span style={{ color: 'black', fontWeight: 'bold', fontSize: '15px' }}>100% Off</span>
                  <div style={{ fontSize: '11.5px', color: 'gray' }}>
                    Complete reset of the tank, please remove fish first.
                  </div>
                </Radio>
              </Radio.Group>
            </div>

            <div style={{ display: 'flex', marginTop: '5px' }}>
              <Button
                className="button"
                htmlType="submit"
                type="button"
                style={{
                  width: '100%',
                  backgroundColor: autoEnabled && !selectedWaterLV
                    ? '#d9d9d9'
                    : draining
                      ? '#ff4d4f'
                      : 'rgba(138, 235, 229, 0.75)',
                  color: autoEnabled && !selectedWaterLV
                    ? '#a1a1a1'
                    : draining
                      ? 'white'
                      : 'gray',
                  cursor: autoEnabled && !selectedWaterLV ? 'not-allowed' : 'pointer',
                }}
                onClick={draining ? handleDrainageStop : handleDrainageStart}
                disabled={autoEnabled && !selectedWaterLV}
              >
                {draining ? 'Stop' : 'Start'}
              </Button>
            </div>
          </Panel>

          {/* Refilling Section */}
          <Panel header="Refilling" key="2">
            <div className="content">
              <p style={{ fontSize: '14px', color: 'gray', textAlign: 'center' }}>
                Refilling system will automatically stop once water level reaches 100%. Press the button again to manually stop at any time.
              </p>
            </div>

            <div style={{ display: 'flex', marginTop: '5px' }}>
              <Button
                className="button"
                htmlType="submit"
                type="button"
                style={{
                  width: '100%',
                  backgroundColor: refilling ? '#ff4d4f' : 'rgba(138, 235, 229, 0.75)',
                  color: refilling ? 'white' : 'gray',
                }}
                onClick={refilling ? handleRefillingStop : handleRefillingStart}
              >
                {refilling ? 'Stop' : 'Start'}
              </Button>
            </div>
          </Panel>
        </Collapse>

        <Button
          className="button"
          style={{ backgroundColor: 'white', border: '1px solid gray', width: '100%', marginTop: '16px' }}
          type="button"
          onClick={() => {
            onClose?.();
            setSelectedWaterLV(null);
            setDraining(false);
            setRefilling(false);
          }}
        >
          Close
        </Button>
      </div>
    </div>
  );
};

export default DrainageModal;
