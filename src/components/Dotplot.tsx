import { Classes, Drawer, DrawerSize } from "@blueprintjs/core";
import { useRecoilState, useRecoilValue } from "recoil";
import { currentOntologyState } from "../recoil";
import {
  dotplotEnabledState,
  dotplotIsOpenState,
  dotplotRenderThresholdState,
  dotplotRowState,
  dotplotState,
  diffexpGenesDotplotState,
  dotScaleState,
} from "../recoil/dotplot";
import { geneNameConversionTableState } from "../recoil/genes";
import { OntologyVertexDatum } from "../types/graph";

import { interpolateViridis } from "d3-scale-chromatic";

const Dotplot = () => {
  /* atoms */
  const [dotplotIsOpen, setDotplotIsOpen] = useRecoilState(dotplotIsOpenState);
  const [dotplotRenderThreshold] = useRecoilState(dotplotRenderThresholdState);

  /* selectors */
  const dotplotEnabled = useRecoilValue(dotplotEnabledState);
  const geneNameConversionTable = useRecoilValue(geneNameConversionTableState);
  const dotplotRows = useRecoilValue(dotplotRowState);
  const dots = useRecoilValue(dotplotState);
  const diffexpGenes = useRecoilValue(diffexpGenesDotplotState);
  const ontology = useRecoilValue(currentOntologyState);

  const { fracScale, meanScale, legend } = useRecoilValue(dotScaleState);

  if (!dotplotEnabled || !dotplotIsOpen || !dotplotRows) {
    return null;
  }

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
        title={`Dotplot view (scroll ↔️) —— celltypes: ${dotplotRows.length}, genes: ${diffexpGenes.length}`}
        position={"bottom"}
        isOpen={dotplotIsOpen}
        canOutsideClickClose={true}
        canEscapeKeyClose={true}
        size={DrawerSize.LARGE}
      >
        <div className={Classes.DRAWER_BODY}>
          <div className={Classes.DIALOG_BODY}>
            {!dotplotEnabled && <p> Select {dotplotRenderThreshold} or fewer cells to display the dotplot view</p>}
            <svg height={3000} width={5000}>
              <g id="dotplotLegend">
                <text x={40} y={20} fill="black">
                  Min frac: {legend.frac.min}
                </text>
                <text x={40} y={40} fill="black">
                  Max frac: {legend.frac.max}
                </text>
                <text x={40} y={60} fill="black">
                  Min mean expression: {legend.mean.min}
                </text>
                <text x={40} y={80} fill="black">
                  Max mean expression: {legend.mean.max}
                </text>
                <circle cx={20} cy={15} fill="grey" r={fracScale(legend.frac.min)} />
                <circle cx={20} cy={35} fill="grey" r={fracScale(legend.frac.max)} />
                <circle
                  cx={20}
                  cy={55}
                  fill={interpolateViridis(meanScale(legend.mean.min))}
                  r={fracScale(legend.frac.max)}
                />
                <circle
                  cx={20}
                  cy={75}
                  fill={interpolateViridis(meanScale(legend.mean.max))}
                  r={fracScale(legend.frac.max)}
                />
              </g>
              <g transform={"translate(200,10)"}>
                {/* CELL TYPES */}
                {ontology &&
                  dotplotRows &&
                  dotplotRows.map((row: OntologyVertexDatum, i: number) => {
                    const vertex = ontology.get(row.id);
                    return (
                      <text key={row.id} x={100} y={i * 12 + 100} textAnchor="end" style={{ fontSize: 10 }}>
                        {(vertex && vertex.label) || row.id}
                      </text>
                    );
                  })}
                {/* GENES */}
                {diffexpGenes &&
                  diffexpGenes.map((gene: string, i: number) => {
                    return (
                      <text
                        key={gene}
                        x={i * 12 + 100}
                        y={90}
                        transform={`rotate(90,${i * 12 + 100},${90})`}
                        textAnchor="end"
                        style={{ fontSize: 10 }}
                      >
                        {geneNameConversionTable.get(gene) || gene}
                      </text>
                    );
                  })}
                {diffexpGenes &&
                  diffexpGenes.map((gene: string, offsetX: number) => {
                    return (
                      <g key={gene}>
                        {dotplotRows &&
                          dotplotRows.map((celltype: any, offsetY: number) => {
                            const dot = dots[gene] && dots[gene][celltype.id];
                            if (dot) {
                              return (
                                <circle
                                  key={`${gene}-${celltype.id}`}
                                  cx={offsetX * 12 + 104}
                                  cy={offsetY * 12 + 97}
                                  r={fracScale(parseFloat(dot.fracExpressing))}
                                  fill={interpolateViridis(meanScale(parseFloat(dot.mean)))}
                                />
                              );
                            } else {
                              return null;
                            }
                          })}
                      </g>
                    );
                  })}
              </g>
            </svg>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default Dotplot;
