const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
require('dotenv').config();

module.exports = {
  mode: 'development', // Mode développement pour un chargement rapide
  entry: './src/index.js', // Point d'entrée du projet
  output: {
    path: path.resolve(__dirname, 'dist'), // Répertoire de sortie
    filename: 'bundle.js', // Nom du fichier de sortie
    publicPath: '/', // Gestion des chemins d'accès pour la navigation
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'), // Chemin pour les fichiers statiques
    },
    compress: true, // Compression pour un chargement plus rapide
    port: 3000, // Port de développement
    historyApiFallback: true, // Support pour les applications SPA
    open: true, // Ouvre le navigateur automatiquement
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // Middleware personnalisé pour des tests ou extensions spécifiques
      devServer.app.get('/status', (req, res) => {
        res.json({ status: 'OK' });
      });

      return middlewares;
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/, // Gestion des fichiers .js et .jsx
        exclude: /node_modules/, // Exclusion du dossier node_modules
        use: {
          loader: 'babel-loader', // Utilisation de Babel pour la transpilation
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'], // Préréglages pour supporter JS moderne et React
          },
        },
      },
      {
        test: /\.css$/, // Gestion des fichiers CSS
        use: ['style-loader', 'css-loader'], // Chargement et intégration du CSS
      },
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/, // Gestion des images et icônes
        type: 'asset/resource', // Type de module pour les ressources
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html', // Template HTML pour générer l'application
      favicon: './public/favicon.ico', // Ajout d'un favicon si disponible
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx'], // Extensions par défaut pour les imports
  },
};
