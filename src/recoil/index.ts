import { atom } from "recoil";

export const ensemble = atom<null | {}>({
  key: "ensemble",
  default: null,
});

export const selectedGeneState = atom<null | {}>({
  key: "selectedGene",
  default: null,
});

export const selectedGeneExpressionDataState = atom<null | {}>({
  key: "selectedGeneExpressionData",
  default: null,
});
