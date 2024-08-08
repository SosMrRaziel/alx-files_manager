/*eslint-disable*/
// Disables ESLint checks for this entire file

import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

// Define a function called controllerRouting that takes an Express app as an argument
function controllerRouting(app) {
  // Create an Express Router instance
  const router = express.Router();
  // Attach the router to the root path of the app
  app.use('/', router);

  // Define routes and their corresponding controller methods

  // GET /status route
  router.get('/status', (req, res) => {
    AppController.getStatus(req, res);
  });

  // GET /stats route
  router.get('/stats', (req, res) => {
    AppController.getStats(req, res);
  });

  // POST /users route
  router.post('/users', (req, res) => {
    UsersController.postNew(req, res);
  });

  // GET /users/me route
  router.get('/users/me', (req, res) => {
    UsersController.getMe(req, res);
  });

  // GET /connect route
  router.get('/connect', (req, res) => {
    AuthController.getConnect(req, res);
  });

  // GET /disconnect route
  router.get('/disconnect', (req, res) => {
    AuthController.getDisconnect(req, res);
  });

  // POST /files route
  router.post('/files', (req, res) => {
    FilesController.postUpload(req, res);
  });

  // GET /files/:id route
  router.get('/files/:id', (req, res) => {
    FilesController.getShow(req, res);
  });

  // GET /files route
  router.get('/files', (req, res) => {
    FilesController.getIndex(req, res);
  });

  // PUT /files/:id/publish route
  router.put('/files/:id/publish', (req, res) => {
    FilesController.putPublish(req, res);
  });

  // PUT /files/:id/unpublish route
  router.put('/files/:id/unpublish', (req, res) => {
    FilesController.putUnpublish(req, res);
  });

  // GET /files/:id/data route
  router.get('/files/:id/data', (req, res) => {
    FilesController.getFile(req, res);
  });
}

// Export the controllerRouting function
export default controllerRouting;
