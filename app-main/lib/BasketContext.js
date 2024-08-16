import { createContext, useContext, useState, useEffect } from 'react';

const BasketContext = createContext();

export const BasketProvider = ({ children }) => {
    const [basketItems, setBasketItems] = useState([]);

    useEffect(() => {
        // Fetch basket items from local storage on initial load
        const storedBasket = localStorage.getItem('basket');
        if (storedBasket) {
            setBasketItems(JSON.parse(storedBasket));
        }
    }, []);

    const addItemToBasket = (item) => {
        const updatedBasket = [...basketItems, item];
        setBasketItems(updatedBasket);
        localStorage.setItem('basket', JSON.stringify(updatedBasket));
    };

    const removeItemFromBasket = (index) => {
        const updatedBasket = basketItems.filter((_, i) => i !== index);
        setBasketItems(updatedBasket);
        localStorage.setItem('basket', JSON.stringify(updatedBasket));
    };

    return (
        <BasketContext.Provider value={{ basketItems, addItemToBasket, removeItemFromBasket }}>
            {children}
        </BasketContext.Provider>
    );
};

export const useBasket = () => useContext(BasketContext);
