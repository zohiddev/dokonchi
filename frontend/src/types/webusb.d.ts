// WebUSB uchun minimal tip e'lonlari — faqat ilovada ishlatiladigan qismi.
// To'liq spetsifikatsiya: https://wicg.github.io/webusb/
export {};

declare global {
  interface USBEndpoint {
    readonly endpointNumber: number;
    readonly direction: 'in' | 'out';
    readonly type: 'bulk' | 'interrupt' | 'isochronous';
  }

  interface USBAlternateInterface {
    readonly alternateSetting: number;
    readonly interfaceClass: number;
    readonly endpoints: USBEndpoint[];
  }

  interface USBInterface {
    readonly interfaceNumber: number;
    readonly alternate: USBAlternateInterface;
    readonly alternates: USBAlternateInterface[];
    readonly claimed: boolean;
  }

  interface USBConfiguration {
    readonly configurationValue: number;
    readonly interfaces: USBInterface[];
  }

  interface USBOutTransferResult {
    readonly bytesWritten: number;
    readonly status: 'ok' | 'stall' | 'babble';
  }

  interface USBDevice {
    readonly vendorId: number;
    readonly productId: number;
    readonly productName?: string;
    readonly manufacturerName?: string;
    readonly serialNumber?: string;
    readonly opened: boolean;
    readonly configuration: USBConfiguration | null;
    readonly configurations: USBConfiguration[];
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    releaseInterface(interfaceNumber: number): Promise<void>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
  }

  interface USBConnectionEvent extends Event {
    readonly device: USBDevice;
  }

  interface USBDeviceFilter {
    vendorId?: number;
    productId?: number;
    classCode?: number;
  }

  interface USBDeviceRequestOptions {
    filters: USBDeviceFilter[];
  }

  interface USB extends EventTarget {
    getDevices(): Promise<USBDevice[]>;
    requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
    addEventListener(
      type: 'connect' | 'disconnect',
      listener: (this: USB, ev: USBConnectionEvent) => void,
    ): void;
    removeEventListener(
      type: 'connect' | 'disconnect',
      listener: (this: USB, ev: USBConnectionEvent) => void,
    ): void;
  }

  interface Navigator {
    readonly usb: USB;
  }
}
