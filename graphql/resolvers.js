export const resolvers = {
  Query: {
    test: (_root, { testing }) => `Hello ${testing}!`,
  },
};
