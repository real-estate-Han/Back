import User from '../model/user.js';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { GraphQLError } from 'graphql';
dotenv.config();

export const resolvers = {
  Query: {
    test: (_root, { testing }, req) => {
      console.log(req);
      if (!req.isAuth) {
        const response = {
          name: testing + ' not auth',
          age: 28,
          lat: 0.11,
        };
        return response;
      }
      const response = {
        name: testing,
        age: 28,
        lat: 0.11,
      };
      return response;
    },
    login: async function (_root, { email, password }) {
      const user = await User.findOne({ email: email });
      if (!user) {
        throw new GraphQLError('You are not authorized to perform this action.', {
          extensions: {
            code: 401,
          },
        });
      }
      const isEqual = await bcrypt.compare(password, user.password);
      if (!isEqual) {
        const error = new Error('Password is incorrect.');
        error.code = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          email: user.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: '5h' }
      );
      return { token: `Barear ${token}`, userId: user._id.toString() };
    },

    posts: async function (_root, { page }, req) {
      if (!req.isAuth) {
        throw new GraphQLError('Not authenticated!');
      }
      if (!page) {
        page = 1;
      }
      const perPage = 2;
      const totalPosts = await Post.find().countDocuments();
      const posts = await Post.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate('creator');
      return {
        posts: posts.map((p) => {
          return {
            ...p._doc,
            _id: p._id.toString(),
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          };
        }),
        totalPosts: totalPosts,
      };
    },

    post: async function (_root, { id }, req) {
      if (!req.isAuth) {
        throw new GraphQLError('Not authenticated!', {
          extensions: {
            code: 401,
          },
        });
      }
      const post = await Post.findById(id).populate('creator');
      if (!post) {
        throw new GraphQLError('No post found!', {
          extensions: {
            code: 401,
          },
        });
      }
      return {
        ...post._doc,
        _id: post._id.toString(),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      };
    },
    deletePost: async function (_root, { id }, req) {
      if (!req.isAuth) {
        const error = new Error('Not authenticated!');
        error.code = 401;
        throw error;
      }
      const post = await Post.findById(id);
      if (!post) {
        const error = new Error('No post found!');
        error.code = 404;
        throw error;
      }
      if (post.creator.toString() !== req.userId.toString()) {
        const error = new Error('Not authorized!');
        error.code = 403;
        throw error;
      }
      clearImage(post.imageUrl);
      await Post.findByIdAndRemove(id);
      const user = await User.findById(req.userId);
      user.posts.pull(id);
      await user.save();
      return true;
    },
  },
  Mutation: {
    createUser: async function (_root, { userInput }) {
      const errors = [];
      if (!validator.isEmail(userInput.email)) {
        errors.push({ message: 'E-Mail is invalid.' });
      }
      if (validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, { min: 5 })) {
        errors.push({ message: 'Password too short!' });
      }
      if (errors.length > 0) {
        const error = new Error('Invalid input.');
        error.data = errors;
        error.code = 422;
        throw new GraphQLError(errors, {
          extensions: { code: 'YOUR_ERROR_CODE', myCustomExtensions },
        });
        // throw error;
      }
      const existingUser = await User.findOne({ email: userInput.email });
      if (existingUser) {
        const error = new Error('User exists already!');
        throw error;
      }
      const hashedPw = await bcrypt.hash(userInput.password, 12);
      const user = new User({
        email: userInput.email,
        name: userInput.name,
        password: hashedPw,
      });
      const createdUser = await user.save();
      return { ...createdUser._doc, _id: createdUser._id.toString() };
    },
  },
};
