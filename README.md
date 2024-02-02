# Fraglates

An open source templating engine for generating dynamic hypertext fragments.

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
const fullpage = fraglates.render("my-template.html#header", {
  title: 'My Dynamic Title'
});

```
