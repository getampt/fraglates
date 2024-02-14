import nunjucks, { ILoaderAny, ILoaderAsync } from "nunjucks";
import path from "path";

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
  env: nunjucks.Environment;
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
    this.env = new nunjucks.Environment(this.loaders, {
      autoescape: config.autoescape === false ? false : true,
      trimBlocks: config.trimBlocks || false,
      lstripBlocks: config.lstripBlocks || false,
    });

    // Default raw function
    this.raw = typeof config.raw == "function" ? config.raw : (x) => x;

    // Default trim setting
    this.trim = config.trim === false ? false : true;

    // Return a proxy to the environment
    return new Proxy(this, {
      get(target, propKey, receiver) {
        // Check if the property exists on the target object
        if (propKey in target) {
          // If the property exists, return it
          return Reflect.get(target, propKey, receiver);
        } else {
          // For undefined properties, return a function that acts as the undefined method
          if (typeof target.env[propKey] === "function") {
            return (...args) => target.env[propKey](...args);
          } else {
            console.error(`"${String(propKey)}" does not exist.`);
            // If the property doesn't exist, return undefined
            return undefined;
          }
        }
      },
    });
  }

  // Render a template function
  async render(template: string, context: any) {
    const templateParts = template.split("#");
    const temp = templateParts[0].trim();
    const frag = templateParts[1]?.trim();

    // console.log("template:", template);

    let output;

    try {
      // Check the cache for the template
      if (cache[template] == undefined) {
        if (process.env.BENCHMARK)
          console.time(`get/compile template: ${template}`);
        // If missing, get and compile the template and store in the cache
        cache[template] = await new Promise((res, err) => {
          this.env.getTemplate(temp, true, (err, tmpl) => {
            res(tmpl);
          });
        });

        cache[template].blocks["__root"] = cache[template].rootRenderFunc;
        cache[template].rootRenderFunc = function root(
          env,
          context,
          frame,
          runtime,
          cb
        ) {
          // console.log("root", env, context, frame, runtime, cb);
          // console.log("TESTING:", template);
          if (frag) {
            cache[template].blocks[frag](env, context, frame, runtime, cb);
          } else {
            cache[template].blocks["__root"](env, context, frame, runtime, cb);
          }
        };

        // console.log("cache", cache[template].rootRenderFunc.toString());

        if (process.env.BENCHMARK)
          console.timeEnd(`get/compile template: ${template}`);
      }

      if (!cache[template]) {
        throw new Error(`Template "${temp}" not found.`);
        // } else {
        //   console.log("cache", cache[temp]);
      }

      if (process.env.BENCHMARK) console.time(`render template: ${template}`);

      output = await new Promise((resolve, err) => {
        cache[template].render(context, (err, res) => {
          resolve(res);
        });
      });

      // console.log("output", output);

      if (process.env.BENCHMARK)
        console.timeEnd(`render template: ${template}`);
      return this.trim ? output.trim() : output;
    } catch (error) {
      if (!this) {
        console.warn(
          "The cache couldn't be loaded. Be sure you're importing the default export from the Fraglates instance and not deconstructing just the 'render' method."
        );
        return "";
      } else {
        throw new Error(`Error rendering template: ${error.message}`);
      }
    }
  }

  async component(template: string, raw?: any) {
    raw = raw || this.raw;
    return async (props) => {
      const output = await this.render(template, props);
      return raw(output);
    };
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

// // Make a copy of the root render function
// const root = cache[temp].rootRenderFunc;
// // Temporarily replace the root render function with the block function
// cache[temp].rootRenderFunc = cache[temp].blocks[frag];
// // Render the block
// cache[temp].render(context, (err, res) => {
//   // Restore the root render function
//   cache[temp].rootRenderFunc = root;
//   resolve(res);
// });
