// controllers/blogPostController.js

const BlogPost = require('../models/blogPostModel');
const fs = require('fs');
const path = require('path');

exports.createBlogPost = async (req, res) => {
    try {
        const { title, content } = req.body;
        const imagePath = req.file ? path.resolve(req.file.path) : null;

        const newBlogPost = new BlogPost({ title, content, image: imagePath });
        const savedBlogPost = await newBlogPost.save();

        res.status(201).json(savedBlogPost);
    } catch (error) {
        console.error('Error creating blog post:', error);
        res.status(500).json({ error: 'Failed to create blog post' });
    }
};

exports.updateBlogPost = async (req, res) => {
    try {
        const { title, content } = req.body;
        const post = await BlogPost.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Blog post not found' });
        }

        let imagePath = post.image; // Default to existing image

        if (req.file) {
            if (post.image && fs.existsSync(post.image)) {
                await fs.unlink(post.image);
            }
            imagePath = path.resolve(req.file.path);
        }

        const updatedBlogPost = await BlogPost.findByIdAndUpdate(
            req.params.id,
            { title, content, image: imagePath },
            { new: true }
        );

        res.json(updatedBlogPost);
    } catch (error) {
        console.error('Error updating blog post:', error);
        res.status(500).json({ error: 'Failed to update blog post' });
    }
};

exports.deleteBlogPost = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Blog post not found' });
        }

        if (post.image && fs.existsSync(post.image)) {
            await fs.unlink(post.image);
        }

        await BlogPost.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Blog post deleted' });
    } catch (error) {
        console.error('Error deleting blog post:', error);
        res.status(500).json({ error: 'Failed to delete blog post' });
    }
};
