import { IS_DEMO } from "../config";
import { localStore } from "./local";
import { remoteStore } from "./remote";
import type { Store } from "./types";

export const store: Store = IS_DEMO ? localStore : remoteStore;
export type { Store };
