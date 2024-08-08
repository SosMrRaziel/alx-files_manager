/*eslint-disable*/
// Disables ESLint checks for this entire file

import redisClient from '../utils/redis';
import dbClient from '../utils/db';

// Define a class called AppController
class AppController {
  // Method for retrieving the status of Redis and the database
  static getStatus(request, response) {
    // Check if Redis and the database are alive
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    // Return the status as a JSON response
    response.status(200).send(status);
  }

  // Method for retrieving statistics (number of users and files)
  static async getStats(request, response) {
    // Get the number of users and files from the database
    const stats = {
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles(),
    };
    // Return the statistics as a JSON response
    response.status(200).send(stats);
  }
}

// Export the AppController class
export default AppController;
