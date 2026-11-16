// Het lettertype van het drukbestand heeft de West-Europese letters. Andere tekens
// (bijvoorbeeld Ł, ő of emoji) zouden als lege blokjes worden gedrukt, dus die weigeren we vooraf.
const DRUKBAAR = /^[ -~ -ÿŒœ–‘’“”…€]*$/;
export const drukbaar = (tekst: string) => DRUKBAAR.test(tekst);
export const nietDrukbaar = (tekst: string) => [...new Set([...tekst].filter((c) => !DRUKBAAR.test(c)))].join(' ');
