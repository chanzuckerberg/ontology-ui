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
      // http: require.resolve('rollup-plugin-node-builtins'),
      // util: require.resolve('rollup-plugin-node-builtins'),
      // stream: require.resolve('rollup-plugin-node-builtins'),
      // buffer: require.resolve('rollup-plugin-node-builtins'),
      // process: require.resolve('rollup-plugin-node-builtins'),
      // url: require.resolve('rollup-plugin-node-builtins'),
      // querystring: require.resolve('rollup-plugin-node-builtins'),
    },
  },
});
