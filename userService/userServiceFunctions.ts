
import { db } from "../dbServices/mongoClient";


export interface UserData {
  accountId: string;
  email: string;
  username: string;
  password?: string; 
  authProvider:string
  //first login boolean needed for acc for onboarding #feat
}

interface CreateUserInput {
  email: string;
  username?: string; // only optional because i use regex for default usernames -- users can change them later in onboarding feature.
  authProvider: string;
  password?: string;
}

const bcrypt = require('bcryptjs');




const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // taken from stack overflow

const isValidPassword = (password: string): boolean =>password.trim().length > 6;


async function checkUserExists(email:string):Promise<boolean> {
  var userdata = await getUserData(email);
  if (!userdata){return false}
  return true
}






// todo encapsulate and make it less duplicated code


export async function createUser({email,username,authProvider,password}: CreateUserInput): Promise<UserData> {
  //console.log("auth picked: ",authProvider);
  
  
  //check if user already exist before making the account
  var user = await checkUserExists(email);
  

  if (user) {throw new Error('USER ALREADY EXISTS')}



  switch(authProvider){
    
    case authProvider = "email":
      if (!password || !email){throw new Error('NULL ERROR!')}

      //validate email and username
      var ok = validateEmail(email);

      if(!ok){throw new Error('invalid email address')}

      ok = isValidPassword(password);
      //500 error due to somehow bypassed frontend filtering! -- honeypot for ip banning in the future.
      // html and js manipulation ban

      if(!ok){throw new Error('invalid password Format')}

      // Garbage clean up
      const cleanEmail = email.trim().toLowerCase();

      // create default username.
      username = email.replace(/@.*/, "");
      

      // hash password
      const hash = await bcrypt.hash(password, 10);

      // generate a user UUID
      var uuid = crypto.randomUUID();
      
      
      var newUser: UserData = {
        accountId: uuid,
        email: cleanEmail,
        username: username,
        password: hash,
        authProvider: "email",
      };


      try{
        const user = await db.collection<UserData>("users").insertOne(newUser);
      
      
        return newUser;
      
        
      

      } catch(error){
         console.error("failed to get user:", error);
         throw error;
      }

    case authProvider = "google":
      if (!email){throw new Error('NULL ERROR!')}

      var ok = validateEmail(email);
      if(!ok){throw new Error('invalid email address')} 
      // idk how this could possibly even happen but i don't trust google.
      // no need to clean up email here due to correct format after google callback

      username = email.replace(/@.*/, "");
      
      uuid = crypto.randomUUID();
      
      var newUser: UserData = {accountId: uuid, email: email,username: username,authProvider: authProvider};

      try{
        const user = await db.collection<UserData>("users").insertOne(newUser);
        return newUser;

      }catch(error){
        console.error("failed to get user:", error);
        throw error;

      }

      // todo make an or union case instead remove duplicated lazy code.
      case authProvider = "github":
        if (!email){throw new Error('NULL ERROR!')}

        var ok = validateEmail(email);
        if(!ok){throw new Error('invalid email address')};
        username = email.replace(/@.*/, "");
        uuid = crypto.randomUUID();
        var newUser: UserData = {accountId: uuid, email: email,username: username,authProvider: authProvider};
        try{
          const user = await db.collection<UserData>("users").insertOne(newUser);
          return newUser;

        }catch(error){
          console.error("failed to get user:", error);
          throw error;

        }

         
      
      default:
        throw new Error(`Unsupported auth provider: ${authProvider}`);
  }














}


export async function getUserData(email: string): Promise<UserData | null> {
  try {
    const user = await db.collection<UserData>("users").findOne({ email });
    return user; // already null if not found
  } catch (error) {
    console.error("failed to get user:", error);
    throw error;
  }
}

