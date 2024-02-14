#! /usr/bin/env node
// @ts-nocheck

import fs from "fs";
// import { writeFileSync } from "fs";
import { resolve, basename, dirname } from "path";
import nunjucks from "nunjucks";
import chokidar from "chokidar";
import { glob, globSync } from "glob";
import * as mkdirp from "mkdirp";
import chalk from "chalk";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

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
  // .option("extension", {
  //   alias: "e",
  //   string: true,
  //   requiresArg: true,
  //   default: "js",
  //   describe: "Extension of the rendered files",
  // })
  .parse();

if (argv._.length !== 1) {
  // Handle cases where the number of non-option arguments is not exactly one
  console.error("Please provide a file or glob pattern in quotes.");
  process.exit(1);
}

const inputDir = resolve(process.cwd(), argv.path || "") || "";
const outputDir = argv.out || "";

const render = (/** @type {string[]} */ files) => {
  for (const file of files) {
    const res = nunjucks.precompile(resolve(inputDir, file), {
      name: file,
      wrapper: (templates: any, opts) => {
        return `const template = function() { ${templates[0].template} }();\n\nexport default template;`;
      },
    });

    let outputFile = file + ".js"; //`.${argv.extension}`

    if (outputDir) {
      outputFile = resolve(outputDir, outputFile);
      mkdirp.sync(dirname(outputFile));
    }
    console.log(chalk.blue("Rendering: " + file));
    fs.writeFileSync(outputFile, res);
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