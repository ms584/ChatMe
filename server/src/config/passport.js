const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      scope: ['user:email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email =
          (profile.emails && profile.emails[0]?.value) || null;

        const role =
          profile.username?.toLowerCase() === process.env.ADMIN_GITHUB_USERNAME?.toLowerCase()
            ? 'admin'
            : 'user';

        const user = await User.findOneAndUpdate(
          { githubId: profile.id },
          {
            $set: {
              username: profile.username,
              displayName: profile.displayName || profile.username,
              email,
              avatar: profile.photos?.[0]?.value || null,
              role,
            },
          },
          { upsert: true, new: true, runValidators: true }
        );

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Not using sessions — JWT only
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
