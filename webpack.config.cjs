const path = require('path');

module.exports = {
  mode: 'production',
  entry: './browser/symbolFetcher.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.min.js',
    library: 'SymbolTransactionFetcher',
    libraryTarget: 'umd',
    globalObject: 'this',
    libraryExport: 'default'

  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  }
};