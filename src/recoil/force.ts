import { atom } from "recoil";

export const simulationRunningState = atom<boolean>({
  key: "simulationRunning",
  default: false,
});
