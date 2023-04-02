/* async recoil selector to https://api.cellxgene.cziscience.com/dp/v1/datasets/index */
import { selector } from "recoil";
import { urlState } from ".";
import apiPrefix from "../util/apiPrefix";

// a type for Census Counts {"CL:0000003":8500,"CL:0000030":31458,"CL:0000037":3342, ...
export interface CensusCounts {
  [key: string]: {
    unique_cell_count: number;
    unique_cell_count_with_descendants: number;
  }
}

interface Assay {
  label: string;
  ontology_term_id: string;
}

export interface CellType {
  label: string;
  ontology_term_id: string;
}

export interface PortalDataset {
  assay: Assay[];
  cell_count: number;
  cell_type: CellType[];
  cell_type_ancestors: string[];
  collection_id: string;
  development_stage: any[];
  development_stage_ancestors: string[];
  disease: any[];
  explorer_url: string;
  id: string;
  is_primary_data: string;
  mean_genes_per_cell: number;
  name: string;
  organism: any[];
  published_at: number;
  schema_version: string;
  self_reported_ethnicity: any[];
  sex: any[];
  tissue: any[];
  tissue_ancestors: string[];
}

type CellMetadataFields = {
  soma_joinid: string;
  dataset_id: string;
  assay: string;
  assay_ontology_term_id: string;
  cell_type: string;
  cell_type_ontology_term_id: string;
  development_stage: string;
  development_stage_ontology_term_id: string;
  disease: string;
  disease_ontology_term_id: string;
  donor_id: string;
  is_primary_data: string;
  self_report: string;
};

const portalDatasets = selector<any>({
  key: "portalDatasets",
  get: async ({ get }) => {
    try {
      const response = await fetch(`${apiPrefix}/portalDatasets`);
      const data: PortalDataset[] = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },
});

// now let's figure out which datasets contain the currently selected cell type
export const portalDatasetsWithCellTypeState = selector<any>({
  key: "datasetsWithCellType",
  get: ({ get }) => {
    const datasets = get(portalDatasets);
    const url = get(urlState);

    // the vertex on the left sidebar is url.vertexID
    // the portal datasets record each cell type in the dataset.
    // the list of cell types are found at dataset.cell_type
    // and each of the cell types has an ontology_term_id
    // the ontology_term_id is the same as the vertexID
    // so we can filter the datasets to find the ones that contain the cell type

    const datasetsWithCellType: PortalDataset[] = datasets.filter((dataset: PortalDataset) => {
      const cellTypes = dataset.cell_type;
      const cellTypeIDs = cellTypes.map((cellType: CellType) => cellType.ontology_term_id);
      // if the cell type is in the list of cell types for this dataset, return true
      if (cellTypeIDs.includes(url.vertexID)) return true;
    });

    return datasetsWithCellType;
  },
});

// now let's get all the counts for each cell type across all datasets
export const portalCellTypeCountsState = selector<any>({
  key: "portalCellTypeCounts",
  get: async ({ get }) => {
    try {
      const response = await fetch(`${apiPrefix}/census/cellCounts`);
      const data: CensusCounts = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },
});

export const portalCellMetadataFieldsState = selector<any>({
  key: "portalCellMetadataFields",
  get: async ({ get }) => {
    try {
      const response = await fetch(`${apiPrefix}/census/cellMetadataFields`);
      const data: CellMetadataFields = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },
});
