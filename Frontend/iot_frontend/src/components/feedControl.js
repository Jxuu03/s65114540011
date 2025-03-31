import React, { useState, useEffect } from 'react';
import * as API from '../utils/API.js';
import '../styles/Modal.css';
import { Space, Switch, Button, TimePicker, Form, Modal } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';

const FeedControlModal = ({ isOpen, onClose, }) => {
  const format = 'HH:mm';
  const [form] = Form.useForm();
  const [autoFeedingTime, setAutoFeedingTime] = useState(null);
  const [latest_success, setLatest] = useState();
  const [autoFeedEnabled, setAutoFeedEnabled] = useState(true);
  const [todayFeed, setTodayFeed] = useState();
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = () => {
    API.fetchFeedingControlLatest()
      .then(latest => setLatest(latest))
      .catch(() => setLatest('Error'));

    API.fetchScheduleData()
      .then((schedules) => {
        const total = schedules.length
          ? schedules.filter(schedules => schedules.desc === 'Automatic Feed ON').length
          : 0;
        setTodayFeed(total);
        console.log('Schedule: ', total)
      })
      .catch(() => setTodayFeed(0));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const instantFeed = () => {
    setIsLoading(true);
    API.instantFeed()
      .then(() => {
        fetchData();
      })
      .catch(error => {
        console.error('Error during instant feed:', error);
      })
      .finally(() => {
        setIsLoading(false); 
      });
    fetchData();
  };

  /* handle users' timer setting */
  const handleSubmit = (values) => {
    const scheduleTimes = [autoFeedingTime, ...values.times || []].filter(Boolean);
    const firstFreq = values.firstSwitch;
    const secondFreq = values.secondSwitch;

    if (scheduleTimes.length === 0) {
      Modal.info({
        centered: true,
        title: 'No Schedule Saving!',
        content: 'It seems you did not enter any time inputs for the schedule or the number of schedules was off-limit. No data will be saved.',
        onOk: () => {
          form.resetFields();
          setAutoFeedingTime(null);
          onClose();
        }
      });
      return;
    }

    const payload = scheduleTimes.map((time) => ({
      workingTime: time.format(format),
      desc: 'Automatic Feed ON',
      freq: firstFreq ? 'Today' : secondFreq ? 'Everyday' : 'Today'
    }));

    Promise.all(payload.map(timeData => API.scheduleFeedSave(timeData)))
      .then((responses) => {
        console.log('Successfully saved schedule:', responses);
        form.resetFields();
        setAutoFeedingTime(null);
        onClose();
      })
      .catch(error => {
        console.error('Error saving schedule:', error);
      });
  };

  /* get date suffix by number */
  const getOrdinalSuffix = (num) => {
    if (num === 2) return `${num}nd`;
    if (num === 3) return `${num}rd`;
    return `${num}th`;
  };

  /* alert if users try to add more than 5 schedules in total */
  const handleAddTime = (add) => {
    const timesCount = form.getFieldValue('times')?.length || 0;

    if (todayFeed + timesCount < 4) {
      add();
    } else {
      Modal.warning({
        centered: true,
        title: 'Fish May End Up Overfed!',
        content: `We do not recommend feeding fish more than 5 times a day. You already have ${todayFeed} feed schedule for today.`,
      });
    }
  };


  /* make the frequency switch goes opposite if one being click */
  const handleTodayToggle = (checked) => form.setFieldsValue({ firstSwitch: checked, secondSwitch: !checked });
  const handleEverydayToggle = (checked) => form.setFieldsValue({ firstSwitch: !checked, secondSwitch: checked });

  if (!isOpen) return null;

  return (
    <div className='modal-overlay'>
      <div className='modal-content'>
        <h2>Feeding Control</h2>

        {/* 1st Line, latest success */}
        <div className='content'>
          Latest Success Feed
          <p>{latest_success}</p>
        </div>

        {/* 2nd Line, instant feed */}
        <div className='content'>
          Instant Feed
          <Button 
            className='button' 
            type='button' 
            style={{ width: '35%' }} 
            onClick={instantFeed}
            loading={isLoading}
          >
            Feed
          </Button>
        </div>

        {/* 3rd Line, automatic feed setting */}
        <div className='content' style={{ marginTop: '20px' }}>
          Automatic Feed
          <Space direction='vertical' className='custom-switch'>
            <Switch style={{ marginTop: '0px' }}
              checkedChildren='ON'
              unCheckedChildren='OFF'
              defaultChecked={true}
              onChange={(checked) => setAutoFeedEnabled(checked)} />
          </Space>
        </div>

        {/* Form of schedule */}
        <div className={`modal-form ${!autoFeedEnabled ? 'hidden' : ''}`}>
          <Form
            form={form}
            onFinish={handleSubmit}
            style={{ marginTop: '0px' }}
          >

            {/* 4th Line, required atleast one schedule to save */}
            <div className='content' style={{ height: '50px' }} >
              1st at
              <Form.Item
                style={{ marginTop: '-15px' }}
              >
                <TimePicker
                  style={{ height: '30px', marginTop: '40px', marginRight: '42px' }}
                  value={autoFeedingTime}
                  onChange={(time) => setAutoFeedingTime(time)}
                  format={format}
                  needConfirm={false}
                  disabled={todayFeed === 5}
                  required
                />
              </Form.Item>
            </div>

            {/* 5th Line, Additional timer; hidden form */}
            <Form.List name='times'>
              {(fields, { add, remove }) => (
                <>
                  <div className='content'>
                    Additional Timer (Max: 4)
                    <Button style={{ width: '32px', height: '32px', position: 'relative' }} color='default' variant='filled' shape='circle' icon={<PlusOutlined />}
                      onClick={() => handleAddTime(add)}></Button>
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
                              value={autoFeedingTime}
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
              <Space style={{ marginBottom: '25px' }} direction='vertical' className='custom-switch' >
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
        <div className={`modal-form ${!autoFeedEnabled ? '' : 'hidden'}`}>
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

export default FeedControlModal;