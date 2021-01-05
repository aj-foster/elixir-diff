/**
 * Elixir Diff
 * 
 * A small weekend project.
 * 
 * This file contains all of the code for listing, fetching, and displaying diffs for each of the
 * project generator combinations. It uses /diffs/manifest.txt to help list versions, and then
 * fetches the individual diff files based on the selected choices.
 * 
 * The `window` object is the source of truth for the current selections (generator, version, and
 * variants / flags). The URL is the source of truth for the style of diff to display (side-by-side
 * vs. single-column). Where possible, we work to make any changes in the UI navigable using the
 * back and forward buttons.
 * 
 * This file is deliberately written in vanilla JavaScript. Not all browsers will support the
 * language features used. That's probably okay.
 */


///////////////////
// Configuration //
///////////////////

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


/////////////////
// DOM handles //
/////////////////

const startForm = document.getElementById("start-form");
const startGeneratorSelect = document.getElementById("start-generator-select");
const startVariantChecks = document.getElementById("start-variant-checks");

const resultForm = document.getElementById("result-form");
const resultGeneratorSelect = document.getElementById("result-generator-select");
const resultVariantChecks = document.getElementById("result-variant-checks");

const outputFormatSelect = document.getElementById("output-format-select");


//////////////////////////////////////////////
// Fetch Generator, Variant List, and Diffs //
//////////////////////////////////////////////

/**
 * Retrieve the manifest of available projects and render the <select> options for the generators
 * and variants.
 */
const fetchManifestAndRenderSelects = async () => {
  const response = await fetch("diffs/manifest.txt");
  const manifest = await response.text();
  const projects = manifest.split("\n");

  //
  // Fill in available versions for each generator.
  //

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

  // Before rendering the selects, check the query params for preset diffs to load.
  setSelectionsFromURL();

  // Render the select boxes.
  renderGeneratorSelect();

  // Now render check marks for variants (flags).
  renderVariantCheckboxes("start");
  renderVariantCheckboxes("result");
}

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
 * Retrieve the diff for the currently selected start and result projects.
 */
const fetchAndRenderDiff = async () => {
  const start = window.startGenerator + "--" + window.startVariants;
  const result = window.resultGenerator + "--" + window.resultVariants;

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


///////////////////////////////////
// Render Selects and Checkboxes //
///////////////////////////////////

/**
 * Render the <select> options for the available generators.
 */
const renderGeneratorSelect = () => {
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
}

/**
 * Render the checkbox options for either the start or result variant.
 * 
 * @param startOrResult "start" or "result"
 */
const renderVariantCheckboxes = (startOrResult) => {
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


/////////////////////////////////
// Manage URL Query Parameters //
/////////////////////////////////

/**
 * Set the values of window.{startGenerator, startVariants, resultGenerator, resultVariants} based
 * on query params present in the URL.
 */
const setSelectionsFromURL = () => {
  const presetStart = (new URLSearchParams(window.location.search)).get("from");
  const presetResult = (new URLSearchParams(window.location.search)).get("to");

  // Set to true if we've chosen a version different than what is in the URL.
  let needToUpdateQueryParams = false;

  if (presetStart) {
    let [generator, version, variant] = presetStart.split("--");

    if (version === 'latest') {
      version = getLatestVersionOfGenerator(generator);
      needToUpdateQueryParams = true;
    }

    window.startGenerator = `${generator}--${version}`;
    window.startVariants = variant;
  } else {
    needToUpdateQueryParams = true;
    window.startGenerator = `${defaultGenerator}--${getLatestVersionOfGenerator(defaultGenerator)}`;
    window.startVariants = defaultStartVariant;
  }
  
  if (presetResult) {
    let [generator, version, variant] = presetResult.split("--");

    if (version === 'latest') {
      version = getLatestVersionOfGenerator(generator);
      needToUpdateQueryParams = true;
    }
    
    window.resultGenerator = `${generator}--${version}`;
    window.resultVariants = variant;
  } else {
    needToUpdateQueryParams = true;
    window.resultGenerator = `${defaultGenerator}--${getLatestVersionOfGenerator(defaultGenerator)}`;
    window.resultVariants = defaultResultVariant;
  }

  if (needToUpdateQueryParams) {
    setURLFromSelections(true);
  }
};

/**
 * Update the URL to reflect dropdown choices. Optionally do this without forcing someone to go
 * "back" an additional time.
 */
const setURLFromSelections = (updateWithoutPushing) => {
  const start = window.startGenerator + "--" + window.startVariants;
  const result = window.resultGenerator + "--" + window.resultVariants;

  updateQueryParams("from", start, !!updateWithoutPushing);
  updateQueryParams("to", result, !!updateWithoutPushing);
};

/**
 * Update the URL to reflect dropdown choices. Optionally do this without forcing someone to go
 * "back" an additional time.
 */
const updateQueryParams = (key, value, updateWithoutPushing) => {
  const urlParams = new URLSearchParams(window.location.search);
  const previousValue = urlParams.get(key);

  if (previousValue !== value) {
    urlParams.set(key, value);

    const newLocation =
        window.location.protocol + "//" +
        window.location.host +
        window.location.pathname +
        "?" + urlParams.toString();

    if (updateWithoutPushing) {
      window.history.replaceState({ path: newLocation }, "", newLocation);
    } else {
      window.history.pushState({ path: newLocation }, "", newLocation);
    }
  }
}


///////////////
// Page Load //
///////////////

// Load versions from manifest and render initial diff.

fetchManifestAndRenderSelects()
  .then(() => fetchAndRenderDiff());


////////////////////
// Event Handlers //
////////////////////

// Change left-side dropdown
startGeneratorSelect.addEventListener('change', (event) => {
  window.startGenerator = event.target.value;
  window.startVariants = "base";

  renderVariantCheckboxes("start");
  setURLFromSelections();
  fetchAndRenderDiff();
});

// Change right-side dropdown
resultGeneratorSelect.addEventListener('change', (event) => {
  window.resultGenerator = event.target.value;
  window.resultVariants = "base";

  renderVariantCheckboxes("result");
  setURLFromSelections();
  fetchAndRenderDiff();
});

// Change dropdown for side-by-side vs. single column diffs
outputFormatSelect.addEventListener('change', (event) => {
  updateQueryParams("output", event.target.value);
  fetchAndRenderDiff();
});

// Respond to back/forward movement by the browser.
window.onpopstate = () => {
  setSelectionsFromURL();
  renderGeneratorSelect();
  renderVariantCheckboxes("start");
  renderVariantCheckboxes("result");
  fetchAndRenderDiff();
}

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

  setURLFromSelections();
  fetchAndRenderDiff();
};
