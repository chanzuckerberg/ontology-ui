import isProd from "./isProd";

const apiPrefix = isProd ? "https://cellxgene.cziscience.com" : "http://localhost:5000/api";

export default apiPrefix;
