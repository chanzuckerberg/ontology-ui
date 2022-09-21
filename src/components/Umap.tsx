import { scaleLinear } from "d3-scale";
import { useRecoilState, useRecoilValue } from "recoil";
import { currentCelltypesState, currentOntologyState } from "../recoil";
import { graphLayoutDimensionsState } from "../recoil/layout";
import { umapCoordsExtentState, umapEmbeddingState, umapThresholdState } from "../recoil/umap";

const Umap = () => {
  const umapThreshold = useRecoilState(umapThresholdState);

  const ontology = useRecoilValue(currentOntologyState);
  const currentCelltypes = useRecoilValue(currentCelltypesState);
  const umapCoords = useRecoilValue(umapEmbeddingState);
  const extent = useRecoilValue(umapCoordsExtentState);
  const graphLayoutDimensions = useRecoilValue(graphLayoutDimensionsState);

  if (!graphLayoutDimensions) return null;
  if (!umapCoords || !extent) return <p>no umap coords, make sure you're under {umapThreshold} cells! </p>;

  const umapPadding = 100;

  const xScale = scaleLinear()
    .domain([extent.xMin, extent.xMax])
    .range([umapPadding, graphLayoutDimensions.graphContainerWidth - umapPadding]);
  const yScale = scaleLinear()
    .domain([extent.yMin, extent.yMax])
    .range([umapPadding, graphLayoutDimensions.graphContainerHeight - umapPadding]);

  return (
    <div>
      <svg height={graphLayoutDimensions.graphContainerHeight} width={graphLayoutDimensions.graphContainerWidth}>
        <g>
          {umapCoords.map((coord, i) => {
            return (
              <g key={i}>
                <text fontSize={10} x={xScale(coord[0])} y={yScale(coord[1])}>
                  {ontology?.get(currentCelltypes[i])?.label || currentCelltypes[i]}
                </text>
                <circle key={i} cx={xScale(coord[0])} cy={yScale(coord[1])} r={2} fill="red" />;
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default Umap;
