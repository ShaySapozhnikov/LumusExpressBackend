
require('dotenv').config();
const bcrypt = require('bcryptjs');
// middleware so i don't need to create a new custom middleware for every auth callbacks
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { createUser, getUserData } from "../userService/userServiceFunctions";





var GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;

var GithubStrategy = require('passport-github').Strategy;





passport.use(new GithubStrategy(
  {
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/github/callback",

  },
  async function(accessToken:any, refreshToken:any, profile:any, done:any){
    // fuck you github // had to read docs 
    //   curl -L \
    // -H "Accept: application/vnd.github+json" \
    // -H "Authorization: Bearer <YOUR-TOKEN>" \
    // -H "X-GitHub-Api-Version: 2026-03-10" \
    // https://api.github.com/user/emails

    //translated to a fetch 
    try{
      const fuckingEmails =  await fetch("https://api.github.com/user/emails",
        {
          headers:{
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${accessToken}`
            // don't need version.
          }


        }
      );
      if (!fuckingEmails.ok) return done(null, false);


      const emails  = await fuckingEmails.json();
      
      // thank you js for building this thank god 

      var userPrimaryEmail = emails.find((email:any) => email.primary == true);
      //console.log(userPrimaryEmail.email);

      profile.email = userPrimaryEmail.email;
  
    }catch(err){
      return done(err)
    }
    return done(null,profile);

  }

));


passport.use(new GoogleStrategy({
    
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback", // this need to be changed once in prod
  },

  function (accessToken:any, refreshToken:any, profile:any, done:any) {
    


    // we don't need accessToken or refreshToken as ill be handling sessions in a custom way in my 
    // frontend cookie way i don't want to rely on third party sessions.
    // i wish i could just remove them but it breaks the methods order for the other parameter.

    //just get null for error or google profile on callback.
    return done(null, profile);
  }
  
));


//The available options are local Strategy:
//docs https://github.com/jaredhanson/passport-local

//usernameField - Optional, defaults to 'username'
//passwordField - Optional, defaults to 'password'



passport.use('email-signup', new LocalStrategy(
  {
    usernameField: "email"

  },
  
  // cb = (err,profile,:any)

  async function(email:string, password:string, cb) {
    try{
      var existingUser = await getUserData(email);
      if (existingUser){return cb(null, false, {message: "account already Exists with this email address"})}

      var newUser = await createUser({email:email,password:password,authProvider:"email", emailVerified:false});

      if (!newUser){return cb(null, false, {message: "failed to create account"})}
      return cb(null,newUser);

    }catch(err){
      return cb(err)
    }

}));


passport.use('email-login', new LocalStrategy(
  {
    usernameField: "email"

  },

  async function (email:string,password:string, cb) {
    try{
      var User = await getUserData(email);
      if (!User){
        return cb(null, false, {message: "Account does not exist with this email please sign up."});
      }


      // catch this in app and redirect user to acc email verification!
      // if cb == "NotVerified" ==> redirect to /verifyAccount
      if(!User.emailVerified){return cb(null,false,{message:"NotVerified"})} 

      if(!User.password){return cb(null, false, {message: "Please sign in using your original sign in method."});}
      
      
      const ismatch = await bcrypt.compare(password,User.password);

      if (ismatch){
        return cb(null,User);
      }else{
        return cb(null,false,{message:"invalid email or password try again"});
      }
  
    }catch(err){
      return cb(err);
    }
  }

));








export default passport;
