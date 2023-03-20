import User from "../model/user.js";
import Post from "../model/post.js";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { GraphQLError } from "graphql";
dotenv.config();

export const resolvers = {
  Query: {
    allpost: async function (_root, {}, req) {
      const posts = await Post.find();
      const totalPosts = await Post.find().countDocuments();
      return {
        posts: posts.map(p => {
          return {
            ...p._doc,
            _id: p._id.toString(),
            itemGeoLocation: {
              lat: p.itemGeoLocation[0],
              lng: p.itemGeoLocation[1],
            },
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          };
        }),
        totalPosts: totalPosts,
      };
    },
    login: async function (_root, { email, password }) {
      const user = await User.findOne({ email: email });
      if (!user) {
        throw new GraphQLError("회원을 찾을 수 없습니다", {
          extensions: {
            code: 401,
          },
        });
      }
      const isEqual = await bcrypt.compare(password, user.password);
      if (!isEqual) {
        throw new GraphQLError("비밀번호가 틀렸습니다");
      }
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          email: user.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: "5h" }
      );
      return { token: `Barear ${token}`, userId: user._id.toString() };
    },

    posts: async (_root, { page }, req) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated!");
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
        .populate("creator");
      return {
        posts: posts.map(p => {
          return {
            ...p._doc,
            _id: p._id.toString(),
            itemGeoLocation: {
              lat: p.itemGeoLocation[0],
              lng: p.itemGeoLocation[1],
            },
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          };
        }),
        totalPosts: totalPosts,
      };
    },

    post: async (_root, { id }, req) => {
      if (!req.isAuth) {
        throw new GraphQLError("Not authenticated!", {
          extensions: {
            code: 401,
          },
        });
      }
      const post = await Post.findById(id).populate("creator");
      if (!post) {
        throw new GraphQLError("No post found!", {
          extensions: {
            code: 401,
          },
        });
      }
      return {
        ...post._doc,
        _id: post._id.toString(),
        itemGeoLocation: {
          lat: post.itemGeoLocation[0],
          lng: post.itemGeoLocation[1],
        },
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      };
    },
  },
  Mutation: {
    createUser: async (_root, { userInput }) => {
      const errors = [];

      const existingUser = await User.findOne({ email: userInput.email });
      if (existingUser) {
        throw new GraphQLError("이미 존재하는 회원입니다");
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

    createPost: async (_root, { postInput, geo }, req) => {
      if (!req.isAuth) {
        throw new GraphQLError("인증 실패");
      }
      console.log(geo);
      const user = await User.findById(req.userId);
      if (!user) {
        throw new GraphQLError("회원을 찾을 수 없습니다");
      }
      const post = new Post({
        ...postInput,
        itemGeoLocation: [geo.lat, geo.lng],
        creator: user,
      });
      const createdPost = await post.save();
      user.posts.push(createdPost);
      await user.save();
      return {
        ...createdPost._doc,
        itemGeoLocation: {
          lat: createdPost.itemGeoLocation[0],
          lng: createdPost.itemGeoLocation[1],
        },
        _id: createdPost._id.toString(),
        createdAt: createdPost.createdAt.toISOString(),
        updatedAt: createdPost.updatedAt.toISOString(),
      };
    },

    deletePost: async (_root, { id }, req) => {
      if (!req.isAuth) {
        throw new GraphQLError("인증 실패");
      }
      const post = await Post.findById(id);
      if (!post) {
        throw new GraphQLError("해당 게시물을 찾을 수 없습니다");
      }
      // if (post.creator.toString() !== req.userId.toString()) {
      //   throw new GraphQLError('Not authorized!');
      //   error.code = 403;
      //   throw error;
      // }

      await Post.findByIdAndRemove(id);
      const user = await User.findById(req.userId);
      user.posts.pull(id);
      await user.save();
      return true;
    },
    updatePost: async (_root, { id, postInput, geo }, req) => {
      if (!req.isAuth) {
        throw new GraphQLError("인증 실패");
      }
      const post = await Post.findById(id).populate("creator");
      if (!post) {
        throw new GraphQLError("게시물을 찾을 수 없습니다");
        error.code = 404;
        throw error;
      }
      if (post.creator._id.toString() !== req.userId.toString()) {
        const error = new Error("Not authorized!");
        error.code = 403;
        throw error;
      }

      post = {
        ...postInput,
        itemGeoLocation: [geo.lat, geo.lng],
        creator: post.creator,
      };
      const updatedPost = await post.save();
      return {
        ...updatedPost._doc,
        _id: updatedPost._id.toString(),
        itemGeoLocation: {
          lat: updatedPost.itemGeoLocation[0],
          lng: updatedPost.itemGeoLocation[1],
        },
        createdAt: updatedPost.createdAt.toISOString(),
        updatedAt: updatedPost.updatedAt.toISOString(),
      };
    },
  },
};
