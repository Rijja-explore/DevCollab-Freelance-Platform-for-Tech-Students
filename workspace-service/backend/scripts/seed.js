#!/usr/bin/env node

/**
 * Database Seed Script
 * 
 * This script:
 * 1. Connects to MongoDB
 * 2. Clears existing data for the collections
 * 3. Inserts realistic dummy data
 * 4. Exits cleanly
 * 
 * Usage: node scripts/seed.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMongo, disconnectDatabase } from '../src/config/database.js';
import { Workspace, Message, Comment } from '../src/models/index.js';
import { logger } from '../src/utils/logger.js';

/**
 * Sample data generation
 */
const generateSampleData = () => {
  // Generate 1 Workspace
  const workspace = {
    projectId: 'proj-collab-workspace-2024',
    studentId: 'student_12345',
    startupId: 'startup_67890',
    status: 'ACTIVE'
  };

  // Generate 5 Messages
  const messages = [
    {
      senderId: 'student_12345',
      text: 'Hey team! I\'ve just pushed the initial project structure. Ready to start collaborating!',
      type: 'TEXT'
    },
    {
      senderId: 'startup_mentor_001',
      text: 'Great work! I\'ve reviewed the architecture. Let\'s discuss the API design in our next meeting.',
      type: 'TEXT'
    },
    {
      senderId: 'system',
      text: 'Milestone "Project Setup" has been completed by student_12345',
      type: 'SYSTEM'
    },
    {
      senderId: 'student_12345',
      text: 'I\'m working on the user authentication module now. Should have it ready for review by tomorrow.',
      type: 'TEXT'
    },
    {
      senderId: 'startup_mentor_001',
      text: 'Perfect! Don\'t forget to add proper error handling and validation. Also, make sure to write tests.',
      type: 'TEXT'
    }
  ];

  // Generate 3 Comments
  const comments = [
    {
      fileRef: 'src/auth/authController.js',
      lineNumber: 45,
      authorId: 'startup_mentor_001',
      text: 'Consider using bcrypt for password hashing instead of the built-in crypto module. It\'s more secure and industry standard.',
      parentId: null
    },
    {
      fileRef: 'src/auth/authController.js',
      lineNumber: 45,
      authorId: 'student_12345',
      text: 'Good point! I\'ll implement bcrypt. Should I also add salt rounds configuration?',
      parentId: null // Will be updated after first comment is created
    },
    {
      fileRef: 'src/database/models/User.js',
      lineNumber: null, // File-level comment
      authorId: 'startup_mentor_001',
      text: 'The User model looks good overall. Consider adding email verification and password reset functionality.',
      parentId: null
    }
  ];

  return { workspace, messages, comments };
};

/**
 * Clear existing data
 */
const clearExistingData = async () => {
  logger.info('🧹 Clearing existing data...');
  
  await Workspace.deleteMany({});
  await Message.deleteMany({});
  await Comment.deleteMany({});
  
  logger.info('✅ Existing data cleared');
};

/**
 * Insert sample workspace
 */
const insertWorkspace = async (workspaceData) => {
  logger.info('📁 Creating workspace...');
  
  const workspace = new Workspace(workspaceData);
  await workspace.save();
  
  logger.info(`✅ Created workspace: ${workspace.projectId}`);
  return workspace;
};

/**
 * Insert sample messages
 */
const insertMessages = async (workspace, messagesData) => {
  logger.info('💬 Creating messages...');
  
  const messages = [];
  
  for (let i = 0; i < messagesData.length; i++) {
    const messageData = {
      ...messagesData[i],
      workspaceId: workspace._id
    };
    
    const message = new Message(messageData);
    await message.save();
    messages.push(message);
    
    // Add slight delay between messages to create realistic timestamps
    if (i < messagesData.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  logger.info(`✅ Created ${messages.length} messages`);
  return messages;
};

/**
 * Insert sample comments
 */
const insertComments = async (workspace, commentsData) => {
  logger.info('💭 Creating comments...');
  
  const comments = [];
  
  // Insert first comment (top-level)
  const firstCommentData = {
    ...commentsData[0],
    workspaceId: workspace._id
  };
  const firstComment = new Comment(firstCommentData);
  await firstComment.save();
  comments.push(firstComment);
  
  // Insert second comment as reply to first comment
  const replyCommentData = {
    ...commentsData[1],
    workspaceId: workspace._id,
    parentId: firstComment._id
  };
  const replyComment = new Comment(replyCommentData);
  await replyComment.save();
  comments.push(replyComment);
  
  // Insert third comment (top-level, different file)
  const thirdCommentData = {
    ...commentsData[2],
    workspaceId: workspace._id
  };
  const thirdComment = new Comment(thirdCommentData);
  await thirdComment.save();
  comments.push(thirdComment);
  
  logger.info(`✅ Created ${comments.length} comments (1 thread with reply, 1 standalone)`);
  return comments;
};

/**
 * Display inserted data summary
 */
const displaySummary = async (workspace, messages, comments) => {
  logger.info('\n📊 Data Summary:');
  logger.info('================');
  
  logger.info(`Workspace: ${workspace.projectId}`);
  logger.info(`- Student: ${workspace.studentId}`);
  logger.info(`- Startup: ${workspace.startupId}`);
  logger.info(`- Status: ${workspace.status}`);
  logger.info(`- Created: ${workspace.createdAt}`);
  
  logger.info(`\nMessages: ${messages.length} total`);
  messages.forEach((msg, index) => {
    logger.info(`- [${index + 1}] ${msg.type} by ${msg.senderId}: "${msg.text.substring(0, 50)}..."`);
  });
  
  logger.info(`\nComments: ${comments.length} total`);
  comments.forEach((comment, index) => {
    const isReply = comment.parentId ? '↳ Reply' : 'Top-level';
    const location = comment.lineNumber ? 
      `${comment.fileRef}:${comment.lineNumber}` : 
      comment.fileRef || 'workspace-wide';
    logger.info(`- [${index + 1}] ${isReply} on ${location} by ${comment.authorId}`);
  });
  
  // Display some stats
  const textMessages = messages.filter(m => m.type === 'TEXT').length;
  const systemMessages = messages.filter(m => m.type === 'SYSTEM').length;
  const topLevelComments = comments.filter(c => !c.parentId).length;
  const replyComments = comments.filter(c => c.parentId).length;
  
  logger.info('\n📈 Statistics:');
  logger.info(`- Text messages: ${textMessages}`);
  logger.info(`- System messages: ${systemMessages}`);
  logger.info(`- Top-level comments: ${topLevelComments}`);
  logger.info(`- Reply comments: ${replyComments}`);
};

/**
 * Main seed function
 */
const seed = async () => {
  try {
    logger.info('🌱 Starting database seed...');
    
    // Connect to database
    await connectMongo();
    
    // Generate sample data
    const { workspace: workspaceData, messages: messagesData, comments: commentsData } = generateSampleData();
    
    // Clear existing data
    await clearExistingData();
    
    // Insert data
    const workspace = await insertWorkspace(workspaceData);
    const messages = await insertMessages(workspace, messagesData);
    const comments = await insertComments(workspace, commentsData);
    
    // Display summary
    await displaySummary(workspace, messages, comments);
    
    logger.info('\n🎉 Database seeding completed successfully!');
    
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Always disconnect
    await disconnectDatabase();
    process.exit(0);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('\n⏹️  Seed interrupted');
  await disconnectDatabase();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('\n⏹️  Seed terminated');
  await disconnectDatabase();
  process.exit(1);
});

// Run the seed
if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}

export default seed;