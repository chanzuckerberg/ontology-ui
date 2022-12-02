const webpack = require("webpack");

module.exports = {
  webpack: {
    configure: {
      //
      // blueprintjs has malformed sourcemaps in their CSS.  CRA v5 no longer ignores
      // these warnings (a fix is in development: https://github.com/facebook/create-react-app/pull/11752)
      // For now, suppress these warnings as they are meaningless.
      //
      ignoreWarnings: [/Failed to parse source map from/],

      plugins: [
        new webpack.DefinePlugin({
          PLAUSIBLE_DATA_DOMAIN: JSON.stringify("cellxgene.cziscience.com"),
        }),        
        //
        // javascript-lp-solver has some bogus imports which we disable as
        // instructed in the install guide: https://github.com/JWally/jsLPSolver#install
        // This package is used by d3-dag. This config can be removed if d3-dag is no
        // longer in use.
        //
        new webpack.IgnorePlugin({
          checkResource(resource, context) {
            if (
              context.endsWith("node_modules/javascript-lp-solver/src/External/lpsolve") &&
              (resource === "child_process" || resource === "fs")
            )
              return true;
            return false;
          },
        }),
      ],
    },
  },
};
