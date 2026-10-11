




import {Request, Response ,NextFunction} from 'express';
import passport from "./passport"; // my strategy pattern and middle man for nay auth i need in the future 
import { createUser, getUserData } from "../userService/userServiceFunctions";




const express = require('express');


const router = express.Router();


// just formatting makes it easier in the router.
var gmailPassportOptions = passport.authenticate('google', { session: false, failureRedirect: '/auth/failed' })


// #todo service health test check
router.get('/ping' , (req : any,res: any) =>{
    res.send('pong from auth');

});

router.post('/emailLogin', (req: Request, res: Response, next: NextFunction) => {

  passport.authenticate('email-login', { session: false }, (err: any, user: any, info: any) => { 

    //(err: any, user: any, info: any) is the callback.

    if (err) return res.status(500).json({ success: false, error: 'Server error'});
    if (!user) return res.status(401).json({ success: false, error: info?.message ?? 'Login failed (unknown error)' });

    return res.status(200).json({ success: true, data: user });
  
})(req, res, next); // hey hand this off to passport 
});


router.post('/emailSignUp',(req:any,res:any, next:NextFunction) =>{
    passport.authenticate('email-signup', {session: false}, (err:any, user:any, info:any) =>{
      
        if (err) return res.status(500).json({ success: false, error: 'Server error'});
        if (!user) return res.status(401).json({ success: false, error: info?.message ?? 'SignUp failed (unknown error)' });
        
        res.status(200).json({success: true,data:user})


    })(req,res,next);
});



//////////////////////////////////////////////////////////////////////////////
// email reset password flow needed.



//////////////////////////////////////////////////////////////////////////////
//google



router.get('/google',passport.authenticate('google',{scope:['email'], session: false})); 






router.get('/google/callback', gmailPassportOptions, async(req: Request, res: Response) => {
   


    



    const profile = (req as any).user;
    
    if (!profile) {
      return res.status(400).json({ error: 'No email returned by Google' });
    }

  

    // check if user exists 
    var user = await getUserData(profile.email)

    
    //check init auth provider if its email or github use that instead avoid broken privilege escalation by 
    //broken access what if users google account gets hacked does this mean anyone with his google account 
    // can use this account conversely with github or any auth.
    if (user && user?.authProvider == "google"){
        return res.status(200).json({success: true,data: user})
    }

    if(user){return res.status(401).json({success: false, message: "Please sign in using your original sign in method."})}


    try{
        const user = await createUser({email: profile.email, authProvider:"google"})
        return res.status(200).json({ success: true,data: user });
    }
    catch(error){
        return res.status(500).json(error)
    }
  }
);



//////////////////////////////////////////////////////////////////////////////
//github


router.get('/github',passport.authenticate('github',{scope: ['user:email']}));  // github needs this specific scope for email


  
    

router.get('/github/callback',passport.authenticate('github', {session: false}), async (req: Request, res: Response) => {
        
    const profile = (req as any).user;
    if (!profile) {
        return res.status(400).json({ error: 'profile returned by github' });
    }
    var user = await getUserData(profile.email)

    
    if (user && user?.authProvider == "github"){
        return res.status(200).json({success: true,data: user})
    }
    if(user){return res.status(401).json({success: false, message: "Please sign in using your original sign in method."})}

    try{
        const user = await createUser({email: profile.email, authProvider:"github"})
        return res.status(200).json({ success: true,data: user });
    }
    catch(error){
        return res.status(500).json(error)
    }
  });
























module.exports = router;


