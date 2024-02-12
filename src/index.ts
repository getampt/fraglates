import nunjucks from "nunjucks";

interface FraglatesConfig {
  templates?: string;
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

  constructor(public config: FraglatesConfig = {}) {
    // Create a new nunjucks environment
    this.env = nunjucks.configure(config.templates || "./", {
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
  render(template: string, context: any) {
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
        cache[temp] = this.env.getTemplate(temp, true);
        if (process.env.BENCHMARK)
          console.timeEnd(`get/compile template: ${temp}`);
      }

      if (process.env.BENCHMARK) console.time("render template");

      if (frag !== undefined) {
        // Make a copy of the root render function
        const root = cache[temp].rootRenderFunc;
        // Temporarily replace the root render function with the block function
        cache[temp].rootRenderFunc = cache[temp].blocks[frag];
        // Render the block
        output = cache[temp].render(context);
        // Restore the root render function
        cache[temp].rootRenderFunc = root;
      } else {
        output = cache[temp].render(context);
      }

      if (process.env.BENCHMARK) console.timeEnd("render template");
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

  component(template: string, raw?: any) {
    raw = raw || this.raw;
    return (props) => raw(this.render(template, props));
  }
}

export default Fraglates;
