// Base webpack config, shared by all packed modules
import Path from "path";
import { fileURLToPath } from 'url';
const __dirname = Path.dirname(fileURLToPath(import.meta.url));
import TerserPlugin from "terser-webpack-plugin";
import webpack from "webpack";
import { promises as fs } from "fs";

/**
 * Copy a file (or directory recursively) into the dist. Used for css etc.
 * that we want to copy but not bundle. I'm sure a webpack expert could do
 * this a lot better!
 * @param {string} from pathname to copy
 * @param {string} to where to copy to
 */
function copyFile(from, to) {
  const a_from = Path.normalize(Path.join(__dirname, from));
  const a_to = Path.normalize(Path.join(__dirname, to));
  fs.cp(a_from, a_to, {
    recursive: true,
    force: true,
//    filter: f => { console.debug("copy", f); return true; },
    dereference: true
  })
  .catch(e => {
    // cp works, but throws all sorts of wierd errors for no
    // apparent reason before completing.
    //console.error("wierd", from, e);
  });
}

/**
 * Rewrite a <link> in html
 * @param {string} from link to rewrite (can be a common preamble)
 * @param {string} to what to replace `from` with
 * @param {string} content the HTML to perform the replacement in
 * @return {string} the edited HTML
 */
function relink(from, to, content) {
  const re = new RegExp(`(<link[^>]*href=")${from}`, "g");
  return content.replace(
    re,
    (m, preamble) => `${preamble}${to}`);
}

/**
 * Process one of the top level HTML files. There are a number of edits
 * required for webpacking, fixing up links etc.
 * @param {string} entry root name of the html file e.g. "standlone_game"
 * @return {Promise} a promise that resolves when the output has been written
 */
function processHTML(entry) {
  return fs.readFile(`${__dirname}/../html/${entry}.html`)
  .then(content => {
    content = content.toString()
    .replace(/<script [^>]*?es-module-shims.*?<\/script>/s, "")  
    .replace(/<script type="importmap".*?<\/script>/s, "")
    // Reroute the code import to dist
    .replace(/(<script type="module"[^>]* src=").*?([^/]+\/_[^/]+.js")/,
             "$1../dist/$2");

    // Pull necessary CSS files out of node_modules; they may not be
    // installed on the target platform
    copyFile("../node_modules/normalize.css/normalize.css",
             "../dist/css/normalize.css");
    content = relink("../node_modules/normalize.css/normalize.css",
                     "../dist/css/normalize.css",
                     content);

    copyFile("../node_modules/jquery-ui/dist/themes",
             "../dist/css/themes");
    content = relink("../node_modules/jquery-ui/dist/themes",
                     "../dist/css/themes",
                     content);

    return fs.writeFile(`${__dirname}/../dist/${entry}.html`, content);
  });
}

fs.mkdir(`${__dirname}/../dist`, { recursive: true })
.then(() => Promise.all([
  processHTML("standalone_game"),
  processHTML("standalone_games"),
  processHTML("client_game"),
  processHTML("client_games")
]));

// Webpacked code always has DISTRIBUTION
const defines = {
  DISTRIBUTION: true
};

let mode = "development"; // or "production"

// --production or NODE_ENV=production  will create a minimised
// production build.
if (process.env.NODE_ENV === "production") {
  console.log("Production build");
  mode = "production";
	defines.PRODUCTION = true;
}

/* Experimenting with plugins
class ImportShimPlugin {
  constructor(options) {
    this.options = options;
  }

  static extras = [];
  static file = "";

  apply(compiler) {

    const PLUGIN = 'ImportShimPlugin';
      
    compiler.hooks.compilation
    .tap(PLUGIN, (compilation, params) => {

      compilation.hooks.moduleAsset
      .tap(PLUGIN, (module, filename) => {
        // Never invoked
        //console.debug("moduleASSET", filename);
      });

      compilation.hooks.chunkAsset
      .tap(PLUGIN, (chunk, filename) => {
        //console.debug("chunkASSET", filename);
      });

      compilation.hooks.assetPath
      .tap(PLUGIN, (path, options) => {
        if (/\[name\]/.test(path)) {
          path = path.replace(/\[name\]/, options.chunk.name);
          //console.debug("ASSETpath[name]", path);
        } else
          //console.debug("ASSETpath", path);
      });

      compilation.hooks.processAssets
      .tap({
        name: PLUGIN,
        stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        //additionalAssets: true // consider?
      }, (assets) => {
        //console.log('List of assets and their sizes:');
        Object.entries(assets).forEach(([pathname, source]) => {
          if (/findBestPlayWorkerLoader/.test(pathname))
            //console.log(`SOURCE ${pathname}`);
        });
      });
    });

    compiler.hooks.normalModuleFactory
    .tap(PLUGIN, factory => {

      factory.hooks.parser
      .for('javascript/esm')
      .tap(PLUGIN, (parser, options) => {
        parser.hooks.call
        .for("importShim")
        .tap(PLUGIN, expression => {
          let path =  expression.arguments[0].value;
          path = Path.resolve(parser.state.module.resource, "..", path);
          //console.debug("SHIM", path, "in", parser.state.module.resource);
          ImportShimPlugin.extras.push(path);
          return true;
        });

        parser.hooks.call
        .for("importScripts")
        .tap(PLUGIN, expression => {
          let path =  expression.arguments[0].value;
          if (!/^https?:/.test(path))
            path = Path.resolve(parser.state.module.resource, path);
          //console.debug("importScripts", path, "in",
                        parser.state.module.resource);
          return true;
        });
      });

      factory.hooks.resolve
      .tap(PLUGIN, (module) => {
        if (/findBestPlay/.test(module.request))
          //console.debug("RESOLVE",
                      module.request, "in", module.context, 
                      "issuer", module.contextInfo.issuer);
      });
    });
  }
}
*/

export default {
  mode: mode, // production or development
  entry: {
    // Entry points - one per top level HTML file

    // TODO: every entry chunk stores all the modules that it uses.
    // We could be more efficient to share modules between chunks.
    // TODO: how does findBestPlay end up getting included in _*Games?
    standalone_game: {
      import: `${__dirname}/../src/standalone/_StandaloneGameUI.js`,
      filename: "standalone/_StandaloneGameUI.js"
    },
    standalone_games: {
      import: `${__dirname}/../src/standalone/_StandaloneGamesUI.js`,
      filename: "standalone/_StandaloneGamesUI.js"
    },
    client_game: {
      import: `${__dirname}/../src/client/_ClientGameUI.js`,
      filename: "client/_ClientGameUI.js"
    },
    client_games: {
      import: `${__dirname}/../src/client/_ClientGamesUI.js`,
      filename: "client/_ClientGamesUI.js"
    }
  },
  output: {
    path: Path.resolve(__dirname, "../dist"),
    // Need a different globalObject in worker
    globalObject: "self"
  },
  resolve: {
    extensions: [ '.js' ],
    alias: {
      // socket.io is normally the node.js version; we need the browser
      // version here.
      "socket.io": Path.resolve(
        __dirname, "../node_modules/socket.io/client-dist/socket.io.js"),
      // Need to override the default node module with the dist
      jquery: Path.resolve(
        __dirname, "../node_modules/jquery/dist/jquery.js"),
      "jquery-ui": Path.resolve(
        __dirname, "../node_modules/jquery-ui/dist/jquery-ui.js")
    }
  },
  externals: {
    // Exclude ServerPlatform, otherwise it banjaxes findBestPlayWorker
    "../server/ServerPlatform.js": "undefined",
    // Exclude the worker shim, not used
    "../browser/findBestPlayWorkerShim.js": "undefined"
  },
  optimization: {
    // Split chunks for module reuse. Would like to use this, but it breaks.
    //splitChunks: {
    //  chunks: "all"
    //},
    minimize: (mode === "production"),
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          // We have to keep class names because CBOR TypeMapHandler
          // uses them
          keep_classnames: true
        },
      }),
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    }),
    new webpack.DefinePlugin(defines),
//    new ImportShimPlugin({}) // experimentation
  ]
};

