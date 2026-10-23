/**
 * GitHub Service
 *
 * Thin wrapper around the GitHub REST API v3.
 * All calls are made server-side using the GITHUB_TOKEN environment variable.
 * The token is NEVER forwarded to the frontend.
 *
 * Supported operations (matching project requirements):
 *  1. getRepoInfo      – repository metadata
 *  2. listContents     – list files/folders at a path
 *  3. getFileContent   – fetch decoded file content + SHA
 *  4. createFile       – create a new file (base64-encodes content)
 *  5. updateFile       – update an existing file (requires SHA)
 *
 * GitHub API docs: https://docs.github.com/en/rest/repos/contents
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';

// ── GitHub API base ───────────────────────────────────────────────────────────

const GITHUB_API = 'https://api.github.com';

/**
 * Build an axios instance pre-configured with the GitHub token.
 * Called fresh per request so env changes during tests are respected.
 */
const buildClient = () => {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is not set');
  }

  return axios.create({
    baseURL: GITHUB_API,
    timeout: 15_000,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
};

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Translate a GitHub API error into a structured result object.
 * Keeps the controller clean and avoids leaking raw GitHub responses.
 */
const handleError = (error, operation) => {
  const status = error.response?.status;
  const ghMessage = error.response?.data?.message;

  logger.error(`GitHub service error [${operation}]: status=${status} msg=${ghMessage || error.message}`);

  if (status === 401) {
    return { success: false, statusCode: 502, message: 'GitHub authentication failed — check GITHUB_TOKEN' };
  }
  if (status === 403) {
    return { success: false, statusCode: 502, message: 'GitHub token lacks required permissions' };
  }
  if (status === 404) {
    return { success: false, statusCode: 404, message: `Not found on GitHub: ${ghMessage || 'resource missing'}` };
  }
  if (status === 409) {
    return { success: false, statusCode: 409, message: `GitHub conflict: ${ghMessage || 'SHA mismatch or file already exists'}` };
  }
  if (status === 422) {
    return { success: false, statusCode: 422, message: `GitHub validation error: ${ghMessage}` };
  }

  return {
    success: false,
    statusCode: 502,
    message: `GitHub API error: ${ghMessage || error.message}`,
  };
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get repository metadata.
 *
 * @param {string} owner
 * @param {string} repo
 * @returns {{ success, data? }}
 */
export const getRepoInfo = async (owner, repo) => {
  try {
    const gh = buildClient();
    const { data } = await gh.get(`/repos/${owner}/${repo}`);

    return {
      success: true,
      data: {
        fullName: data.full_name,
        description: data.description,
        defaultBranch: data.default_branch,
        private: data.private,
        htmlUrl: data.html_url,
        updatedAt: data.updated_at,
      },
    };
  } catch (error) {
    return handleError(error, 'getRepoInfo');
  }
};

/**
 * List files and folders at a given path in the repository.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} path   – directory path, e.g. "" (root) or "src/components"
 * @param {string} [ref]  – branch/tag/commit SHA (defaults to repo default branch)
 * @returns {{ success, data?: Array<{ name, path, type, sha, size, downloadUrl }> }}
 */
export const listContents = async (owner, repo, path = '', ref) => {
  try {
    const gh = buildClient();
    const params = ref ? { ref } : {};
    const encodedPath = path ? `/${encodeURIComponent(path).replace(/%2F/g, '/')}` : '';
    const { data } = await gh.get(`/repos/${owner}/${repo}/contents${encodedPath}`, { params });

    // data is an array when listing a directory
    const items = Array.isArray(data) ? data : [data];

    return {
      success: true,
      data: items.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type,   // "file" | "dir" | "symlink" | "submodule"
        sha: item.sha,
        size: item.size,
        downloadUrl: item.download_url,
      })),
    };
  } catch (error) {
    return handleError(error, 'listContents');
  }
};

/**
 * Fetch the decoded content of a single file.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} filePath  – full file path, e.g. "src/App.js"
 * @param {string} [ref]
 * @returns {{ success, data?: { path, content, sha, size, encoding, htmlUrl } }}
 */
export const getFileContent = async (owner, repo, filePath, ref) => {
  try {
    const gh = buildClient();
    const params = ref ? { ref } : {};
    const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, '/');
    const { data } = await gh.get(`/repos/${owner}/${repo}/contents/${encodedPath}`, { params });

    if (data.type !== 'file') {
      return { success: false, statusCode: 400, message: `Path "${filePath}" is not a file` };
    }

    // GitHub returns content as base64 with newlines — strip newlines before decode
    const rawBase64 = (data.content || '').replace(/\n/g, '');
    const content = Buffer.from(rawBase64, 'base64').toString('utf8');

    return {
      success: true,
      data: {
        path: data.path,
        content,
        sha: data.sha,
        size: data.size,
        encoding: data.encoding,
        htmlUrl: data.html_url,
      },
    };
  } catch (error) {
    return handleError(error, 'getFileContent');
  }
};

/**
 * Create a new file in the repository.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} filePath  – full path for the new file, e.g. "src/utils/helper.js"
 * @param {string} content   – raw file content (UTF-8 string)
 * @param {string} message   – commit message
 * @param {string} [branch]  – target branch (defaults to repo default branch)
 * @returns {{ success, data?: { path, sha, htmlUrl, commitSha } }}
 */
export const createFile = async (owner, repo, filePath, content, message, branch) => {
  try {
    const gh = buildClient();
    const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, '/');

    const body = {
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
    };
    if (branch) body.branch = branch;

    const { data } = await gh.put(`/repos/${owner}/${repo}/contents/${encodedPath}`, body);

    return {
      success: true,
      data: {
        path: data.content.path,
        sha: data.content.sha,
        htmlUrl: data.content.html_url,
        commitSha: data.commit.sha,
      },
    };
  } catch (error) {
    return handleError(error, 'createFile');
  }
};

/**
 * Update an existing file in the repository.
 * Requires the current file SHA (from getFileContent).
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} filePath
 * @param {string} content   – new raw content
 * @param {string} sha       – current blob SHA of the file
 * @param {string} message   – commit message
 * @param {string} [branch]
 * @returns {{ success, data?: { path, sha, htmlUrl, commitSha } }}
 */
export const updateFile = async (owner, repo, filePath, content, sha, message, branch) => {
  try {
    const gh = buildClient();
    const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, '/');

    const body = {
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      sha,
    };
    if (branch) body.branch = branch;

    const { data } = await gh.put(`/repos/${owner}/${repo}/contents/${encodedPath}`, body);

    return {
      success: true,
      data: {
        path: data.content.path,
        sha: data.content.sha,
        htmlUrl: data.content.html_url,
        commitSha: data.commit.sha,
      },
    };
  } catch (error) {
    return handleError(error, 'updateFile');
  }
};

export default {
  getRepoInfo,
  listContents,
  getFileContent,
  createFile,
  updateFile,
};
