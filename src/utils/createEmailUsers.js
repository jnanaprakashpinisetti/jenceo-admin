// src/utils/createEmailUsers.js
import {
    collection,
    addDoc,
    getDocs,
    query,
    where
} from "firebase/firestore";
import {
    db
} from "../firebase";

async function sha256Base64(text) {
    const enc = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", enc);
    const bytes = new Uint8Array(hash);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
}

// Default permissions
const PERMISSIONS = {
    admin: {
        Dashboard: {
            view: true,
            edit: true,
            delete: true
        },
        Investments: {
            view: true,
            edit: true,
            delete: true
        },
        "Workers Data": {
            view: true,
            edit: true,
            delete: true
        },
        "Worker Call Data": {
            view: true,
            edit: true,
            delete: true
        },
        "Client Data": {
            view: true,
            edit: true,
            delete: true
        },
        Enquiries: {
            view: true,
            edit: true,
            delete: true
        },
        "Hospital List": {
            view: true,
            edit: true,
            delete: true
        },
        Expenses: {
            view: true,
            edit: true,
            delete: true
        },
        Assets: {
            view: true,
            edit: true,
            delete: true
        },
        Reports: {
            view: true,
            edit: true,
            delete: true
        },
        Accounts: {
            view: true,
            edit: true,
            delete: true
        },
        Task: {
            view: true,
            edit: true,
            delete: true
        },
    },
    manager: {
        Dashboard: {
            view: true,
            edit: true,
            delete: false
        },
        Investments: {
            view: true,
            edit: true,
            delete: false
        },
        "Workers Data": {
            view: true,
            edit: true,
            delete: false
        },
        "Worker Call Data": {
            view: true,
            edit: true,
            delete: false
        },
        "Client Data": {
            view: true,
            edit: true,
            delete: false
        },
        Enquiries: {
            view: true,
            edit: true,
            delete: false
        },
        "Hospital List": {
            view: true,
            edit: true,
            delete: false
        },
        Expenses: {
            view: true,
            edit: true,
            delete: false
        },
        Assets: {
            view: true,
            edit: true,
            delete: false
        },
        Reports: {
            view: true,
            edit: true,
            delete: false
        },
        Accounts: {
            view: true,
            edit: true,
            delete: false
        },
        Task: {
            view: true,
            edit: true,
            delete: false
        },
    },
    user: {
        Dashboard: {
            view: true,
            edit: false,
            delete: false
        },
        Investments: {
            view: true,
            edit: false,
            delete: false
        },
        "Workers Data": {
            view: true,
            edit: false,
            delete: false
        },
        "Worker Call Data": {
            view: true,
            edit: false,
            delete: false
        },
        "Client Data": {
            view: true,
            edit: false,
            delete: false
        },
        Enquiries: {
            view: true,
            edit: false,
            delete: false
        },
        "Hospital List": {
            view: true,
            edit: false,
            delete: false
        },
        Expenses: {
            view: true,
            edit: false,
            delete: false
        },
        Assets: {
            view: true,
            edit: false,
            delete: false
        },
        Reports: {
            view: true,
            edit: false,
            delete: false
        },
        Accounts: {
            view: true,
            edit: false,
            delete: false
        },
        Task: {
            view: true,
            edit: false,
            delete: false
        },
    }
};

export async function createEmailUsers() {
    const emailUsers = [{
            email: "admin@jenceo.com",
            name: "Admin User",
            role: "admin",
            password: "admin123"
        },
        {
            email: "manager@jenceo.com",
            name: "Manager User",
            role: "manager",
            password: "manager123"
        },
        {
            email: "user@jenceo.com",
            name: "Regular User",
            role: "user",
            password: "user123"
        }
    ];

    try {
        for (const user of emailUsers) {
            // Check if user already exists by email
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", user.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                continue;
            }

            const passwordHash = await sha256Base64(user.password);

            const userData = {
                email: user.email,
                name: user.name,
                role: user.role,
                active: true,
                passwordHash: passwordHash,
                permissions: PERMISSIONS[user.role] || PERMISSIONS.user,
                createdAt: new Date(),
            };

            const docRef = await addDoc(collection(db, "users"), userData);
        }

        return true;
    } catch (error) {
        throw error;
    }
}

// Also create in authentication collection for compatibility
export async function createAuthEmailUsers() {
    const emailUsers = [{
            email: "admin@jenceo.com",
            name: "Admin User",
            role: "admin",
            password: "admin123"
        },
        {
            email: "manager@jenceo.com",
            name: "Manager User",
            role: "manager",
            password: "manager123"
        }
    ];

    try {
        for (const user of emailUsers) {
            // Check if user already exists by email
            const authRef = collection(db, "authentication");
            const q = query(authRef, where("email", "==", user.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                continue;
            }

            const passwordHash = await sha256Base64(user.password);

            const userData = {
                email: user.email,
                name: user.name,
                role: user.role,
                active: true,
                passwordHash: passwordHash,
                permissions: PERMISSIONS[user.role] || PERMISSIONS.user,
                createdAt: new Date(),
            };

            const docRef = await addDoc(collection(db, "authentication"), userData);
        }

        return true;
    } catch (error) {
        console.error("Error creating auth email users: ", error);
        throw error;
    }
}

export async function checkEmailUsersExist() {
    try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        return !querySnapshot.empty;
    } catch (error) {
        console.error("Error checking email users: ", error);
        return false;
    }
}