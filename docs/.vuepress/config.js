const { slugify } = require("@vuepress/shared-utils")

const slugMap = {
  "Requirejs Bundling: How to ignore resources which should only be resolved at runtime?":
    "RUNTIME_RESOURCES",
  "Requirejs Bundling: How to ignore None AMD resources?": "IGNORE_JS",
  "Require.js Bundling: How to handle failures due to automatic detection of None AMD(require.js) resources?":
    "VALIDATE_AMD",
}

module.exports = {
  title: "SAP Web IDE Client Tools",
  base: "/webide-client-tools/web/site/",
  description: "Tools & Flows for SAP Web IDE Client Side Features.",
  dest: "docs/web/site",
  markdown: {
    slugify: function (str) {
      const mappedSlug = slugMap[str]
      if (mappedSlug) {
        return mappedSlug
      }

      return slugify(str)
    },
  },
  themeConfig: {
    repo: "SAP/webide-client-tools",
    docsDir: "docs",
    docsBranch: "master",
    editLinks: true,
    editLinkText: "Edit this page on GitHub",
    navbar: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/testing" },
      {
        text: "APIs",
        link: "https://sap.github.io/webide-client-tools/web/html_docs/modules/_api_d_.html",
      },
      { text: "FAQ", link: "/FAQ" },
      { text: "Changes", link: "/changes/changelog" },
    ],
    sidebar: {
      "/guide/": [
        {
          title: "Guide",
          collapsable: false,
          children: [
            ["testing", "Testing"],
            ["bundling", "Bundling"],
            ["local_env", "Environment"],
          ],
        },
      ],
      "/changes/": [
        {
          title: "Changes",
          collapsable: false,
          children: [
            ["CHANGELOG", "ChangeLog"],
            ["BREAKING_CHANGES", "Breaking Changes"],
          ],
        },
      ],
    },
  },
}
