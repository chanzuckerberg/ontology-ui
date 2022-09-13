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

const Dotplot = () => {
  const [dotplotIsOpen, setDotplotIsOpen] = useRecoilState(dotplotIsOpenState);
  const [dotplotRenderThreshold] = useRecoilState(dotplotRenderThresholdState);
  const dotplotEnabled = useRecoilValue(dotplotEnabledState);

  const dotplotRows = useRecoilValue(dotplotRowState);

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
