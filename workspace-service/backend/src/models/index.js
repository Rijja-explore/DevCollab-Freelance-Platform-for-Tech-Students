/**
 * Models Index
 * 
 * Centralized export for all database models.
 * This makes importing models consistent across the application.
 */

import Workspace from './Workspace.js';
import Message from './Message.js';
import Comment from './Comment.js';
import * as constants from './constants.js';

export {
  Workspace,
  Message,
  Comment,
  constants
};

export default {
  Workspace,
  Message,
  Comment,
  constants
};