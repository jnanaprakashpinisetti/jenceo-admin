// src/firebase.js
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/database";
import "firebase/compat/storage";
import { getStorage } from "firebase/storage";

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
const auth = app.auth();
const db = app.database();
const storage = app.storage();

/* ------------------------- Realtime Database (compat) ------------------------ */
// export default firebaseDB for backwards compatibility with components that import a default
export const firebaseDB = db.ref("JenCeo-DataBase");

/* ------------------------------ Storage ----------------------------- */
export const firebaseStorage = storage;
export const storageRef = storage.ref();

// Enhanced upload helper with better error handling
export const uploadFile = async (filePath, file) => {
  try {
    let fileRef;
    if (typeof filePath === 'string') {
      fileRef = storageRef.child(filePath);
    } else if (filePath && typeof filePath.child === 'function') {
      fileRef = filePath;
    } else {
      throw new Error("Invalid filePath parameter.");
    }
    
    console.log('Uploading file to:', fileRef.fullPath);
    
    // Upload the file
    const snapshot = await fileRef.put(file);
    console.log('Upload completed:', snapshot.metadata.name);
    
    return snapshot;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};

// Enhanced download URL getter
export const getDownloadURL = async (refOrSnapshot) => {
  try {
    const fileRef = refOrSnapshot?.ref ? refOrSnapshot.ref : refOrSnapshot;
    const url = await fileRef.getDownloadURL();
    console.log('Download URL:', url);
    return url;
  } catch (error) {
    console.error("Get download URL error:", error);
    throw error;
  }
};

// Helper to delete file from storage
export const deleteFile = async (filePath) => {
  try {
    const fileRef = storageRef.child(filePath);
    await fileRef.delete();
    console.log('File deleted:', filePath);
  } catch (error) {
    console.error("Delete file error:", error);
    throw error;
  }
};

// Helper to check if file exists
export const fileExists = async (filePath) => {
  try {
    const fileRef = storageRef.child(filePath);
    const url = await fileRef.getDownloadURL();
    return !!url;
  } catch (error) {
    return false;
  }
};

/* --------------------------- Default Export -------------------------- */
export default firebaseDB;
export { auth, db };