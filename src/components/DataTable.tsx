import { Button, Classes, Drawer, DrawerSize } from "@blueprintjs/core";
import { useRecoilState, useRecoilValue } from "recoil";

import { dataTableIsOpenState } from "../recoil/datatable";
import { currentCelltypesState, currentCelltypesWithCountsState, currentOntologyState } from "../recoil/";
import { portalCellTypeCountsState } from "../recoil/portal";

const Datatable = () => {
  /* atoms */
  const [dataTableIsOpen, setDataTableIsOpen] = useRecoilState(dataTableIsOpenState);
  const currentCelltypes = useRecoilValue(currentCelltypesState);
  const portalCellTypeCounts = useRecoilValue(portalCellTypeCountsState);
  const ontology = useRecoilValue(currentOntologyState);

  if (!ontology) return null;

  const tableWidth = 800;

  return (
    <div id="datatable">
      <Drawer
        icon="th"
        onClose={() => {
          setDataTableIsOpen(false);
        }}
        title={`Data Table`}
        position={"bottom"}
        isOpen={dataTableIsOpen}
        canOutsideClickClose={true}
        canEscapeKeyClose={true}
        size={DrawerSize.LARGE}
      >
        <div className={Classes.DRAWER_BODY}>
          <div className={Classes.DIALOG_BODY}>
            <div style={{ display: "flex" }}>
              <div>
                <div style={{ width: tableWidth, display: "flex", justifyContent: "flex-start" }}>
                  <pre style={{ marginBottom: 20, lineHeight: 1, fontSize: 10, width: 90 }}>CL Term</pre>
                  <pre style={{ marginBottom: 20, lineHeight: 1, fontSize: 10, width: 335 }}>Cell Type</pre>
                  <pre style={{ marginBottom: 20, lineHeight: 1, fontSize: 10, width: 200 }}>Count</pre>
                  <pre style={{ marginBottom: 20, lineHeight: 1, fontSize: 10, width: 200 }}>
                    Count With Descendants
                  </pre>
                </div>
                <div>
                  {currentCelltypes.map((celltype, i) => {
                    console.log(portalCellTypeCounts[celltype]);
                    const vertex = ontology.get(celltype);

                    return (
                      <div
                        style={{
                          width: tableWidth,
                          display: "flex",
                          justifyContent: "flex-start",
                          alignItems: "left",
                          background: i % 2 === 0 ? "rgb(240,240,240)" : "none",
                          fontSize: 10,
                          lineHeight: 1,
                        }}
                      >
                        <pre style={{ margin: 0, textAlign: "left", width: 90 }} key={celltype}>
                          {celltype}
                        </pre>
                        <pre style={{ margin: 0, textAlign: "left", width: 300, overflow: "hidden" }} key={celltype}>
                          {vertex && vertex.label}
                        </pre>
                        <pre style={{ margin: 0, marginLeft: 35, textAlign: "left", width: 200 }} key={celltype}>
                          {portalCellTypeCounts[celltype] && portalCellTypeCounts[celltype].unique_cell_count}
                        </pre>
                        <pre style={{ margin: 0, textAlign: "left", width: 200 }} key={celltype}>
                          {portalCellTypeCounts[celltype] &&
                            portalCellTypeCounts[celltype].unique_cell_count_with_descendants}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div>foo</div>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default Datatable;
