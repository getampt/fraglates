import nunjucks from "nunjucks";

export class FragmentExtension {
  tags: string[];
  env: nunjucks.Environment;
  ctx: any;
  cache: any;
  templateName?: string;

  constructor(ctx, cache, templateName?) {
    this.tags = ["fragment"];
    this.env = ctx.env;
    // Use our render function for caching
    this.ctx = ctx;
    this.cache = cache;
    this.templateName = templateName;
  }

  parse(parser: any, nodes: any) {
    const tok = parser.nextToken();
    const args = parser.parseSignature(null, true);
    const start = parser.advanceAfterBlockEnd(tok.value);
    const body = parser.parseUntilBlocks("endfragment");
    const end = parser.advanceAfterBlockEnd();

    if (process.env.BENCHMARK) console.time(`extract raw string`);
    // Extract the raw string from the fragment
    const rawStr = this.extractRawString(
      parser.tokens.str,
      body.children[0].lineno,
      body.children[0].colno,
      end.lineno,
      end.colno
    );
    if (process.env.BENCHMARK) console.timeEnd(`extract raw string`);

    // If a templateName exists, it means we're working around the
    // in-loop fragment issue
    if (this.templateName) {
      const name = args.children[0].value;

      // If the fragment isn't cached
      if (!this.cache.fragments[this.templateName][name]) {
        if (process.env.BENCHMARK) console.time(`compile fragment '${name}'`);
        // Compile the raw string using the passed env and store in the cache
        try {
          this.cache.fragments[this.templateName][name] = nunjucks.compile(
            rawStr,
            this.env // render with the main env
          );
        } catch (e) {
          console.log(`Error shortcut compiling fragment '${name}'`);
        }
        if (process.env.BENCHMARK)
          console.timeEnd(`compile fragment '${name}'`);
      }
    }

    // Custom node to add the raw string to the args
    let additionalInfo = new nodes.Literal(0, 0, rawStr);

    // Add the additional info to the args
    args.addChild(additionalInfo);

    // Call the run extension with the args and body
    return new nodes.CallExtension(this, "run", args, [body]);
  }

  run(context: any, ...args: any) {
    // Body is always last
    const body = args.pop();
    // Raw string is second to last
    const rawStr = args.pop();
    // Name is first
    const name = args[0];

    // Extract the template name from the context
    const templateName = context.ctx._templateName;

    // If a cache for the template doesn't exist, create it
    if (!this.cache.fragments[templateName]) {
      this.cache.fragments[templateName] = {};
    }

    // If the fragment isn't cached
    if (!this.cache.fragments[templateName][name]) {
      if (process.env.BENCHMARK) console.time(`compile fragment '${name}'`);
      // Compile the raw string using the passed env and store in the cache
      this.cache.fragments[templateName][name] = nunjucks.compile(
        rawStr,
        this.env
      );
      if (process.env.BENCHMARK) console.timeEnd(`compile fragment '${name}'`);
    }

    // Return the executed fragment to the main template
    return new nunjucks.runtime.SafeString(body());
  }

  getFragment(templateName: string, fragmentName: string, context: any) {
    if (
      !this.cache.fragments[templateName] ||
      !this.cache.fragments[templateName][fragmentName]
    ) {
      // TODO: add some error handling here
      if (process.env.BENCHMARK) console.debug("Parse the template first");
      this.ctx.render(templateName, { _templateName: templateName });

      // If the fragment still isn't found, then it might be nested in
      // a loop and isn't getting parsed
      if (this.cache.fragments[templateName][fragmentName] === undefined) {
        // console.log(
        //   `Fragment '${fragmentName}' not found in '${templateName}'`
        // );

        // Create a new nunjucks environment with the template name embedded
        let tmpEnv = nunjucks.configure(
          this.ctx.config.templates,
          Object.assign({ templateName }, this.ctx.opts)
        );

        // Copy filters and globals from the main environment (I hate this)
        tmpEnv["filters"] = this.ctx.env["filters"];
        tmpEnv["globals"] = this.ctx.env["globals"];

        const tmpFragExt = new FragmentExtension(
          this.ctx,
          this.cache,
          templateName
        );
        // Add the fragment extension to the nunjucks environment
        tmpEnv.addExtension("Fragment", tmpFragExt);
        tmpEnv.render(templateName, { _templateName: templateName });
        tmpEnv = null;
      }
    }

    if (this.cache.fragments[templateName][fragmentName] === undefined) {
      throw new Error(
        `Fragment '${fragmentName}' not found in '${templateName}'`
      );
    }

    // Render the fragment with the context
    if (process.env.BENCHMARK) console.time(`render fragment ${fragmentName}`);
    const fragment =
      this.cache.fragments[templateName][fragmentName].render(context);
    if (process.env.BENCHMARK)
      console.timeEnd(`render fragment ${fragmentName}`);
    return fragment;
  }

  private extractRawString(
    str: string,
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number
  ) {
    // Split the string into lines
    const lines = str.split("\n");

    // Initialize an array to hold the parts of the substring
    let parts = [];

    // Extract from the first line
    if (startLine === endLine) {
      // If the start and end are on the same line, just extract the specific part
      parts.push(
        lines[startLine]
          .substring(startColumn, endColumn)
          .replace(/{%-{0,1}\s*endfragment\s*/i, "")
      );
    } else {
      // Extract part of the first line
      if (lines[startLine].length > startColumn) {
        parts.push(lines[startLine].substring(startColumn));
      }

      // Include whole lines between the first and last, if any
      for (let i = startLine + 1; i < endLine; i++) {
        parts.push(lines[i]);
      }

      // Extract part of the last line
      parts.push(
        lines[endLine]
          .substring(0, endColumn)
          .replace(/{%-{0,1}\s*endfragment\s*/im, "")
      );
    }

    // Combine the parts to form the final substring
    // This also strips out a trailing multiline endfragment tag
    // Could be improved
    return parts
      .join("\n")
      .replace(/{%-{0,1}(?:\r\n|\r|\n|\s)*endfragment\s*$/im, "");
  }
}
