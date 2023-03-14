import User from '../model/user.js';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
export const resolvers = {
  Query: {
    test: (_root, { testing }) => {
      const response = {
        name: testing,
        age: 28,
        lat: 0.11,
      };
      return response;
    },
    login: async function (_root, { email, password }) {
      // const user = await User.findOne({ email: email });
      // if (!user) {
      //   const error = new Error('User not found.');
      //   error.code = 401;
      //   throw error;
      // }
      // const isEqual = await bcrypt.compare(password, user.password);
      // if (!isEqual) {
      //   const error = new Error('Password is incorrect.');
      //   error.code = 401;
      //   throw error;
      // }
      // const token = jwt.sign(
      //   {
      //     userId: user._id.toString(),
      //     email: user.email,
      //   },
      //   'somesupersecretsecret',
      //   { expiresIn: '1h' }
      // );
      // return { token: token, userId: user._id.toString() };
      return { token: email, userId: password };
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
        console.log(error);
        throw error;
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
