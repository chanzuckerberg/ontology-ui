import { useRecoilValue } from "recoil";
import { umapEmbeddingState } from "../recoil/umap";

const Umap = () => {
  const umap = useRecoilValue(umapEmbeddingState);

  return <p>allo</p>;
};

export default Umap;
