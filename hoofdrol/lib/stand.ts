// Welke onderdelen echt zijn gekoppeld en welke nog op de testversie draaien.
import { paymentMode } from './providers/payment';
import { imageMode } from './providers/images';
import { printMode } from './providers/print';
import { mailMode } from './mail';
import { storeMode } from './store';

export const koppelingen = () => ({
  Betalen: paymentMode() === 'mollie' ? 'Mollie' : 'testbetaling',
  Platen: imageMode() === 'higgsfield' ? 'Higgsfield' : 'testplaten',
  Drukker: printMode() === 'echt' ? 'Gelato' : 'testdrukkers',
  Mail: mailMode() === 'resend' ? 'Resend' : 'niet verstuurd',
  Opslag: storeMode() === 'blobs' ? 'Netlify Blobs' : 'schijf',
});

// De balk "Testversie" blijft staan zolang betalen, platen of drukker nog nagemaakt is.
export const testversie = () => paymentMode() === 'test' || imageMode() === 'test' || printMode() === 'test';
