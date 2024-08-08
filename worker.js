/*eslint-disable*/
// Disables ESLint checks for this entire file

import Queue from 'bull';
import { ObjectId } from 'mongodb';
import { promises as fsPromises } from 'fs';
import fileUtils from './utils/file';
import userUtils from './utils/user';
import basicUtils from './utils/basic';

// Import the 'image-thumbnail' library
const imageThumbnail = require('image-thumbnail');

// Create two queues: 'fileQueue' and 'userQueue'
const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

// Process jobs in the 'fileQueue'
fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  // Check if userId is missing
  if (!userId) {
    console.log('Missing userId');
    throw new Error('Missing userId');
  }

  // Check if fileId is missing
  if (!fileId) {
    console.log('Missing fileId');
    throw new Error('Missing fileId');
  }

  // Validate that both userId and fileId are valid MongoDB ObjectIds
  if (!basicUtils.isValidId(fileId) || !basicUtils.isValidId(userId))
    throw new Error('File not found');

  // Retrieve file information based on fileId and userId
  const file = await fileUtils.getFile({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });

  // If no file is found, throw an error
  if (!file) throw new Error('File not found');

  const { localPath } = file;
  const options = {};
  const widths = [500, 250, 100];

  // Generate thumbnails for different widths
  widths.forEach(async (width) => {
    options.width = width;
    try {
      const thumbnail = await imageThumbnail(localPath, options);
      await fsPromises.writeFile(`${localPath}_${width}`, thumbnail);
      // Uncomment the line below if you want to log the thumbnail data
      // console.log(thumbnail);
    } catch (err) {
      console.error(err.message);
    }
  });
});

// Process jobs in the 'userQueue'
userQueue.process(async (job) => {
  const { userId } = job.data;

  // Check if userId is missing
  if (!userId) {
    console.log('Missing userId');
    throw new Error('Missing userId');
  }

  // Validate that userId is a valid MongoDB ObjectId
  if (!basicUtils.isValidId(userId)) throw new Error('User not found');

  // Retrieve user information based on userId
  const user = await userUtils.getUser({
    _id: ObjectId(userId),
  });

  // If no user is found, throw an error
  if (!user) throw new Error('User not found');

  console.log(`Welcome ${user.email}!`);
});
