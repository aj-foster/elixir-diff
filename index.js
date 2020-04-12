//
// Configuration 
//

const generators = [
  {
    name: "Elixir",
    value: "elixir",
    base: "mix new",
    variants: [
      {name: "--sup", value: "sup"},
      {name: "--umbrella", value: "umbrella"}
    ]
  },
  {
    name: "Nerves",
    value: "nerves",
    base: "mix nerves.new",
    variants: [{name: "--no-nerves-pack", value: "no-nerves-pack"}]
  },
  {
    name: "Phoenix",
    value: "phoenix",
    base: "mix phx.new",
    variants: [
      {name: "--binary-id", value: "binaryid"},
      {name: "--database mysql", value: "database"},
      {name: "--no-ecto", value: "noecto"},
      {name: "--no-gettext", value: "nogettext"},
      {name: "--no-html", value: "nohtml"},
      {name: "--no-webpack", value: "nowebpack"},
      {name: "--umbrella", value: "umbrella"}
    ]
  }
]

const defaultGenerator = "elixir--1.10.2";
const defaultStartVariant = "base";
const defaultResultVariant = "sup";

//
// DOM handles
//

const startForm = document.getElementById("start-form");
const startGeneratorSelect = document.getElementById("start-generator-select");
const startVariantChecks = document.getElementById("start-variant-checks");

const resultForm = document.getElementById("result-form");
const resultGeneratorSelect = document.getElementById("result-generator-select");
const resultVariantChecks = document.getElementById("result-variant-checks");

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

  const startGeneratorOptions = generators.map((generator) => {
    return generator.versions.map((version) => {
      const value = `${generator.value}--${version}`;

      return `
        <option
            value="${value}"
            ${window.startGenerator === value ? "selected" : ""}>
          ${generator.name} ${version} (${generator.base})
        </option>`;
      });
  }).join("");

  const resultGeneratorOptions = generators.map((generator) => {
    return generator.versions.map((version) => {
      const value = `${generator.value}--${version}`;

      return `
        <option
            value="${value}"
            ${window.resultGenerator === value ? "selected" : ""}>
          ${generator.name} ${version} (${generator.base})
        </option>`;
      });
  }).join("");

  startGeneratorSelect.innerHTML = startGeneratorOptions;
  resultGeneratorSelect.innerHTML = resultGeneratorOptions;

  renderVariantSelect("start");
  renderVariantSelect("result");

  // fetchAndRenderDiff();
}

/**
 * Render the <select> options for either the start or result variant.
 * 
 * @param startOrResult "start" or "result"
 * @param generatorVersion Generator value, i.e. "elixir--1.9.1"
 * @param selectDefault Whether to force selection of a particular option
 */
const renderVariantSelect = (startOrResult) => {
  const [generatorValue] = window[startOrResult + "Generator"].split("--");
  const generator = generators.find(({ value }) => value === generatorValue);
  const variantChecks = document.getElementById(`${startOrResult}-variant-checks`);
  const currentVariant = window[startOrResult + "Variants"];

  const variantOptions = generator.variants.map((variant) => `
    <label>
      <input
        type="checkbox"
        name="${startOrResult}-variant-${variant.value}"
        value="${variant.value}"
        ${currentVariant.includes(variant.value) ? "checked" : ""}>
      ${variant.name}
    </label>
    `).join("");

  if (variantChecks.innerHTML !== variantOptions) {
    variantChecks.innerHTML = variantOptions;
    variantChecks.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", handleVariantChange);
    });
  }
};

const handleVariantChange = () => {
  window.startVariants = Array.from(
    startVariantChecks
      .querySelectorAll("input")
      .values()
    )
    .filter((input) => input.checked)
    .map((input) => input.value)
    .join("-")
    || "base";

  window.resultVariants = Array.from(
    resultVariantChecks
      .querySelectorAll("input")
      .values()
    )
    .filter((input) => input.checked)
    .map((input) => input.value)
    .join("-")
    || "base";

  fetchAndRenderDiff();
};

/**
 * Retrieve the diff for the currently selected start and result projects.
 */
const fetchAndRenderDiff = async () => {
  const start = window.startGenerator + "--" + window.startVariants;
  const result = window.resultGenerator + "--" + window.resultVariants;

  updateQueryParams("from", start);
  updateQueryParams("to", result);

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

  const plainHighlighter = diff2htmlUi.hljs.getLanguage("plaintext");
  diff2htmlUi.hljs.registerLanguage("gitignore", () => plainHighlighter);

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

// Set variants based on URL params, if available.

const presetStart = urlParams.get("from");
const presetResult = urlParams.get("to");

if (presetStart) {
  const [generator, version, variant] = presetStart.split("--");

  window.startGenerator = `${generator}--${version}`;
  window.startVariants = variant;
} else {
  window.startGenerator = defaultGenerator;
  window.startVariants = defaultStartVariant;
}

if (presetResult) {
  const [generator, version, variant] = presetResult.split("--");

  window.resultGenerator = `${generator}--${version}`;
  window.resultVariants = variant;
} else {
  window.resultGenerator = defaultGenerator;
  window.resultVariants = defaultResultVariant;
}

// Load versions from manifest and render initial diff.

fetchManifestAndRenderSelects()
  .then(() => fetchAndRenderDiff());

// Add listeners for generator and display changes.

startGeneratorSelect.addEventListener('change', async (event) => {
  window.startGenerator = event.target.value;
  await renderVariantSelect("start", event.target.value);
  fetchAndRenderDiff();
});

resultGeneratorSelect.addEventListener('change', async (event) => {
  window.resultGenerator = event.target.value;
  await renderVariantSelect("result", event.target.value);
  fetchAndRenderDiff();
});

outputFormatSelect.addEventListener('change', (event) => {
  updateQueryParams("output", event.target.value);
  fetchAndRenderDiff();
});
