import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCw9DmSKAj3k_4Ha00RgO-kLk_Pn3WyUTA',
  authDomain: 'sunfamily-trips.firebaseapp.com',
  projectId: 'sunfamily-trips',
  storageBucket: 'sunfamily-trips.firebasestorage.app',
  messagingSenderId: '1049070188395',
  appId: '1:1049070188395:web:24a52a1479457b900d7e2e',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
