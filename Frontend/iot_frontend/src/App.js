import React, { useEffect } from 'react';
import { useMediaQuery } from 'react-responsive';
import Dashboard from './components/dashboard';
import { onMessage } from 'firebase/messaging';
import { messaging } from './firebase';
import * as API from './utils/API';
import '../src/styles/dashboard.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Modal } from 'antd';

function App() {
    useMediaQuery({ query: '(min-width: 1224px)' });
    useMediaQuery({ query: '(min-width: 1824px)' });
    useMediaQuery({ query: '(max-width: 1224px)' });
    useMediaQuery({ query: '(orientation: portrait)' });
    useMediaQuery({ query: '(min-resolution: 2dppx)' });

    useEffect(() => {
        // Requesting permission to display notifications
        API.requestPermission();
    }, []);

    useEffect(() => {
        // Handling incoming messages with onMessage
        onMessage(messaging, (payload) => {
            console.log('Message received (data payload): ', payload.data);

            const { title, body, color } = payload.data;

            // Display the toast notification
            switch (color) {
                case 'Orange':
                    toast.warning(`${title}: ${body}`, {
                        position: toast.POSITION.TOP_RIGHT,
                        theme: "colored"
                    });
                    break;
                case 'Red':
                    toast.error(`${title}: ${body}`, {
                        position: toast.POSITION.TOP_RIGHT,
                        theme: "colored"
                    });
                    break;
                default:
                    toast.info(`${title}: ${body}`, {
                        position: toast.POSITION.TOP_RIGHT,
                        theme: "colored"
                    });
                    break;
            }


            if (color === 'Orange' || color === 'Red') {
                Modal.warning({
                    centered: true,
                    title: 'Abnormal Water Quality Detected!',
                    content: `It seems there was some inappropriate water parameter in your tank. Tap each parameter box to see the guideline!`,
                });
            }


        });
    }, []);

    return (
        <div className="App">
            <Dashboard />
            <ToastContainer />
        </div>
    );
}

export default App;
