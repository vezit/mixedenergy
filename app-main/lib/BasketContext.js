import { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore'; // Firestore methods
import { db } from '../lib/firebase'; // Import your Firestore instance
import { getCookie, setCookie } from '.cookies'; // Importing from cookies.js

const BasketContext = createContext();

export const BasketProvider = ({ children }) => {
    const [basketItems, setBasketItems] = useState([]);
    const [consentId, setConsentId] = useState(null);

    useEffect(() => {
        const consentIdFromCookie = getCookie('cookie_consent_id');
        setConsentId(consentIdFromCookie);

        if (consentIdFromCookie) {
            const docRef = doc(db, 'sessions', consentIdFromCookie);
            getDoc(docRef).then((docSnap) => {
                if (docSnap.exists()) {
                    const sessionData = docSnap.data();
                    if (sessionData.basketItems) {
                        setBasketItems(sessionData.basketItems); // Load basket from Firestore
                    }
                } else {
                    // If no document exists, initialize an empty basket
                    setDoc(docRef, { basketItems: [] }, { merge: true });
                }
            });
        }
    }, []);

    const updateBasketInFirestore = async (updatedBasket) => {
        if (!consentId) return; // Ensure consentId is available

        const docRef = doc(db, 'sessions', consentId);
        await setDoc(docRef, { basketItems: updatedBasket }, { merge: true }); // Update Firestore
    };

    const addItemToBasket = (item) => {
        const existingItemIndex = basketItems.findIndex(basketItem => basketItem.title === item.title);

        let updatedBasket;

        if (existingItemIndex >= 0) {
            updatedBasket = basketItems.map((basketItem, index) =>
                index === existingItemIndex
                    ? { ...basketItem, quantity: basketItem.quantity + item.quantity }
                    : basketItem
            );
        } else {
            updatedBasket = [...basketItems, item];
        }

        setBasketItems(updatedBasket);
        updateBasketInFirestore(updatedBasket); // Update Firestore instead of localStorage
    };

    const removeItemFromBasket = (index) => {
        const updatedBasket = basketItems.filter((_, i) => i !== index);
        setBasketItems(updatedBasket);
        updateBasketInFirestore(updatedBasket); // Update Firestore instead of localStorage
    };

    return (
        <BasketContext.Provider value={{ basketItems, addItemToBasket, removeItemFromBasket, setBasketItems }}>
            {children}
        </BasketContext.Provider>
    );
};

export const useBasket = () => useContext(BasketContext);
