import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import "firebase/compat/database"

// Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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
const firebaseDB = firebase.initializeApp(firebaseConfig);
export default firebaseDB.database().ref("JenCeo-DataBase");
