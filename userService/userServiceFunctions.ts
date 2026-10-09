import { error } from "node:console";
import { db } from "../dbServices/mongoClient";







export interface UserData {
  accountId: string;
  email: string;
  username: string;
  password: string; 
  authProvider:string
}

interface CreateUserInput {
  email: string;
  username: string;
  authProvider: string;
  password?: string;
}

const bcrypt = require('bcryptjs');




const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // taken from stack overflow

const isValidUsername = (username: string): boolean =>username.trim().length > 0;


async function checkUserExists(email:string):Promise<boolean> {
  var userdata = await getUserData(email);
  if (!userdata){return false}
  return true
}






export async function createUser({email,username,authProvider,password}: CreateUserInput): Promise<UserData> {
  //console.log("auth picked: ",authProvider);
  
  
  //check if user already exist before making the account
  var user = await checkUserExists(email);


  if (user) {throw new Error('USER ALREADY EXISTS')}

  switch(authProvider){
    

    case authProvider = "email":
      if (!password ||!username || !email){throw new Error('NULL ERROR!')}

      //validate email and username
      var ok = validateEmail(email);

      if(!ok){throw new Error('invalid email address')}

      ok = isValidUsername(username);

      if(!ok){throw new Error('invalid Username Format')}

      // Garbage clean up
      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = username.trim()


      
      // hash password
      const hash = await bcrypt.hash(password, 10);

      // generate a user UUID
      const uuid = crypto.randomUUID();
      
      
      const newUser: UserData = {
        accountId: uuid,
        email: cleanEmail,
        username: cleanUsername,
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

