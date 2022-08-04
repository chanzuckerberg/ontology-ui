import { selector } from "recoil";
import { dsvFormat } from "d3-dsv";

export const geneNameConversionTableState = selector<any>({
  key: "geneNameConversionTable",
  get: async ({ get }) => {
    try {
      const response = await fetch(`./ens_gene_convert.json`);
      const data = await response.json();

      let geneNameConversionTable = null;

      if (data && data.gene_terms && data.gene_terms["NCBITaxon:9606"]) {
        geneNameConversionTable = new Map(
          data.gene_terms["NCBITaxon:9606"].map((name: any) => {
            const ensToGenePair = Object.entries(name)[0];
            return [ensToGenePair[0], ensToGenePair[1]];
          })
        );
      }

      return geneNameConversionTable;
    } catch (error) {
      throw error;
    }
  },
});

export const geneMeanState = selector<any>({
  key: "geneMean",
  get: async ({ get }) => {
    try {
      const response = await fetch(`./gene_data_filtered.tsv`, {
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "utf-8",
        },
      });

      const csvString = await response.text();
      const geneData = dsvFormat(",").parseRows(csvString);

      return geneData.slice(1);
    } catch (error) {
      throw error;
    }
  },
});
