import { Classes, Drawer, DrawerSize } from "@blueprintjs/core";
import { useRecoilState, useRecoilValue } from "recoil";
import { geneDataState } from "../recoil";
import {
  dotplotEnabledState,
  dotplotIsOpenState,
  dotplotRenderThresholdState,
  dotplotRowState,
} from "../recoil/dotplot";
import { OntologyVertexDatum } from "../types/graph";

interface DotplotProps {
  ontology: any;
}

const Dotplot = ({ ontology }: DotplotProps) => {
  const [dotplotIsOpen, setDotplotIsOpen] = useRecoilState(dotplotIsOpenState);
  const [dotplotRenderThreshold] = useRecoilState(dotplotRenderThresholdState);
  const dotplotEnabled = useRecoilValue(dotplotEnabledState);
  const dotplotRows = useRecoilValue(dotplotRowState);
  const geneData = useRecoilValue(geneDataState);

  if (!dotplotIsOpen) return null;

  /*
    each gene looks like this. it's a pair of cell/gene
    [
      0 "10100", index position
      1 "CL:0000065", cl term
      2 "ENSMUSG00000045658", gene id
      3 "2.2974446", mean
      4 "0.59615386", frac expressing
    ]

    mean: geneData[i][3],
    frac: geneData[i][4],
  */

  /**
   * Since we have cl/gene pairs, the dotplot
   * already exists, more or less
   */

  const _justCellIDs: string[] = [];

  dotplotRows?.forEach((row) => {
    _justCellIDs.push(row.id);
  });

  console.log("dotplotrows", _justCellIDs);

  const includedPairs = [];

  geneData.forEach((gene: []) => {});

  return (
    <div id="dotplot">
      {/**
       * Render sugiyama
       */}
      <Drawer
        icon="heat-grid"
        onClose={() => {
          setDotplotIsOpen(false);
        }}
        title="Dotplot view (scroll ↔️)"
        position={"bottom"}
        isOpen={dotplotIsOpen}
        canOutsideClickClose={true}
        canEscapeKeyClose={true}
        size={DrawerSize.LARGE}
      >
        <div className={Classes.DRAWER_BODY}>
          <div className={Classes.DIALOG_BODY}>
            {!dotplotEnabled && <p> Select {dotplotRenderThreshold} or fewer cells to display the dotplot view</p>}
            <svg height={3000} width={3000}>
              {dotplotRows &&
                dotplotRows.map((row: OntologyVertexDatum, i: number) => {
                  return (
                    <text x={100} y={i * 12 + 100} textAnchor="end" style={{ fontSize: 10 }}>
                      {row.id}
                    </text>
                  );
                })}
            </svg>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default Dotplot;
