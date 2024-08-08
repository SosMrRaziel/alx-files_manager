/*eslint-disable*/
// Disables ESLint checks for this entire file

import { ObjectId } from 'mongodb'; // Import ObjectId from the MongoDB library
import mime from 'mime-types'; // Import mime-types for handling MIME types
import Queue from 'bull'; // Import Bull for job queueing
import userUtils from '../utils/user'; // Import user utilities
import fileUtils from '../utils/file'; // Import file utilities
import basicUtils from '../utils/basic'; // Import basic utilities

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager'; // Set the folder path from environment variable or default to '/tmp/files_manager'

const fileQueue = new Queue('fileQueue'); // Initialize a new Bull queue named 'fileQueue'

class FilesController {
  // Handle file upload
  static async postUpload(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request); // Get user ID from the request

    if (!basicUtils.isValidId(userId)) {
      return response.status(401).send({ error: 'Unauthorized' }); // Return 401 if user ID is invalid
    }
    if (!userId && request.body.type === 'image') {
      await fileQueue.add({}); // Add a job to the queue if the request is for an image and no user ID
    }

    const user = await userUtils.getUser({ _id: ObjectId(userId) }); // Get user from the database

    if (!user) return response.status(401).send({ error: 'Unauthorized' }); // Return 401 if user is not found

    const { error: validationError, fileParams } = await fileUtils.validateBody(
      request
    ); // Validate the request body

    if (validationError)
      return response.status(400).send({ error: validationError }); // Return 400 if validation fails

    if (fileParams.parentId !== 0 && !basicUtils.isValidId(fileParams.parentId))
      return response.status(400).send({ error: 'Parent not found' }); // Return 400 if parent ID is invalid

    const { error, code, newFile } = await fileUtils.saveFile(
      userId,
      fileParams,
      FOLDER_PATH
    ); // Save the file

    if (error) {
      if (response.body.type === 'image') await fileQueue.add({ userId }); // Add a job to the queue if there's an error and the request is for an image
      return response.status(code).send(error); // Return the error code and message
    }

    if (fileParams.type === 'image') {
      await fileQueue.add({
        fileId: newFile.id.toString(),
        userId: newFile.userId.toString(),
      }); // Add a job to the queue if the file is an image
    }

    return response.status(201).send(newFile); // Return the newly created file
  }

  // Handle file retrieval by ID
  static async getShow(request, response) {
    const fileId = request.params.id; // Get file ID from the request parameters

    const { userId } = await userUtils.getUserIdAndKey(request); // Get user ID from the request

    const user = await userUtils.getUser({ _id: ObjectId(userId) }); // Get user from the database

    if (!user) return response.status(401).send({ error: 'Unauthorized' }); // Return 401 if user is not found

    if (!basicUtils.isValidId(fileId) || !basicUtils.isValidId(userId))
      return response.status(404).send({ error: 'Not found' }); // Return 404 if file ID or user ID is invalid

    const result = await fileUtils.getFile({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    }); // Get the file from the database

    if (!result) return response.status(404).send({ error: 'Not found' }); // Return 404 if the file is not found

    const file = fileUtils.processFile(result); // Process the file

    return response.status(200).send(file); // Return the file
  }

  // Handle retrieving a list of files
  static async getIndex(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request); // Get user ID from the request

    const user = await userUtils.getUser({ _id: ObjectId(userId) }); // Get user from the database

    if (!user) return response.status(401).send({ error: 'Unauthorized' }); // Return 401 if user is not found

    let parentId = request.query.parentId || '0'; // Get parent ID from the query parameters

    if (parentId === '0') parentId = 0; // Set parent ID to 0 if it's '0'

    let page = Number(request.query.page) || 0; // Get page number from the query parameters

    if (Number.isNaN(page)) page = 0; // Set page number to 0 if it's not a valid number

    if (parentId !== 0 && parentId !== '0') {
      if (!basicUtils.isValidId(parentId))
        return response.status(401).send({ error: 'Unauthorized' }); // Return 401 if parent ID is invalid

      parentId = ObjectId(parentId); // Convert parent ID to ObjectId

      const folder = await fileUtils.getFile({ _id: ObjectId(parentId) }); // Get the folder from the database

      if (!folder || folder.type !== 'folder')
        return response.status(200).send([]); // Return an empty list if the folder is not found or it's not a folder
    }

    const pipeline = [
      { $match: { parentId } },
      { $skip: page * 20 },
      { $limit: 20 },
    ]; // Define the aggregation pipeline for fetching files

    const fileCursor = await fileUtils.getFilesOfParentId(pipeline); // Get files based on the pipeline

    const fileList = [];
    await fileCursor.forEach((doc) => {
      const document = fileUtils.processFile(doc); // Process each file
      fileList.push(document); // Add the processed file to the list
    });

    return response.status(200).send(fileList); // Return the list of files
  }

  // Handle publishing a file
  static async putPublish(request, response) {
    const { error, code, updatedFile } = await fileUtils.publishUnpublish(
      request,
      true
    ); // Publish the file

    if (error) return response.status(code).send({ error }); // Return the error code and message if there's an error

    return response.status(code).send(updatedFile); // Return the updated file
  }

  // Handle unpublishing a file
  static async putUnpublish(request, response) {
    const { error, code, updatedFile } = await fileUtils.publishUnpublish(
      request,
      false
    ); // Unpublish the file

    if (error) return response.status(code).send({ error }); // Return the error code and message if there's an error

    return response.status(code).send(updatedFile); // Return the updated file
  }

  // Handle file download
  static async getFile(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request); // Get user ID from the request
    const { id: fileId } = request.params; // Get file ID from the request parameters
    const size = request.query.size || 0; // Get file size from the query parameters

    if (!basicUtils.isValidId(fileId))
      return response.status(404).send({ error: 'Not found' }); // Return 404 if file ID is invalid

    const file = await fileUtils.getFile({ _id: ObjectId(fileId) }); // Get the file from the database

    if (!file || !fileUtils.isOwnerAndPublic(file, userId))
      // Return 404 if the file is not found or the user is not the owner and the file is not public
      return response.status(404).send({ error: 'Not found' });

    if (file.type === 'folder') {
      return response
        .status(400)
        .send({ error: "A folder doesn't have content" }); // Return 400 if the file is a folder
    }

    const { error, code, data } = await fileUtils.getFileData(file, size); // Get the file data

    if (error) return response.status(code).send({ error }); // Return the error code and message if there's an error

    const mimeType = mime.contentType(file.name); // Get the MIME type of the file

    response.setHeader('Content-Type', mimeType); // Set the content type header

    return response.status(200).send(data); // Return the file data
  }
}

export default FilesController; // Export the FilesController class
