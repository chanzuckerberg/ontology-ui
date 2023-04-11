import isProd from "./isProd";

const apiPrefix = isProd ? "https://cellxgene.cziscience.com" : "/api";

export default apiPrefix;
