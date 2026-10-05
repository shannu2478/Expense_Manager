import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('₹'); // Default currency

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem('app_currency');
        if (savedCurrency) setCurrency(savedCurrency);
      } catch (e) {
        console.error(e);
      }
    };
    loadCurrency();
  }, []);

  const changeCurrency = async (newSymbol) => {
    setCurrency(newSymbol);
    try {
      await AsyncStorage.setItem('app_currency', newSymbol);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, changeCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};