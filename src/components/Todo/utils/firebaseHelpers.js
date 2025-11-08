import firebaseDB from "../../../firebase";
import { isFn } from "./helpers";


export const hasRTDB = !!firebaseDB && (isFn(firebaseDB.child) || isFn(firebaseDB.ref));

export const getRef = (path) => {
  if (!hasRTDB) return null;
  const p = String(path || "").trim();
  if (!p) {
    return isFn(firebaseDB.child)
      ? firebaseDB.child("ToDo")
      : firebaseDB.ref("ToDo");
  }
  return isFn(firebaseDB.child) ? firebaseDB.child(p) : firebaseDB.ref(p);
};


export const getStorage = () => {
  try {
    return (
      firebaseDB?.storage?.() ||
      firebaseDB?.app?.storage?.() ||
      firebaseDB?.storage ||
      null
    );
  } catch {
    return null;
  }
};

export const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  export { isFn };