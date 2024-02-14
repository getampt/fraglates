# Fraglates

[![npm](https://img.shields.io/npm/v/fraglates.svg)](https://www.npmjs.com/package/fraglates)
[![npm](https://img.shields.io/npm/l/fraglates.svg)](https://www.npmjs.com/package/fraglates)

An open source templating engine for generating server-side hypertext templates and fragments.

> These docs are a work in progress. Not all features are documented and are subject to change.

## Installation and Usage

```
npm install fraglates
```

Import into your app, initialize with your template directory, and use the render method to render full templates or partial fragments.

```typescript
import Fraglates from "fraglates";

// Create a new instance of Fraglates
const fraglates = new Fraglates({
  templates: "./templates", // templates folder
  precompiled: "./precompiled", // precompile template folder (optional)
});

// Render the whole template
const fullpage = await fraglates.render("my-template.html", {
  title: 'My Dynamic Title'
  items: ["one", "two", "three"]
});

// Render just the #header fragment
const header = await fraglates.render("my-template.html#header", {
  title: 'My Dynamic Title'
});
```

> **Note:** Fraglates uses a caching mechanism on the returned instance. **DO NOT** destructure the `render` method or the caching will break (i.e. `const { render } = new Fraglates(...);`).

## Templating

Fraglates uses [Nunjucks](https://mozilla.github.io/nunjucks/) as the core templating engine. An instance of Fraglates returns a [Nunjucks Environment](https://mozilla.github.io/nunjucks/api.html#environment) and supports all methods such as `addFilter()`, `addGlobal()`, etc.

The [templating syntax](https://mozilla.github.io/nunjucks/templating.html) is the same as Nunjucks, with one important addition: content wrapped in **`{% block blockName %}`** and **`{% endblock %}`** tags are accessible as fragments.

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

## Precompiling Templates

Fraglates provides the `fraglates` cli command to precompile templates into JavaScript files that can be lazy loaded with dynamic imports. This is significantly faster than reading directly from the file system.

From your project directory, run the following:

```
fraglates '**/*.{html,njk}' -p path/to/templates -o path/to/precompiled
```

This will compile all `html` and `njk` files in your `path/to/templates` directory and write them to the `path/to/compiled` directory as `.js` files. You should add this to your npm `build` script so that templates are compiled at build time as well.

If you want to compile templates while developing, you can add the `--watch` or `-w` flag to the above command to watch the template files for changes and automatically recompile.

> **Note:** Compiled templates are referenced using the name of the template, e.g. `my-template.html`. If the precompiled template doesn't exist, Fraglates will fall back to the filesystem.

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

## Extending with Nunjucks

An instance of Fraglates creates a [Nunjucks Environment](https://mozilla.github.io/nunjucks/api.html#environment) and provides a proxy to `Environment` methods. You can also access the `Environment` on the `.env` property of the instance.

Fraglates supports all Nunjucks methods such as `addFilter()`, `addGlobal()`, etc. Changes to the environment will affect all templates and fragments.

### Add a custom filter

```typescript
// Create a new instance of Fraglates
const fraglates = new Fraglates({
  templates: "./templates", // template directory
});

// Add an 'upper' filter
fraglates.addFilter("upper", (str) => str.toUpperCase());

// or using the .env property
fraglates.env.addFilter("upper", (str) => str.toUpperCase());
```

## Asynchronous Support

> **Note:** Asynchronous filters are currently not supported in precompiled templates.

Fraglates supports Nunjucks' asynchronous filters using the [async callback format](https://mozilla.github.io/nunjucks/api.html#custom-filters).

```typescript
fraglates.env.addFilter(
  "myAsyncFilter",
  (name, callback) => {
    data.get(name).then((result) => {
      callback(null, result);
    });
  },
  true // Set the third argument to 'true'
);
```

Any additional context passed to the Fraglates `render` function must be resolved first.

```typescript
const foo = await someAsyncCall();

await fraglates.render("my-template.html", {
  foo: foo, // foo is already resolved
  // or you can just await the async call here
  bar: await someAsyncFunction(),
});
```

## Contributions & Feedback

Issues and PRs are welcome! 🙌
