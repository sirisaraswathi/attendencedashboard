import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAjvIZxDNfrfN6dPLxgLR7fbKlrUA0SmV",
  authDomain: "fingerprint-attendance-97741.firebaseapp.com",
  databaseURL: "https://fingerprint-attendance-97741-default-rtdb.firebaseio.com",
  projectId: "fingerprint-attendance-97741",
  storageBucket: "fingerprint-attendance-97741.appspot.com",
  messagingSenderId: "443013809983",
  appId: "1:443013809983:web:9e8eba3280dd9ed3a2f58a"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);