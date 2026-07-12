import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..");
const projectDirectory = path.join(siteRoot, "projects");
const journalDirectory = path.join(siteRoot, "journal");
const outputFile = path.join(siteRoot, "assets/js/content.js");

const decodeEntities = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const stripTags = (value) => normalizeWhitespace(decodeEntities(value.replace(/<[^>]*>/g, " ")));

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toPosixPath = (value) => value.split(path.sep).join("/");

const sortByDateDesc = (items) =>
  [...items].sort((left, right) => {
    const leftDate = Date.parse(left.date || "");
    const rightDate = Date.parse(right.date || "");

    if (Number.isNaN(leftDate) && Number.isNaN(rightDate)) {
      return left.title.localeCompare(right.title);
    }

    if (Number.isNaN(leftDate)) {
      return 1;
    }

    if (Number.isNaN(rightDate)) {
      return -1;
    }

    return rightDate - leftDate;
  });

const findTag = (html, tagName, className) => {
  const expression = new RegExp(
    `<${tagName}\\b[^>]*class=["'][^"']*${escapeRegExp(className)}[^"']*["'][^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "i"
  );

  const match = html.match(expression);
  return match ? stripTags(match[1]) : "";
};

const findMeta = (html, name) => {
  const metaExpression = new RegExp(
    `<meta\\b[^>]*name=["']${escapeRegExp(name)}["'][^>]*>`,
    "i"
  );
  const tagMatch = html.match(metaExpression);

  if (!tagMatch) {
    return "";
  }

  const contentMatch = tagMatch[0].match(/\bcontent=["']([^"']*)["']/i);
  return contentMatch ? normalizeWhitespace(decodeEntities(contentMatch[1])) : "";
};

const findTitle = (html) => {
  const headingMatch = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);

  if (headingMatch) {
    return stripTags(headingMatch[1]);
  }

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch ? stripTags(titleMatch[1]).replace(/\s*\|\s*Seventh Boar Development$/i, "") : "";
};

const findInkChips = (html) =>
  [...html.matchAll(/<span\b[^>]*class=["'][^"']*chip ink[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)].map(
    (match) => stripTags(match[1])
  );

const parseBoolean = (value) => /^true$/i.test(value);

const parseList = (value) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const readHtmlFiles = async (directoryPath) => {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html") && !entry.name.includes("template"))
    .map((entry) => path.join(directoryPath, entry.name))
    .sort((left, right) => left.localeCompare(right));
};

const buildProject = async (filePath) => {
  const html = await fs.readFile(filePath, "utf8");
  const relativePath = toPosixPath(path.relative(siteRoot, filePath));

  return {
    title: findTitle(html),
    href: relativePath,
    type: findMeta(html, "seventhboar:project-type") || "Project",
    categories: parseList(findMeta(html, "seventhboar:categories")),
    tags: findInkChips(html),
    summary:
      findTag(html, "p", "page-lead") ||
      findMeta(html, "description") ||
      "Project summary coming soon.",
    badge: findMeta(html, "seventhboar:badge") || "Project",
    featured: parseBoolean(findMeta(html, "seventhboar:featured")),
    date: findMeta(html, "seventhboar:date")
  };
};

const buildPost = async (filePath) => {
  const html = await fs.readFile(filePath, "utf8");
  const relativePath = toPosixPath(path.relative(siteRoot, filePath));

  return {
    title: findTitle(html),
    href: relativePath,
    category: findMeta(html, "seventhboar:category") || "Journal",
    summary:
      findTag(html, "p", "article-lead") ||
      findMeta(html, "description") ||
      "Post summary coming soon.",
    date: findMeta(html, "seventhboar:date"),
    featured: parseBoolean(findMeta(html, "seventhboar:featured"))
  };
};

const buildContentFile = (content) => `/*
  This file is generated automatically.
  Source pages:
  - /projects/*.html
  - /journal/*.html

  For local previews, update the page content and metadata, then run:
  node scripts/generate-content.mjs

  GitHub also refreshes this file automatically on pushes to main.
*/

window.seventhBoarContent = ${JSON.stringify(content, null, 2)};
`;

const generate = async () => {
  const projectFiles = await readHtmlFiles(projectDirectory);
  const journalFiles = await readHtmlFiles(journalDirectory);

  const projects = sortByDateDesc(await Promise.all(projectFiles.map(buildProject)));
  const posts = sortByDateDesc(await Promise.all(journalFiles.map(buildPost)));

  await fs.writeFile(outputFile, buildContentFile({ projects, posts }), "utf8");

  console.log(
    `Generated ${path.relative(siteRoot, outputFile)} from ${projects.length} project pages and ${posts.length} journal pages.`
  );
};

generate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
