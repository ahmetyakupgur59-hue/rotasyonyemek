import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { 
    getAuth, 
    GoogleAuthProvider, 
    FacebookAuthProvider 
} from "firebase/auth";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCZdQltQMsCQWnt9dkNyh-_Cu7sIQYIhCs",
    authDomain: "tekyemek-proje.firebaseapp.com",
    projectId: "tekyemek-proje",
    storageBucket: "tekyemek-proje.firebasestorage.app",
    messagingSenderId: "596350470474",
    appId: "1:596350470474:web:ea5e606941d02f174199b3"
};

// Ana Firebase uygulaması
const app = initializeApp(firebaseConfig);

// İkincil Firebase uygulaması (Admin panelinde restoran oluşturmak için)
const secondaryApp = initializeApp(firebaseConfig, "Secondary");

// Auth & Firestore
export const db = getFirestore(app);
export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);

// OAuth Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account' // Her zaman hesap seçtir
});

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.setCustomParameters({
    display: 'popup'
});

export { firebaseConfig };