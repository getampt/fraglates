import Fraglates from "./dist/index.js";
// Create a new Fraglates instance
const fraglates = new Fraglates({
  templates: "./src/__tests__/templates",
});

const data = {
  header: "Test Header <script>alert('XSS')</script>",
  content: "Test Content",
  footer: "Test Footer",
};

fraglates.addFilter("upperx", (str) => str.toUpperCase());

// console.log("autoescape:", fraglates.autoescape);
// const result = fraglates.render("simple.njk#header", data);

const result = fraglates.renderString("<h1>{{ header | safe }}</h1>", data);

console.log(result);
