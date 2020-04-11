function fetchAndRenderDiff(start, result) {
  fetch("diffs/" + start + "/" + result + ".diff")
    .then(function (response) {
      if (response.ok) {
        return response.text();
      } else {
        throw new Error("Received non-OK response during fetch");
      }
    })
    .then(function (diff) {
      var diffElement = document.getElementById("diff");
      var configuration = {
        matching: "lines",
        outputFormat: "line-by-line"
      };
      var diff2htmlUi = new Diff2HtmlUI(diffElement, diff, configuration);

      diff2htmlUi.draw();
      diff2htmlUi.highlightCode();
    })
    .catch(function (error) {
      console.error("An error occurred while fetching and rendering the diff:", error);
    })
}

fetchAndRenderDiff("elixir--1.9.1--base", "elixir--1.9.1--sup");
