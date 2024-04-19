var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Define the Recipe schema
var recipeSchema = new Schema({
    title: { type: String, required: true },
    cuisine: { type: String },
    mealType: { type: String },
    dietaryRestrictions: { type: [String] },
    ingredients: { type: [String], required: true },
    steps: { type: [String], required: true },
    images: { type: [String] },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    ratings: [{ type: Number }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

// Define the User schema
var userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    savedRecipes: [{ type: Schema.Types.ObjectId, ref: 'Recipe' }],
});

// Define the Comment schema
var commentSchema = new Schema({
    text: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    recipe: { type: Schema.Types.ObjectId, ref: 'Recipe' },
    createdAt: { type: Date, default: Date.now },
});

// Create models
var Recipe = mongoose.model('Recipe', recipeSchema);
var User = mongoose.model('User', userSchema);
var Comment = mongoose.model('Comment', commentSchema);

// Export the models
module.exports.Recipe = Recipe;
module.exports.User = User;
module.exports.Comment = Comment;
