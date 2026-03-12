  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCbHTfv0U0DdVRbKc4FSPQi-VF4zrdX0QQ",
    authDomain: "homework-easy-times.firebaseapp.com",
    projectId: "homework-easy-times",
    storageBucket: "homework-easy-times.firebasestorage.app",
    messagingSenderId: "344316429906",
    appId: "1:344316429906:web:853d2c96b6d0500128c18b",
    measurementId: "G-J3F285WRQM"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
