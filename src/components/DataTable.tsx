import { Button, Classes, Drawer, DrawerSize } from "@blueprintjs/core";
import { useRecoilState, useRecoilValue } from "recoil";

import { dataTableIsOpenState } from "../recoil/datatable";
import { currentCelltypesState, currentCelltypesWithCountsState, currentOntologyState } from "../recoil/";
import { portalCellTypeCountsState } from "../recoil/portal";
import { useState } from "react";

const Datatable = () => {
  /* atoms */
  const [dataTableIsOpen, setDataTableIsOpen] = useRecoilState(dataTableIsOpenState);
  const currentCelltypes = useRecoilValue(currentCelltypesState);
  const portalCellTypeCounts = useRecoilValue(portalCellTypeCountsState);
  const ontology = useRecoilValue(currentOntologyState);

  // State to keep track of the CSV data
  const [csvData, setCsvData] = useState("");

  if (!ontology) return null;

  const tableWidth = 1200;
  const gridWidths = "100px 335px 110px 170px 150px 200px";

  const downloadCsv = () => {
    // creating an invisible anchor element
    const anchor = document.createElement("a");
    anchor.style.display = "none";
    document.body.appendChild(anchor);

    // constructing CSV content
    let csvContent = "data:text/csv;charset=utf-8,";

    // adding headers
    csvContent += "CL Term, Cell Type, Count, Count With Descendants, Immediate Children, Depth\n";

    // adding data rows
    currentCelltypes.forEach((celltype) => {
      const vertex = ontology.get(celltype);
      const rowData = [
        celltype,
        vertex?.label,
        portalCellTypeCounts[celltype]?.unique_cell_count,
        portalCellTypeCounts[celltype]?.unique_cell_count_with_descendants,
        vertex?.children.length,
        vertex?.depth,
      ];
      csvContent += rowData.join(",") + "\n";
    });

    // setting anchor href and initiating download
    anchor.href = encodeURI(csvContent);
    anchor.download = "table-data.csv";
    anchor.click();

    // removing anchor from DOM
    document.body.removeChild(anchor);
  };

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
            <Button onClick={downloadCsv}>Download CSV</Button>

            <div
              style={{
                width: tableWidth,
                display: "grid",
                gridTemplateColumns: gridWidths,
                alignItems: "left",
                marginBottom: 20,
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              <pre style={{ lineHeight: 1, fontSize: 10 }}>CL Term</pre>
              <pre style={{ lineHeight: 1, fontSize: 10 }}>Cell Type</pre>
              <pre style={{ lineHeight: 1, fontSize: 10 }}>Count</pre>
              <pre style={{ lineHeight: 1, fontSize: 10 }}>Count With Descendants</pre>
              <pre style={{ lineHeight: 1, fontSize: 10 }}>Immediate Children</pre>
              <pre style={{ lineHeight: 1, fontSize: 10 }}>Depth (from ontology root "cell")</pre>
            </div>
            <div>
              {currentCelltypes.map((celltype, i) => {
                console.log(portalCellTypeCounts[celltype]);
                const vertex = ontology.get(celltype);

                return (
                  <div
                    style={{
                      width: tableWidth,
                      display: "grid",
                      gridTemplateColumns: gridWidths,
                      alignItems: "left",
                      background: i % 2 === 0 ? "rgb(240,240,240)" : "none",
                      fontSize: 10,
                      lineHeight: 1,
                    }}
                  >
                    <pre style={{ margin: 0, textAlign: "left" }} key={celltype}>
                      {celltype}
                    </pre>
                    <pre style={{ margin: 0, textAlign: "left", overflow: "hidden", marginRight: 30 }} key={celltype}>
                      {vertex && vertex.label}
                    </pre>
                    <pre style={{ margin: 0, textAlign: "left" }} key={celltype}>
                      {portalCellTypeCounts[celltype] && portalCellTypeCounts[celltype].unique_cell_count}
                    </pre>
                    <pre style={{ margin: 0, textAlign: "left" }} key={celltype}>
                      {portalCellTypeCounts[celltype] &&
                        portalCellTypeCounts[celltype].unique_cell_count_with_descendants}
                    </pre>
                    <pre style={{ margin: 0, textAlign: "left" }} key={celltype}>
                      {vertex?.children.length}
                    </pre>
                    <pre style={{ margin: 0, textAlign: "left" }} key={celltype}>
                      {vertex?.depth}
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default Datatable;
