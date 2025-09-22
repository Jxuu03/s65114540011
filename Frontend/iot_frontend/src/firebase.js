// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCMvYPcTdxt7lc2yqAXGIpeZmAOBeBvyLQ",
    authDomain: "freshyfishy-kmch.firebaseapp.com",
    projectId: "freshyfishy-kmch",
    storageBucket: "freshyfishy-kmch.appspot.com",
    messagingSenderId: "410953623988",
    appId: "1:410953623988:web:90af860855b41700a3aae1",
    measurementId: "G-RQRK35CMWF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let messaging;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    } else {
      console.warn("Firebase messaging is not supported in this environment.");
    }
  });
}

export { messaging };

// Request permission and get token
export const requestForToken = async () => {
    if (!messaging) return;
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
export const onMessageListener = () => {
    if (!messaging) return Promise.resolve(null);
    return new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });
};