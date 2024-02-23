import nunjucks, { ILoaderAny, ILoaderAsync } from "nunjucks";
import path from "path";
import fs from "fs";

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
        new FileSystemLoader(config.templates || "./", {
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
  async render(template: string, context: any, blocks?: any) {
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
        cache[temp] = {};
        cache[temp].tmp = await new Promise((resolve, reject) => {
          this.#env.getTemplate(temp, true, (err, tmp) => {
            if (err) reject(err);
            resolve(tmp);
          });
        });

        // Create a store for the blocks
        cache[temp].tmp._blocks = [];

        // Process the blocks
        for (const block in cache[temp].tmp.blocks) {
          // Copy the original block function
          cache[temp].tmp._blocks[block] = cache[temp].tmp.blocks[block];

          // Overwrite the block function
          cache[temp].tmp.blocks[block] = function (
            env,
            context,
            frame,
            runtime,
            cb
          ) {
            // Override the getSuper function
            context.getSuper = function getSuper(
              env,
              name,
              block,
              frame,
              runtime,
              cb
            ) {
              // if (this.ctx.__fragment) {
              //   console.log("This is a fragment", this.ctx);
              //   cache[temp].tmp._rootRenderFunc(
              //     env,
              //     {},
              //     frame,
              //     runtime,
              //     (e, res) => {
              //       console.log(e, res);
              //     }
              //   );
              // }

              // Since we overrode the signatures of the block functions, we need
              // to keep track of the depth ourselves.
              if (!this.depth) {
                this.depth = {};
              }
              if (!this.depth[name]) {
                this.depth[name] = 0;
              }
              this.depth[name]++;
              let idx = this.depth[name];

              let blk = this.blocks[name][idx];
              let context = this;
              if (idx === -1 || !blk) {
                console.log(
                  "SUPER ERROR",
                  name,
                  idx,
                  this.ctx,
                  this.blocks[name]
                );
                throw new Error('no super block available for "' + name + '"');
              }
              blk(env, context, frame, runtime, cb);
            }; // end getSuper override

            // Create a new callback
            const newCB = (err, res) => {
              if (
                context.ctx.__fallback === false &&
                context.__fragment === block
              ) {
                const content = wrapSuspense(block, res);
                cb(err, content);
              } else if (context.__blocks && context.__blocks[block]) {
                const content = wrapFallback(block, res);
                cb(err, content);
              } else {
                cb(err, res);
              }
            };

            if (context.__blocks) {
              // If the block is awaiting content, set the fallback flag
              if (context.__blocks[block]) {
                context.ctx.__fallback = true;
              } else {
                // If not, remove the fallback flag
                delete context.ctx.__fallback;
              }
            }

            // Render the block
            cache[temp].tmp._blocks[block](env, context, frame, runtime, newCB);
          };
        }

        // Copy the root render function
        cache[temp].tmp._rootRenderFunc = cache[temp].tmp.rootRenderFunc;
        // Replace the root render function with a function that checks for a fragment
        cache[temp].tmp.rootRenderFunc = function fraglate(
          env,
          context,
          frame,
          runtime,
          cb
        ) {
          // If a fragment is found, render it
          if (context.ctx.__fragment) {
            // Move the fragment context
            context.__fragment = context.ctx.__fragment;
            // Call the fragment block function
            cache[temp].tmp.blocks[context.__fragment](
              env,
              context,
              frame,
              runtime,
              cb
            );
          } else {
            // Else, render the copied root render function

            // Move the blocks to the main context
            if (context.ctx.__blocks) {
              context.__blocks = context.ctx.__blocks;
              delete context.ctx.__blocks;
            }
            cache[temp].tmp._rootRenderFunc(env, context, frame, runtime, cb);
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

      // If blocks were provided, add them to the context
      if (blocks) {
        context.__blocks = Object.keys(blocks).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {});
      }

      // Render the template
      output = await new Promise((resolve, reject) => {
        cache[temp].tmp.render(
          context,
          // { ...context, ...cache[temp].ctx }, for future frontmatter support
          (err, res) => {
            if (err) reject(err);
            resolve(res);
          }
        );
      });

      if (process.env.BENCHMARK) console.timeEnd(`render template: ${temp}`);

      if (blocks) {
        return [this.trim && output ? output.trim() : output, blocks];
      } else {
        // Return the output, trimming if set
        return this.trim && output ? output.trim() : output;
      }
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

  // Experimental stream support
  stream(
    template: string,
    context: any,
    blocks?: any
  ): ReadableStream<Uint8Array> {
    const that = this;
    const textEncoder = new TextEncoder();
    const reader = new ReadableStream<Uint8Array>({
      async start(controller) {
        const [content, _blocks] = await that.render(template, context, blocks);

        // Write the main template content to the stream
        // Strip the closing body and html tags
        controller.enqueue(
          textEncoder.encode(
            content.replace("</body>", "").replace("</html>", "")
          )
        );

        // Write an extra space to make lambda send previous chunk
        controller.enqueue(textEncoder.encode("\n"));

        // Set the resolved counter (not sure we'll need this)
        let resolvedCount = 0;
        // Create an array to store our promises
        const promises: Promise<void>[] = [];

        // Create a function to handle resolved blocks
        const then = async (block: string) => {
          // Call the passed block function
          let promise = _blocks[block](); // <-- Should we pass something here?

          // If the passed block doesn't return a promise, make it one
          if (!(promise instanceof Promise)) {
            promise = Promise.resolve(promise);
          }

          // Add the promise to the array
          promises.push(
            promise.then(async (res) => {
              // If the block returns an object, render the fragment with the object as context
              if (isObject(res)) {
                const { __blocks, ...ctx } = context;
                const output = await that.render([template, block].join("#"), {
                  ...ctx, // Include the parent context
                  ...res, // Include the returned block context
                  __fallback: false, // Set the fallback flag
                });
                controller.enqueue(textEncoder.encode(output));

                // Else return the response as a string
              } else {
                const output = wrapSuspense(block, res);
                controller.enqueue(textEncoder.encode(output));
              }

              // Increment the resolved counter
              resolvedCount++;

              // Write an extra space to make lambda send previous chunk
              controller.enqueue(textEncoder.encode("\n"));
            })
          );
        };

        // This will map all the passed blocks to promises
        Object.keys(_blocks).map(then);

        // Not sure why we need to wait here?
        // while (resolvedCount !== promises.length) { }
        await Promise.all(promises);

        // Close the body and html tags
        controller.enqueue(textEncoder.encode("</body></html>"));
        // Close the stream
        controller.close();
      },
    });
    return reader;
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

  addTag(tagName, tagFn) {
    const Tag = getTagFn(tagName, tagFn);
    this.#env.addExtension(tagName, new Tag());
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

  async component(template: string, raw?: any) {
    raw = raw || this.raw;
    return async (props) => {
      const output = await this.render(template, props);
      return raw(output);
    };
  }
}

// Define the PrecompiledTemplateLoader class
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
} // end PrecompiledTemplateLoader

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
}; // end asyncFetchTemplate

// Define the FileSystemLoader class
class FileSystemLoader extends nunjucks.Loader {
  pathsToNames: any;
  noCache: boolean;
  searchPaths: string[];

  constructor(searchPaths, opts) {
    super();
    if (typeof opts === "boolean") {
      console.log(
        "[nunjucks] Warning: you passed a boolean as the second " +
          "argument to FileSystemLoader, but it now takes an options " +
          "object. See http://mozilla.github.io/nunjucks/api.html#filesystemloader"
      );
    }

    opts = opts || {};
    this.pathsToNames = {};
    this.noCache = !!opts.noCache;

    if (searchPaths) {
      searchPaths = Array.isArray(searchPaths) ? searchPaths : [searchPaths];
      // For windows, convert to forward slashes
      this.searchPaths = searchPaths.map(path.normalize);
    } else {
      this.searchPaths = ["."];
    }
  }

  getSource(name) {
    var fullpath = null;
    var paths = this.searchPaths;

    for (let i = 0; i < paths.length; i++) {
      const basePath = path.resolve(paths[i]);
      const p = path.resolve(paths[i], name);

      // Only allow the current directory and anything
      // underneath it to be searched
      if (p.indexOf(basePath) === 0 && fs.existsSync(p)) {
        fullpath = p;
        break;
      }
    }

    if (!fullpath) {
      return null;
    }

    this.pathsToNames[fullpath] = name;

    const src = fs.readFileSync(fullpath, "utf-8");
    // Future frontmatter support?
    // const { content, data } = matter(src);
    // if (cache[name]) cache[name].ctx = data;

    const source = {
      src: src,
      path: fullpath,
      noCache: this.noCache,
    };
    // this.emit("load", name, source);
    return source;
  }
} // end FileSystemLoader

// Define the dynamic tag function
const getTagFn = (tagName, tagFn) => {
  return function TagFunction() {
    this.tags = [tagName];

    this.parse = function (parser, nodes) {
      const tok = parser.nextToken();
      const args = parser.parseSignature(true, true);
      parser.advanceAfterBlockEnd(tok.value);
      const body = parser.parseUntilBlocks("end" + tagName);
      parser.advanceAfterBlockEnd();
      return new nodes.CallExtensionAsync(this, "run", args, [body]);
    };

    this.run = function (context, ...args) {
      const cb = args.pop();
      const body = args.pop();

      const { __keywords = false, ...keywords } =
        args[args.length - 1] instanceof Object &&
        args[args.length - 1] !== null &&
        args[args.length - 1].__keywords
          ? args.pop()
          : {};

      body(async (e, content) => {
        if (e) {
          console.log(e);
          cb(e);
        }

        let ret = await tagFn.call(this, content, keywords, ...args);
        cb(null, new nunjucks.runtime.SafeString(ret));
      });
    };
  };
};

// Utility function to check if a variable is an object
function isObject(variable) {
  return (
    typeof variable === "object" &&
    variable !== null &&
    !Array.isArray(variable) &&
    !(variable instanceof Date)
  );
}

// Utility function to wrap a block in a fallback template
function wrapFallback(block, content) {
  return `<template id="fraglate:${block}"></template>${content}\n<!--/${block}$-->`;
}

// Utility function to wrap a block in a suspense component
function wrapSuspense(block, content) {
  return `<template data-fraglate-target="fraglate:${block}">${content}</template><script>((d,c,n) => { c=d.currentScript.previousSibling; d=d.getElementById('fraglate:${block}');if(!d){return};do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/${block}$');d.replaceWith(c.content)})(document)</script>`;
}

export default Fraglates;
