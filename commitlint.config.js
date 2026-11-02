module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "refactor",
        "test",
        "docs",
        "chore",
        "style",
        "perf",
        "build",
        "ci",
        "revert",
      ],
    ],
    "subject-max-length": [2, "always", 72],
    "subject-case": [2, "always", "lower-case"],
  },
};

