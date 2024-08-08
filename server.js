/*eslint-disable*/
// Disables ESLint checks for this entire file

import express from 'express';
import controllerRouting from './routes/index';

// Create an Express application
const app = express();

// Define the port where the server will listen (fallback to 5000 if not specified in environment variables)
const port = process.env.PORT || 5000;

// Middleware: Parse incoming JSON requests
app.use(express.json());

// Set up routing using the exported controllerRouting function
controllerRouting(app);

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Export the Express app (not commonly done in this way, but it's possible)
export default app;
