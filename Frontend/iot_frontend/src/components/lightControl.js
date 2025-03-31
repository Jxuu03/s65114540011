import React, { useState, useEffect } from 'react';
import * as API from '../utils/API.js';
import '../styles/Modal.css';
import { Space, Switch, Button, TimePicker, Form, Modal } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { GithubPicker } from 'react-color';

const LightControlModal = ({ isOpen, onClose, }) => {
  const format = 'HH:mm';
  const [form] = Form.useForm();
  const [lightStatus, setLightStatus] = useState()
  const [lightEnabled, setLightEnabled] = useState();
  const [autoLightTime, setAutoLightTime] = useState(null);
  const [autoLightEnabled, setAutoLightEnabled] = useState(true);
  const [colorRgb, setColorRgb] = useState('rgb(245, 255, 197)');
  const [todayON, setTodayON] = useState();
  const [todayOFF, setTodayOFF] = useState();

  const fetchData = () => {
    API.fetchLightControlStatus()
      .then((data) => {
        setLightStatus(data.status);
        setLightEnabled(data.status === 'ON');
        setColorRgb(data.color)
      })
      .catch(() => setLightStatus('Error'));

    API.fetchScheduleData()
      .then((schedules) => {
        const totalON = schedules?.length
          ? schedules.filter(schedules => schedules.desc === 'Automatic Light ON').length
          : 0;

        const totalOFF = schedules?.length
          ? schedules.filter(schedules => schedules.desc === 'Automatic Light OFF').length
          : 0;

        setTodayON(totalON);
        setTodayOFF(totalOFF);
        console.log('Total ON: ', totalON,
          'Total OFF: ', totalOFF
        )
      })
      .catch(() => {
        setTodayON(0);
        setTodayOFF(0);
      })
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* light switch */
  const lightSwitch = (status) => {
    const payload = {
      status: status,
      color: rgbString,
    };
    console.log("Sending request:", JSON.stringify(payload));


    API.lightSwitch(payload)
      .then(() => {
        fetchData();
      })
      .catch(error => {
        console.error('Error during switching light status:', error);
      });
  };

  /* Handle color change completion */
  const lightColorChange = (color) => {
    const newRgbString = color.rgb
      ? `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`
      : color;

    setColorRgb(newRgbString);

    const payload = { color: newRgbString };
    API.lightColor(payload)
      .then(() => {
        console.log('Color updated successfully:', payload);
      })
      .catch((error) => {
        console.error('Error updating color:', error);
      });
  };

  /* handle users' timer setting */
  const handleSubmit = (values) => {
    const scheduleTimes = [values.onMain, values.offMain, ...values['on times'] || [], ...values['off times'] || []].filter(Boolean);
    const firstFreq = values.firstSwitch;
    const secondFreq = values.secondSwitch;

    if (scheduleTimes.length === 0) {
      Modal.info({
        centered: true,
        title: 'No Schedule Saving!',
        content: 'It seems you did not enter any time inputs for the schedule or the number of schedules was off-limit. No data will be saved.',
        onOk: () => {
          form.resetFields();
          setAutoLightTime(null);
          onClose();
        }
      });
      return;
    }

    const payload = scheduleTimes.map((time) => {
      let desc = 'Automatic Light OFF';

      if (time === values.onMain) {
        desc = 'Automatic Light ON';
      }

      else if (values['on times'] && values['on times'].includes(time)) {
        desc = 'Automatic Light ON';
      }

      return {
        workingTime: time.format(format),
        desc: desc,
        freq: firstFreq ? 'Today' : secondFreq ? 'Everyday' : 'Today'
      };
    });

    Promise.all(payload.map(timeData => API.scheduleLightSave(timeData)))
      .then((responses) => {
        console.log('Successfully saved schedule:', responses);
        form.resetFields();
        setAutoLightTime(null);
        onClose();
      })
      .catch(error => {
        console.error('Error saving schedule:', error);
        console.error('Failed payload:', payload);
      });
  };

  /* get date suffix by number */
  const getOrdinalSuffix = (num) => {
    if (num === 2) return `${num}nd`;
    if (num === 3) return `${num}rd`;
    return `${num}th`;
  };

  /* alert if users try to add more than 5 schedules in total */
  const handleAddTime = (add, type) => {
    const onTimesCount = form.getFieldValue('on times')?.length || 0;
    const offTimesCount = form.getFieldValue('off times')?.length || 0;

    if ((type === 'on times' && todayON + onTimesCount >= 4) || (type === 'off times' && todayOFF + offTimesCount >= 4)) {
      Modal.warning({
        centered: true,
        title: 'Maximum Schedule Reached!',
        content: `Sorry, you cannot add more than 5 automatic light ${type === 'on times' ? 'ON' : 'OFF'} schedules per day. You already have ${type === 'on times' ? todayON : todayOFF} light schedules for today.`
      });
      return;
    }

    if (type === 'off times' && todayOFF + offTimesCount > todayON + onTimesCount) {
      Modal.warning({
        centered: true,
        title: 'Not Matching ON and OFF!',
        content: 'You cannot schedule automatic light OFF more than automatic light ON. Please check again.'
      });
      return;
    }
    add();
  };

  /* make the frequency switch goes opposite if one being click */
  const handleTodayToggle = (checked) => form.setFieldsValue({ firstSwitch: checked, secondSwitch: !checked });
  const handleEverydayToggle = (checked) => form.setFieldsValue({ firstSwitch: !checked, secondSwitch: checked });

  /* Color picker rgb format */
  const rgbString = React.useMemo(
    () => (typeof colorRgb === 'string' ? colorRgb : colorRgb?.toRgbString()),
    [colorRgb],
  );

  /* Helper function to convert RGB to HEX */
  const rgbToHex = (rgb) => {
    const result = rgb.match(/\d+/g); // Extract R, G, B values
    if (!result || result.length < 3) return '#FFFFFF'; // Fallback to white
    return `#${result
      .slice(0, 3)
      .map((v) => parseInt(v, 10).toString(16).padStart(2, '0'))
      .join('')}`;
  };

  const RgbCase = () => {
    return (
      <Space>
        <GithubPicker
          color={rgbToHex(colorRgb)}
          onChangeComplete={(color) => lightColorChange(color)}
          triangle="hide"
          colors={[
            '#FF0000', '#FF8000', '#FFA500', '#FFFF00', '#FFFFFF', '#00FF00',
            '#00BFFF', '#0000FF', '#4000FF', '#8000FF', '#A000A0', '#FF0080'
          ]}
          
          width="150px"
          styles={{
            color: '#000',
            hue: { border: 'none' },
          }}
          circleSize={30}
        />
      </Space>
    );
  };

  if (!isOpen) return null;

  return (
    <div className='modal-overlay'>
      <div className='modal-content'>
        <h2>Light Control</h2>

        {/* 1st Line, light status */}
        <div className='content'>
          Status
          <Space
            direction='vertical'
            className='custom-switch'
          >
            <Switch
              checkedChildren='ON'
              unCheckedChildren='OFF'
              style={{ marginBottom: '15px' }}
              checked={lightStatus === 'ON'}
              onChange={(checked) => {
                setLightStatus(checked ? 'ON' : 'OFF');
                setLightEnabled(checked)
                lightSwitch(checked ? 'ON' : 'OFF');
              }}
            />
          </Space>
        </div>

        {/* 2nd Line, light color setting */}
        <div className={`modal-form ${!lightEnabled ? 'hidden' : ''}`}>
          <div className='content'>
            <div>
              Light Color
              {/* Display the current color as a rectangle */}
              <div
                style={{
                  width: '20px',   
                  height: '20px',  
                  borderRadius: '4px', 
                  border: '1px solid rgba(0, 0, 0, 0.2)', 
                  padding: '5px',   
                  backgroundColor: '#fff',  
                  marginLeft: '15px',
                  marginTop: '5px'
                }}
              >
                <div
                  style={{
                    width: '100%',   
                    height: '100%',  
                    backgroundColor: colorRgb, 
                  }}
                />
              </div>
            </div>
            <Space direction="vertical">
              <RgbCase />
            </Space>
          </div>
        </div>

        {/* 3rd Line, automatic Light setting */}
        <div className='content'>
          Automatic Light
          <Space direction='vertical' className='custom-switch'>
            <Switch
              style={{ marginBottom: '15px' }}
              checkedChildren='ON'
              unCheckedChildren='OFF'
              defaultChecked={true}
              onChange={(checked) => setAutoLightEnabled(checked)} />
          </Space>
        </div>

        {/* Form of schedule */}
        <div className={`modal-form ${!autoLightEnabled ? 'hidden' : ''}`}>
          <Form
            form={form}
            onFinish={handleSubmit}
            style={{ marginTop: '-10px' }}
          >

            {/* 4th Line, required atleast one schedule to save */}
            <div className='content' style={{ height: '50px' }} >
              ON at
              <Form.Item
                style={{ marginTop: '-15px' }}
                name='onMain'
              >
                <TimePicker
                  style={{ height: '30px', marginTop: '40px', marginRight: '42px' }}
                  value={autoLightTime}
                  onChange={(time) => form.setFieldValue('onMain', time)}
                  format={format}
                  needConfirm={false}
                  disabled={todayON === 5}
                />
              </Form.Item>
            </div>

            {/* 5th Line, Additional timer; hidden form */}
            <Form.List name='on times'>
              {(fields, { add, remove }) => (
                <>
                  <div className='content'>
                    Additional ON Timer (Max: 4)
                    <Button style={{ width: '32px', height: '32px', position: 'relative' }} color='default' variant='filled' shape='circle' icon={<PlusOutlined />}
                      onClick={() => handleAddTime(add, 'on times')}></Button>
                  </div>

                  {fields.map((field, index) => (
                    <Space key={field.key} >
                      <div className='content' style={{ height: '50px' }}>
                        {getOrdinalSuffix(index + 2)} at
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3px' }}>
                          <Form.Item
                            {...field}
                            name={[field.name]}
                          >
                            <TimePicker
                              style={{ height: '30px', marginTop: '20px', marginRight: '10px' }}
                              value={autoLightTime}
                              format={format}
                              needConfirm={false}
                            />
                          </Form.Item>
                          <Button style={{ height: '32px', marginTop: '20px', position: 'relative' }} color='default' variant='filled' shape='circle' icon={<MinusOutlined />} onClick={() => remove(field.name)} />
                        </div>
                      </div>
                    </Space>
                  ))}
                </>
              )}
            </Form.List>


            {/* 6th Line, required atleast one schedule to save */}
            <div className='content' style={{ height: '50px' }} >
              OFF at
              <Form.Item
                style={{ marginTop: '-15px' }}
                name='offMain'
              >
                <TimePicker
                  style={{ height: '30px', marginTop: '40px', marginRight: '42px' }}
                  value={autoLightTime}
                  onChange={(time) => form.setFieldValue('offMain', time)}
                  format={format}
                  needConfirm={false}
                  disabled={todayOFF === 5 || todayOFF > todayON}
                />
              </Form.Item>
            </div>

            {/* 7th Line, Additional timer; hidden form */}
            <Form.List name='off times'>
              {(fields, { add, remove }) => (
                <>
                  <div className='content'>
                    Additional OFF Timer (Max: 4)
                    <Button style={{ width: '32px', height: '32px', position: 'relative' }} color='default' variant='filled' shape='circle' icon={<PlusOutlined />}
                      onClick={() => handleAddTime(add, 'off times')}></Button>
                  </div>

                  {fields.map((field, index) => (
                    <Space key={field.key} >
                      <div className='content' style={{ height: '50px' }}>
                        {getOrdinalSuffix(index + 2)} at
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3px' }}>
                          <Form.Item
                            {...field}
                            name={[field.name]}
                          >
                            <TimePicker
                              style={{ height: '30px', marginTop: '20px', marginRight: '10px' }}
                              value={autoLightTime}
                              format={format}
                              needConfirm={false}
                            />
                          </Form.Item>
                          <Button style={{ height: '32px', marginTop: '20px', position: 'relative' }} color='default' variant='filled' shape='circle' icon={<MinusOutlined />} onClick={() => remove(field.name)} />
                        </div>
                      </div>
                    </Space>
                  ))}
                </>
              )}
            </Form.List>

            <div className='content' style={{ height: '50px' }}>
              Frequency
              <Space direction='vertical' className='custom-switch' style={{ marginBottom: '25px' }}>
                <Form.Item valuePropName='checked' name='firstSwitch' label='Today'>
                  <Switch
                    checkedChildren='ON'
                    unCheckedChildren='OFF'
                    defaultChecked
                    onChange={handleTodayToggle} />
                </Form.Item>
              </Space>
            </div>
            <Space style={{ display: 'flex', justifySelf: 'flex-end', marginTop: '-55px' }} direction='vertical' className='custom-switch'>
              <Form.Item valuePropName='checked' name='secondSwitch' label='Everyday'>
                <Switch
                  checkedChildren='ON'
                  unCheckedChildren='OFF'
                  onChange={handleEverydayToggle} />
              </Form.Item>
            </Space>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
              <Button className='button' htmlType='submit' type='submit'>
                Save
              </Button>
              <Button
                className='button'
                style={{ backgroundColor: 'white', border: '1px solid gray' }}
                type='button'
                onClick={() => { onClose?.(); form.resetFields(); }}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </div>

        {/* Hide form and show close button */}
        <div className={`modal-form ${!autoLightEnabled ? '' : 'hidden'}`}>
          <Button
            className='button'
            style={{ backgroundColor: 'white', border: '1px solid gray', width: '100%' }}
            type='button'
            onClick={() => { onClose?.(); form.resetFields(); }}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LightControlModal;