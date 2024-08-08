/*eslint-disable*/
// Disables ESLint checks for this entire file

import { ObjectId } from 'mongodb';
import sha1 from 'sha1';
import Queue from 'bull';
import dbClient from '../utils/db';
import userUtils from '../utils/user';

// Create a new Bull queue named 'userQueue'
const userQueue = new Queue('userQueue');

// Define a class called UsersController
class UsersController {
  // Method for handling user registration
  static async postNew(request, response) {
    const { email, password } = request.body;

    // Check if email is provided
    if (!email) return response.status(400).send({ error: 'Missing email' });

    // Check if password is provided
    if (!password)
      return response.status(400).send({ error: 'Missing password' });

    // Check if the email already exists in the database
    const emailExists = await dbClient.usersCollection.findOne({ email });

    if (emailExists)
      return response.status(400).send({ error: 'Already exist' });

    // Hash the password using SHA-1
    const sha1Password = sha1(password);

    let result;
    try {
      // Insert the new user into the database
      result = await dbClient.usersCollection.insertOne({
        email,
        password: sha1Password,
      });
    } catch (err) {
      // If an error occurs during user creation, add a job to the userQueue
      await userQueue.add({});
      return response.status(500).send({ error: 'Error creating user' });
    }

    // Prepare the user object to be sent in the response
    const user = {
      id: result.insertedId,
      email,
    };

    // Add a job to the userQueue with the newly created user's ID
    await userQueue.add({
      userId: result.insertedId.toString(),
    });

    // Return a successful response with the user object
    return response.status(201).send(user);
  }

  // Method for retrieving the authenticated user's information
  static async getMe(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request);

    // Retrieve the user based on the userId
    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });

    // If no user is found, return an unauthorized response
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    // Prepare the processed user object (without sensitive fields)
    const processedUser = { id: user._id, ...user };
    delete processedUser._id;
    delete processedUser.password;

    // Return the processed user object
    return response.status(200).send(processedUser);
  }
}

// Export the UsersController class
export default UsersController;
