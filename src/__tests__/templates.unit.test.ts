import * as fs from "fs";
import Fraglates from "../index";
import { get } from "http";

// process.env.BENCHMARK = "true";

const getVar = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return "async var";
};

// Create a new instance of Fraglates
const fraglates = new Fraglates({
  templates: "./src/__tests__/templates",
});

fraglates.env.addFilter("upperx", (str) => {
  return "testing: " + str;
});

const renderedPath = "./src/__tests__/rendered";

describe("Template rendering", () => {
  it("should render a template", () => {
    const data = {
      header: "Test Header",
      content: "Test Content",
      footer: "Test Footer",
    };
    const result = fraglates.render("simple.njk", data);
    const expected = fs.readFileSync(`${renderedPath}/_simple.html`, "utf8");
    expect(result).toBe(expected);
  });

  it("should render the fragments", () => {
    const header = fraglates.render("simple.njk#header", {
      header: "Test Header Fragment",
    });
    const footer = fraglates.render("simple.njk#footer", {
      footer: "Test Footer Fragment",
    });

    expect(header).toBe(`<header>Test Header Fragment</header>`);
    expect(footer).toBe(`<footer>Test Footer Fragment</footer>`);
  });

  it("should render a template with nested fragments", () => {
    const data = {
      lvl1: "Level 1",
      lvl2: "Level 2",
      lvl3: "Level 3",
    };
    const result = fraglates.render("fragments.njk", data);
    const expected = fs.readFileSync(`${renderedPath}/_fragments.html`, "utf8");
    expect(result).toBe(expected);
  });

  it("should render nested fragments", () => {
    const level1 = fraglates.render("fragments.njk#level1", {
      lvl1: "Level 1",
      lvl2: "Level 1.2",
      lvl3: "Level 1.3",
    });

    const level2 = fraglates.render("fragments.njk#level2", {
      lvl2: "Level 2",
      lvl3: "Level 2.3",
    });

    const level3 = fraglates.render("fragments.njk#level3", {
      lvl3: "Level 3",
    });

    const expectedLvl1 = fs.readFileSync(
      `${renderedPath}/_fragments-level1.html`,
      "utf8"
    );
    const expectedLvl2 = fs.readFileSync(
      `${renderedPath}/_fragments-level2.html`,
      "utf8"
    );

    expect(level1).toBe(expectedLvl1);
    expect(level2).toBe(expectedLvl2);
    expect(level3).toBe(`<h3>Level 3</h3>`);
  });

  it("should render a template with messy fragments", () => {
    const result = fraglates.render("messy-fragments.njk", {
      text: "Test123",
    });

    const expected = fs.readFileSync(
      `${renderedPath}/_messy-fragments.html`,
      "utf8"
    );
    expect(result).toBe(expected);
  });

  it("should render messy fragments", () => {
    const nobreaks = fraglates.render("messy-fragments.njk#nobreaks", {
      text: "Test",
    });
    expect(nobreaks).toBe(`<h1>Test</h1>`);

    const leadbreak = fraglates.render("messy-fragments.njk#leadbreak", {
      text: "Test",
    });
    expect(leadbreak).toBe(`<h2>Test</h2>`);

    const endbreak = fraglates.render("messy-fragments.njk#endbreak", {
      text: "Test",
    });
    expect(endbreak).toBe(`<h3>Test</h3>`);

    const extravalues = fraglates.render("messy-fragments.njk#extravalues", {
      text: "Test",
    });
    expect(extravalues).toBe(`<h4>Test</h4>`);

    const splitblock = fraglates.render("messy-fragments.njk#splitblock", {
      text: "Test",
    });
    expect(splitblock).toBe(`<h5>Test</h5>`);
  });

  it("should await the data before returning the template", async () => {
    const result = fraglates.render("simple.njk#header", {
      header: await getVar(),
    });

    expect(result).toBe(`<header>async var</header>`);
  });

  it("should componentize a template", () => {
    const TestComponent = fraglates.component("simple.njk#header");
    const result = TestComponent({ header: "Test Header" });
    expect(result).toBe(`<header>Test Header</header>`);
  });

  it("should cache fragments within loops", async () => {
    const result = fraglates.render("nested-loops.njk#inloop", {
      // headerText: "Header",
      // items: ["123", "456", "789"],
      x: "test",
    });
    console.log(result);

    expect(result).toBe(`<p id="test">test</p>`);
  });

  it("should handle restore the rootRenderFunction", async () => {
    const result = fraglates.render("simple.njk#header", {
      header: "HeaderTest",
    });
    const result2 = fraglates.render("simple.njk#footer", {
      footer: "FooterTest",
    });
    const result3 = fraglates.render("simple.njk", {
      header: "Test Header",
      content: "Test Content",
      footer: "Test Footer",
    });

    expect(result).toBe(`<header>HeaderTest</header>`);
    expect(result2).toBe(`<footer>FooterTest</footer>`);

    const expected = fs.readFileSync(`${renderedPath}/_simple.html`, "utf8");
    expect(result3).toBe(expected);
  });
});
