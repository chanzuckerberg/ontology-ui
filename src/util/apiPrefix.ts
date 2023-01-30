import isProd from "./isProd";

const apiPrefix = isProd ? "https://cellxgene.cziscience.com" : "http://127.0.0.1:5000/api";

export default apiPrefix;
