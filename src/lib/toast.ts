type Listener = (message: string) => void;
const listeners = new Set<Listener>();
export const toast = (message: string) => listeners.forEach((listener) => listener(message));
export const subscribeToast = (listener: Listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const paymentSoonMessage = 'Bu özellik yakında iyzico/PayTR entegrasyonu ile açılacak.';
