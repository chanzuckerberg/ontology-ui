import { atom } from "recoil";

export const settingsDrawerActiveState = atom<boolean>({
  key: "settingsDrawerActive",
  default: false,
});

export const selectedGeneState = atom<null | string>({
  key: "selectedGene",
  default: null,
});

export const sugiyamaIsOpenState = atom<boolean>({
  key: "sugiyamaIsOpen",
  default: false,
});

export const activeGraphState = atom<"force" | "umap">({
  key: "activeGraph",
  default: "force",
});
