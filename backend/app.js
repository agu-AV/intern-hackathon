const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const User = require('./models/User');
const Workout = require('./models/Workout');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./middleware/auth');
const workoutRoutes = require('./routes/workout');
const { generateWithGemini } = require('./services/gemini');
require('dotenv').config();

/**
 * Express application setup
 * Configures middleware, routes, and database connection
 */
const app = express();
const port = process.env.PORT || 3001;

/**
 * MongoDB Connection
 * Establishes connection to MongoDB using environment variables
 * Logs success or error status to console
 */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Enable CORS and JSON parsing middleware
app.use(cors());
app.use(express.json());

/**
 * Authentication Routes
 */

/**
 * Login endpoint
 * @route POST /api/auth/login
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {object} User data and JWT token
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      userId: user._id,
      name: user.name
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get user profile endpoint
 * @route GET /api/me
 * @middleware authMiddleware - Verifies JWT token
 * @returns {object} User profile data
 */
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('name email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ name: user.name, email: user.email });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * User registration endpoint
 * @route POST /api/auth/register
 * @param {string} name - User's full name
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {object} Success message
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Create new user
    const newUser = new User({ name, email, password });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Health check endpoint
 * @route GET /api/health
 * @returns {object} Status message
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Workout Routes
 */

/**
 * Get all workouts for authenticated user
 * @route GET /api/workouts
 * @middleware authMiddleware - Verifies JWT token
 * @returns {array} List of user's workouts
 */
app.get('/api/workouts', authMiddleware, async (req, res) => {
  try {
    const workouts = await Workout.find({ userId: req.user.userId }).sort({ date: 1 });
    res.json(workouts);
  } catch (error) {
    console.error('Error fetching workouts:', error);
    res.status(500).json({ message: 'Failed to fetch workouts' });
  }
});

/**
 * Create new workout
 * @route POST /api/makeWorkout
 * @middleware authMiddleware - Verifies JWT token
 * @param {string} title - Workout title
 * @param {string} date - Workout date
 * @param {array} exercises - Array of exercise objects
 * @returns {object} Created workout
 */
app.post('/api/makeWorkout', authMiddleware, async (req, res) => {
  try {
    const { title, date, exercises } = req.body;

    // Validate required fields
    if (!title || !date || !Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ message: 'Title, date, and at least one exercise are required.' });
    }

    const newWorkout = new Workout({
      userId: req.user.userId,
      title,
      date,
      exercises
    });

    await newWorkout.save();
    res.status(201).json(newWorkout);
  } catch (error) {
    console.error('Error creating workout:', error);
    res.status(500).json({ message: 'Failed to create workout' });
  }
});

/**
 * Update existing workout
 * @route PUT /api/workouts/:id
 * @middleware authMiddleware - Verifies JWT token
 * @param {string} id - Workout ID
 * @param {object} req.body - Updated workout data
 * @returns {object} Updated workout
 */
app.put('/api/workouts/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, exercises } = req.body;

    if (!title || !date || !Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ message: 'Title, date, and at least one exercise are required.' });
    }

    const updatedWorkout = await Workout.findOneAndUpdate(
      { _id: id, userId: req.user.userId },
      { title, date, exercises },
      { new: true }
    );

    if (!updatedWorkout) {
      return res.status(404).json({ message: 'Workout not found or not authorized' });
    }

    res.json(updatedWorkout);
  } catch (error) {
    console.error('Error updating workout:', error);
    res.status(500).json({ message: 'Failed to update workout' });
  }
});

/**
 * Delete workout
 * @route DELETE /api/workouts/:id
 * @middleware authMiddleware - Verifies JWT token
 * @param {string} id - Workout ID
 * @returns {object} Success message
 */
app.delete('/api/workouts/:id', authMiddleware, async (req, res) => {
  try {
    const workoutId = req.params.id;
    const deletedWorkout = await Workout.findOneAndDelete({
      _id: workoutId,
      userId: req.user.userId
    });

    if (!deletedWorkout) {
      return res.status(404).json({ message: 'Workout not found or not authorized to delete' });
    }

    res.status(200).json({ message: 'Workout deleted successfully' });
  } catch (error) {
    console.error('Error deleting workout:', error);
    res.status(500).json({ message: 'Failed to delete workout' });
  }
});

/**
 * Generate workout using AI
 * @route POST /api/generateWorkout
 * @middleware authMiddleware - Verifies JWT token
 * @param {string} description - Workout description for AI generation
 * @param {string} date - Target workout date
 * @returns {object} Generated workout
 */
app.post('/api/generateWorkout', authMiddleware, async (req, res, next) => {
  try {
    const { description, date } = req.body;
    const dateStr = date || new Date().toISOString().slice(0,10);

    // Build the schema-prompt for AI generation
    const prompt = `
Generate a single-day workout plan and return it only as valid JSON in exactly this shape:

{
  "title": "<short name of workout>",
  "date": "<YYYY-MM-DD>",
  "exercises": [
    {
      "name": "<exercise name>",
      "description": "<brief description>",
      "sets": <number>,
      "reps": <number>
    }
  ]
}

Do not output any extra text or markdown—only the JSON object.

WORKOUT NAME: "${description}"
DATE: "${dateStr}"
`;

    // Generate workout using AI
    let raw = await generateWithGemini(prompt);

    // Clean up AI response
    raw = raw.trim()
      .replace(/^```(?:json)?\s*/, '')
      .replace(/\s*```$/, '');

    // Extract and parse JSON
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No JSON object found in response');
    const jsonString = m[0];
    const planObj = JSON.parse(jsonString);

    // Create new workout from AI generation
    const newWorkout = await Workout.create({
      userId: req.user.userId,
      title: planObj.title,
      date: planObj.date,
      exercises: planObj.exercises
    });

    res.status(201).json(newWorkout);
  } catch (err) {
    console.error('Generate+Create error:', err);
    next(err);
  }
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Handle all other routes by serving the React app
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});