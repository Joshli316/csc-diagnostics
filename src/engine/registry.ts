/**
 * The only module that imports concrete instruments. Adding a new diagnostic =
 * import its config here and append it to `INSTRUMENTS`.
 */
import type { Instrument } from "./instrument";
import { w15 } from "../instruments/w15/config";
import { w04 } from "../instruments/w04/config";
import { w10 } from "../instruments/w10/config";
import { w12 } from "../instruments/w12/config";

// Hub display order: Wins, Skills, Culture, Network.
export const INSTRUMENTS: Instrument[] = [w15, w04, w10, w12];

export function getInstrument(id: string): Instrument | undefined {
  return INSTRUMENTS.find((i) => i.id === id);
}
