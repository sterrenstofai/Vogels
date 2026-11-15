// /ontdek: een willekeurig voertuig.
import { lijst, pad } from "/js/voertuigen.js";
const v = lijst(); location.replace(pad(v[Math.floor(Math.random() * v.length)]));
