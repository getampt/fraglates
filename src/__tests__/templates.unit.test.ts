import * as fs from "fs";
import Fraglates from "../index";

// process.env.BENCHMARK = "true";

const getVar = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return "async var";
};

const getPromise = async (resolveTo) => {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(resolveTo);
    });
  });
};

const loaders = {
  "file system": { templates: "./src/__tests__/templates" },
  precompiled: { precompiled: "./src/__tests__/precompiled" },
};

// Loop through each template loader type
for (const loader in loaders) {
  // Create a new instance of Fraglates
  const fraglates = new Fraglates(loaders[loader]);

  fraglates.addFilter("upperx", (str) => {
    return "testing: " + str;
  });

  fraglates.addFilter("custom_filter", (str) => {
    return "CUSTOM: " + str;
  });

  fraglates.addFilter("syncFilter", (str) => {
    return "[{" + str + "}]";
  });

  fraglates.addFilter("syncishFilter", (str) => {
    return getPromise("[~" + str + "~]");
  });

  fraglates.addFilter("asyncFilter", (str) => {
    return new Promise((res) => {
      setTimeout(() => {
        res("[(" + str + ")]");
      }, 500);
    });
  });

  // Defines some global variables and functions
  fraglates.addGlobal("globalVar", "GLOBAL");
  fraglates.addGlobal("globalFunc", (x) => {
    return typeof x === "string" ? x.toUpperCase() : "MISSING";
  });
  fraglates.addGlobal("globalFuncAsync", (x) => {
    return 1; //getPromise("[~" + x + "~]");
  });

  // console.log(fraglates.getFilter("asyncFilter").toString());

  const renderedPath = "./src/__tests__/rendered";

  describe(`${loader} template rendering`, () => {
    it("should render a template", async () => {
      const data = {
        header: "Test Header",
        content: "Test Content",
        footer: "Test Footer",
        include: "Test Include",
      };
      const result = await fraglates.render("simple.html", data);

      const expected = fs.readFileSync(`${renderedPath}/_simple.html`, "utf8");
      expect(result).toBe(expected);
    });

    it("should render the fragments", async () => {
      const header = await fraglates.render("simple.html#header", {
        header: "Test Header Fragment",
        include: "Test Include",
      });
      const footer = await fraglates.render("simple.html#footer", {
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
      const result = await fraglates.render("nested-fragments.html", data);
      const expected = fs.readFileSync(
        `${renderedPath}/_fragments.html`,
        "utf8"
      );
      expect(result).toBe(expected);
    });

    it("should render nested fragments", async () => {
      const level1 = await fraglates.render("nested-fragments.html#level1", {
        lvl1: "Level 1",
        lvl2: "Level 1.2",
        lvl3: "Level 1.3",
      });

      const level2 = await fraglates.render("nested-fragments.html#level2", {
        lvl2: "Level 2",
        lvl3: "Level 2.3",
      });

      const level3 = await fraglates.render("nested-fragments.html#level3", {
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
      const result = await fraglates.render("messy-fragments.html", {
        text: "Test123",
      });

      const expected = fs.readFileSync(
        `${renderedPath}/_messy-fragments.html`,
        "utf8"
      );
      expect(result).toBe(expected);
    });

    it("should render messy fragments", async () => {
      const nobreaks = await fraglates.render("messy-fragments.html#nobreaks", {
        text: "Test",
      });
      expect(nobreaks).toBe(`<h1>Test</h1>`);

      const leadbreak = await fraglates.render(
        "messy-fragments.html#leadbreak",
        {
          text: "Test",
        }
      );
      expect(leadbreak).toBe(`<h2>Test</h2>`);

      const endbreak = await fraglates.render("messy-fragments.html#endbreak", {
        text: "Test",
      });
      expect(endbreak).toBe(`<h3>Test</h3>`);

      const extravalues = await fraglates.render(
        "messy-fragments.html#extravalues",
        {
          text: "Test",
        }
      );
      expect(extravalues).toBe(`<h4>Test</h4>`);

      const splitblock = await fraglates.render(
        "messy-fragments.html#splitblock",
        {
          text: "Test",
        }
      );
      expect(splitblock).toBe(`<h5>Test</h5>`);
    });

    it("should await the data before returning the template", async () => {
      const result = await fraglates.render("simple.html#header", {
        header: await getVar(),
        include: "Test Include",
      });

      expect(result).toBe(
        `<h1>Test Include</h1>\n    <header>async var</header>`
      );
    });

    it("should componentize a template", async () => {
      const TestComponent = await fraglates.component("simple.html#header");
      const result = await TestComponent({
        header: "Test Header",
        include: "Test Include",
      });
      expect(result).toBe(
        `<h1>Test Include</h1>\n    <header>Test Header</header>`
      );
    });

    it("should cache fragments within loops", async () => {
      const result = await fraglates.render("nested-loops.html#inloop", {
        x: "test",
      });
      expect(result).toBe(`<p id="test">test</p>`);
    });

    it("should handle async/sync filters", async () => {
      const result = await fraglates.render("async-filters.html", {
        input: "TEST",
      });
      expect(result).toBe(
        `<div>ASYNC: [(TEST)]</div>\n` +
          `<div>SYNC: [{TEST}]</div>\n` +
          `<div>SYNCISH: [~TEST~]</div>`
      );
    });

    it("should handle global variables and functions", async () => {
      const result = await fraglates.render("custom-globals.html", {
        input: "xyz",
      });
      expect(result).toBe(
        `<div>GLOBAL: GLOBAL</div>\n` +
          `<div>GLOBALFUNC: XYZ</div>\n` +
          `<div>GLOBALFUNCMISSING: MISSING</div>\n` +
          `<div>GLOBALFUNCASYNC: 1</div>`
      );
    });

    it("should handle restore the rootRenderFunction", async () => {
      const result = await fraglates.render("simple.html#header", {
        header: "HeaderTest",
        include: "Test Include",
      });
      const result2 = await fraglates.render("simple.html#footer", {
        footer: "FooterTest",
      });
      const result3 = await fraglates.render("simple.html", {
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

    it("should process built-in filters", async () => {
      const result = await fraglates.render("builtin-filters-globals.html", {});
      const expected = fs.readFileSync(
        `${renderedPath}/_builtin-filters-globals.html`,
        "utf8"
      );
      expect(result).toBe(expected);
    });

    it("should inherit a template", async () => {
      const result = await fraglates.render("inherited.html", {
        header: "Test Header",
        content: "Test Content",
        footer: "Test Footer",
        include: "Test Include",
      });

      const expected = fs.readFileSync(
        `${renderedPath}/_simple-inherited.html`,
        "utf8"
      );
      expect(result).toBe(expected);
    });

    it("should process macros", async () => {
      const result = await fraglates.render("macros.html", {});

      const expected = fs.readFileSync(`${renderedPath}/_macros.html`, "utf8");
      expect(result).toBe(expected);
    });

    it("should process imports", async () => {
      const result = await fraglates.render("import.html", {});

      const expected = fs.readFileSync(`${renderedPath}/_macros.html`, "utf8");
      expect(result).toBe(expected);
    });
  });
}
