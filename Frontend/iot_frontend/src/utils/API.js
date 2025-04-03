import axios from 'axios';
import { getToken } from 'firebase/messaging';
import { messaging } from '../firebase';

const BASE_URL = 'http://127.0.0.1:8000/project/';
//const BASE_URL = 'https://322e-49-229-22-72.ngrok-free.app/project/';

// Permission for push-noti
export const requestPermission = async () => {
  try {
    const token = await getToken(messaging, { vapidKey: 'BIRiFPt0p4jlRFp5CTd-C_g5rfbzjEJVDOQJFZ_m4WhAUYF1NWO_60U--8mS33JT1RICNHDbGzRd-bc9oBr4I5Q' });
    if (token) {
      console.log('Token:', token);
      await sendTokenToServer(token);
    } else {
      console.log('No registration token available.');
    }
  } catch (error) {
    console.error('Error retrieving token:', error);
  }
};

// Post user's device' token
export const sendTokenToServer = async (token) => {
  try {
    await axios.post(`${BASE_URL}saveToken/`,
      { token },
      {
        headers: {
          'ngrok-skip-browser-warning': '69420',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Token sent to the server');
  } catch (error) {
    console.error('Error sending token to server:', error);
  }
};

// Get sensor data
export const fetchSensorData = async () => {
  try {
    const response = await axios.get(`${BASE_URL}sensorDataDisplay/`, {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    });
    return {
      temp: response.data.temp,
      ph: response.data.ph,
      tds: response.data.tds,
      waterLevel: response.data.waterLv,
      eval: response.data.eval,
      toNotice: response.data.toNotice
    };
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    throw error;
  }
};

// Light Control
export const fetchLightControlStatus = async () => {
  try {
    const response = await axios.get(`${BASE_URL}lightControl/`, {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    });
    return {
      status: response.data.status,
      color: response.data.color
    }
  } catch (error) {
    console.error('Error fetching light control status:', error);
    throw error;
  }
};

// Feed Control
export const fetchFeedingControlLatest = async () => {
  try {
    const response = await axios.get(`${BASE_URL}feedingControl/`, {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    });

    const options = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };

    return new Date(response.data.timestamp * 1000).toLocaleString(undefined, options);
  } catch (error) {
    console.error('Error fetching feeding control latest:', error);
    throw error;
  }
};

// Switch light status
export const lightSwitch = async (payload) => {
  try {
    const response = await axios.post(`${BASE_URL}lightControl/`, {
      action: 'Instant',
      status: payload.status,
      color: payload.color
    }, {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    });

    if (response.status !== 200) {
      throw new Error('Network response was not ok');
    }

    return response.data;
  } catch (error) {
    console.error('Error switch light:', error);
    throw error;
  }
};

// Instant feed
export const instantFeed = async () => {
  try {
    const response = await axios.post(`${BASE_URL}feedingControl/`, {
      action: 'Instant',
      message: 'Instant Feed'
    }, {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    });

    if (response.status !== 200) {
      throw new Error('Network response was not ok');
    }

    return response.data;
  } catch (error) {
    console.error('Error toggling servo:', error);
    throw error;
  }
};

// Save user's feed schedule time
export const scheduleFeedSave = async (payload) => {
  try {
    const response = await axios.post(`${BASE_URL}feedingControl/`, {
      action: 'Schedule',
      workingTime: payload.workingTime,
      desc: payload.desc,
      freq: payload.freq
    }, {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    });

    if (response.status !== 201) {
      throw new Error('Network response was not ok');
    }

    return response.data;
  } catch (error) {
    console.error('Error saving schedule:', error);
    throw error;
  }
};

// Save user's light schedule time
export const scheduleLightSave = async (payload) => {
  try {
    const response = await axios.post(`${BASE_URL}lightControl/`, {
      action: 'Schedule',
      workingTime: payload.workingTime,
      desc: payload.desc,
      freq: payload.freq
    }, {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    });

    if (response.status === 201) {
      return response.data;
    } else {
      throw new Error(`Unexpected response code: ${response.status}`);
    }

  } catch (error) {
    console.error('Error saving schedule:', error);
    console.error('Failed payload:', payload);
    throw error;
  }
};

// Get schedule data
export const fetchScheduleData = async () => {
  try {
    const response = await axios.get(`${BASE_URL}schedule/`, {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    });

    return response.data.schedules;
  } catch (error) {
    console.error('Error fetching schedule data:', error);
    throw error;
  }
};

// Cancel today's schedule
export const cancelSchedule = async (payload) => {
  try {
    const response = await axios.delete(`${BASE_URL}schedule/`, {
      data: {
        id: payload.id,
        type: payload.type
      },
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    });

    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error(`Unexpected response code: ${response.status}`);
    }

  } catch (error) {
    console.error('Error candeling schedule:', error);
    console.error('Failed payload:', payload);
    throw error;
  }

};

// Update light color once completeChange
export const lightColor = async (payload) => {
  try {
    const response = await axios.put(`${BASE_URL}lightControl/`, {
      color: payload.color
    }, {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    });

    if (response.status !== 200) {
      throw new Error('Network response was not ok');
    }

    return response.data;
  } catch (error) {
    console.error('Error changing light:', error);
    throw error;
  }
};

// Fetch preferences
export const fetchPreferences = async () => {
  try {
    const response = await axios.get(`${BASE_URL}preferences/`, {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    });
    return {
      minGrnTemp: response.data.minGrnTemp,
      maxGrnTemp: response.data.maxGrnTemp,
      minOrgTemp: response.data.minOrgTemp,
      maxOrgTemp: response.data.maxOrgTemp,

      minGrnPh: response.data.minGrnPh,
      maxGrnPh: response.data.maxGrnPh,
      minOrgPh: response.data.minOrgPh,
      maxOrgPh: response.data.maxOrgPh,

      minGrnTds: response.data.minGrnTds,
      maxGrnTds: response.data.maxGrnTds,
      minOrgTds: response.data.minOrgTds,
      maxOrgTds: response.data.maxOrgTds,

      grnWaterLv: response.data.grnWaterLv,
      orgWaterLv: response.data.orgWaterLv,
      tankHeight: response.data.tankHeight
    };
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    throw error;
  }
};

// UpdatePreferences
export const savePreferences = async (payload) => {
  try {
    const response = await axios.put(`${BASE_URL}preferences/`, {
      minGrnTemp: payload.minGrnTemp,
      maxGrnTemp: payload.maxGrnTemp,
      minOrgTemp: payload.minOrgTemp,
      maxOrgTemp: payload.maxOrgTemp,

      minGrnPh: payload.minGrnPh,
      maxGrnPh: payload.maxGrnPh,
      minOrgPh: payload.minOrgPh,
      maxOrgPh: payload.maxOrgPh,

      minGrnTds: payload.minGrnTds,
      maxGrnTds: payload.maxGrnTds,
      minOrgTds: payload.minOrgTds,
      maxOrgTds: payload.maxOrgTds,

      grnWaterLv: payload.grnWaterLv,
      orgWaterLv: payload.orgWaterLv,
      tankHeight: payload.tankHeight
    }, {
      headers: {
        'ngrok-skip-browser-warning': '69420'
      }
    });

    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error(`Unexpected response code: ${response.status}`);
    }

  } catch (error) {
    console.error('Error saving preferences:', error);
    console.error('Failed payload:', payload);
    throw error;
  }
};

// Fetch data for report modal
export const fetchReport = async () => {
  try {
    const response = await axios.get(`${BASE_URL}report/`, {
      headers: {
        'ngrok-skip-browser-warning': '69420',
      },
    });
    return {
      sensorData: response.data.sensor,
      feedingData: response.data.feeding,
      lightData: response.data.light,
    };
  } catch (error) {
    console.error('Error fetching graph data:', error);
    throw error;
  }
}