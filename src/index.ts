import nunjucks, { ILoaderAny, ILoaderAsync } from "nunjucks";
import path from "path";

const ComparisonAsyncFunction = (async () => {}).constructor;

interface FraglatesConfig {
  templates?: string;
  precompiled?: string;
  autoescape?: boolean;
  trimBlocks?: boolean;
  lstripBlocks?: boolean;
  trim?: boolean;
  raw?: any;
}

// Create a cache for the templates
const cache = {};

class Fraglates {
  #env: nunjucks.Environment;
  raw: Function;
  trim: boolean;
  loaders: ILoaderAny[];

  constructor(public config: FraglatesConfig = {}) {
    this.loaders = [];

    // Add the precompiled template loader if precompiled is set
    if (config.precompiled) {
      this.loaders.push(
        new PrecompiledTemplateLoader(
          config.precompiled,
          this.loaders,
          {}
        ) as ILoaderAsync
      );
    }

    // Add the file system loader if templates is set (or no precompiled)
    if (config.templates || !config.precompiled) {
      this.loaders.push(
        new nunjucks.FileSystemLoader(config.templates || "./", {
          noCache: false,
        })
      );
    }

    // Create a new nunjucks environment
    this.#env = new nunjucks.Environment(this.loaders, {
      autoescape: config.autoescape === false ? false : true,
      trimBlocks: config.trimBlocks || false,
      lstripBlocks: config.lstripBlocks || false,
    });

    // Default raw function
    this.raw = typeof config.raw == "function" ? config.raw : (x) => x;

    // Default trim setting
    this.trim = config.trim === false ? false : true;
  }

  // Render a template function
  async render(template: string, context: any) {
    const templateParts = template.split("#");
    const temp = templateParts[0].trim();
    const frag = templateParts[1]?.trim();

    let output;

    try {
      // Check the cache for the template
      if (cache[temp] == undefined) {
        if (process.env.BENCHMARK)
          console.time(`get/compile template: ${temp}`);
        // If missing, get and compile the template and store in the cache
        cache[temp] = await new Promise((resolve, reject) => {
          this.#env.getTemplate(temp, true, (err, tmpl) => {
            if (err) reject(err);
            resolve(tmpl);
          });
        });

        // Copy the root render function
        cache[temp]._rootRenderFunc = cache[temp].rootRenderFunc;
        // Replace the root render function with a function that checks for a fragment
        cache[temp].rootRenderFunc = function fraglate(
          env,
          context,
          frame,
          runtime,
          cb
        ) {
          // If a fragment is found, render it
          if (context.ctx.__fragment) {
            cache[temp].blocks[context.ctx.__fragment](
              env,
              context,
              frame,
              runtime,
              cb
            );
          } else {
            // Else, render the copied root render function
            cache[temp]._rootRenderFunc(env, context, frame, runtime, cb);
          }
        };

        if (process.env.BENCHMARK)
          console.timeEnd(`get/compile template: ${temp}`);
      }

      if (!cache[temp]) {
        throw new Error(`Template "${temp}" not found.`);
      }

      if (process.env.BENCHMARK) console.time(`render template: ${temp}`);

      // If this is a fragment, set the context
      if (frag) {
        context.__fragment = frag;
      }

      // Render the template
      output = await new Promise((resolve, reject) => {
        cache[temp].render(context, (err, res) => {
          if (err) reject(err);
          resolve(res);
        });
      });

      if (process.env.BENCHMARK) console.timeEnd(`render template: ${temp}`);

      // Return the output, trimming if set
      return this.trim && output ? output.trim() : output;
    } catch (error) {
      if (!this) {
        console.warn(
          "The cache couldn't be loaded. Be sure you're importing the default export from the Fraglates instance and not deconstructing just the 'render' method."
        );
        return "";
      } else {
        // throw new Error(`Error rendering template: ${error.message}`);
        throw new Error(error);
      }
    }
  }

  addFilter(name, callback) {
    this.#env.addFilter(
      name,
      async function (...args) {
        let cb = args.pop();

        // This is only an issue when running sync from compiled templates
        if (
          typeof cb !== "function" &&
          !(callback instanceof ComparisonAsyncFunction)
        ) {
          throw new Error("No callback because it's a sync function", name);
        }

        // @ts-ignore
        let ret = await callback.call(this, ...args);
        cb(null, ret);
      },
      true
    );
  }

  async component(template: string, raw?: any) {
    raw = raw || this.raw;
    return async (props) => {
      const output = await this.render(template, props);
      return raw(output);
    };
  }

  addGlobal(name, value) {
    if (typeof value === "function") {
      return this.#env.addGlobal(name, (...args) => {
        let ret = value.call(this, ...args);
        if (ret instanceof Promise) {
          throw new Error(
            `Global functions (${name}) cannot be async, use 'addFilter("${name}", async function() {})' instead.`
          );
        }
        return ret;
      });
    } else {
      return this.#env.addGlobal(name, value);
    }
  }
}

class PrecompiledTemplateLoader extends nunjucks.Loader {
  options?: any;
  path: string;
  async: boolean;
  loaders: ILoaderAny[];

  constructor(path, loaders, options) {
    super();
    this.path = path;
    this.options = options;
    this.async = true;
    this.loaders = loaders;
  }

  // Implement the async getSource method
  async getSource(name, callback) {
    const templateParts = name.split("#");
    const temp = templateParts[0].trim();
    const frag = templateParts[1]?.trim();

    // Asynchronously fetch the template
    asyncFetchTemplate(temp, this.path, (err, src) => {
      // If the template is found, return it
      if (src) {
        callback(null, {
          src: {
            type: "code",
            obj: src,
          },
          path: name,
          noCache: false,
        });
      } else {
        callback(null, null);
      }
    });
  }
}

// Define the asyncFetchTemplate function
const asyncFetchTemplate = async (name, searchPath, callback) => {
  if (process.env.BENCHMARK) console.time(`asyncFetchTemplate ${name}`);
  // Dynamically import the template
  try {
    const tmplPath = path.resolve(searchPath, `${name}.js`);
    const template = (await import(tmplPath)).default;
    if (process.env.BENCHMARK) console.timeEnd(`asyncFetchTemplate ${name}`);
    callback(null, template);
    // If the template can't be found, fall through
  } catch (error) {
    // console.error(error);
    callback(error, null);
  }
};

export default Fraglates;
