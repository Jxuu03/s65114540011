import React, { useState, useEffect } from 'react';
import * as API from '../utils/API.js';
import { Button, List, Empty, Modal } from 'antd';
import { ExclamationCircleOutlined, MinusOutlined } from '@ant-design/icons';

const ScheduleModal = ({ isOpen, onClose }) => {
  const [schedules, setSchedules] = useState([]);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const fetchData = () => {
    API.fetchScheduleData()
      .then(data => {
        const sortedData = data.sort((a, b) => a.workingTime.localeCompare(b.workingTime));
        setSchedules(sortedData);
      })
      .catch(() => setSchedules([]));
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const formatTime = (time) => time.slice(0, 5);

  const handleOpenConfirmModal = (schedule) => {
    if (schedule.freq === 'Everyday') {
      setSelectedSchedule(schedule);
      setIsConfirmModalVisible(true);
    } else {
      handleCancelSchedule(schedule, 'Permanent');
    }
  };

  const handleCancelSchedule = (schedule, cancelType) => {
    setIsConfirmModalVisible(false);
    console.log(`Cancel ${schedule.id}, type: ${cancelType}`);

    const payload = {
      id: schedule.id,
      type: cancelType,
    };

    API.cancelSchedule(payload)
      .then((response) => {
        console.log('Schedule canceled successfully', response);
        fetchData(); 
      })
      .catch((error) => {
        console.error('Error canceling schedule:', error);
      });
  };


  if (!isOpen) return null;

  return (
    <div className='modal-overlay'>
      <div className='modal-content'>
        <h2>Today Schedule</h2>
        <List
          itemLayout="horizontal"
          locale={{
            emptyText:
              <Empty
                description={'No Schedule for Today!'}
                style={{ fontFamily: 'Inria Sans' }} />
          }}
          dataSource={schedules}
          renderItem={(schedule) => (
            <List.Item>
              <List.Item.Meta
                avatar={<p style={{ fontWeight: 'bold' }}>{formatTime(schedule.workingTime)}</p>}
                title={<strong>{schedule.desc}</strong>}
                description={schedule.freq}
              />
              {schedule.status === 'Success' && (
                <Button
                  style={{
                    height: '35px',
                    width: '35%',
                    fontSize: '14px',
                    pointerEvents: 'none',
                    backgroundColor: 'rgba(138, 235, 229, 0.75)',
                    border: 'none',
                    color: 'gray',
                  }}
                >
                  {schedule.status}
                </Button>
              )}

              {schedule.status === 'Pending' && (
                <div style={{ display: 'flex' }}>
                  <Button
                    style={{
                      height: '35px',
                      width: '70px',
                      fontSize: '14px',
                      borderTopRightRadius: '0px',
                      borderBottomRightRadius: '0px',
                      pointerEvents: 'none'
                    }}
                  >
                    {schedule.status}
                  </Button>

                  <Button
                    type="primary"
                    danger
                    onClick={() => handleOpenConfirmModal(schedule)}
                    style={{
                      height: '35px',
                      width: '35px',
                      fontSize: '14px',
                      borderTopLeftRadius: '0px',
                      borderBottomLeftRadius: '0px'
                    }}
                  >
                    <MinusOutlined />
                  </Button>
                </div>
              )}
            </List.Item>
          )}
        />

        {/* Confirmation Modal */}
        {selectedSchedule && (
          <Modal
            centered
            title="Cancel Schedule"
            open={isConfirmModalVisible}
            onCancel={() => setIsConfirmModalVisible(false)}
            footer={[
              <Button style={{ width: '40%', fontSize: '14px' }} key="cancel" onClick={() => handleCancelSchedule(selectedSchedule, 'Today')}>
                Just for Today
              </Button>,
              <Button style={{ width: '40%', fontSize: '14px' }} key="delete" type="primary" danger onClick={() => handleCancelSchedule(selectedSchedule, 'Permanent')}>
                Permanently
              </Button>,
            ]}
          >
            <ExclamationCircleOutlined style={{ color: 'red', marginRight: '8px' }} />
            <span>Do you want to cancel this schedule just for today or permanently?</span>
          </Modal>
        )}

        <Button
          className='button'
          style={{ backgroundColor: 'white', border: '1px solid gray', width: '100%' }}
          type='button'
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  );
};

export default ScheduleModal;
