const path = require("path");

const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const CopyWebbackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  entry: {
    background: "./src/background/background.js",
    content: "./src/content/content.js",
    popup: "./src/popup/popup.js",
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "Resources"),
    publicPath: "/",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [["@babel/preset-env", { targets: "defaults" }]],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: "static",
      openAnalyzer: false,
      reportFilename: "./../build/report.html",
    }),
    new CopyWebbackPlugin({
      patterns: [
        {
          from: "./src/_locales/",
          to: "_locales/",
          globOptions: {
            gitignore: true,
            ignore: ["**/.DS_Store"],
          },
        },
        { from: "./src/images/*.*", to: "images/[name][ext]" },
        { from: "./src/manifest.json", to: "[name][ext]" },
        {
          from: "@nordhealth/themes/lib/nord.css",
          to: "assets/[name][ext]",
          context: "node_modules",
        },
        {
          from: "@nordhealth/themes/lib/nord-dark.css",
          to: "assets/[name][ext]",
          context: "node_modules",
        },
      ],
    }),
    new HtmlWebpackPlugin({
      chunks: ["popup"],
      filename: "popup.html",
      template: "./src/popup/popup.html",
    }),
  ],
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
    ],
  },
  devtool: "source-map",
  target: ["web", "es5"],
};
