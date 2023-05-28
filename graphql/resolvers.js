import User from "../model/user.js";
import Post from "../model/post.js";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { GraphQLError } from "graphql";
import { mongo } from "mongoose";
dotenv.config();

export const resolvers = {
  Query: {
    checklogin: async function (_root, {}, req) {
      if (!req.isAuth) {
        if (req.expire) {
          return { checklogin: "expired" };
        }
        return { checklogin: "failed" };
      }
      if (req.isAuth) {
        const user = await User.findById(req.userId);
        if (user.status == "owner") {
          return { checklogin: "success", status: "owner" };
        } else {
          return { checklogin: "success" };
        }
      }
    },
    allpost: async function (_root, {}, req) {
      const posts = await Post.find();
      const totalPosts = await Post.find().countDocuments();
      return {
        posts: posts.map((p) => {
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
      return {
        token: `Barear ${token}`,
        userId: user._id.toString(),
        userEmail: user.email,
        userNickname: user.name,
        likeposts: user.likeposts,
        status: user.status,
        posts: user.posts,
      };
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
        posts: posts.map((p) => {
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
    createUser: async (_root, { userInput }, req) => {
      const errors = [];
      console.log(userInput);

      const existingUser = await User.findOne({ email: userInput.email });
      if (existingUser) {
        throw new GraphQLError("이미 존재하는 회원입니다");
      }
      const hashedPw = await bcrypt.hash(userInput.password, 12);
      const user = new User({
        email: userInput.email,
        name: userInput.name,
        password: hashedPw,
        status: "guest",
      });
      const createdUser = await user.save();
      return { ...createdUser._doc, _id: createdUser._id.toString() };
    },

    createPost: async (_root, { postInput, geo }, req) => {
      if (!req.isAuth) {
        throw new GraphQLError("인증 실패");
      }
      console.log(postInput);
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
      }

      const {
        itemUniqueID,
        itemLoadAddress,
        itemAddress,
        region_1depth,
        region_2depth,
        region_3depth,
        itemType,
        transactionType,
        itemDeposit,
        itemMonthly,
        itemJense,
        itemSale,
        itemManagement,
        itemParking,
        itemElevator,
        itemHeating,
        itemBalcony,
        itemDirection,
        itemAreaLand,
        itemAreaBuilding,
        itemSupplyArea,
        itemExclusiveArea,
        itemFloor,
        itemLandType,
        itemFloorHeight,
        itemPurpose,
        itemRooms,
        itemBathroom,
        itemStatus,
        itemTruck,
        itemLandNumber,
        itemAreaTotal,
        itemLandCategory,
        itemTotalAreaLand,
        itemMovein,
        itemApproval,
        itemSubway,
        itemTitleimg,
        itemDetailimg,
        itemTag,
        itemElectricity,
        itemOption,
        itemLoan,
        itemWaterMark,
        itemMoreInfo,
        itemManagementInfo,
        itemManagementException,
        itemFavorCount,
        itemSecurity,
        itemControlLine,
      } = postInput;
      const update = await Post.findByIdAndUpdate(
        id,
        {
          $set: {
            itemUniqueID,
            itemGeoLocation: [geo.lat, geo.lng],
            itemLoadAddress,
            itemAddress,
            region_1depth,
            region_2depth,
            region_3depth,
            itemType,
            transactionType,
            itemDeposit,
            itemMonthly,
            itemJense,
            itemSale,
            itemManagement,
            itemParking,
            itemElevator,
            itemHeating,
            itemBalcony,
            itemDirection,
            itemAreaLand,
            itemAreaBuilding,
            itemSupplyArea,
            itemExclusiveArea,
            itemFloor,
            itemLandType,
            itemFloorHeight,
            itemPurpose,
            itemRooms,
            itemBathroom,
            itemStatus,
            itemTruck,
            itemLandNumber,
            itemAreaTotal,
            itemLandCategory,
            itemTotalAreaLand,
            itemMovein,
            itemApproval,
            itemSubway,
            itemTitleimg,
            itemDetailimg,
            itemTag,
            itemElectricity,
            itemOption,
            itemLoan,
            itemWaterMark,
            itemMoreInfo,
            itemManagementInfo,
            itemManagementException,
            itemFavorCount,
            itemSecurity,
            itemControlLine,
          },
        },
        { new: true }
      );

      const updatedPost = await Post.findById(id).populate("creator");
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
    likePost: async (_root, { id }, req) => {
      if (!req.isAuth) {
        throw new GraphQLError("로그인이 필요합니다");
      }
      const post = await Post.findById(id);

      const user = await User.findById(req.userId);
      const userlikelist = user.likeposts;

      // const obID = mongoose.Types.ObjectId(id);
      const includepost = userlikelist.includes(id);
      if (includepost) {
        user.likeposts.pull(id);
        post.itemFavorCount -= 1;
      }
      if (!includepost) {
        user.likeposts.push(id);
        post.itemFavorCount += 1;
      }
      await user.save();
      await post.save();
      return user.likeposts;
    },
    updateUser: async (_root, { userid, oldpass, newpass }, req) => {
      const user = await User.findById(userid);

      // 현재 비밀번호 검증
      const isPasswordValid = await bcrypt.compare(oldpass, user.password);
      if (!isPasswordValid) {
        throw new Error("현재 비밀번호가 틀렸습니다");
      }

      // 새로운 비밀번호 해싱
      const hashedNewPassword = await bcrypt.hash(newpass, 12);

      // 비밀번호 업데이트
      user.password = hashedNewPassword;
      await user.save();

      return true;
    },
  },
};
