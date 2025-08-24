// src/firebase.js
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/database";
import "firebase/compat/storage";

/* ------------------------- Firebase Config ------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyBYBYDMqcK5tdMCrvMCuqTsgqso9MBNt18",
  authDomain: "jenceo-admin.firebaseapp.com",
  databaseURL: "https://jenceo-admin-default-rtdb.firebaseio.com",
  projectId: "jenceo-admin",
  storageBucket: "jenceo-admin.firebasestorage.app",
  messagingSenderId: "863138638995",
  appId: "1:863138638995:web:0c43ff8601b969b53cb166",
};

/* -------------------- Initialize Firebase -------------------- */
const app = firebase.initializeApp(firebaseConfig);

/* ----------------------------- Services ----------------------------- */
const database = app.database();
const storage = app.storage();

/* ------------------------- Realtime Database ------------------------ */
export const firebaseDB = database.ref("JenCeo-DataBase");

/* ------------------------------ Storage ----------------------------- */
export const firebaseStorage = storage;
export const storageRef = storage.ref();

// Fixed uploadFile function
export const uploadFile = async (filePath, file) => {
  try {
    console.log("Uploading file:", file.name);
    
    // Handle both string paths and StorageReference objects
    let fileRef;
    if (typeof filePath === 'string') {
      fileRef = storageRef.child(filePath);
    } else if (filePath && typeof filePath.child === 'function') {
      // It's already a StorageReference
      fileRef = filePath;
    } else {
      throw new Error("Invalid filePath parameter. Expected string path or StorageReference.");
    }
    
    const snapshot = await fileRef.put(file);
    console.log("Upload completed successfully");
    return snapshot;
  } catch (error) {
    console.error("Upload error:", error);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

// Get download URL
export const getDownloadURL = async (refOrSnapshot) => {
  try {
    const fileRef = refOrSnapshot?.ref ? refOrSnapshot.ref : refOrSnapshot;
    const url = await fileRef.getDownloadURL();
    console.log("Download URL obtained");
    return url;
  } catch (error) {
    console.error("Get download URL error:", error);
    throw new Error(`Failed to get download URL: ${error.message}`);
  }
};

/* --------------------------- Default Export -------------------------- */
export default firebaseDB;