#! /usr/bin/env node
// @ts-nocheck

import fs from "fs";
import { resolve, basename, dirname } from "path";
import nunjucks, { Environment } from "nunjucks";
import chokidar from "chokidar";
import { glob, globSync } from "glob";
import chalk from "chalk";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// Extend the Parser and override the parseStatement method
class CustomParser extends nunjucks.parser.Parser {
  // Override using an arrow function to automatically bind `this`
  parseStatement = () => {
    var tok = this.peekToken();
    var node;
    if (tok.type !== nunjucks.lexer.TOKEN_SYMBOL) {
      this.fail("tag name expected", tok.lineno, tok.colno);
    }
    if (
      this.breakOnBlocks &&
      nunjucks.lib.indexOf(this.breakOnBlocks, tok.value) !== -1
    ) {
      return null;
    }
    switch (tok.value) {
      case "raw":
        return this.parseRaw();
      case "verbatim":
        return this.parseRaw("verbatim");
      case "if":
      case "ifAsync":
        return this.parseIf();
      case "for":
      case "asyncEach":
      case "asyncAll":
        return this.parseFor();
      case "block":
        return this.parseBlock();
      case "extends":
        return this.parseExtends();
      case "include":
        return this.parseInclude();
      case "set":
        return this.parseSet();
      case "macro":
        return this.parseMacro();
      case "call":
        return this.parseCall();
      case "import":
        return this.parseImport();
      case "from":
        return this.parseFrom();
      case "filter":
        return this.parseFilterStatement();
      case "switch":
        return this.parseSwitch();
      default:
        if (this.extensions.length) {
          for (var i = 0; i < this.extensions.length; i++) {
            var ext = this.extensions[i];
            if (nunjucks.lib.indexOf(ext.tags || [], tok.value) !== -1) {
              return ext.parse(this, this.nodes, this.lexer);
            }
          }
        } else {
          // This is our hack to make sure precompiling works with custom tags
          const env = new Environment([]);
          env.addExtension(tok.value, new genericExtension(tok.value));
          // console.log(env.getExtension(tok.value));
          return env
            .getExtension(tok.value)
            .parse(this, this.nodes, this.lexer);
        }
    }
    return node;
  };
}

// Parse the command line arguments
const argv = yargs(hideBin(process.argv))
  .usage("Usage: fraglates '<file|glob>' [options]")
  .example("fraglates test.html", "Precompile test.html to test.html.js")
  .example(
    "fraglates '*.html' -p src -o dist -w",
    "Watch .html files in ./src, precompile them to ./dist"
  )
  .demandCommand(1, "You must provide at least a file/glob path")
  .epilogue("For more information: https://github.com/getampt/fraglates")
  .help()
  .alias("help", "h")
  .locale("en")
  .version(false)
  .option("path", {
    alias: "p",
    string: true,
    requiresArg: true,
    nargs: 1,
    describe: "Path where templates live",
  })
  .option("out", {
    alias: "o",
    string: true,
    requiresArg: true,
    nargs: 1,
    describe: "Compiled templates output directory",
  })
  .option("watch", {
    alias: "w",
    boolean: true,
    describe: "Watch file changes",
  })
  // We might want to add the ability to change the extension (e.g. mjs or cjs)
  // .option("extension", {
  //   alias: "e",
  //   string: true,
  //   requiresArg: true,
  //   default: "js",
  //   describe: "Extension of the rendered files",
  // })
  .parse();

// Handle cases where the number of non-option arguments is not exactly one
if (argv._.length !== 1) {
  console.error("Please provide a file or glob pattern in quotes.");
  process.exit(1);
}

// Set the input and output directories
const inputDir = resolve(process.cwd(), argv.path || "") || "";
const outputDir = argv.out || "";

// Set our Filter detection pattern
const pattern = /env\.getFilter\("(.*?)"\)/g;

// Precompile the templates
const render = (/** @type {string[]} */ files) => {
  for (const file of files) {
    // Create a new nunjucks environment to hold our filters
    const env = new nunjucks.Environment([]);

    // Override the parser to allow for auto discovery of custom tags
    nunjucks.parser.parse = (src, extensions, opts) => {
      const p = new CustomParser(nunjucks.lexer.lex(src, opts));

      if (extensions !== undefined) {
        p.extensions = extensions;
      }
      return p.parseAsRoot();
    };

    try {
      // Precompile the template to parse for any filters
      const tmp = nunjucks.precompile(resolve(inputDir, file), {
        env,
      });

      let filters; // Find all the filters and indicate them as async
      while ((filters = pattern.exec(tmp)) !== null) {
        // console.log(filters[1]);
        env.addFilter(filters[1], function () {}, true);
      }

      // Recompile the template with async filters and wrapper
      const res = nunjucks.precompile(resolve(inputDir, file), {
        env,
        name: file,
        wrapper: (templates: any, opts) => {
          return `const template = function() { ${templates[0].template.replace(
            /^env\.getFilter\(/gm,
            "env.getAsyncFilter("
          )} }();\n\nexport default template;`;
        },
      });

      // Add the .js extension (TODO: make this configurable)
      let outputFile = file + ".js"; //`.${argv.extension}`

      // Create the output directory if it doesn't exist
      if (outputDir) {
        outputFile = resolve(outputDir, outputFile);
        fs.mkdirSync(dirname(outputFile), { recursive: true });
      }

      console.log(chalk.blue("Rendering: " + file));
      fs.writeFileSync(outputFile, res);
    } catch (e) {
      console.error(chalk.red("Error rendering template: " + file));
      if (argv.watch) {
        console.error(e.message);
      } else {
        throw new Error(e.message);
      }
    }
  }
};

/** @type {glob.IOptions} */
const globOptions = {
  strict: true,
  cwd: inputDir,
  ignore: "node_modules/**",
  nonull: true,
};

// Grab the matching templates
const files = await glob(argv._[0], globOptions);
render(files);

// Watcher
if (argv.watch) {
  const layouts = [];
  const templates = [];

  /** @type {chokidar.WatchOptions} */
  const watchOptions = { persistent: true, cwd: inputDir };
  const watcher = chokidar.watch(argv._[0], watchOptions);

  watcher.on("ready", () => console.log(chalk.gray("Watching templates...")));

  // Sort files to not render partials/layouts
  watcher.on("add", (file) => {
    templates.push(file);
  });

  // if the file is a layout/partial, render all other files instead
  watcher.on("change", (file) => {
    render([file]);
  });
}

// Define a generic extension to add to the nunjucks environment
function genericExtension(name) {
  this.tags = [name];

  this.parse = function (parser, nodes, lexer) {
    var tok = parser.nextToken();
    var args = parser.parseSignature(null, true);
    parser.advanceAfterBlockEnd(tok.value);
    var body = parser.parseUntilBlocks("end" + name);
    parser.advanceAfterBlockEnd();
    return new nunjucks.nodes.CallExtensionAsync(this, "run", args, [body]);
  };
}
