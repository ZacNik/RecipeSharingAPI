var express = require('express');
var mongoose = require('mongoose');
// Would be used to validate inputs for the theoretical web app
const { body, validationResult } = require('express-validator');


var { Recipe, User, Comment } = require('./models');

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
app.post('/recipes', async (req, res) => {
    try {
        const newRecipe = new Recipe(req.body);
        await newRecipe.save();
        res.status(201).json(newRecipe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all recipes
app.get('/recipes', async (req, res) => {
    try {
        const recipes = await Recipe.find().populate('author').populate('comments');
        res.json(recipes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a single recipe by ID
app.get('/recipes/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id)
            .populate('author')
            .populate({
                path: 'comments',
                populate: { path: 'author' }
            });
        if (recipe) {
            res.json(recipe);
        } else {
            res.status(404).json({ error: 'Recipe not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a recipe by ID
app.put('/recipes/:id', async (req, res) => {
    try {
        const updatedRecipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, {
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
        const deletedRecipe = await Recipe.findByIdAndRemove(req.params.id);
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
        const newComment = new Comment({
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
        const recipe = await Recipe.findById(req.params.id).populate({
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
        const { recipeId, commentId } = req.params;
        const recipe = await Recipe.findById(recipeId);
        const commentIndex = recipe.comments.findIndex(comment => comment.equals(commentId));

        if (commentIndex !== -1) {
            recipe.comments.splice(commentIndex, 1);
            await recipe.save();
            const deletedComment = await Comment.findByIdAndDelete(commentId);
            res.json({ message: 'Comment deleted', comment: deletedComment });
        } else {
            res.status(404).json({ error: 'Comment not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new user
app.post('/users', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// I would implement user authentication here if I were developing a full fledged web app.

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something Broke!');
});

app.listen(port, () => {
    console.log('Server running on port ${port}');
})



