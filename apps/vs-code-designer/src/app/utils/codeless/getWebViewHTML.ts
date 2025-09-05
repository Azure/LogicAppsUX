/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { WebviewPanel } from 'vscode';
import { Uri } from 'vscode';
import * as https from 'https';
import * as http from 'http';

/**
 * Gets webview content, converting links to VS Code URIs
 * @param {string} webviewFolder - React project folder name.
 * @param {WebviewPanel} panel - Webview panel.
 * @returns {Promise<string>} Webview html.
 */
export async function getWebViewHTML(webviewFolder: string, panel: WebviewPanel): Promise<string> {
  const indexPath = join(ext.context.extensionPath, webviewFolder, 'index.html');
  const html = (await fs.readFile(indexPath, 'utf-8')) as string;

  // 1. Get all link prefixed by href or src
  const matchLinks = /(href|src)="([^"]*)"/g;
  // 2. Transform the result of the regex into a vscode's URI format
  const toUri = (_, prefix: 'href' | 'src', link: string) => {
    // For
    if (link === '#') {
      return `${prefix}="${link}"`;
    }
    // For scripts & links
    const path = join(ext.context.extensionPath, webviewFolder, link);
    const uri = Uri.file(path);
    return `${prefix}="${panel.webview.asWebviewUri(uri)}"`;
  };

  return html.replace(matchLinks, toUri);
}

/**
 * Fetches HTML content from a URL and processes it for webview display
 * @param {string} url - The URL to fetch HTML content from.
 * @param {WebviewPanel} _panel - Webview panel (unused but kept for API consistency).
 * @returns {Promise<string>} Webview html.
 */
export async function getWebViewHTMLFromUrl(url: string, _panel: WebviewPanel): Promise<string> {
  try {
    const html = await fetchHtmlFromUrl(url);
    
    // Inline all external resources (CSS and JS)
    let processedHtml = await inlineResources(html, url);
    
    return processedHtml;
  } catch (error) {
    console.error('Error fetching HTML from URL:', error);
    return `<html><body><h1>Error loading content</h1><p>Failed to load content from: ${url}</p><p>${error}</p></body></html>`;
  }
}

/**
 * Inline all external CSS and JavaScript resources into the HTML
 * @param {string} html - The original HTML content
 * @param {string} baseUrl - The base URL to resolve relative paths
 * @returns {Promise<string>} HTML with inlined resources
 */
async function inlineResources(html: string, baseUrl: string): Promise<string> {
  let processedHtml = html;
  
  // Find and inline CSS files
  const cssLinkRegex = /<link[^>]+rel=["|']stylesheet["|'][^>]*href=["|']([^"']+)["|'][^>]*>/gi;
  const cssMatches = [...html.matchAll(cssLinkRegex)];
  
  for (const match of cssMatches) {
    const cssUrl = resolveUrl(match[1], baseUrl);
    try {
      const cssContent = await fetchHtmlFromUrl(cssUrl);
      const inlineStyle = `<style>\n${cssContent}\n</style>`;
      processedHtml = processedHtml.replace(match[0], inlineStyle);
    } catch (error) {
      console.warn(`Failed to fetch CSS from ${cssUrl}:`, error);
      // Keep the original link tag but try to resolve the URL
      const resolvedLink = match[0].replace(match[1], cssUrl);
      processedHtml = processedHtml.replace(match[0], resolvedLink);
    }
  }
  
  // Find and inline JavaScript files
  const jsScriptRegex = /<script[^>]+src=["|']([^"']+)["|'][^>]*><\/script>/gi;
  const jsMatches = [...html.matchAll(jsScriptRegex)];
  
  for (const match of jsMatches) {
    const jsUrl = resolveUrl(match[1], baseUrl);
    try {
      const jsContent = await fetchHtmlFromUrl(jsUrl);
      const inlineScript = `<script>\n${jsContent}\n</script>`;
      processedHtml = processedHtml.replace(match[0], inlineScript);
    } catch (error) {
      console.warn(`Failed to fetch JavaScript from ${jsUrl}:`, error);
      // Keep the original script tag but try to resolve the URL
      const resolvedScript = match[0].replace(match[1], jsUrl);
      processedHtml = processedHtml.replace(match[0], resolvedScript);
    }
  }
  
  // Handle any remaining relative URLs for other resources
  const matchLinks = /(href|src)="([^"]*)"/g;
  processedHtml = processedHtml.replace(matchLinks, (match, prefix, link) => {
    // Keep anchor links as is
    if (link === '#' || link.startsWith('#')) {
      return `${prefix}="${link}"`;
    }
    
    // Keep absolute URLs as is
    if (link.match(/^(https?:|data:|blob:|mailto:|tel:)/i)) {
      return `${prefix}="${link}"`;
    }
    
    // For relative URLs, resolve them against the base URL
    try {
      const resolvedUrl = resolveUrl(link, baseUrl);
      return `${prefix}="${resolvedUrl}"`;
    } catch {
      return match;
    }
  });
  
  return processedHtml;
}

/**
 * Helper function to resolve relative URLs
 * @param {string} url - The URL to resolve
 * @param {string} baseUrl - The base URL
 * @returns {string} The resolved URL
 */
function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

/**
 * Helper function to fetch HTML content from a URL
 * @param {string} url - The URL to fetch content from
 * @returns {Promise<string>} The HTML content
 */
function fetchHtmlFromUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // Set a timeout for the request
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}
