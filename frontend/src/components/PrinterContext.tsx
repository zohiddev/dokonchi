import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { buildReceipt, buildTestReceipt, type ReceiptSettings } from '../lib/escpos';
import * as printer from '../lib/printer';
import { loadSettings, saveSettings } from '../lib/printerSettings';
import type { Sale } from '../types/api';

export type PrinterStatus = 'unsupported' | 'disconnected' | 'connected' | 'printing';

interface PrinterContextValue {
  status: PrinterStatus;
  deviceName: string | null;
  settings: ReceiptSettings;
  updateSettings: (patch: Partial<ReceiptSettings>) => void;
  connect: () => Promise<void>;
  testPrint: () => Promise<void>;
  // Sotuv chekini chop qiladi. Printer ulangan bo'lsa true qaytaradi.
  printSale: (sale: Sale) => Promise<boolean>;
}

const PrinterContext = createContext<PrinterContextValue | undefined>(undefined);

export function PrinterProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PrinterStatus>(() =>
    printer.isSupported() ? 'disconnected' : 'unsupported',
  );
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [settings, setSettings] = useState<ReceiptSettings>(() => loadSettings());
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const refreshState = useCallback(() => {
    if (!printer.isSupported()) {
      setStatus('unsupported');
      setDeviceName(null);
      return;
    }
    if (printer.isConnected()) {
      setStatus('connected');
      setDeviceName(printer.deviceName());
    } else {
      setStatus('disconnected');
      setDeviceName(null);
    }
  }, []);

  // Boshlanishida jimgina qayta ulanish + USB ulash/uzish hodisalarini kuzatish.
  useEffect(() => {
    if (!printer.isSupported()) return;
    let active = true;

    printer.tryReconnect().then(() => {
      if (active) refreshState();
    });

    const onConnect = () => {
      printer.tryReconnect().then(() => {
        if (active) refreshState();
      });
    };
    const onDisconnect = (ev: USBConnectionEvent) => {
      printer.handleDisconnect(ev);
      if (active) refreshState();
    };

    navigator.usb.addEventListener('connect', onConnect);
    navigator.usb.addEventListener('disconnect', onDisconnect);
    return () => {
      active = false;
      navigator.usb.removeEventListener('connect', onConnect);
      navigator.usb.removeEventListener('disconnect', onDisconnect);
    };
  }, [refreshState]);

  const updateSettings = useCallback((patch: Partial<ReceiptSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const connect = useCallback(async () => {
    await printer.pairDevice();
    refreshState();
  }, [refreshState]);

  const testPrint = useCallback(async () => {
    setStatus('printing');
    try {
      await printer.write(buildTestReceipt(settingsRef.current));
    } finally {
      refreshState();
    }
  }, [refreshState]);

  const printSale = useCallback(
    async (sale: Sale): Promise<boolean> => {
      if (!printer.isSupported()) return false;
      // Ulanmagan bo'lsa, jimgina qayta ulanishga urinib ko'ramiz.
      if (!printer.isConnected()) {
        const ok = await printer.tryReconnect();
        if (!ok) {
          refreshState();
          return false;
        }
      }
      setStatus('printing');
      try {
        const s = settingsRef.current;
        const bytes = buildReceipt(sale, s);
        const copies = Math.max(1, s.copies);
        for (let i = 0; i < copies; i++) {
          await printer.write(bytes);
        }
        return true;
      } finally {
        refreshState();
      }
    },
    [refreshState],
  );

  const value = useMemo<PrinterContextValue>(
    () => ({ status, deviceName, settings, updateSettings, connect, testPrint, printSale }),
    [status, deviceName, settings, updateSettings, connect, testPrint, printSale],
  );

  return <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>;
}

export function usePrinter(): PrinterContextValue {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error("usePrinter PrinterProvider ichida bo'lishi kerak");
  return ctx;
}
