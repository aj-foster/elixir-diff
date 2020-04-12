# Elixir Diff

View the differences between files created by various Elixir project generators.
[https://aj-foster.github.io/elixir-diff/](https://aj-foster.github.io/elixir-diff)

## What is this?

Occasionally, I find myself wondering about the difference between various Elixir project generators.
Maybe I forgot to add the `--sup` flag while running `mix new`.
Or maybe it's time to add Phoenix to a project that wasn't generated with `mix phx.new`.
Without generating a new project and manually looking at files, how can you tell what needs to change?

This project — heavily inspired by [PhoenixDiff](https://phoenixdiff.org/) — shows the differences.

It was a quick weekend project.
Nothing world-changing here.

**Examples**

- [I forgot to add the `--sup` flag; how do I fix it?](https://aj-foster.github.io/elixir-diff/?from=elixir--1.10.2--base&to=elixir--1.10.2--sup)
- [How do I remove HTML support and Webpack from my Phoenix app?](https://aj-foster.github.io/elixir-diff/?from=phoenix--1.4.16--base&to=phoenix--1.4.16--nohtml-nowebpack)
- [What does the `--no-nerves-pack` flag do to my Nerves project?](https://aj-foster.github.io/elixir-diff/?from=nerves--1.8.0--base&to=nerves--1.8.0--no-nerves-pack)

If you're interested in changes to generators across versions of Phoenix, I highly recommend you use [PhoenixDiff](https://phoenixdiff.org/).

### How does it work?

By generating a bunch of projects with every combination of available flags, we can ask `git` to compare files and generate a patch file.
Then we can present those patch files in a friendly web interface.

Notably, the number of pairwise diffs grows very rapidly when we add new generators and variants.
As a result, a few of the decisions about how the front-end works were driven by a need to avoid listing out all of the variant combinations.

If you're bored, try calculating out how many diffs there are for (2 + 7 + 1) generator flags across the three projects.
Then checkout the [Handshake Lemma](https://en.wikipedia.org/wiki/Handshaking_lemma) and begin down the fun rabbit hole that is Graph Theory.

### What's up with your technology choices?

Maybe it was a longing for simplicity, or maybe it was nostalgia.
This just seemed like a project that could be accomplish with plain old HTML/CSS/JS along with some Bash scripts.
There's one line of Elixir code, `eval`ed in a script to get the current version.
Other than that, jumping through the hoops of using vanilla JS and Bash were entertaining.

My use of `CanIUse` was sparse, and some of the more modern JavaScript features used may not work in all browsers.
Please let me know if there's anything in particular that could be polyfilled or regressed.
The lack of a build step for the site is probably okay for now.

## Contributing

Contributions are welcome.
Please open issues with ideas for improvement.
If the community takes any interest in this project, we can add a more comprehensive contribution policy.

## License

The code provided in this repository is presented under the MIT license.
Chances are, though, you won't want to use it for anything.
It's just a quick weekend project.
