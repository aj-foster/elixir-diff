//
// Configuration 
//

const generators = [
  {
    name: "Elixir",
    value: "elixir",
    variants: [
      {name: "mix new", value: "base"},
      {name: "mix new --sup", value: "sup"},
      {name: "mix new --umbrella", value: "umbrella"},
      {name: "mix new --sup --umbrella", value: "sup-umbrella"}
    ]
  }
]

const defaultGenerator = "elixir--1.10.2";
const defaultStartVariant = "base";
const defaultResultVariant = "sup";

//
// DOM handles
//

const startGeneratorSelect = document.getElementById("start-generator-select");
const startVariantSelect = document.getElementById("start-variant-select");
const resultGeneratorSelect = document.getElementById("result-generator-select");
const resultVariantSelect = document.getElementById("result-variant-select");
const outputFormatSelect = document.getElementById("output-format-select");

const urlParams = new URLSearchParams(window.location.search);

//
// Helpers
//

/**
 * Retrieve the manifest of available projects and render the <select> options for the generators
 * and variants.
 */
const fetchManifestAndRenderSelects = async () => {
  const response = await fetch("diffs/manifest.txt");
  const manifest = await response.text();
  const projects = manifest.split("\n");

  const generatorToVersionMap = {};

  for (const project of projects) {
    const [generator, version, _variant] = project.split("/");

    if (generator == null || generator === "") {
      continue;
    }
    
    if (generatorToVersionMap[generator] == null) {
      generatorToVersionMap[generator] = [version];
    } else if (!generatorToVersionMap[generator].includes(version)) {
      generatorToVersionMap[generator].push(version);
    }
  }

  for (const generator of generators) {
    generator.versions = generatorToVersionMap[generator.value];
  }

  const generatorOptions = generators.map((generator) => {
    return generator.versions.map((version) => {
      return `<option value="${generator.value}--${version}">${generator.name} ${version}</option>`;
    })
  }).join("");

  startGeneratorSelect.innerHTML = generatorOptions;
  resultGeneratorSelect.innerHTML = generatorOptions;

  renderVariantSelect("start", defaultGenerator, true);
  renderVariantSelect("result", defaultGenerator, true);

  fetchAndRenderDiff();
}

/**
 * Render the <select> options for either the start or result variant.
 * 
 * @param startOrResult "start" or "result"
 * @param generatorVersion Generator value, i.e. "elixir--1.9.1"
 * @param selectDefault Whether to force selection of a particular option
 */
const renderVariantSelect = (startOrResult, generatorVersion, selectDefault) => {
  const [generatorValue] = generatorVersion.split("--");
  const generator = generators.find(({ value }) => value === generatorValue);
  const variantSelect = document.getElementById(`${startOrResult}-variant-select`);

  const variantOptions = generator.variants.map((variant) => {
    if (selectDefault && startOrResult === "start" && variant.value === defaultStartVariant) {
      return `<option selected value="${variant.value}">${variant.name}</option>`;

    } else if (selectDefault && startOrResult === "result" && variant.value === defaultResultVariant) {
      return `<option selected value="${variant.value}">${variant.name}</option>`;

    } else {
      return `<option value="${variant.value}">${variant.name}</option>`;
    }
  }).join("");

  if (variantSelect.innerHTML !== variantOptions) {
    variantSelect.innerHTML = variantOptions;
  }
}

/**
 * Retrieve the diff for the currently selected start and result projects.
 */
const fetchAndRenderDiff = async () => {
  const start = startGeneratorSelect.value + "--" + startVariantSelect.value;
  const result = resultGeneratorSelect.value + "--" + resultVariantSelect.value;

  const response = await fetch("diffs/" + start + "/" + result + ".diff");
  const diff = await response.text();

  const diffElement = document.getElementById("diff");
  const configuration = {
    matching: "lines",
    outputFormat: outputFormatSelect.value
  };
  const diff2htmlUi = new Diff2HtmlUI(diffElement, diff, configuration);

  const elixirHighlighter = diff2htmlUi.hljs.getLanguage("elixir");
  diff2htmlUi.hljs.registerLanguage("ex", () => elixirHighlighter);
  diff2htmlUi.hljs.registerLanguage("exs", () => elixirHighlighter);

  diff2htmlUi.draw();
}

/**
 * Update the URL to reflect dropdown choices.
 */
const updateQueryParams = (key, value) => {
  urlParams.set(key, value);

  const newLocation =
      window.location.protocol + "//" +
      window.location.host +
      window.location.pathname +
      "?" + urlParams.toString();

  window.history.pushState({ path: newLocation }, "", newLocation);
}

//
// On page load
//

fetchManifestAndRenderSelects();

startGeneratorSelect.addEventListener('change', async (event) => {
  updateQueryParams("from", startGeneratorSelect.value + "--" + startVariantSelect.value);
  await renderVariantSelect("start", event.target.value);
  fetchAndRenderDiff();
});

startVariantSelect.addEventListener('change', () => {
  updateQueryParams("from", startGeneratorSelect.value + "--" + startVariantSelect.value);
  fetchAndRenderDiff();
});

resultGeneratorSelect.addEventListener('change', async (event) => {
  await renderVariantSelect("result", event.target.value);
  updateQueryParams("to", resultGeneratorSelect.value + "--" + resultVariantSelect.value);
  fetchAndRenderDiff();
});

resultVariantSelect.addEventListener('change', () => {
  updateQueryParams("to", resultGeneratorSelect.value + "--" + resultVariantSelect.value);
  fetchAndRenderDiff();
});

outputFormatSelect.addEventListener('change', (event) => {
  updateQueryParams("output", event.target.value);
  fetchAndRenderDiff();
});
