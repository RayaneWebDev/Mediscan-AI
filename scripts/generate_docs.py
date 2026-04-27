#!/usr/bin/env python3
"""Generate a unified documentation portal for the whole MediScan project."""

from __future__ import annotations

import ast
import html
import re
import subprocess
import tokenize
import platform
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = PROJECT_ROOT / "docs"
PYTHON_DOCS_DIR = DOCS_DIR / "python"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
FRONTEND_DOCS_DIR = DOCS_DIR / "frontend"
ASSETS_DIR = DOCS_DIR / "_assets"
SHARED_CSS_NAME = "mediscan-docs.css"
SHARED_JS_NAME = "mediscan-docs.js"

PYTHON_SECTION_ROOTS = (
    PROJECT_ROOT / "src" / "mediscan",
    PROJECT_ROOT / "backend" / "app",
    PROJECT_ROOT / "tests",
)
PRODUCT_SCRIPT_FILES = (
    PROJECT_ROOT / "scripts" / "build_index.py",
    PROJECT_ROOT / "scripts" / "query.py",
    PROJECT_ROOT / "scripts" / "query_text.py",
    PROJECT_ROOT / "scripts" / "rebuild_stable_indexes.py",
)
FRENCH_COMMENT_PATTERN = re.compile(
    r"[éèêëàâîïôùûçÉÈÊËÀÂÎÏÔÙÛÇ]|"
    r"\b("
    r"affiche|affiché|ajoute|annule|appelé|applique|assure|bascule|calcule|"
    r"charge|choisi|classe|composant|construit|courant|courante|déclenche|"
    r"disponible|données|effectue|erreur|état|fichier|filtre|fournit|gère|"
    r"indique|initialise|langue|lit|masque|met|modale|"
    r"normalise|paramètres|requête|résultat|retourne|sélecteur|sélection|"
    r"supprime|texte|télécharge|utilisateur|vérifie"
    r")\b",
    re.IGNORECASE,
)


@dataclass
class DocItem:
    """Documented Python symbol extracted from the AST."""

    name: str
    kind: str
    signature: str
    lineno: int
    docstring: str
    children: list["DocItem"]


@dataclass
class ModuleDoc:
    """Structured representation of one Python module."""

    title: str
    source_path: Path
    output_name: str
    docstring: str
    items: list[DocItem]


BASE_CSS = """
:root {
  color-scheme: light;
  --docs-bg: #f6f7f9;
  --docs-bg-soft: #eef0f3;
  --docs-panel: #ffffff;
  --docs-panel-soft: #f9fafb;
  --docs-border: #d8dee6;
  --docs-border-strong: #b8c0cc;
  --docs-text: #1f2933;
  --docs-text-soft: #5f6b7a;
  --docs-link: #2f5f8f;
  --docs-link-soft: #e9edf2;
  --docs-accent: #64748b;
  --docs-sidebar: #111827;
  --docs-sidebar-soft: #1f2937;
  --docs-sidebar-border: rgba(209, 213, 219, 0.16);
  --docs-sidebar-text: rgba(226, 232, 240, 0.92);
  --docs-sidebar-muted: rgba(148, 163, 184, 0.96);
  --docs-sidebar-active: #eff6ff;
  --docs-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
  --docs-shadow-soft: 0 1px 3px rgba(15, 23, 42, 0.06);
  --docs-scrollbar-thumb: rgba(30, 41, 59, 0.2);
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body.docs-body,
body {
  margin: 0;
  min-height: 100vh;
  background: var(--docs-bg);
  color: var(--docs-text);
  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  line-height: 1.58;
}
a { color: var(--docs-link); text-decoration: none; }
a:hover {
  color: color-mix(in srgb, var(--docs-link) 84%, #0f172a);
  text-decoration: underline;
}
.docs-shell {
  display: grid;
  grid-template-columns: 312px minmax(0, 1fr);
  min-height: 100vh;
}
.docs-sidebar {
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  overflow-y: auto;
  padding: 24px 16px 28px;
  background: linear-gradient(180deg, var(--docs-sidebar) 0%, var(--docs-sidebar-soft) 100%);
  color: var(--docs-sidebar-text);
  border-right: 1px solid var(--docs-sidebar-border);
  box-shadow: inset -1px 0 0 rgba(15, 23, 42, 0.3);
}
.docs-sidebar a {
  color: inherit;
  text-decoration: none;
}
.docs-sidebar a:hover {
  color: #f8fafc;
}
.docs-sidebar-brand {
  display: block;
  padding: 6px 10px 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--docs-sidebar-border);
}
.docs-sidebar-kicker {
  display: block;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--docs-sidebar-muted);
}
.docs-sidebar-title {
  display: block;
  margin-top: 6px;
  font-size: 1.18rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.docs-sidebar-subtitle {
  display: block;
  margin-top: 5px;
  font-size: 0.88rem;
  color: var(--docs-sidebar-muted);
}
.docs-sidebar-group {
  margin-top: 16px;
}
.docs-sidebar-group-title {
  display: block;
  margin: 0 10px 10px;
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--docs-sidebar-muted);
}
.docs-sidebar-list,
.docs-sidebar-list ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.docs-sidebar-list li + li {
  margin-top: 4px;
}
.docs-sidebar-list ul {
  margin-top: 6px;
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid var(--docs-sidebar-border);
}
.docs-sidebar-tree {
  margin: 0;
  padding: 0;
}
.docs-sidebar-tree .docs-sidebar-tree {
  margin-top: 6px;
  margin-left: 10px;
  padding-left: 14px;
  border-left: 1px solid var(--docs-sidebar-border);
}
.docs-sidebar-tree-details {
  margin: 0;
}
.docs-sidebar-tree-summary {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  list-style: none;
  padding: 8px 10px 8px 28px;
  border-radius: 8px;
  font-size: 0.95rem;
  color: var(--docs-sidebar-text);
  transition: background-color 180ms ease, color 180ms ease, transform 180ms ease;
}
.docs-sidebar-tree-summary::-webkit-details-marker {
  display: none;
}
.docs-sidebar-tree-summary::before {
  content: "›";
  position: absolute;
  left: 11px;
  top: 50%;
  color: var(--docs-sidebar-muted);
  font-size: 1rem;
  line-height: 1;
  transform: translateY(-50%);
  transition: transform 160ms ease, color 160ms ease;
}
.docs-sidebar-tree-details[open] > .docs-sidebar-tree-summary::before {
  transform: translateY(-50%) rotate(90deg);
  color: var(--docs-sidebar-active);
}
.docs-sidebar-tree-root > .docs-sidebar-tree-summary {
  font-weight: 700;
  color: #f8fafc;
}
.docs-sidebar-tree-summary:hover {
  background: rgba(148, 163, 184, 0.14);
  transform: translateX(2px);
}
.docs-sidebar-tree-details[open] > .docs-sidebar-tree-summary {
  background: rgba(148, 163, 184, 0.1);
}
.docs-sidebar-link {
  display: block;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.95rem;
  color: var(--docs-sidebar-text);
  overflow-wrap: anywhere;
  transition: background-color 180ms ease, color 180ms ease, transform 180ms ease;
}
.docs-sidebar-tree-file .docs-sidebar-link {
  position: relative;
  padding-left: 24px;
  color: var(--docs-sidebar-muted);
}
.docs-sidebar-tree-file .docs-sidebar-link::before {
  content: "";
  position: absolute;
  left: 11px;
  top: 50%;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.55;
  transform: translateY(-50%);
}
.docs-sidebar-tree-file .docs-sidebar-link.active,
.docs-sidebar-tree-file .docs-sidebar-link[aria-current="page"] {
  color: var(--docs-sidebar-active);
}
.docs-sidebar-link:hover {
  background: rgba(148, 163, 184, 0.14);
  transform: translateX(2px);
  text-decoration: none;
}
.docs-sidebar-link.active,
.docs-sidebar-link[aria-current="page"] {
  background: rgba(100, 116, 139, 0.18);
  color: var(--docs-sidebar-active);
  box-shadow: inset 3px 0 0 rgba(203, 213, 225, 0.9);
}
.docs-sidebar-aux {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--docs-sidebar-border);
}
.docs-main {
  min-width: 0;
  padding: 32px;
}
.docs-main-inner {
  max-width: 1220px;
  margin: 0 auto;
}
.hero {
  position: relative;
  overflow: hidden;
  background: #ffffff;
  color: var(--docs-text);
  padding: 24px 28px;
  border-radius: 10px;
  border: 1px solid var(--docs-border);
  border-left: 4px solid var(--docs-accent);
  box-shadow: var(--docs-shadow);
}
.hero h1 {
  margin: 0;
  font-size: clamp(1.9rem, 2.1vw, 2.6rem);
  line-height: 1.1;
  letter-spacing: -0.01em;
}
.hero p {
  margin: 12px 0 0;
  color: var(--docs-text-soft);
  max-width: 920px;
  font-size: 1.02rem;
}
.hero .code {
  background: var(--docs-bg-soft);
  color: var(--docs-text);
}
.section {
  margin-top: 22px;
  background: var(--docs-panel);
  border: 1px solid var(--docs-border);
  border-radius: 10px;
  padding: 24px 26px;
  box-shadow: var(--docs-shadow-soft);
  min-width: 0;
}
.section h2,
.section h3,
.section h4,
.section h5 {
  margin-top: 0;
  overflow-wrap: anywhere;
}
.section h2 {
  margin-bottom: 14px;
  font-size: clamp(1.26rem, 1.4vw, 1.54rem);
  letter-spacing: -0.01em;
}
.muted { color: var(--docs-text-soft); }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}
.card {
  background: var(--docs-panel-soft);
  border: 1px solid var(--docs-border);
  border-left: 3px solid var(--docs-border-strong);
  border-radius: 8px;
  padding: 18px;
  min-width: 0;
  box-shadow: none;
}
.card h3, .card h4 {
  margin: 0 0 10px;
  overflow-wrap: anywhere;
}
.meta {
  font-size: 0.92rem;
  color: var(--docs-text-soft);
  margin: 8px 0 0;
}
.code,
code,
pre,
.prettyprint,
.tag-source a,
.signature,
.type-signature,
.details,
td,
th {
  overflow-wrap: anywhere;
  word-break: break-word;
}
.code {
  display: inline-block;
  margin-top: 8px;
  max-width: 100%;
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.92rem;
  background: #f1f3f5;
  border: 1px solid var(--docs-border);
  border-radius: 8px;
  padding: 8px 10px;
  color: #27313d;
}
.doc p,
.description p,
.tag-description p {
  line-height: 1.65;
  margin: 0 0 12px;
}
.doc pre,
pre.prettyprint,
pre.source {
  white-space: pre-wrap;
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  background: #f3f5f7 !important;
  border: 1px solid var(--docs-border);
  border-radius: 8px;
  padding: 14px;
  overflow-x: auto;
  max-width: 100%;
}
.item {
  border-top: 1px solid var(--docs-border);
  padding-top: 18px;
  margin-top: 18px;
  min-width: 0;
}
.item:first-child {
  border-top: 0;
  padding-top: 0;
  margin-top: 0;
}
.pill {
  display: inline-block;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #334155;
  background: #eef0f3;
  border: 1px solid #d8dee6;
  border-radius: 999px;
  padding: 5px 9px;
  margin-right: 8px;
}
.footer,
footer {
  margin-top: 24px;
  font-size: 0.92rem;
  color: var(--docs-text-soft);
}
.docs-breadcrumbs {
  margin-top: 10px;
  color: var(--docs-text-soft);
  font-size: 0.92rem;
}
.docs-breadcrumbs a {
  color: inherit;
}
table {
  width: 100%;
  border-collapse: collapse;
  display: block;
  overflow-x: auto;
}
.summary-table-wrap {
  width: 100%;
  overflow-x: auto;
}
.summary-table {
  min-width: 680px;
}
.index-table {
  min-width: 760px;
}
.index-table td:first-child {
  font-weight: 600;
}
.index-table .source-column {
  color: var(--docs-text-soft);
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.86rem;
}
th,
td {
  border: 1px solid var(--docs-border);
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
  min-width: 140px;
}
th {
  background: #f1f3f5;
}
.summary-table td:first-child {
  font-weight: 600;
}
.summary-table .summary-kind {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid #d8dee6;
  background: #eef0f3;
  color: #334155;
  font-size: 0.76rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 2px 8px;
}
dl.details {
  background: var(--docs-panel-soft);
  border: 1px solid var(--docs-border);
  border-radius: 8px;
  padding: 16px 18px;
}
.stat-strip {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.stat-card {
  background: #ffffff;
  border: 1px solid var(--docs-border);
  border-radius: 8px;
  padding: 14px 16px;
  box-shadow: var(--docs-shadow-soft);
}
.stat-card .meta {
  margin-top: 4px;
}
.stat-card strong {
  display: block;
  margin-top: 4px;
  font-size: 1.2rem;
  color: #0f172a;
}
.checklist {
  margin: 0;
  padding-left: 22px;
  display: grid;
  gap: 8px;
}
.checklist li {
  color: var(--docs-text);
}
.command-block {
  margin: 16px 0 0;
}
.docs-list {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 8px;
}
.container-overview,
.subsection-title,
.page-title,
article,
section {
  min-width: 0;
}
.docs-sidebar::-webkit-scrollbar,
body::-webkit-scrollbar {
  width: 10px;
}
.docs-sidebar::-webkit-scrollbar-thumb,
body::-webkit-scrollbar-thumb {
  background: var(--docs-scrollbar-thumb);
  border-radius: 999px;
}
body.docs-jsdoc .nav-trigger,
body.docs-jsdoc .navicon-button,
body.docs-jsdoc .overlay {
  display: none;
}
body.docs-jsdoc {
  display: grid;
  grid-template-columns: 312px minmax(0, 1fr);
  min-height: 100vh;
}
body.docs-jsdoc nav.docs-sidebar {
  display: block;
  float: none;
  width: auto;
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  overflow-y: auto;
}
body.docs-jsdoc #main.docs-main {
  margin: 0;
  float: none;
  width: auto;
}
body.docs-jsdoc footer {
  grid-column: 2;
  padding: 0 32px 24px;
}
body.docs-jsdoc .clear {
  display: none;
}
body.docs-jsdoc h1.page-title {
  margin: 0 0 18px;
  font-size: clamp(1.7rem, 2vw, 2.3rem);
  letter-spacing: -0.01em;
}
body.docs-jsdoc .package,
body.docs-jsdoc .subsection-title,
body.docs-jsdoc article > h3:first-child {
  margin-top: 0;
}
body.docs-jsdoc #main.docs-main > section {
  margin-top: 20px;
  border: 1px solid var(--docs-border);
  border-radius: 10px;
  padding: 20px 22px 24px;
  background: var(--docs-panel);
  box-shadow: var(--docs-shadow-soft);
}
body.docs-jsdoc #main.docs-main > section:first-of-type {
  margin-top: 0;
}
body.docs-jsdoc #main.docs-main header {
  margin-bottom: 10px;
}
body.docs-jsdoc #main.docs-main article {
  padding: 0;
  background: transparent;
}
body.docs-jsdoc nav h2,
body.docs-jsdoc nav h3 {
  color: var(--docs-sidebar-muted);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 18px 10px 8px;
}
body.docs-jsdoc nav h2:first-of-type {
  margin-top: 0;
}
body.docs-jsdoc nav > ul,
body.docs-jsdoc nav ul {
  list-style: none;
  padding-left: 0;
  margin: 0;
}
body.docs-jsdoc nav li {
  margin: 0;
}
body.docs-jsdoc nav li > a {
  display: block;
  padding: 7px 10px;
  margin: 2px 0;
  border-radius: 10px;
  color: var(--docs-sidebar-text);
  overflow-wrap: anywhere;
}
body.docs-jsdoc nav li > a:hover {
  background: rgba(148, 163, 184, 0.16);
  text-decoration: none;
}
body.docs-jsdoc nav ul.methods {
  margin: 4px 0 8px 12px;
  padding-left: 12px;
  border-left: 1px solid var(--docs-sidebar-border);
}
body.docs-jsdoc nav ul.methods a {
  color: var(--docs-sidebar-muted);
  font-size: 0.88rem;
}
body.docs-jsdoc nav a.active {
  background: rgba(100, 116, 139, 0.18);
  color: var(--docs-sidebar-active);
}
body.docs-jsdoc nav .docs-sidebar-brand {
  margin: 0 0 18px;
}
body.docs-jsdoc nav .docs-sidebar-aux a {
  display: block;
  padding: 8px 10px;
  border-radius: 10px;
}
body.docs-jsdoc nav .docs-sidebar-aux a:hover {
  background: rgba(148, 163, 184, 0.16);
  text-decoration: none;
}
body.docs-jsdoc nav.docs-sidebar-frontend .docs-sidebar-link {
  padding: 8px 10px;
  margin: 0;
  border-radius: 8px;
  color: var(--docs-sidebar-text);
  transition: background-color 180ms ease, color 180ms ease, transform 180ms ease;
}
body.docs-jsdoc nav.docs-sidebar-frontend .docs-sidebar-link:hover {
  background: rgba(148, 163, 184, 0.14);
  transform: translateX(2px);
  text-decoration: none;
}
body.docs-jsdoc nav.docs-sidebar-frontend .docs-sidebar-link.active,
body.docs-jsdoc nav.docs-sidebar-frontend .docs-sidebar-link[aria-current="page"] {
  background: rgba(100, 116, 139, 0.18);
  color: var(--docs-sidebar-active);
  box-shadow: inset 3px 0 0 rgba(203, 213, 225, 0.9);
}
body.docs-jsdoc h4.name {
  color: var(--docs-text);
  background: var(--docs-panel-soft);
  border: 1px solid var(--docs-border);
  border-left: 3px solid var(--docs-border-strong);
  box-shadow: none;
  margin: 18px 0 12px;
  padding: 14px 16px;
  border-radius: 8px;
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.96rem;
  line-height: 1.55;
  font-weight: 600;
  overflow-wrap: anywhere;
}
body.docs-jsdoc h4.name a {
  color: var(--docs-link);
}
body.docs-jsdoc h4.name a:hover {
  border-bottom-color: var(--docs-link);
}
body.docs-jsdoc h4.name .signature,
body.docs-jsdoc h4.name .type-signature {
  color: #334155;
  font-weight: 500;
}
body.docs-jsdoc .signature-attributes {
  color: var(--docs-text-soft);
}
body.docs-jsdoc .container-overview,
body.docs-jsdoc .description,
body.docs-jsdoc .details {
  margin-bottom: 12px;
}
body.docs-jsdoc .container-overview {
  border-top: 1px solid var(--docs-border);
  padding-top: 18px;
  margin-top: 18px;
}
body.docs-jsdoc .container-overview:first-child {
  border-top: 0;
  padding-top: 0;
  margin-top: 0;
}
body.docs-jsdoc .description,
body.docs-jsdoc .class-description,
body.docs-jsdoc .usertext {
  color: var(--docs-text);
  line-height: 1.65;
}
body.docs-jsdoc .description p,
body.docs-jsdoc .class-description p,
body.docs-jsdoc .usertext p {
  margin: 0 0 12px;
}
body.docs-jsdoc h2,
body.docs-jsdoc h3,
body.docs-jsdoc h5,
body.docs-jsdoc .subsection-title {
  color: var(--docs-text);
  letter-spacing: 0;
}
body.docs-jsdoc h5,
body.docs-jsdoc .subsection-title {
  margin: 18px 0 10px;
  font-size: 1rem;
  font-weight: 700;
}
body.docs-jsdoc .params,
body.docs-jsdoc .props {
  margin: 10px 0 18px;
  border: 0;
  box-shadow: none;
}
body.docs-jsdoc .params th,
body.docs-jsdoc .props th {
  background: #f1f3f5;
  color: var(--docs-text);
  font-weight: 700;
}
body.docs-jsdoc .params td,
body.docs-jsdoc .props td {
  background: rgba(255, 255, 255, 0.72);
}
body.docs-jsdoc .params .name,
body.docs-jsdoc .props .name,
body.docs-jsdoc .name,
body.docs-jsdoc .signature {
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
body.docs-jsdoc .type-signature,
body.docs-jsdoc .param-type,
body.docs-jsdoc .return-type {
  color: #334155;
}
body.docs-jsdoc dl.details {
  margin: 12px 0 18px;
  display: grid;
  grid-template-columns: minmax(120px, max-content) minmax(0, 1fr);
  gap: 8px 14px;
}
body.docs-jsdoc dl.details dt,
body.docs-jsdoc dl.details dd {
  margin: 0;
  float: none;
  width: auto;
  padding: 0;
}
body.docs-jsdoc dl.details dt {
  color: var(--docs-text-soft);
  font-weight: 700;
}
body.docs-jsdoc dl.details dd ul {
  margin: 0;
  padding-left: 18px;
}
body.docs-jsdoc .prettyprint.source,
body.docs-jsdoc .prettyprint.source code,
body.docs-jsdoc .prettyprint code {
  background: #f3f5f7 !important;
  color: var(--docs-text);
}
body.docs-jsdoc .prettyprint.linenums {
  padding-left: 0;
}
body.docs-jsdoc .prettyprint.linenums ol {
  margin: 0;
  padding-left: 44px;
}
body.docs-jsdoc .prettyprint.linenums li {
  border-left: 1px solid var(--docs-border);
  padding-left: 10px;
}
body.docs-jsdoc .pln,
body.docs-jsdoc .pun,
body.docs-jsdoc .opn,
body.docs-jsdoc .clo {
  color: var(--docs-text);
}
body.docs-jsdoc .str,
body.docs-jsdoc .atv {
  color: #047857;
}
body.docs-jsdoc .kwd,
body.docs-jsdoc .tag {
  color: #2f5f8f;
}
body.docs-jsdoc .com {
  color: var(--docs-text-soft);
}
body.docs-jsdoc .typ,
body.docs-jsdoc .atn {
  color: #0e7490;
}
body.docs-jsdoc .lit {
  color: #9333ea;
}
@media (max-width: 980px) {
  .docs-shell {
    grid-template-columns: 1fr;
  }
  body.docs-jsdoc {
    grid-template-columns: 1fr;
  }
  .docs-sidebar {
    position: relative;
    height: auto;
    max-height: none;
  }
  body.docs-jsdoc footer {
    grid-column: 1;
    padding: 0 18px 18px;
  }
  .docs-main {
    padding: 18px;
  }
  .section,
  .hero {
    padding: 20px;
  }
  body.docs-jsdoc #main.docs-main > section {
    padding: 18px;
  }
  body.docs-jsdoc dl.details {
    grid-template-columns: 1fr;
  }
  body.docs-jsdoc .prettyprint.linenums ol {
    padding-left: 30px;
  }
  .stat-strip {
    grid-template-columns: 1fr;
  }
}
"""

SHARED_JS = """
document.addEventListener("DOMContentLoaded", () => {
  const current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("#")) return;
    const target = href.split("/").pop();
    if (target === current) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
});
"""


def run_frontend_jsdoc() -> None:
    """Generate frontend documentation through the existing JSDoc setup."""
    command = "npm.cmd" if platform.system() == "Windows" else "npm"
    
    subprocess.run(
        [command, "run", "docs", "--", "--destination", str(FRONTEND_DOCS_DIR)],
        cwd=FRONTEND_DIR,
        check=True,
    )


def write_shared_assets() -> None:
    """Write the shared stylesheet and script used by all generated pages."""
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    (ASSETS_DIR / SHARED_CSS_NAME).write_text(BASE_CSS, encoding="utf-8")
    (ASSETS_DIR / SHARED_JS_NAME).write_text(SHARED_JS, encoding="utf-8")


def assets_href(depth: int, filename: str) -> str:
    """Return the relative href to a shared generated asset."""
    prefix = "../" * depth
    return f"{prefix}_assets/{filename}"


def remove_tree(path: Path) -> None:
    """Delete one directory tree if it exists."""
    if not path.exists():
        return
    for child in sorted(path.rglob("*"), reverse=True):
        if child.is_file() or child.is_symlink():
            child.unlink()
        elif child.is_dir():
            child.rmdir()
    path.rmdir()


def clean_generated_outputs() -> None:
    """Remove stale generated docs so each run starts from a clean state."""
    for directory in (PYTHON_DOCS_DIR, FRONTEND_DOCS_DIR, ASSETS_DIR):
        remove_tree(directory)
    for output_file in (DOCS_DIR / "index.html", DOCS_DIR / "style.html"):
        if output_file.exists():
            output_file.unlink()


def clean_python_docs_dir() -> None:
    """Remove stale generated Python documentation before rebuilding."""
    if PYTHON_DOCS_DIR.exists():
        for path in sorted(PYTHON_DOCS_DIR.rglob("*"), reverse=True):
            if path.is_file():
                path.unlink()
            elif path.is_dir():
                path.rmdir()
    PYTHON_DOCS_DIR.mkdir(parents=True, exist_ok=True)


def html_docstring(text: str) -> str:
    """Render a docstring into lightweight HTML paragraphs and code blocks."""
    cleaned = ast.get_docstring(ast.parse(f'"""{text}"""')) if False else text.strip()
    if not cleaned:
        return '<p class="muted">No description available.</p>'

    blocks: list[str] = []
    current: list[str] = []
    in_code = False
    for line in cleaned.splitlines():
        if line.startswith("    ") or line.startswith("\t"):
            if current:
                blocks.append("<p>" + html.escape(" ".join(part.strip() for part in current)) + "</p>")
                current = []
            in_code = True
            blocks.append(f"<pre>{html.escape(line.strip())}</pre>")
            continue
        if not line.strip():
            if current:
                blocks.append("<p>" + html.escape(" ".join(part.strip() for part in current)) + "</p>")
                current = []
            in_code = False
            continue
        if in_code:
            blocks.append(f"<pre>{html.escape(line)}</pre>")
        else:
            current.append(line)
    if current:
        blocks.append("<p>" + html.escape(" ".join(part.strip() for part in current)) + "</p>")
    return "".join(blocks)


def slugify(path: Path) -> str:
    """Convert a file path into a stable HTML filename."""
    return path.with_suffix("").as_posix().replace("/", "_") + ".html"


def function_signature(node: ast.FunctionDef | ast.AsyncFunctionDef) -> str:
    """Return a human-readable function signature from an AST node."""
    try:
        return f"{node.name}({ast.unparse(node.args)})"
    except Exception:
        return f"{node.name}(...)"


def class_signature(node: ast.ClassDef) -> str:
    """Return a compact class signature from an AST node."""
    if not node.bases:
        return node.name
    try:
        bases = ", ".join(ast.unparse(base) for base in node.bases)
    except Exception:
        bases = "..."
    return f"{node.name}({bases})"


def extract_item(node: ast.AST) -> DocItem | None:
    """Extract one documented class or function from an AST node."""
    docstring = ast.get_docstring(node)
    if not docstring:
        return None

    if isinstance(node, ast.ClassDef):
        children = [
            child_item
            for child in node.body
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef))
            for child_item in [extract_item(child)]
            if child_item is not None and not child.name.startswith("_")
        ]
        return DocItem(
            name=node.name,
            kind="class",
            signature=class_signature(node),
            lineno=node.lineno,
            docstring=docstring,
            children=children,
        )

    if isinstance(node, ast.AsyncFunctionDef):
        return DocItem(
            name=node.name,
            kind="async function",
            signature="async " + function_signature(node),
            lineno=node.lineno,
            docstring=docstring,
            children=[],
        )

    if isinstance(node, ast.FunctionDef):
        return DocItem(
            name=node.name,
            kind="function",
            signature=function_signature(node),
            lineno=node.lineno,
            docstring=docstring,
            children=[],
        )

    return None


def parse_module(path: Path) -> ModuleDoc:
    """Parse one Python module and collect its documented public API."""
    tree = ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))
    module_doc = ast.get_docstring(tree) or ""
    items: list[DocItem] = []

    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            if node.name.startswith("_") and not isinstance(node, ast.ClassDef):
                continue
            item = extract_item(node)
            if item is not None:
                items.append(item)

    relative = path.relative_to(PROJECT_ROOT)
    return ModuleDoc(
        title=relative.with_suffix("").as_posix().replace("/", "."),
        source_path=relative,
        output_name=slugify(relative),
        docstring=module_doc,
        items=items,
    )


def first_sentence(text: str) -> str:
    """Return a compact one-line summary extracted from a longer docstring."""
    compact = " ".join(line.strip() for line in text.strip().splitlines() if line.strip())
    if not compact:
        return ""
    for marker in (". ", ": ", " - "):
        if marker in compact:
            return compact.split(marker, 1)[0] + ("" if marker != ". " else ".")
    return compact


def item_anchor(path: tuple[str, ...]) -> str:
    """Build a stable HTML anchor id for an API symbol path."""
    value = "-".join(part.strip().lower() for part in path if part.strip())
    slug = "".join(ch if ch.isalnum() or ch == "-" else "-" for ch in value)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return f"api-{slug.strip('-') or 'symbol'}"


def summarize_items(items: list[DocItem], trail: tuple[str, ...] = ()) -> list[tuple[tuple[str, ...], DocItem]]:
    """Flatten documented items into one ordered list with their symbol path."""
    rows: list[tuple[tuple[str, ...], DocItem]] = []
    for item in items:
        current = (*trail, item.name)
        rows.append((current, item))
        rows.extend(summarize_items(item.children, current))
    return rows


def collect_frontend_module_groups() -> dict[str, list[tuple[str, str]]]:
    """Collect frontend module pages grouped by top-level namespace."""
    groups: dict[str, list[tuple[str, str]]] = {}
    for path in sorted(FRONTEND_DOCS_DIR.glob("module-*.html"), key=lambda item: item.name.lower()):
        href = path.name
        label = href.removeprefix("module-").removesuffix(".html").replace("_", "/")
        head = label.split("/", 1)[0]
        if head == "api":
            group = "API"
        elif head == "i18n":
            group = "i18n"
        else:
            group = head.capitalize()
        groups.setdefault(group, []).append((href, label))
    for links in groups.values():
        links.sort(key=lambda item: item[1].lower())
    return groups


def add_sidebar_link_to_tree(tree: dict[str, object], label: str, href: str) -> None:
    """Add one slash-separated documentation link to a generic sidebar tree."""
    parts = [part for part in label.split("/") if part]
    if not parts:
        return

    node = tree
    for directory in parts[:-1]:
        directories = node["dirs"]  # type: ignore[index]
        if directory not in directories:  # type: ignore[operator]
            directories[directory] = {"dirs": {}, "links": []}  # type: ignore[index]
        node = directories[directory]  # type: ignore[index]
    node["links"].append((parts[-1], href))  # type: ignore[index]


def sidebar_link_tree_contains_active(node: dict[str, object], current_page: str) -> bool:
    """Return True when a generic sidebar tree contains the active page."""
    links = node["links"]  # type: ignore[index]
    if any(href == current_page for _, href in links):  # type: ignore[arg-type]
        return True
    directories = node["dirs"]  # type: ignore[index]
    return any(
        sidebar_link_tree_contains_active(child, current_page)
        for child in directories.values()  # type: ignore[union-attr]
    )


def render_sidebar_link_tree(node: dict[str, object], current_page: str) -> str:
    """Render a generic collapsible tree made from slash-separated docs links."""
    parts: list[str] = ['<ul class="docs-sidebar-list docs-sidebar-tree">']
    directories = node["dirs"]  # type: ignore[index]
    links = node["links"]  # type: ignore[index]

    for directory in sorted(directories):  # type: ignore[arg-type]
        child = directories[directory]  # type: ignore[index]
        open_attr = " open" if sidebar_link_tree_contains_active(child, current_page) else ""
        parts.append(
            f'<li class="docs-sidebar-tree-branch"><details class="docs-sidebar-tree-details"{open_attr}>'
            f'<summary class="docs-sidebar-tree-summary">{html.escape(directory)}</summary>'
        )
        parts.append(render_sidebar_link_tree(child, current_page))
        parts.append("</details></li>")

    for label, href in sorted(links, key=lambda item: item[0].lower()):  # type: ignore[arg-type]
        active = ' aria-current="page" class="docs-sidebar-link active"' if href == current_page else ' class="docs-sidebar-link"'
        parts.append(
            f'<li class="docs-sidebar-tree-file"><a{active} href="{html.escape(href)}">{html.escape(label)}</a></li>'
        )

    parts.append("</ul>")
    return "".join(parts)


def render_frontend_sidebar(
    *,
    current_page: str,
    module_groups: dict[str, list[tuple[str, str]]],
    has_global_page: bool,
) -> str:
    """Render a frontend sidebar aligned with the Python documentation mechanics."""
    section_links = [
        ("index.html", "Frontend Overview"),
        ("../python/index.html", "Python Overview"),
        ("../style.html", "Style Guide"),
        ("../index.html", "Documentation Portal"),
    ]

    sections = [
        """
        <a class="docs-sidebar-brand" href="../index.html">
          <span class="docs-sidebar-kicker">MediScan</span>
          <span class="docs-sidebar-title">Documentation</span>
          <span class="docs-sidebar-subtitle">Unified reference tree</span>
        </a>
        """,
        '<div class="docs-sidebar-group"><span class="docs-sidebar-group-title">Sections</span><ul class="docs-sidebar-list">',
    ]

    for href, label in section_links:
        is_active = href == current_page
        class_name = "docs-sidebar-link active" if is_active else "docs-sidebar-link"
        current_attr = ' aria-current="page"' if is_active else ""
        sections.append(
            f'<li><a class="{class_name}"{current_attr} href="{html.escape(href)}">{html.escape(label)}</a></li>'
        )
    sections.append("</ul></div>")

    tree: dict[str, object] = {"dirs": {}, "links": []}
    for links in module_groups.values():
        for href, label in links:
            add_sidebar_link_to_tree(tree, label, href)
    if has_global_page:
        add_sidebar_link_to_tree(tree, "globals/Global Symbols", "global.html")

    tree_html = render_sidebar_link_tree(tree, current_page)
    open_attr = " open" if current_page == "index.html" or sidebar_link_tree_contains_active(tree, current_page) else ""
    sections.append(
        f"""
        <div class="docs-sidebar-group"><span class="docs-sidebar-group-title">Frontend Tree</span>
          <ul class="docs-sidebar-list docs-sidebar-tree">
            <li class="docs-sidebar-tree-branch">
              <details class="docs-sidebar-tree-details docs-sidebar-tree-root"{open_attr}>
                <summary class="docs-sidebar-tree-summary">frontend/src</summary>
                {tree_html}
              </details>
            </li>
          </ul>
        </div>
        """
    )

    return "".join(sections)


def transform_frontend_jsdoc_page(text: str, page_name: str) -> str:
    """Normalize frontend JSDoc page structure to match Python page visual mechanics."""
    title_match = re.search(r'<h1 class="page-title">\s*(.*?)\s*</h1>', text, flags=re.S)
    if title_match:
        title_plain = re.sub(r"<[^>]+>", "", title_match.group(1)).strip() or page_name.removesuffix(".html")
        title_html = html.escape(title_plain)
        hero = (
            '<section class="hero docs-jsdoc-hero">'
            f"<h1>{title_html}</h1>"
            "<p>Generated from frontend JSDoc with the shared MediScan layout.</p>"
            f'<div class="docs-breadcrumbs"><a href="../index.html">Portal</a> / <a href="index.html">Frontend</a> / {title_html}</div>'
            "</section>"
        )
        text = text.replace(title_match.group(0), hero, 1)

    text = re.sub(r"<section(?![^>]*class=)>", '<section class="section docs-jsdoc-section">', text)
    return text


def write_frontend_overview(
    *,
    module_groups: dict[str, list[tuple[str, str]]],
    has_global_page: bool,
) -> None:
    """Write a dedicated frontend overview page with compact reference tables."""
    preferred_order = [
        "Core",
        "Components",
        "Context",
        "Hooks",
        "Utils",
        "Data",
        "i18n",
        "API",
    ]
    order_map = {name: idx for idx, name in enumerate(preferred_order)}
    sorted_groups = sorted(module_groups.items(), key=lambda item: (order_map.get(item[0], 999), item[0].lower()))
    module_count = sum(len(entries) for entries in module_groups.values())

    group_sections: list[str] = []
    for group_name, entries in sorted_groups:
        rows = []
        for href, label in entries:
            source_hint = f"frontend/src/{label}"
            rows.append(
                f"""
                <tr>
                  <td><a href="{html.escape(href)}">{html.escape(label)}</a></td>
                  <td class="source-column">{html.escape(source_hint)}</td>
                  <td>Generated module reference from frontend source documentation.</td>
                </tr>
                """
            )
        group_sections.append(
            f"""
            <section class="section">
              <h2>{html.escape(group_name)}</h2>
              <div class="summary-table-wrap">
                <table class="summary-table index-table">
                  <thead>
                    <tr>
                      <th>Module</th>
                      <th>Source</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {''.join(rows)}
                  </tbody>
                </table>
              </div>
            </section>
            """
        )

    global_section = ""
    if has_global_page:
        global_section = """
        <section class="section">
          <h2>Globals</h2>
          <div class="summary-table-wrap">
            <table class="summary-table index-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Source</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><a href="global.html">Global Symbols</a></td>
                  <td class="source-column">JSDoc globals</td>
                  <td>Reference page for non-module global symbols extracted by JSDoc.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        """

    body = f"""
    <section class="hero">
      <h1>MediScan Frontend Documentation</h1>
      <p>Reference tables for documented React modules, grouped by source area and backed by the sidebar tree.</p>
      <div class="docs-breadcrumbs"><a href="../index.html">Portal</a> / Frontend</div>
    </section>
    <section class="stat-strip">
      <article class="stat-card">
        <span class="meta">Documented frontend files</span>
        <strong>{module_count}</strong>
        <p class="meta">Each row opens a dedicated module page.</p>
      </article>
      <article class="stat-card">
        <span class="meta">Generation toolchain</span>
        <strong>JSDoc + Shared Shell</strong>
        <p class="meta">Structure aligned with the Python documentation portal.</p>
      </article>
    </section>
    {''.join(group_sections)}
    {global_section}
    <p class="footer"><a href="../index.html">Back to the documentation portal</a></p>
    """

    page = render_docs_shell(
        title="Frontend Documentation | MediScan",
        sidebar_html=render_frontend_sidebar(
            current_page="index.html",
            module_groups=module_groups,
            has_global_page=has_global_page,
        ),
        body_html=body,
        depth=1,
        body_class="docs-frontend",
    )
    (FRONTEND_DOCS_DIR / "index.html").write_text(page, encoding="utf-8")


def python_section_name(section_root: Path) -> str:
    """Return a stable section label based on the real repository path."""
    return section_root.relative_to(PROJECT_ROOT).as_posix()


def build_python_sidebar_tree(section_name: str, modules: list[ModuleDoc]) -> dict[str, object]:
    """Build a filesystem-like tree for one Python section."""
    root: dict[str, object] = {"dirs": {}, "modules": []}
    section_root = Path(section_name)

    for module in modules:
        relative_source = module.source_path.relative_to(section_root)
        node = root
        for directory in relative_source.parts[:-1]:
            directories = node["dirs"]  # type: ignore[index]
            if directory not in directories:  # type: ignore[operator]
                directories[directory] = {"dirs": {}, "modules": []}  # type: ignore[index]
            node = directories[directory]  # type: ignore[index]
        node["modules"].append(module)  # type: ignore[index]

    return root


def python_tree_contains_active(node: dict[str, object], current_output: str | None) -> bool:
    """Return True when a tree node contains the currently opened module."""
    modules = node["modules"]  # type: ignore[index]
    if any(module.output_name == current_output for module in modules):  # type: ignore[arg-type]
        return True
    directories = node["dirs"]  # type: ignore[index]
    return any(
        python_tree_contains_active(child, current_output)
        for child in directories.values()  # type: ignore[union-attr]
    )


def render_python_sidebar_tree(node: dict[str, object], current_output: str | None) -> str:
    """Render one collapsible filesystem-like tree for the Python sidebar."""
    parts: list[str] = ['<ul class="docs-sidebar-list docs-sidebar-tree">']
    directories = node["dirs"]  # type: ignore[index]
    modules = node["modules"]  # type: ignore[index]

    for directory in sorted(directories):  # type: ignore[arg-type]
        child = directories[directory]  # type: ignore[index]
        open_attr = " open" if python_tree_contains_active(child, current_output) else ""
        parts.append(
            f'<li class="docs-sidebar-tree-branch"><details class="docs-sidebar-tree-details"{open_attr}>'
            f'<summary class="docs-sidebar-tree-summary">{html.escape(directory)}</summary>'
        )
        parts.append(render_python_sidebar_tree(child, current_output))
        parts.append("</details></li>")

    for module in sorted(modules, key=lambda item: item.source_path.name.lower()):  # type: ignore[arg-type]
        active = ' aria-current="page" class="docs-sidebar-link active"' if module.output_name == current_output else ' class="docs-sidebar-link"'
        parts.append(
            f'<li class="docs-sidebar-tree-file"><a{active} href="{html.escape(module.output_name)}">{html.escape(module.source_path.name)}</a></li>'
        )

    parts.append("</ul>")
    return "".join(parts)


def render_python_sidebar(section_map: dict[str, list[ModuleDoc]], current_output: str | None = None) -> str:
    """Render the shared sidebar tree for Python documentation pages."""
    groups: list[str] = [
        """
        <a class="docs-sidebar-brand" href="../index.html">
          <span class="docs-sidebar-kicker">MediScan</span>
          <span class="docs-sidebar-title">Documentation</span>
          <span class="docs-sidebar-subtitle">Unified reference tree</span>
        </a>
        """,
        '<div class="docs-sidebar-group"><span class="docs-sidebar-group-title">Sections</span><ul class="docs-sidebar-list">'
        '<li><a class="docs-sidebar-link" href="index.html">Python Overview</a></li>'
        '<li><a class="docs-sidebar-link" href="../frontend/index.html">Frontend JSDoc</a></li>'
        '<li><a class="docs-sidebar-link" href="../style.html">Style Guide</a></li>'
        "</ul></div>",
    ]

    groups.append('<div class="docs-sidebar-group"><span class="docs-sidebar-group-title">Python Tree</span>')

    for section_name, modules in section_map.items():
        tree = build_python_sidebar_tree(section_name, modules)
        tree_html = render_python_sidebar_tree(tree, current_output)
        open_attr = " open" if current_output is None or python_tree_contains_active(tree, current_output) else ""
        groups.append(
            f"""
              <ul class="docs-sidebar-list docs-sidebar-tree">
                <li class="docs-sidebar-tree-branch">
                  <details class="docs-sidebar-tree-details docs-sidebar-tree-root"{open_attr}>
                    <summary class="docs-sidebar-tree-summary">{html.escape(section_name)}</summary>
                    {tree_html}
                  </details>
                </li>
              </ul>
            """
        )

    groups.append("</div>")
    return "".join(groups)


def render_docs_shell(
    *,
    title: str,
    sidebar_html: str,
    body_html: str,
    depth: int,
    body_class: str = "docs-python",
) -> str:
    """Render one documentation page with the shared sidebar shell."""
    css_href = assets_href(depth, SHARED_CSS_NAME)
    js_href = assets_href(depth, SHARED_JS_NAME)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{html.escape(title)}</title>
  <link rel="stylesheet" href="{html.escape(css_href)}" />
</head>
<body class="docs-body {html.escape(body_class)}">
  <div class="docs-shell">
    <aside class="docs-sidebar">
      {sidebar_html}
    </aside>
    <main class="docs-main">
      <div class="docs-main-inner">
        {body_html}
      </div>
    </main>
  </div>
  <script src="{html.escape(js_href)}" defer></script>
</body>
</html>
"""


def render_item(item: DocItem, heading_level: int = 3, trail: tuple[str, ...] = ()) -> str:
    """Render one documented symbol and its children."""
    current = (*trail, item.name)
    anchor = item_anchor(current)
    full_name = ".".join(current)
    heading = f"h{heading_level}"
    body = [
        f'<div class="item" id="{html.escape(anchor)}">',
        f'<{heading}><span class="pill">{html.escape(item.kind)}</span>{html.escape(full_name)}</{heading}>',
        f'<div class="code">{html.escape(item.signature)}</div>',
        f'<div class="meta">Line {item.lineno}</div>',
        f'<div class="doc">{html_docstring(item.docstring)}</div>',
    ]
    for child in item.children:
        body.append(render_item(child, min(heading_level + 1, 6), current))
    body.append("</div>")
    return "".join(body)


def render_python_module(module: ModuleDoc, section_map: dict[str, list[ModuleDoc]]) -> str:
    """Render one Python module page."""
    summary_rows: list[str] = []
    for path, item in summarize_items(module.items):
        label = ".".join(path)
        summary = first_sentence(item.docstring) or "No summary available."
        summary_rows.append(
            f"""
            <tr>
              <td><a href="#{html.escape(item_anchor(path))}">{html.escape(label)}</a></td>
              <td><span class="summary-kind">{html.escape(item.kind)}</span></td>
              <td>{item.lineno}</td>
              <td>{html.escape(summary)}</td>
            </tr>
            """
        )

    summary_html = (
        """
        <div class="summary-table-wrap">
          <table class="summary-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Type</th>
                <th>Line</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {rows}
            </tbody>
          </table>
        </div>
        """.replace("{rows}", "".join(summary_rows))
        if summary_rows
        else '<p class="muted">No documented public symbols found.</p>'
    )
    items_html = "".join(render_item(item) for item in module.items) or '<p class="muted">No documented public symbols found.</p>'
    body = f"""
    <section class="hero">
      <h1>{html.escape(module.title)}</h1>
      <p>Generated from <code>{html.escape(module.source_path.as_posix())}</code></p>
      <div class="docs-breadcrumbs"><a href="../index.html">Portal</a> / <a href="index.html">Python</a> / {html.escape(module.title)}</div>
    </section>
    <section class="section">
      <h2>Module Summary</h2>
      <div class="doc">{html_docstring(module.docstring)}</div>
    </section>
    <section class="section">
      <h2>API Summary</h2>
      {summary_html}
    </section>
    <section class="section">
      <h2>API Details</h2>
      {items_html}
    </section>
    <p class="footer"><a href="../index.html">Back to the documentation portal</a></p>
    """
    return render_docs_shell(
        title=f"{module.title} | MediScan Docs",
        sidebar_html=render_python_sidebar(section_map, module.output_name),
        body_html=body,
        depth=1,
    )


def build_python_docs() -> dict[str, list[ModuleDoc]]:
    """Generate per-module Python documentation and return the section map."""
    clean_python_docs_dir()
    section_map: dict[str, list[ModuleDoc]] = {}

    for section_root in PYTHON_SECTION_ROOTS:
        section_name = python_section_name(section_root)
        modules: list[ModuleDoc] = []
        for path in sorted(section_root.rglob("*.py")):
            if "__pycache__" in path.parts:
                continue
            modules.append(parse_module(path))
        section_map[section_name] = modules

    product_script_modules = [
        parse_module(path)
        for path in PRODUCT_SCRIPT_FILES
        if path.exists()
    ]
    section_map["scripts"] = product_script_modules

    for modules in section_map.values():
        for module in modules:
            (PYTHON_DOCS_DIR / module.output_name).write_text(
                render_python_module(module, section_map),
                encoding="utf-8",
            )

    write_python_index(section_map)
    return section_map


def write_python_index(section_map: dict[str, list[ModuleDoc]]) -> None:
    """Write the Python documentation landing page."""
    sections_html: list[str] = []
    for section_name, modules in section_map.items():
        rows = []
        for module in modules:
            summary = first_sentence(module.docstring) or "No module description available."
            rows.append(
                f"""
                <tr>
                  <td><a href="{html.escape(module.output_name)}">{html.escape(module.title)}</a></td>
                  <td class="source-column">{html.escape(module.source_path.as_posix())}</td>
                  <td>{html.escape(summary)}</td>
                </tr>
                """
            )
        sections_html.append(
            f"""
            <section class="section">
              <h2>{html.escape(section_name)}</h2>
              <div class="summary-table-wrap">
                <table class="summary-table index-table">
                  <thead>
                    <tr>
                      <th>Module</th>
                      <th>Source</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {''.join(rows)}
                  </tbody>
                </table>
              </div>
            </section>
            """
        )

    body = f"""
    <section class="hero">
      <h1>MediScan Python Documentation</h1>
      <p>Reference tables generated from docstrings in <code>src</code>, <code>backend</code>, and <code>scripts</code>, with a stable sidebar tree for navigation.</p>
      <div class="docs-breadcrumbs"><a href="../index.html">Portal</a> / Python</div>
    </section>
    {''.join(sections_html)}
    <p class="footer"><a href="../index.html">Back to the documentation portal</a></p>
    """
    page = render_docs_shell(
        title="Python Documentation | MediScan",
        sidebar_html=render_python_sidebar(section_map),
        body_html=body,
        depth=1,
    )
    (PYTHON_DOCS_DIR / "index.html").write_text(page, encoding="utf-8")


def write_style_guide() -> None:
    """Write a short documentation style guide for future consistency."""
    body = """
    <section class="hero">
      <h1>Documentation Style</h1>
      <p>Single-source conventions with a Javadoc-inspired reading flow: overview, summary, details.</p>
      <div class="docs-breadcrumbs"><a href="index.html">Portal</a> / Style</div>
    </section>
    <section class="section">
      <h2>Structure (Javadoc-like)</h2>
      <ol class="docs-list">
        <li>Start with an overview section that explains the role of the module/page.</li>
        <li>Expose a short API summary table to scan members quickly.</li>
        <li>Keep full details below, grouped by symbol with stable anchors.</li>
      </ol>
    </section>
    <section class="section">
      <h2>Python Docstrings</h2>
      <ul class="checklist">
        <li>Write a strong first sentence: concise, explicit, action-oriented.</li>
        <li>Add context only when it improves implementation understanding.</li>
        <li>Use <code>Args</code>, <code>Returns</code>, and <code>Raises</code> for real behavior, not boilerplate.</li>
      </ul>
    </section>
    <section class="section">
      <h2>Frontend JSDoc</h2>
      <ul class="checklist">
        <li>Document exported functions/components first, then complex helpers.</li>
        <li>Prefer readable types over dense inline signatures.</li>
        <li>Keep descriptions practical and aligned with UI behavior.</li>
      </ul>
    </section>
    <section class="section">
      <h2>Generation Workflow</h2>
      <ol class="docs-list">
        <li>Generate frontend JSDoc output.</li>
        <li>Generate Python pages and indexes.</li>
        <li>Apply the shared shell and color system to all pages.</li>
      </ol>
      <pre class="command-block"><code>python scripts/generate_docs.py</code></pre>
    </section>
    <p class="footer"><a href="index.html">Back to the documentation portal</a></p>
    """
    sidebar = """
    <a class="docs-sidebar-brand" href="index.html">
      <span class="docs-sidebar-kicker">MediScan</span>
      <span class="docs-sidebar-title">Documentation</span>
      <span class="docs-sidebar-subtitle">Conventions and outputs</span>
    </a>
    <div class="docs-sidebar-group">
      <span class="docs-sidebar-group-title">Pages</span>
      <ul class="docs-sidebar-list">
        <li><a class="docs-sidebar-link" href="index.html">Portal</a></li>
        <li><a class="docs-sidebar-link" href="python/index.html">Python Overview</a></li>
        <li><a class="docs-sidebar-link" href="frontend/index.html">Frontend JSDoc</a></li>
        <li><a class="docs-sidebar-link active" aria-current="page" href="style.html">Style Guide</a></li>
      </ul>
    </div>
    """
    page = render_docs_shell(
        title="Documentation Style | MediScan",
        sidebar_html=sidebar,
        body_html=body,
        depth=0,
        body_class="docs-style",
    )
    (DOCS_DIR / "style.html").write_text(page, encoding="utf-8")


def write_portal_index(section_map: dict[str, list[ModuleDoc]]) -> None:
    """Write the unified project documentation portal."""
    python_modules = sum(len(modules) for modules in section_map.values())
    body = f"""
    <section class="hero">
      <h1>MediScan Documentation Portal</h1>
      <p>Unified technical reference generated from Python docstrings and frontend JSDoc comments.</p>
      <div class="docs-breadcrumbs">Portal</div>
    </section>
    <section class="stat-strip">
      <article class="stat-card">
        <span class="meta">Python modules</span>
        <strong>{python_modules}</strong>
        <p class="meta">Generated from <code>src</code>, <code>backend</code>, and <code>scripts</code>.</p>
      </article>
      <article class="stat-card">
        <span class="meta">Frontend reference</span>
        <strong>JSDoc</strong>
        <p class="meta">Generated from React modules and helper utilities.</p>
      </article>
      <article class="stat-card">
        <span class="meta">Navigation model</span>
        <strong>Summary + Details</strong>
        <p class="meta">Overview pages and symbol-level details remain consistent.</p>
      </article>
    </section>
    <section class="section">
      <h2>Reference Areas</h2>
      <div class="summary-table-wrap">
        <table class="summary-table index-table">
          <thead>
            <tr>
              <th>Area</th>
              <th>Source</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><a href="python/index.html">Python Documentation</a></td>
              <td class="source-column">src, backend, scripts</td>
              <td>Module overview pages plus API summary/detail sections for each Python file.</td>
            </tr>
            <tr>
              <td><a href="frontend/index.html">Frontend Documentation</a></td>
              <td class="source-column">frontend/src</td>
              <td>JSDoc output wrapped in the shared shell and organized as a source tree.</td>
            </tr>
            <tr>
              <td><a href="style.html">Documentation Style</a></td>
              <td class="source-column">docs/style.html</td>
              <td>Writing and structure rules to keep generated pages coherent over time.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="section">
      <h2>Generation Workflow</h2>
      <ol class="docs-list">
        <li>Build frontend JSDoc pages.</li>
        <li>Build Python pages and index pages.</li>
        <li>Apply the shared theme and navigation shell.</li>
      </ol>
      <pre class="command-block"><code>python scripts/generate_docs.py</code></pre>
    </section>
    """
    sidebar = """
    <a class="docs-sidebar-brand" href="index.html">
      <span class="docs-sidebar-kicker">MediScan</span>
      <span class="docs-sidebar-title">Documentation</span>
      <span class="docs-sidebar-subtitle">Unified reference portal</span>
    </a>
    <div class="docs-sidebar-group">
      <span class="docs-sidebar-group-title">Pages</span>
      <ul class="docs-sidebar-list">
        <li><a class="docs-sidebar-link active" aria-current="page" href="index.html">Portal</a></li>
        <li><a class="docs-sidebar-link" href="python/index.html">Python Overview</a></li>
        <li><a class="docs-sidebar-link" href="frontend/index.html">Frontend JSDoc</a></li>
        <li><a class="docs-sidebar-link" href="style.html">Style Guide</a></li>
      </ul>
    </div>
    """
    page = render_docs_shell(
        title="MediScan Documentation",
        sidebar_html=sidebar,
        body_html=body,
        depth=0,
        body_class="docs-portal",
    )
    (DOCS_DIR / "index.html").write_text(page, encoding="utf-8")


def postprocess_frontend_docs() -> None:
    """Apply the shared shell styling to every generated frontend JSDoc page."""
    css_href = assets_href(1, SHARED_CSS_NAME)
    js_href = assets_href(1, SHARED_JS_NAME)
    module_groups = collect_frontend_module_groups()
    has_global_page = (FRONTEND_DOCS_DIR / "global.html").exists()

    for path in FRONTEND_DOCS_DIR.glob("*.html"):
        text = path.read_text(encoding="utf-8")
        text = re.sub(r'\s*<link[^>]+href="styles/prettify\.css"[^>]*>\s*', "\n", text, count=1)
        text = re.sub(r'\s*<link[^>]+href="styles/jsdoc\.css"[^>]*>\s*', "\n", text, count=1)
        text = re.sub(r'\s*<script src="scripts/nav\.js" defer></script>\s*', "\n", text, count=1)
        text = re.sub(
            r'<input type="checkbox" id="nav-trigger" class="nav-trigger" />\s*'
            r'<label for="nav-trigger" class="navicon-button x">\s*<div class="navicon"></div>\s*</label>\s*'
            r'<label for="nav-trigger" class="overlay"></label>\s*',
            "",
            text,
            flags=re.S,
            count=1,
        )
        if css_href not in text:
            text = text.replace(
                "</head>",
                f'    <link rel="stylesheet" href="{css_href}">\n</head>',
                1,
            )
        text = re.sub(
            r'<body(?:\s+class="[^"]*")?>',
            '<body class="docs-body docs-jsdoc docs-frontend">',
            text,
            count=1,
        )
        text = text.replace("<nav >", '<nav class="docs-sidebar docs-sidebar-frontend">', 1)
        text = text.replace("<nav>", '<nav class="docs-sidebar docs-sidebar-frontend">', 1)

        sidebar_html = render_frontend_sidebar(
            current_page=path.name,
            module_groups=module_groups,
            has_global_page=has_global_page,
        )
        text = re.sub(
            r'<nav class="docs-sidebar docs-sidebar-frontend">.*?</nav>',
            f'<nav class="docs-sidebar docs-sidebar-frontend">{sidebar_html}</nav>',
            text,
            count=1,
            flags=re.S,
        )
        text = transform_frontend_jsdoc_page(text, path.name)
        text = text.replace('<div id="main">', '<main id="main" class="docs-main"><div class="docs-main-inner">', 1)
        text = text.replace("</div>\n\n<br class=\"clear\">", "</div></main>\n\n<br class=\"clear\">", 1)
        text = text.replace("<br class=\"clear\">", "")
        text = re.sub(
            r"<footer>.*?</footer>",
            '<p class="footer"><a href="../index.html">Back to the documentation portal</a></p>',
            text,
            flags=re.S,
            count=1,
        )
        if js_href not in text:
            text = text.replace("</body>", f'<script src="{js_href}" defer></script>\n</body>', 1)
        path.write_text(text, encoding="utf-8")

    write_frontend_overview(module_groups=module_groups, has_global_page=has_global_page)


def target_python_files() -> list[Path]:
    """Return Python files that are part of the public documentation target."""
    files: list[Path] = []
    for section_root in PYTHON_SECTION_ROOTS:
        files.extend(
            path
            for path in sorted(section_root.rglob("*.py"))
            if "__pycache__" not in path.parts
        )
    files.extend(path for path in PRODUCT_SCRIPT_FILES if path.exists())
    return sorted(set(files), key=lambda item: item.relative_to(PROJECT_ROOT).as_posix())


def target_frontend_files() -> list[Path]:
    """Return frontend files that must have generated JSDoc pages."""
    return sorted(
        path
        for path in (FRONTEND_DIR / "src").rglob("*")
        if path.suffix in {".js", ".jsx"}
    )


def iter_python_doc_comments(path: Path) -> list[tuple[int, str]]:
    """Extract Python docstrings and comments for documentation-language audits."""
    text = path.read_text(encoding="utf-8-sig")
    comments: list[tuple[int, str]] = []
    tree = ast.parse(text, filename=str(path))

    module_doc = ast.get_docstring(tree)
    if module_doc:
        comments.append((1, module_doc))
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            doc = ast.get_docstring(node)
            if doc:
                comments.append((node.lineno, doc))

    for token in tokenize.tokenize(BytesIO(text.encode("utf-8")).readline):
        if token.type == tokenize.COMMENT:
            comments.append((token.start[0], token.string))
    return comments


def iter_js_comments(path: Path) -> list[tuple[int, str]]:
    """Extract JavaScript and JSX comments for documentation-language audits."""
    text = path.read_text(encoding="utf-8")
    comments: list[tuple[int, str]] = []
    comment_re = re.compile(r"/\*\*?[\s\S]*?\*/|//[^\n]*")
    for match in comment_re.finditer(text):
        lineno = text.count("\n", 0, match.start()) + 1
        comments.append((lineno, match.group(0)))
    return comments


def js_module_name(path: Path) -> str | None:
    """Read the JSDoc module name declared by a frontend source file."""
    text = path.read_text(encoding="utf-8")
    match = re.search(r"@module\s+([^\s*]+)", text)
    if match:
        return match.group(1).strip()
    return None


def has_adjacent_jsdoc(text: str, position: int) -> bool:
    """Return True when an export is immediately preceded by a JSDoc block."""
    before = text[:position].rstrip()
    return before.endswith("*/") and "/**" in before[before.rfind("/**") :]


def audit_documentation(section_map: dict[str, list[ModuleDoc]]) -> None:
    """Fail when target code is missing generated docs or English comments."""
    errors: list[str] = []
    documented_python = {
        module.source_path.as_posix()
        for modules in section_map.values()
        for module in modules
    }

    for path in target_python_files():
        relative = path.relative_to(PROJECT_ROOT).as_posix()
        if relative not in documented_python:
            errors.append(f"Python file is not generated: {relative}")
        tree = ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))
        if not ast.get_docstring(tree):
            errors.append(f"Python module docstring missing: {relative}")
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name.startswith("_"):
                    continue
                if not ast.get_docstring(node):
                    errors.append(f"Python public symbol docstring missing: {relative}:{node.name}")
                if isinstance(node, ast.ClassDef):
                    for child in node.body:
                        if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)) and not child.name.startswith("_"):
                            if not ast.get_docstring(child):
                                errors.append(f"Python public method docstring missing: {relative}:{node.name}.{child.name}")
        for lineno, comment in iter_python_doc_comments(path):
            if FRENCH_COMMENT_PATTERN.search(comment):
                errors.append(f"French Python comment/docstring remains: {relative}:{lineno}")

    for path in target_frontend_files():
        relative = path.relative_to(PROJECT_ROOT).as_posix()
        text = path.read_text(encoding="utf-8")
        if "@fileoverview" not in text[:1200]:
            errors.append(f"Frontend fileoverview missing: {relative}")
        module_name = js_module_name(path)
        if not module_name:
            errors.append(f"Frontend @module missing: {relative}")
        else:
            module_page = FRONTEND_DOCS_DIR / f"module-{module_name.replace('/', '_')}.html"
            if not module_page.exists():
                errors.append(f"Frontend module page is not generated: {relative} -> {module_page.name}")
        export_re = re.compile(
            r"^\s*export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)?",
            re.M,
        )
        for match in export_re.finditer(text):
            name = match.group(1) or "default"
            if not has_adjacent_jsdoc(text, match.start()):
                errors.append(f"Frontend export JSDoc missing: {relative}:{name}")
        for lineno, comment in iter_js_comments(path):
            if FRENCH_COMMENT_PATTERN.search(comment):
                errors.append(f"French frontend comment/JSDoc remains: {relative}:{lineno}")

    if errors:
        preview = "\n".join(f"- {error}" for error in errors[:80])
        remaining = "" if len(errors) <= 80 else f"\n... and {len(errors) - 80} more"
        raise RuntimeError(f"Documentation audit failed with {len(errors)} issue(s):\n{preview}{remaining}")
    print("Documentation audit passed: 0 missing files, comments, or English-language issues.")


def main() -> None:
    """Generate the full documentation portal."""
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    clean_generated_outputs()
    write_shared_assets()
    run_frontend_jsdoc()
    section_map = build_python_docs()
    write_style_guide()
    write_portal_index(section_map)
    postprocess_frontend_docs()
    audit_documentation(section_map)
    print(f"Documentation generated in {DOCS_DIR}")


if __name__ == "__main__":
    main()
