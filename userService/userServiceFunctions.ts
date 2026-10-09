import { db } from "../dbServices/mongoClient";


interface UserData {
  accountId: string;
  email: string;
  username: string;
  password: string; 
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

