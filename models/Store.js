const mongoose = require('mongoose');

// There are multiple ways to handle promises when querying data
// We use the global promise here so we can use the built-in ES6 Promise
// so we can use async/await
mongoose.Promise = global.Promise;

// To make URL-friendly names for slugs
const slug = require('slugs');

// Do data normalisation as close to model as possible
// instead of just before saving
const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true, // automatically trim
        required: 'Please enter a store name!' // mongo complains when we dont set a store with a name anyway, so use this here for more control
    },
    slug: String,
    description: {
        type: String,
        trim: true
    },
    tags: [String],
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: 'You must supply coordinates!'
        }],
        address: {
            type: String,
            required: 'You must supply an address!'
        }
    },
    photo: String, // name of photo stored on disc on server
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }
});

// Want to auto-generate the slug and hav this saved into our model
storeSchema.pre('save', async function(next){
    // Use a standard function here as want 'this' to be dynamically scoped
    // to be the model that in question

    if(!this.isModified('name')) {
        next(); // skip it
        return; // stop this function from running
    }
    this.slug = slug(this.name);

    // Find stores with the same name: name, name-1, name-2, ...
    // Use a Regex to do fuzzy matching and match
    // all that match pattern name, name-99

    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');

    // Need to find a model within a models function.
    // We haven't created the store yet, so need to use this.constructor,
    // which will be equal to the store by the time it runs.
    const storesWithSlug = await this.constructor.find({slug: slugRegEx});

    if(storesWithSlug.length) {
        // overwrite slug with unique name
        this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
    }

    // Now pre-save has done, can move to next step
    next();
});

// Adding a static method to our Store model
storeSchema.statics.getTagsList = function() {
    // Use classic function as need this to by dynamically scoped
    // array is the pipeline, and we put operators in there

    // Before we group by we need to unwind. Stores may have multiple tags
    // and we need to have an instance of the store for each tag,.
    return this.aggregate([
        { $unwind: '$tags'},
        // Group each instance by tags and create a new field called count
        // for each instance we'sunm' by 1.
        { $group: { _id: '$tags', count: { $sum: 1}}},
        // Sort by count descending
        { $sort: { count: -1}}
    ])

};
// If the main thing in a file is going to be exporting
// put it on module name.
// A question of whether importing a function or an object with loads
// of properties on it.
module.exports = mongoose.model('Store', storeSchema);