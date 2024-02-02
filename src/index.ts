import nunjucks from "nunjucks";
import { FragmentExtension } from "./fragmentExtension.js";

interface FraglatesConfig {
  templates?: string;
  autoescape?: boolean;
  trimBlocks?: boolean;
  lstripBlocks?: boolean;
  trim?: boolean;
  raw?: any;
}

class Fraglates {
  env: nunjucks.Environment;
  fragmentExtension: FragmentExtension;
  trim: boolean;
  raw: Function;

  constructor(public config: FraglatesConfig = {}) {
    // Create a new nunjucks environment
    this.env = nunjucks.configure(config.templates || "./", {
      autoescape: config.autoescape === false ? false : true,
      trimBlocks: config.trimBlocks || false,
      lstripBlocks: config.lstripBlocks || false,
    });

    // Instantiate the fragment extension
    this.fragmentExtension = new FragmentExtension(this.env);

    // Add the fragment extension to the nunjucks environment
    this.env.addExtension("Fragment", this.fragmentExtension);

    // Set the trim option
    this.trim = config.trim === false ? false : true;

    // Default raw function
    this.raw = typeof config.raw == "function" ? config.raw : (x) => x;

    return new Proxy(this, {
      get(target, propKey, receiver) {
        // Check if the property exists on the target object
        if (propKey in target) {
          // If the property exists, return it
          return Reflect.get(target, propKey, receiver);
        } else {
          // For undefined properties, return a function that acts as the undefined method
          if (typeof target.env[propKey] === "function") {
            return (...args) => {
              // console.log(receiver);

              // console.log(
              //   `Method "${String(propKey)}" does not exist. Arguments:`,
              //   args
              // );

              return target.env[propKey](...args);
            };
          } else {
            console.error(`"${String(propKey)}" does not exist.`);
            // If the property doesn't exist, return undefined
            return undefined;
          }
        }
      },
    });
  }

  // TODO: Decide if we need this
  // Add a global function to the nunjucks environment to get a fragment
  // env.addGlobal("getFragment", (templateName, fragmentName) =>
  //   fragmentExtension.getFragment(templateName, fragmentName)
  // );

  // Render a template function
  render(template: string, context: any) {
    const templateParts = template.split("#");
    const temp = templateParts[0].trim();
    const frag = templateParts[1]?.trim();

    try {
      // Check the cache for the template
      if (
        frag == undefined &&
        this.fragmentExtension.cache[temp] == undefined
      ) {
        if (process.env.BENCHMARK) console.time("get/compile template");
        // If missing, get and compile the template and store in the cache
        this.fragmentExtension.cache[temp] = this.env.getTemplate(temp, true);
        if (process.env.BENCHMARK) console.timeEnd("get/compile template");
      }

      if (process.env.BENCHMARK) console.time("render template");
      const output =
        frag !== undefined
          ? this.fragmentExtension.getFragment(temp, frag, context)
          : this.fragmentExtension.cache[temp].render(
              Object.assign(context, { _templateName: temp })
            );
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
