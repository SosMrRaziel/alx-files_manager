/*eslint-disable*/
// Disables ESLint checks for this entire file

import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import redisClient from '../utils/redis';
import userUtils from '../utils/user';

// Define a class called AuthController
class AuthController {
  // Method for handling user authentication (connect)
  static async getConnect(request, response) {
    const Authorization = request.header('Authorization') || '';

    // Extract the credentials from the Authorization header
    const credentials = Authorization.split(' ')[1];

    // If no credentials are provided, return an unauthorized response
    if (!credentials)
      return response.status(401).send({ error: 'Unauthorized' });

    // Decode the base64-encoded credentials
    const decodedCredentials = Buffer.from(credentials, 'base64').toString(
      'utf-8'
    );

    // Split the decoded credentials into email and password
    const [email, password] = decodedCredentials.split(':');

    // If email or password is missing, return an unauthorized response
    if (!email || !password)
      return response.status(401).send({ error: 'Unauthorized' });

    // Hash the password using SHA-1
    const sha1Password = sha1(password);

    // Retrieve user information based on the email and hashed password
    const user = await userUtils.getUser({
      email,
      password: sha1Password,
    });

    // If no user is found, return an unauthorized response
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    // Generate a unique token (UUID) for the authenticated user
    const token = uuidv4();
    const key = `auth_${token}`;
    const hoursForExpiration = 24;

    // Store the token in Redis with an expiration time
    await redisClient.set(key, user._id.toString(), hoursForExpiration * 3600);

    // Return the token in the response
    return response.status(200).send({ token });
  }

  // Method for handling user disconnection (logout)
  static async getDisconnect(request, response) {
    const { userId, key } = await userUtils.getUserIdAndKey(request);

    // If no userId is provided, return an unauthorized response
    if (!userId) return response.status(401).send({ error: 'Unauthorized' });

    // Delete the token from Redis (user logout)
    await redisClient.del(key);

    // Return a successful response (no content)
    return response.status(204).send();
  }
}

// Export the AuthController class
export default AuthController;
