import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type CurrencySymbol = '$' | '₹';

interface CurrencyContextType {
  currency: CurrencySymbol;
  setCurrency: (currency: CurrencySymbol) => void;
  formatAmount: (amount: number | string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencySymbol>(() => {
    // Get from localStorage or default to dollar
    const stored = localStorage.getItem('taxease_currency') as CurrencySymbol;
    return stored && (stored === '$' || stored === '₹') ? stored : '$';
  });

  useEffect(() => {
    localStorage.setItem('taxease_currency', currency);
  }, [currency]);

  const setCurrency = (newCurrency: CurrencySymbol) => {
    setCurrencyState(newCurrency);
  };

  const formatAmount = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return `${currency}0.00`;
    
    // Format number with commas
    const formatted = numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    return `${currency}${formatted}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}







