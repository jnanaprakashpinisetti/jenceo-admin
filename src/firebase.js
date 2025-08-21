import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import "firebase/compat/database";
import 'firebase/compat/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBYBYDMqcK5tdMCrvMCuqTsgqso9MBNt18",
  authDomain: "jenceo-admin.firebaseapp.com",
  databaseURL: "https://jenceo-admin-default-rtdb.firebaseio.com",
  projectId: "jenceo-admin",
  storageBucket: "jenceo-admin.appspot.com",
  messagingSenderId: "863138638995",
  appId: "1:863138638995:web:0c43ff8601b969b53cb166"
};

// Initialize Firebase
const firebaseApp = firebase.initializeApp(firebaseConfig);
const database = firebaseApp.database();

// Export the database reference and methods
export const firebaseDB = database.ref("JenCeo-DataBase");
export const ref = database.ref;
export const set = (ref, data) => ref.set(data);
export const push = (ref) => ref.push();
export const update = (updates) => database.ref().update(updates);

export default firebaseDB;