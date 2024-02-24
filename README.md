<div>
    <img src="https://raw.githubusercontent.com/getampt/fraglates/main/images/fraglates-logo.png" width="400" height="auto" alt="Fraglates"/>
</div>

---

An open source templating engine built on top of [Nunjucks](https://mozilla.github.io/nunjucks/) for server-side rendering (SSR) hypertext templates and fragments. Includes support for precompiling, automatic caching, asynchronous filters and tags, and progressive rendering of templates with `Suspense`-like fallbacks using a single http request.

---

[![npm](https://img.shields.io/npm/v/fraglates.svg)](https://www.npmjs.com/package/fraglates)
[![npm](https://img.shields.io/npm/l/fraglates.svg)](https://www.npmjs.com/package/fraglates)

> These docs are a **work in progress**. Not all features are documented and are subject to change.

## Installation and Usage

```
npm install fraglates
```

Import into your app, initialize with your template and/or precompiled template directory, and use the `render` method to render full templates or partial fragments.

```typescript
import Fraglates from "fraglates";

// Create a new instance of Fraglates
const fraglates = new Fraglates({
  templates: "./templates", // templates directory
  precompiled: "./precompiled", // precompile template directory (optional)
});

// Render the whole template (template, context)
const fullpage = await fraglates.render("my-template.html", {
  title: "My Dynamic Title",
  items: ["one", "two", "three"],
});

// Render just the #header fragment (template#fragment, context)
const header = await fraglates.render("my-template.html#header", {
  title: "My Dynamic Title",
});
```

> **Note:** Fraglates uses a caching mechanism on the returned instance. **DO NOT** destructure the `render` method or the caching will break (i.e. `const { render } = new Fraglates(...);`).

## Progressive Rendering with ReadableStream

Fraglates supports progressive rendering by generating a `ReadableStream` that can be streamed to the browser. The `stream()` method takes three arguments:

- `template`: The template to render.
- `context`: The data/variables passed to the template.
- `blocks`: An object with block names for keys and asynchronous callbacks for values.

The `blocks` object references any `{% block someBlock  %} ... {% endblock %}` blocks in the supplied `template`. These blocks will be rendered based on your template definition and streamed as soon as the initial template is rendered. Their output will be progressively replaced by the result of the async callback functions as they are resolved and added to the stream.

```typescript
// Render the whole template
const stream = await fraglates.stream(
  "my-template.html", // Template name
  { title: "My Dynamic Title" }, // Context/variables
  {
    // Blocks
    header: async () => {
      // do some async stuff
      return { headerText: "Resolved header" }; // return an object
    },
    someBlock: async () => {
      // do some async stuff
      return "This is a string"; // or return a string
    },
  }
);
```

If the async callback function returns an `Object`, Fraglates will render the same fragment with the object merged into the main context.

If the async callback returns a `string`, the block will be replaced by the string. You can use this to optional render different fragments to replace a block.

> Note that when blocks/fragments are rendered in the main template, they will contain an added `__fallback` variable set to a boolean value of `true`. This can be used to conditionally render content within the blocks. The `__fallback` value is scoped to the block, so any nested blocks will not inherit this value.

### Streaming to the browser

The `stream()` method returns a `ReadableStream` that can be sent to the browser using any modern framework. Here is an example using [Hono](https://hono.dev):

```typescript
import { Hono } from "hono";
const app = new Hono();

app.get("/stream-fraglates", (c) => {
  // Render the whole template
  const stream = await fraglates.stream(
    "my-template.html", // Template name
    { title: "My Dynamic Title" }, // Context/variables
    {
      // Blocks
      header: async () => {
        // do some async stuff
        return { headerText: "Resolved header" }; // return an object
      },
      someBlock: async () => {
        // do some async stuff
        return "This is a string"; // or return a string
      },
    }
  );

  return c.body(stream, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Transfer-Encoding": "chunked",
    },
  });
});

app.fire();
```

## Templating

Fraglates uses [Nunjucks](https://mozilla.github.io/nunjucks/) as the core templating engine. Currently [Nunjucks Environment](https://mozilla.github.io/nunjucks/api.html#environment) methods such as `addFilter()` and `addGlobal()` are supported.

The [templating syntax](https://mozilla.github.io/nunjucks/templating.html) is the same as Nunjucks, with one important addition: content wrapped in **`{% block blockName %}`** and **`{% endblock %}`** tags are accessible as **fragments**. Fragments can be rendered independently, giving you the ability to collocate HTML code within the same template for better readability. See this [HTMX essay on fragments](https://htmx.org/essays/template-fragments/) for more information and motivation.

In the template below, you can either render the entire template, or just the `header` fragment using the `render` method.

```nunjucks
<!-- my-template.html -->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Simple Template</title>
  </head>

  <body>
    {% block header -%}
    <header>{{ headerText }}</header>
    {%- endblock %}

    <div>{{ content }}</div>
  </body>
</html>
```

> Note that `block`s can be nested and include any Nunjucks templating logic like conditionals, filters, includes, etc.

Fraglates supports advanced Nunjucks features such as [template inheritance](https://mozilla.github.io/nunjucks/templating.html#template-inheritance), [includes](https://mozilla.github.io/nunjucks/templating.html#include), [macros](https://mozilla.github.io/nunjucks/templating.html#macro)/[imports](https://mozilla.github.io/nunjucks/templating.html#import), [custom filters](#add-a-custom-filter), and more.

## Precompiling Templates

Fraglates provides the `fraglates` cli command to precompile templates into JavaScript files that can be lazy loaded with dynamic imports. This is significantly faster than reading directly from the file system.

From your project directory, run the following:

```
fraglates '**/*.{html,njk}' -p path/to/templates -o path/to/precompiled
```

This will compile all `html` and `njk` files in your `path/to/templates` directory and write them to the `path/to/compiled` directory as `.js` files. You should add this to your npm `build` script so that templates are compiled at build time as well.

If you want to compile templates while developing, you can add the `--watch` or `-w` flag to the above command to watch the template files for changes and automatically recompile.

> **Note:** Compiled templates are referenced using the name of the template, e.g. `my-template.html`. If the precompiled template doesn't exist, Fraglates will fall back to the filesystem if you provide a `templates` directory on initialization.

## Asynchronous Support

> **IMPORTANT:** Fraglates is asynchronous by default because of how it lazy loads compiled templates with dynamic imports. Calls to the `render` function **must be** `await`ed.

Custom filters are automatically converted to asynchronous filters. They can return a synchronous result, a resolved promise, or a promise. See [Add a custom filter](#add-a-custom-filter) for more information.

Any additional context/variables passed to the Fraglates `render` function must be resolved first.

```typescript
const foo = await someAsyncCall();

await fraglates.render("my-template.html", {
  foo: foo, // foo is already resolved
  // or you can just await the async call here
  bar: await someAsyncFunction(),
});
```

## Extending with Nunjucks

An instance of Fraglates creates a _private_ [Nunjucks Environment](https://mozilla.github.io/nunjucks/api.html#environment) behind the scenes. This is to ensure any manipulate of the underlying environment would not compromise the Fraglates instance.

Fraglates does supports Nunjucks methods such as `addFilter()` and `addGlobal()`. Using these methods will affect all templates and fragments.

### Add a custom filter

```typescript
// Create a new instance of Fraglates
const fraglates = new Fraglates({
  templates: "./templates", // template directory
});

// Add an 'upper' filter
fraglates.addFilter("upper", (str) => str.toUpperCase());

// Add an async filter
fraglates.addFilter("getUser", async (id) => {
  let user = await data.get(id);
  return user;
});
```

### Add a custom global

```typescript
// Create a new instance of Fraglates
const fraglates = new Fraglates({
  templates: "./templates", // template directory
});

// Add global variable
fraglates.addGlobal("someGlobalVar", "This is Global");

// Add a global function
fraglates.addGlobal("rand", (x, y) => {
  return Math.floor(Math.random() * (y - x + 1) + x);
});
```

> **NOTE:** Globals **cannot** be asynchronous. Defining async globals will throw an error.

## Custom Tags

You can extend Fraglates even more by using **custom tags**. Custom tags are heavily inspired by [Eleventy's Paired Shortcodes](https://www.11ty.dev/docs/shortcodes/#paired-shortcodes) that allow you to create new "block" types within your templates.

Custom tags can be made asynchronous by passing an `async` function as the second parameter. The function signature is as follows:

- `content`: Anything wrapped inside the custom tag block
- `keywords`: Auto-parsed keywords using Nunjucks' [keyword arguments](https://mozilla.github.io/nunjucks/templating.html#keyword-arguments) support
- `arg0`...`argn`: Any positional arguments passed in to the custom tag in the template. Argument names can be specified directly, e.g. `(contents, keywords, x, y, z) => {}` or captured using the spread operator, i.e. `(contents, keywords, ...args) => {}`.

Create a synchronous custom tag:

```typescript
fraglates.addTag("customTag", (content, keywords, ...args) => {
  return `<div style="color:${keywords.color};">${content}</div>`;
});
```

Create an asynchronous custom tag:

```typescript
fraglates.addTag("customAsyncTag", async (content, keywords, userId) => {
  const user = await data.get(userId);
  return `<div>
    <h3>${user.name}</h3>
    ${content}
  </div>`;
});
```

Custom tags can be used in templates like this:

```nunjucks
<h1>My template with custom tags!</h1>

{% customTag color="blue" %}
This will change my color to blue.
And this {{ variable }} will render before it is passed into the custom tag
{% endcustomTag %}

{% customAsyncTag 1234 %}
<p>This is some test content in a custom tag</p>
{% endcustomAsyncTag %}
```

## Functional Components with JSX

If you're using a modern web framework like [Hono](https://hono.dev/), you may want to use JSX in order to build hypertext server side responses. Fraglates includes a `component` function that _"componentizes"_ your template for you.

The HTML returned from a template needs to be `HtmlEscaped` in order to be usable in JSX. Hono includes a `raw` helper function that can be passed into the Fraglates constructor.

```typescript
import { Hono } from "hono";
import { raw } from "hono/html";
import { FC } from "hono/jsx";
import Fraglates from "fraglates";

// Create a new instance of Fraglates
const fraglates = new Fraglates({
  templates: "./templates", // template directory
  precompiled: "./precompiled", // precompile template folder (optional)
  raw, // use Hono's HTML helper to escape templates
});

// Create the Hono app
const app = new Hono();

// Define a route
app.get("/header", async (c) => {
  // Componentize the header fragment (type as an FC - Functional Component)
  const Header: FC = await fraglates.component("my-template.html#header");

  // Return Header component with JSX
  return c.html(<Header headerText="My Header Text" />);
});
```

> Note that `c.html` will automatically `await` the asynchronous components.

Functional components automatically pass attributes as data into the template and anything wrapped in the tag as a `children` prop. This allows you to nest templates, fragments, other components, and JSX to build more complex responses.

Define a template with children:

```nunjucks
<!-- simple-div.html -->
<div class="{{ class }}">{{ children | safe }}</div>
```

Wrap additional JSX with a componentized version of the template:

```typescript
// Define a route
app.get("/div", async (c) => {
  // Componentize the template
  const SimpleDiv: FC = await fraglates.component("simple-div.html");

  const text = "Sample text";

  // Return Header component with JSX
  return c.html(
    <SimpleDiv class="red">
      <h1>Hello Fraglates!</h1>
      <p>{text}</p>
    </SimpleDiv>
  );
});
```

## Known issues

Fragments cannot make `super()` calls when rendered independently. This has to do with the way Nunjucks processes template inheritance. A fix is actively being explored.

## Contributions & Feedback

Issues and PRs are welcome! 🙌
