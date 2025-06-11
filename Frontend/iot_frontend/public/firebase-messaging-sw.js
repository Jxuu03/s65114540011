// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
    apiKey: "",
    authDomain: "freshyfishy-kmch.firebaseapp.com",
    projectId: "freshyfishy-kmch",
    storageBucket: "freshyfishy-kmch.appspot.com",
    messagingSenderId: "410953623988",
    appId: "1:410953623988:web:90af860855b41700a3aae1",
    measurementId: "G-RQRK35CMWF"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notification = payload.data;
  const notificationOptions = {
    body: notification.body,
    sound: '/noti-sound.mp3',
    icon: '/logo512.png',
    badge: '/logo512.png',
  };

  self.registration.showNotification(notification.title, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification click Received.', event);

  event.notification.close(); // Close the notification when it's clicked.

  event.waitUntil(
      clients.openWindow('https://freshyfishy-kmch.web.app/') // Customize the URL to the page you want to open
  );
});

// Error Handling (Optional: Catch issues with sound or icon loading)
self.addEventListener('notificationerror', function(event) {
  console.error('Notification error: ', event);
});

// Optional: Handle when the notification closes
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed: ', event);
});
