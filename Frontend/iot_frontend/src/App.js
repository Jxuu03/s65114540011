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
        if (API && API.requestPermission) {
            API.requestPermission().catch((err) => {
                console.warn("Could not request notification permission:", err);
            });
        }
    }, []);

    useEffect(() => {
        if (!messaging) {
            console.warn("Firebase messaging not supported in this environment.");
            return;
        }

        try {
            // Set custom handler if messaging object exists
            messaging.onMessageHandler = (payload) => {
                console.log("Message received:", payload);
            };

            onMessage(messaging, (payload) => {
                if (!payload || !payload.data) return;

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

                // Show modal for critical alerts
                if (color === 'Orange' || color === 'Red') {
                    Modal.warning({
                        centered: true,
                        title: 'Abnormal Water Quality Detected!',
                        content: `It seems there was some inappropriate water parameter in your tank. Tap each parameter box to see the guideline!`,
                    });
                }
            });
        } catch (err) {
            console.warn("Error initializing Firebase messaging:", err);
        }
    }, []);

    return (
        <div className="App">
            <Dashboard />
            <ToastContainer />
        </div>
    );
}

export default App;
