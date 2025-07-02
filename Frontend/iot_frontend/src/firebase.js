// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "",
    authDomain: "freshyfishy-kmch.firebaseapp.com",
    projectId: "freshyfishy-kmch",
    storageBucket: "freshyfishy-kmch.appspot.com",
    messagingSenderId: "410953623988",
    appId: "1:410953623988:web:90af860855b41700a3aae1",
    measurementId: "G-RQRK35CMWF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// Request permission and get token
export const requestForToken = async () => {
    try {
        const token = await getToken(messaging, {
            vapidKey: "BGvIp1nayMiCckcLlng6fG5V1U4jpjGEx30bfu8E2iT30FY3KjTxbVcUkJnh_TM7OzR67yjGT0OqTwVJeild7QI",
        });
        if (token) {
            console.log('Token received:', token);
        } else {
            console.log('No registration token available.');
        }
    } catch (error) {
        console.error('An error occurred while retrieving token.', error);
    }
};

// Listen for foreground messages
export const onMessageListener = () =>
    new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });
