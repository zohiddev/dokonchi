import { createContext, useContext, useState, type ReactNode } from 'react';
import { NewSaleModal } from './NewSaleModal';

interface NewSaleContextValue {
  open: () => void;
}

const NewSaleContext = createContext<NewSaleContextValue | undefined>(undefined);

export function NewSaleProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <NewSaleContext.Provider value={{ open: () => setIsOpen(true) }}>
      {children}
      <NewSaleModal open={isOpen} onClose={() => setIsOpen(false)} />
    </NewSaleContext.Provider>
  );
}

export function useNewSale(): NewSaleContextValue {
  const ctx = useContext(NewSaleContext);
  if (!ctx) throw new Error('useNewSale NewSaleProvider ichida bo\'lishi kerak');
  return ctx;
}
