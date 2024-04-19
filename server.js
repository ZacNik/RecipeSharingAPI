var express = require('express');
var mongoose = require('mongoose');
var { body, validationResult } = require('express-validator');
var morgan = require('morgan');
var cors = require('cors');
var rateLimit = require('express-rate-limit');
var { Recipe, User, Comment } = require('./models');
var helmet = require('helmet');
var bcrypt = require('bcrypt');

var app = express();
var port = process.env.PORT || 3000;

var mongoUri = 'mongodb+srv://ZacNik:3EIh7kkDTTpPDt8Y@cluster0.86jxh18.mongodb.net/Recipe-Sharing-Service?retryWrites=true&w=majority';

// parse JSON
app.use(express.json());

//connect to mongoDB
mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    });

// CRUD operations for recipes

// Create a new recipe
app.post(
    '/recipes',
    [
        // Validation and sanitization rules
        body('name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isString().withMessage('Name must be a string'),
        body('ingredients')
            .isArray().withMessage('Ingredients must be an array')
            .notEmpty().withMessage('Ingredients cannot be empty'),
        body('steps')
            .isArray().withMessage('Steps must be an array')
            .notEmpty().withMessage('Steps cannot be empty'),
        body('author')
            .trim()
            .notEmpty().withMessage('Author is required')
            .isString().withMessage('Author must be a string')
    ],
    async (req, res) => {
        var errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Route logic
        try {
            var newRecipe = new Recipe(req.body);
            await newRecipe.save();
            res.status(201).json(newRecipe);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Get all recipes
app.get('/recipes', async (req, res) => {
    try {
        var recipes = await Recipe.find().populate('author').populate('comments');
        res.json(recipes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a single recipe by ID
app.get(
    '/recipes/:id',
    [
        // Validate the id parameter
        param('id')
            .trim()
            .notEmpty().withMessage('ID is required')
            .isMongoId().withMessage('Invalid ID format')
    ],
    async (req, res) => {
        var errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Route logic
        try {
            var recipe = await Recipe.findById(req.params.id)
                .populate('author')
                .populate({ path: 'comments', populate: { path: 'author' } });
            if (recipe) {
                res.json(recipe);
            } else {
                res.status(404).json({ error: 'Recipe not found' });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);


// Update a recipe by ID
app.put('/recipes/:id', async (req, res) => {
    try {
        var updatedRecipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        if (updatedRecipe) {
            res.json(updatedRecipe);
        } else {
            res.status(404).json({ error: 'Recipe not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a recipe by ID
app.delete('/recipes/:id', async (req, res) => {
    try {
        var deletedRecipe = await Recipe.findByIdAndRemove(req.params.id);
        if (deletedRecipe) {
            res.json({ message: 'Recipe deleted' });
        } else {
            res.status(404).json({ error: 'Recipe not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new comment
app.post('/recipes/:id/comments', async (req, res) => {
    try {
        var newComment = new Comment({
            text: req.body.text,
            author: req.body.author,
            recipe: req.params.id,
        });
        await newComment.save();
        res.status(201).json(newComment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all comments for a specific recipe
app.get('/recipes/:id/comments', async (req, res) => {
    try {
        var recipe = await Recipe.findById(req.params.id).populate({
            path: 'comments',
            populate: { path: 'author' }
        });
        if (recipe) {
            res.json(recipe.comments);
        } else {
            res.status(404).json({ error: 'Recipe not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a comment by ID
app.delete('/recipes/:recipeId/comments/:commentId', async (req, res) => {
    try {
        var { recipeId, commentId } = req.params;
        var recipe = await Recipe.findById(recipeId);
        var commentIndex = recipe.comments.findIndex(comment => comment.equals(commentId));

        if (commentIndex !== -1) {
            recipe.comments.splice(commentIndex, 1);
            await recipe.save();
            var deletedComment = await Comment.findByIdAndDelete(commentId);
            res.json({ message: 'Comment deleted', comment: deletedComment });
        } else {
            res.status(404).json({ error: 'Comment not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

var saltRounds = 10;

// Create a new user
app.post(
    '/users',
    [
        // Validation and sanitization rules
        body('username')
            .trim()
            .notEmpty().withMessage('Username is required')
            .isAlphanumeric().withMessage('Username must be alphanumeric'),
            .isLength({ min: 6, max: 20 }).withMessage('Username must be between 6 and 20 characters'),
        body('email')
            .normalizeEmail().isEmail().withMessage('Invalid email address'),
        body('password')
            .trim()
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
            .matches(/\d/).withMessage('Password must contain at least one number')
            .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
            .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
            .matches(/[\W_]/).withMessage('Password must contain at least one special character')
    ],
    async (req, res) => {
        var errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Route logic
        try {
            var hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
            req.body.password = hashedPassword;
            var newUser = new User(req.body);
            await newUser.save();
            res.status(201).json(newUser);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Middleware library used for logging purposes
app.use(morgan('combined'));

// Cors will help ensure that the API can be accessed from multiple domains effectively
app.use(cors());

// Rate limiter to help protect against denial-of-service attacks
var limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 250, // Limit each IP to 250 requests per windowMs
    standardHeaders: true, // Return rate limit information in the 'RateLimit-*' headers
    legacyHeaders: false, // Disable 'X-RateLimit-*' headers
});
app.use(limiter);

// Helmet will take care of using HTTPS
app.use(helmet());

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something broke!',
        message: err.message
    });
});

// Check connection
app.listen(port, () => {
    console.log('Server running on port ${port}');
})



