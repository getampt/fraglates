# Fraglates

An open source templating engine for generating dynamic hypertext fragments.

## Installation and Usage

```
npm install fraglates
```

Import into your app, initialize with your template directory, and use the render method to render full templates or partial fragments.

```javascript
import Fraglates from "fraglates";

// Create a new instance of Fraglates
const fraglates = new Fraglates({
  templates: "./templates", // templates folder
});

// Render the whole template
const fullpage = fraglates.render("my-template.html", {
  title: 'My Dynamic Title'
  items: ["one", "two", "three"]
});

// Render just the #header fragment
const fragment = fraglates.render("my-template.html#header", {
  title: 'My Dynamic Title'
});

```

## Templating

Fraglates uses [Nunjucks](https://mozilla.github.io/nunjucks/) as the core templating engine. An instance of Fraglates returns a [Nunjucks Environment](https://mozilla.github.io/nunjucks/api.html#environment) and supports all methods such as `addFilter()`, `addGlobal()`, etc.

The [templating syntax](https://mozilla.github.io/nunjucks/templating.html) is the same as Nunjucks, with one important addition: the **`{% fragment 'name' %}`** and **`{% endfragment %}`** block.

In the template below, you can either render the entire template, or just the `header` fragment.

```html
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Simple Template</title>
  </head>

  <body>
    {% fragment "header" -%}
    <header>{{ headerText }}</header>
    {%- endfragment %} {{ content }}
  </body>
</html>
```
