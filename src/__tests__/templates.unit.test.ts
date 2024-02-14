import * as fs from "fs";
import Fraglates from "../index";

// process.env.BENCHMARK = "true";

const getVar = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return "async var";
};

// Create a new instance of Fraglates
const fraglates = new Fraglates({
  templates: "./src/__tests__/templates",
  precompiled: "./src/__tests__/precompiled",
});

fraglates.env.addFilter("upperx", (str) => {
  return "testing: " + str;
});

fraglates.env.addFilter("custom_filter", (str) => {
  return "CUSTOM: " + str;
});

const renderedPath = "./src/__tests__/rendered";

describe("Template rendering", () => {
  it("should render a template", async () => {
    const data = {
      header: "Test Header",
      content: "Test Content",
      footer: "Test Footer",
      include: "Test Include",
    };
    const result = await fraglates.render("simple.njk", data);

    const expected = fs.readFileSync(`${renderedPath}/_simple.html`, "utf8");
    expect(result).toBe(expected);
  });

  it("should render the fragments", async () => {
    const header = await fraglates.render("simple.njk#header", {
      header: "Test Header Fragment",
      include: "Test Include",
    });
    const footer = await fraglates.render("simple.njk#footer", {
      footer: "Test Footer Fragment",
    });

    expect(header).toBe(
      `<h1>Test Include</h1>\n    <header>Test Header Fragment</header>`
    );
    expect(footer).toBe(`<footer>Test Footer Fragment</footer>`);
  });

  it("should render a template with nested fragments", async () => {
    const data = {
      lvl1: "Level 1",
      lvl2: "Level 2",
      lvl3: "Level 3",
    };
    const result = await fraglates.render("fragments.njk", data);
    const expected = fs.readFileSync(`${renderedPath}/_fragments.html`, "utf8");
    expect(result).toBe(expected);
  });

  it("should render nested fragments", async () => {
    const level1 = await fraglates.render("fragments.njk#level1", {
      lvl1: "Level 1",
      lvl2: "Level 1.2",
      lvl3: "Level 1.3",
    });

    const level2 = await fraglates.render("fragments.njk#level2", {
      lvl2: "Level 2",
      lvl3: "Level 2.3",
    });

    const level3 = await fraglates.render("fragments.njk#level3", {
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

  it("should render a template with messy fragments", async () => {
    const result = await fraglates.render("messy-fragments.njk", {
      text: "Test123",
    });

    const expected = fs.readFileSync(
      `${renderedPath}/_messy-fragments.html`,
      "utf8"
    );
    expect(result).toBe(expected);
  });

  it("should render messy fragments", async () => {
    const nobreaks = await fraglates.render("messy-fragments.njk#nobreaks", {
      text: "Test",
    });
    expect(nobreaks).toBe(`<h1>Test</h1>`);

    const leadbreak = await fraglates.render("messy-fragments.njk#leadbreak", {
      text: "Test",
    });
    expect(leadbreak).toBe(`<h2>Test</h2>`);

    const endbreak = await fraglates.render("messy-fragments.njk#endbreak", {
      text: "Test",
    });
    expect(endbreak).toBe(`<h3>Test</h3>`);

    const extravalues = await fraglates.render(
      "messy-fragments.njk#extravalues",
      {
        text: "Test",
      }
    );
    expect(extravalues).toBe(`<h4>Test</h4>`);

    const splitblock = await fraglates.render(
      "messy-fragments.njk#splitblock",
      {
        text: "Test",
      }
    );
    expect(splitblock).toBe(`<h5>Test</h5>`);
  });

  it("should await the data before returning the template", async () => {
    const result = await fraglates.render("simple.njk#header", {
      header: await getVar(),
      include: "Test Include",
    });

    expect(result).toBe(
      `<h1>Test Include</h1>\n    <header>async var</header>`
    );
  });

  it("should componentize a template", async () => {
    const TestComponent = await fraglates.component("simple.njk#header");
    const result = await TestComponent({
      header: "Test Header",
      include: "Test Include",
    });
    expect(result).toBe(
      `<h1>Test Include</h1>\n    <header>Test Header</header>`
    );
  });

  it("should cache fragments within loops", async () => {
    const result = await fraglates.render("nested-loops.njk#inloop", {
      x: "test",
    });
    expect(result).toBe(`<p id="test">test</p>`);
  });

  it("should handle restore the rootRenderFunction", async () => {
    const result = await fraglates.render("simple.njk#header", {
      header: "HeaderTest",
      include: "Test Include",
    });
    const result2 = await fraglates.render("simple.njk#footer", {
      footer: "FooterTest",
    });
    const result3 = await fraglates.render("simple.njk", {
      header: "Test Header",
      content: "Test Content",
      footer: "Test Footer",
      include: "Test Include",
    });

    expect(result).toBe(
      `<h1>Test Include</h1>\n    <header>HeaderTest</header>`
    );
    expect(result2).toBe(`<footer>FooterTest</footer>`);

    const expected = fs.readFileSync(`${renderedPath}/_simple.html`, "utf8");
    expect(result3).toBe(expected);
  });
});
