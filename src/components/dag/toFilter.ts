/**
 * This is a set of nodes we don't want in the graph, because of high connectivity. Manual override.
 * Included: cell, native cell, animal cell, eukaryotic cell, somatic cell
 */

export const greaterThanThirtyDescendants = [
  "CL:0000000", // 'cell', descendants: 2365
  "CL:0000540", // 'neuron', descendants: 302
  "CL:0000003", // 'native cell', descendants: 2354
  "CL:0000057", // 'fibroblast', descendants: 66
  "CL:0000006", // 'neuronal receptor cell', descendants: 59
  "CL:0000197", // 'sensory receptor cell', descendants: 87
  "CL:0000101", // 'sensory neuron', descendants: 83
  "CL:0002321", // 'embryonic cell (metazoa)', descendants: 31
  "CL:0000039", // 'germ line cell', descendants: 41
  "CL:0000034", // 'stem cell', descendants: 106
  "CL:0000586", // 'germ cell', descendants: 32
  "CL:0000548", // 'animal cell', descendants: 1986
  "CL:0000192", // 'smooth muscle cell', descendants: 51
  "CL:0000055", // 'non-terminally differentiated cell', descendants: 52
  "CL:0000151", // 'secretory cell', descendants: 395
  "CL:0011115", // 'precursor cell', descendants: 257
  "CL:0000723", // 'somatic stem cell', descendants: 40
  "CL:0000988", // 'hematopoietic cell', descendants: 615
  "CL:0008001", // 'hematopoietic precursor cell', descendants: 103
  "CL:0011026", // 'progenitor cell', descendants: 147
  "CL:0000764", // 'erythroid lineage cell', descendants: 34
  "CL:0000839", // 'myeloid lineage restricted progenitor cell', descendants: 51
  "CL:0002371", // 'somatic cell', descendants: 1983
  "CL:0000763", // 'myeloid cell', descendants: 229
  "CL:0000145", // 'professional antigen presenting cell', descendants: 190
  "CL:0000048", // 'multi fate stem cell', descendants: 52
  "CL:0002320", // 'connective tissue cell', descendants: 177
  "CL:0002077", // 'ecto-epithelial cell', descendants: 129
  "CL:0000710", // 'neurecto-epithelial cell', descendants: 83
  "CL:0002159", // 'general ecto-epithelial cell', descendants: 46
  "CL:0000064", // 'ciliated cell', descendants: 32
  "CL:0000066", // 'epithelial cell', descendants: 657
  "CL:0000738", // 'leukocyte', descendants: 484
  "CL:0000068", // 'duct epithelial cell', descendants: 35
  "CL:0000071", // 'blood vessel endothelial cell', descendants: 45
  "CL:0000076", // 'squamous epithelial cell', descendants: 94
  "CL:0002139", // 'endothelial cell of vascular tree', descendants: 54
  "CL:0002078", // 'meso-epithelial cell', descendants: 165
  "CL:0000075", // 'columnar/cuboidal epithelial cell', descendants: 143
  "CL:0000213", // 'lining cell', descendants: 98
  "CL:0000081", // 'blood cell', descendants: 32
  "CL:0000084", // 'T cell', descendants: 142
  "CL:0000542", // 'lymphocyte', descendants: 294
  "CL:0000945", // 'lymphocyte of B lineage', descendants: 101
  "CL:0000864", // 'tissue-resident macrophage', descendants: 39
  "CL:0000766", // 'myeloid leukocyte', descendants: 149
  "CL:0001035", // 'bone cell', descendants: 40
  "CL:0000095", // 'neuron associated cell', descendants: 46
  "CL:0002319", // 'neural cell', descendants: 393
  "CL:0000234", // 'phagocyte', descendants: 84
  "CL:0000098", // 'sensory epithelial cell', descendants: 45
  "CL:0000099", // 'interneuron', descendants: 81
  "CL:0000527", // 'efferent neuron', descendants: 31
  "CL:0000526", // 'afferent neuron', descendants: 84
  "CL:0000104", // 'multipolar neuron', descendants: 39
  "CL:0000226", // 'single nucleate cell', descendants: 399
  "CL:0000115", // 'endothelial cell', descendants: 73
  "CL:0000117", // 'CNS neuron (sensu Vertebrata)', descendants: 70
  "CL:0011005", // 'GABAergic interneuron', descendants: 41
  "CL:0000125", // 'glial cell', descendants: 37
  "CL:0000499", // 'stromal cell', descendants: 49
  "CL:0000325", // 'stuff accumulating cell', descendants: 167
  "CL:0000150", // 'glandular epithelial cell', descendants: 129
  "CL:0000159", // 'seromucus secreting cell', descendants: 33
  "CL:0000161", // 'acid secreting cell', descendants: 45
  "CL:0000163", // 'endocrine cell', descendants: 96
  "CL:0000164", // 'enteroendocrine cell', descendants: 32
  "CL:0000165", // 'neuroendocrine cell', descendants: 33
  "CL:0000393", // 'electrically responsive cell', descendants: 466
  "CL:0000167", // 'peptide hormone secreting cell', descendants: 69
  "CL:0000183", // 'contractile cell', descendants: 158
  "CL:0000187", // 'muscle cell', descendants: 128
  "CL:0008000", // 'non-striated muscle cell', descendants: 52
  "CL:0008007", // 'visceral muscle cell', descendants: 54
  "CL:0000746", // 'cardiac muscle cell', descendants: 46
  "CL:0000362", // 'epidermal cell', descendants: 32
  "CL:0002076", // 'endo-epithelial cell', descendants: 187
  "CL:0000211", // 'electrically active cell', descendants: 468
  "CL:0000215", // 'barrier cell', descendants: 101
  "CL:0000630", // 'supportive cell', descendants: 57
  "CL:0000219", // 'motile cell', descendants: 527
  "CL:0002242", // 'nucleate cell', descendants: 524
  "CL:0000228", // 'multinucleate cell', descendants: 32
  "CL:0000473", // 'defensive cell', descendants: 97
  "CL:0000235", // 'macrophage', descendants: 51
  "CL:0000236", // 'B cell', descendants: 86
  "CL:0000255", // 'eukaryotic cell', descendants: 2017
  "CL:0000402", // 'CNS interneuron', descendants: 36
  "CL:2000029", // 'central nervous system neuron', descendants: 80
  "CL:0000404", // 'electrically signaling cell', descendants: 303
  "CL:0000737", // 'striated muscle cell', descendants: 72
  "CL:0000451", // 'dendritic cell', descendants: 74
  "CL:0000842", // 'mononuclear cell', descendants: 395
  "CL:0000990", // 'conventional dendritic cell', descendants: 59
  "CL:0000624", // 'CD4-positive, alpha-beta T cell', descendants: 31
  "CL:0000498", // 'inhibitory interneuron', descendants: 42
  "CL:0002563", // 'intestinal epithelial cell', descendants: 69
  "CL:0002494", // 'cardiocyte', descendants: 63
  "CL:0002251", // 'epithelial cell of alimentary canal', descendants: 110
  "CL:0000617", // 'GABAergic neuron', descendants: 43
  "CL:0000791", // 'mature alpha-beta T cell', descendants: 72
  "CL:0000679", // 'glutamatergic neuron', descendants: 36
  "CL:0000785", // 'mature B cell', descendants: 61
  "CL:0001201", // 'B cell, CD19-positive', descendants: 84
  "CL:0000789", // 'alpha-beta T cell', descendants: 91
  "CL:0002420", // 'immature T cell', descendants: 45
  "CL:0002419", // 'mature T cell', descendants: 92
  "CL:0000893", // 'thymocyte', descendants: 37
  "CL:0002031", // 'hematopoietic lineage restricted progenitor cell', descendants: 63
  "CL:0001065", // 'innate lymphoid cell', descendants: 45
  "CL:0001200", // 'lymphocyte of B lineage, CD19-positive', descendants: 85
  "CL:0002086", // 'specialized cardiac myocyte', descendants: 37
  "CL:0002253", // 'epithelial cell of large intestine', descendants: 31
  "CL:0002518", // 'kidney epithelial cell', descendants: 100
  "CL:1000497", // 'kidney cell', descendants: 126
  "CL:0002584", // 'renal cortical epithelial cell', descendants: 69
  "CL:0002681", // 'kidney cortical cell', descendants: 74
  "CL:0002609", // 'neuron of cerebral cortex', descendants: 31
  "CL:0010012", // 'cerebral cortex neuron', descendants: 52
  "CL:0012001", // 'neuron of the forebrain', descendants: 36
  "CL:1000449", // 'epithelial cell of nephron', descendants: 58
  "CL:1000504", // 'kidney medulla cell', descendants: 59
  "CL:1000854", // 'kidney blood vessel cell', descendants: 39
];
