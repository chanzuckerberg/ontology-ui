import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";
import svgrPlugin from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), viteTsconfigPaths(), svgrPlugin()],
  resolve: {
    alias: {
      fs: require.resolve("rollup-plugin-node-builtins"),
    },
  },
  build: {
    outDir: "build",
  },
  server: {
    open: true,
    port: 3000,
  },
});
