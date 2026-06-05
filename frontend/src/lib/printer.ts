// WebUSB orqali termal ESC/POS printerni boshqarish.
// Qurilma ruxsati brauzerda saqlanadi — sahifa qayta yuklansa
// navigator.usb.getDevices() orqali avtomatik qayta ulanadi.

let device: USBDevice | null = null;
let interfaceNumber = -1;
let endpointOut = -1;

export function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

export function isConnected(): boolean {
  return !!device && device.opened && endpointOut >= 0;
}

export function deviceName(): string | null {
  if (!device) return null;
  if (device.productName) return device.productName;
  const v = device.vendorId.toString(16).padStart(4, '0');
  const pr = device.productId.toString(16).padStart(4, '0');
  return `USB ${v}:${pr}`;
}

// Qurilmani ochib, bulk-OUT endpointini topib, interfeysni egallaymiz.
async function openDevice(dev: USBDevice): Promise<void> {
  if (!dev.opened) await dev.open();
  if (dev.configuration === null) await dev.selectConfiguration(1);

  const config = dev.configuration;
  if (!config) throw new Error('Printer konfiguratsiyasi topilmadi.');

  // Avval printer-klass (7) interfeysini, bo'lmasa bulk-OUT bor har qandayni izlaymiz.
  const candidates = [...config.interfaces].sort((a, b) => {
    const ac = a.alternate.interfaceClass === 7 ? 0 : 1;
    const bc = b.alternate.interfaceClass === 7 ? 0 : 1;
    return ac - bc;
  });

  for (const iface of candidates) {
    const out = iface.alternate.endpoints.find(
      (e) => e.direction === 'out' && e.type === 'bulk',
    );
    if (!out) continue;
    if (!iface.claimed) await dev.claimInterface(iface.interfaceNumber);
    interfaceNumber = iface.interfaceNumber;
    endpointOut = out.endpointNumber;
    device = dev;
    return;
  }

  throw new Error('Printerda chop qilish endpointi topilmadi.');
}

// Foydalanuvchi ishorasi bilan yangi qurilma tanlash (birinchi ulanish).
export async function pairDevice(): Promise<void> {
  if (!isSupported()) {
    throw new Error("Bu brauzer WebUSB'ni qo'llamaydi. Chrome yoki Edge ishlating.");
  }
  // filters: [] — barcha USB qurilmalarni ko'rsatadi (printerlar har xil klassda bo'ladi).
  const dev = await navigator.usb.requestDevice({ filters: [] });
  await openDevice(dev);
}

// Sahifa yuklanganda oldin ruxsat berilgan qurilmaga jimgina qayta ulanish.
export async function tryReconnect(): Promise<boolean> {
  if (!isSupported()) return false;
  if (isConnected()) return true;
  try {
    const devices = await navigator.usb.getDevices();
    if (devices.length === 0) return false;
    await openDevice(devices[0]);
    return true;
  } catch {
    return false;
  }
}

export async function disconnect(): Promise<void> {
  const dev = device;
  const iface = interfaceNumber;
  device = null;
  interfaceNumber = -1;
  endpointOut = -1;
  if (!dev) return;
  try {
    if (dev.opened && iface >= 0) await dev.releaseInterface(iface);
  } catch {
    /* interfeys allaqachon bo'shagan bo'lishi mumkin */
  }
  try {
    if (dev.opened) await dev.close();
  } catch {
    /* qurilma allaqachon uzilgan bo'lishi mumkin */
  }
}

// Uzilish hodisasi kelganda ichki holatni tozalash.
export function handleDisconnect(ev: USBConnectionEvent): void {
  if (device && ev.device === device) {
    device = null;
    interfaceNumber = -1;
    endpointOut = -1;
  }
}

// Baytlarni printerga yozish (zarur bo'lsa avval qayta ulanadi).
export async function write(data: Uint8Array): Promise<void> {
  if (!isConnected()) {
    const ok = await tryReconnect();
    if (!ok) throw new Error("Printer ulanmagan.");
  }
  const CHUNK = 8 * 1024;
  for (let i = 0; i < data.length; i += CHUNK) {
    const res = await device!.transferOut(endpointOut, data.slice(i, i + CHUNK));
    if (res.status !== 'ok') {
      throw new Error(`Chop qilishda xato (${res.status}).`);
    }
  }
}
