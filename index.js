//
// Configuration 
//

/**
 * JavaScript-level configuration of what variants (flags) are available for each generator. If
 * you make changes, here, ensure the relevant generator script changes as well.
 * 
 * In `fetchManifestAndRenderSelects`, this configuration will get filled in with lists of
 * `versions` for each generator.
 */
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

/**
 * When the page loads without any query parameters, use the latest version of `defaultGenerator` as
 * the default selection. Use `defaultStartVariant` as the starting variant (selected on the left)
 * and `defaultResultVariant` as the result variant (selected on the right).
 */
const defaultGenerator = "elixir";
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

  // Before rendering the selects, check the URL (specifically, query params) for preset diffs
  // to load.
  setSelectionsFromURL();

  // Render options in the start (left) selection.
  startGeneratorSelect.innerHTML = generators.map((generator) => {
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

  // Render options in the result (right) selection.
  resultGeneratorSelect.innerHTML = generators.map((generator) => {
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

  // Now render check marks for variants (flags).
  renderVariantSelect("start", true);
  renderVariantSelect("result", true);
}

/**
 * Set the values of window.{startGenerator, startVariants, resultGenerator, resultVariants} based
 * on query params present in the URL.
 */
const setSelectionsFromURL = () => {
  const presetStart = urlParams.get("from");
  const presetResult = urlParams.get("to");

  if (presetStart) {
    let [generator, version, variant] = presetStart.split("--");

    if (version === 'latest') {
      version = getLatestVersionOfGenerator(generator);
    }

    window.startGenerator = `${generator}--${version}`;
    window.startVariants = variant;
  } else {
    window.startGenerator = `${defaultGenerator}--${getLatestVersionOfGenerator(defaultGenerator)}`;
    window.startVariants = defaultStartVariant;
  }
  
  if (presetResult) {
    let [generator, version, variant] = presetResult.split("--");

    if (version === 'latest') {
      version = getLatestVersionOfGenerator(generator);
    }
    
    window.resultGenerator = `${generator}--${version}`;
    window.resultVariants = variant;
  } else {
    window.resultGenerator = `${defaultGenerator}--${getLatestVersionOfGenerator(defaultGenerator)}`;
    window.resultVariants = defaultResultVariant;
  }
};

/**
 * Returns the latest version number for the given generator.
 * 
 * @param {string} generator Generator for which to return the latest version.
 * @returns {string} Latest version number of the given generator.
 */
const getLatestVersionOfGenerator = (generator) => {
  return generators.find((gen) => gen.value === generator).versions[0];
};

/**
 * Render the <select> options for either the start or result variant.
 * 
 * @param startOrResult "start" or "result"
 * @param firstRender Whether this is the first render of the variants
 */
const renderVariantSelect = (startOrResult, firstRender) => {
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

    if (!firstRender) {
      window[startOrResult + "Variants"] = "base";
    }
  }
};

/**
 * Handler triggered when one of the checkboxes for variants (flags) changes.
 */
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

// Load versions from manifest and render initial diff.

fetchManifestAndRenderSelects()
  .then(() => fetchAndRenderDiff());

// Add listeners for generator and display changes.

startGeneratorSelect.addEventListener('change', async (event) => {
  window.startGenerator = event.target.value;
  await renderVariantSelect("start");
  fetchAndRenderDiff();
});

resultGeneratorSelect.addEventListener('change', async (event) => {
  window.resultGenerator = event.target.value;
  await renderVariantSelect("result");
  fetchAndRenderDiff();
});

outputFormatSelect.addEventListener('change', (event) => {
  updateQueryParams("output", event.target.value);
  fetchAndRenderDiff();
});
