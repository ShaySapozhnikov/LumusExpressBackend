

const bcrypt = require('bcryptjs');


import type { auth,credentials } from '../auth';
import { getUserData } from '../../userService/userServiceFunctions';



const express = require('express');

const router = express.Router();



export class emailLogin implements auth{

    async getAuth(credentials: credentials): Promise<boolean> { // fix to strong syntax remove cred type 
        try{

   
            if(!credentials.email){return false};

            // try to get the users account email first 
            const user = await getUserData(credentials.email); // find a way once authorized pre load this data


            // if object has nothing 
            if(!user) return false;


            // Auth check
            const ismatch = await bcrypt.compare(credentials.password,user.password)

            if(ismatch) {
                // add the cookie session.
                return true;
                
            }

        }
        catch(error)
        {
            return false;
            throw error;
        }

        return false;
    
    }


    async removeAuth(accountId: string): Promise<boolean> {
        // future remove cookie
        return true
        
    }
}

