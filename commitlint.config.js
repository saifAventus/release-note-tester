module.exports = {
  extends: ["@commitlint/config-conventional"],

  rules: {
    "header-max-length": [2, "always", 100],

    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "perf", "test", "chore"],
    ],

    "references-empty": [2, "never"],
  },

  parserPreset: {
    parserOpts: {
      issuePrefixes: ["DRNT2-"],
    },
  },
};
