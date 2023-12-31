const express = require("express");
const session = require("express-session");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // You'll need jsonwebtoken for user authentication
const { body, validationResult } = require("express-validator"); // Import express-validator
const User = require("../models/user");
const Post = require("../models/post");
const app = express();

// Configure express-session
router.use(
  session({
    secret: "johnnyaframe", // Replace with key of choice
    resave: false,
    saveUninitialized: true,
  })
);

const requireLogin = (req, res, next) => {
  if (req.session.user) {
    // User is logged in, proceed to the next middleware or route handler
    next();
  } else {
    // User is not logged in, redirect them to the login page
    res.redirect("/login"); // Change the route to your login page
  }
};

router.get("/news", requireLogin);

//Create Post Route

router.post("/create", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "User is not authenticated" });
    }

    // Extract post data from the request body
    const { news } = req.body;
    // const userId = req.session.user._id; // Get the user's ID from the session
    const username = req.session.username;
    const email = req.session.email;

    // Create a new post with the associated userId
    const newPost = new Post({
      news,
      username,
      email,
    });

    // Save the post to the database
    await newPost.save();

    res.status(201).json({ message: "Post successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Registration route with password validation
router.post(
  "/signup",
  [
    // Validate password: minimum 8 characters
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
    // Other validation rules for username and email
    body("username").notEmpty().withMessage("Username is required"),
    body("email").isEmail().withMessage("Invalid email address"),
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Extract user data from the request body
    const { username, email, password } = req.body;

    try {
      // Check if the email is already registered
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Email is already registered." });
      }

      // Hash the password before saving it to the database
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
      });

      // Save the user to the database
      await newUser.save();

      res.status(201).json({ message: "Registration successful!" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Add a route to fetch posts
router.get("/posts", requireLogin, async (req, res) => {
  try {
    // Fetch all posts from the database
    const posts = await Post.find();

    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update Post Route
// Update Post Route (Change the HTTP method to PUT)
router.put("/posts/update/:postId", requireLogin, async (req, res) => {
  try {
    const { postId } = req.params;
    const { news } = req.body;
    const username = req.session.username;
    const email = req.session.email;

    // Check if the post with the given postId exists
    console.log("Updating post with Id", postId);
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the user is the owner of the post (you can add more checks as needed)
    if (post.username !== username || post.email !== email) {
      return res
        .status(403)
        .json({ message: "You don't have permission to update this post" });
    }

    // Update the post content
    post.news = news;
    await post.save();
    // await Post.updateOne({ _id: postId });

    res.status(200).json({ message: "Post updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete Post Route
router.delete("/posts/:postId", requireLogin, async (req, res) => {
  try {
    const { postId } = req.params;
    const username = req.session.username;
    const email = req.session.email;

    console.log("Deleting post with ID:", postId);

    // Check if the post with the given postId exists
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the user is the owner of the post (you can add more checks as needed)
    if (post.username !== username || post.email !== email) {
      return res
        .status(403)
        .json({ message: "You don't have permission to delete this post" });
    }

    // Delete the post
    await Post.deleteOne({ _id: postId });

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post(
  "/signin",
  [
    body("email").isEmail().withMessage("Invalid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if the user with the provided email exists in the database
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Compare the provided password with the stored hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // If credentials are valid, store user information in the session
      req.session.user = user; // Store the entire user object in the session
      req.session.username = user.username; // Store the username in the session
      req.session.email = user.email;

      // Respond with a success message or the user data
      res.status(200).json({ message: "Login successful", user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.get("/news", (req, res) => {
  if (!req.session.user) {
    res.redirect("/login");
  }
});

module.exports = router;
