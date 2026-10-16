




import {Request, Response ,NextFunction} from 'express';
import passport from "./passport"; // my strategy pattern and middle man for nay auth i need in the future 
import { createUser, getUserData,UserData } from "../userService/userServiceFunctions";
import { promises } from 'node:dns';
import { db } from '../dbServices/mongoClient';
import { sendEmail } from '../emailService/EmailService';
import { randomBytes } from 'node:crypto';


////////////////////////////////////////////////
// AuthService V1.0

//TODO#
//clean up needed later for one Concrete res back to app stick to (Boolean,Message)
// poor performance on sending token needs a shoot and forget.

// security tests needed

// testCase for init needed

////////////////////////////////////////////////


const express = require('express');


const router = express.Router();

const bcrypt = require('bcryptjs');


// just formatting makes it easier in the router.
var gmailPassportOptions = passport.authenticate('google', { session: false, failureRedirect: `${process.env.WEB_APP_URL}/api/auth/callback?result=${encodeURIComponent(JSON.stringify({success: false, message: 'Google sign-in failed'}))}` })

// OAuth callbacks are hit by the browser, so send it back to the web app instead of answering with JSON.
// TEMP: the user is passed in the query string until sessions/tokens are in place.
function redirectToApp(res: Response, result: { success: boolean, data?: any, message?: string }) {
    return res.redirect(`${process.env.WEB_APP_URL}/api/auth/callback?result=${encodeURIComponent(JSON.stringify(result))}`);
}


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
    passport.authenticate('email-signup', {session: false}, (err:any, user:any, info:any) =>
    {
      
        if (err) return res.status(500).json({ success: false, error: 'Server error'});
        if (!user) return res.status(401).json({ success: false, error: info?.message ?? 'SignUp failed (unknown error)' });
        
        res.status(200).json({success: true,data:user})


    })
    
    (req,res,next);
});



//////////////////////////////////////////////////////////////////////////////
// email reset password flow needed + any token verification .

interface token_model{
    tokenID:string,
    email:string,
    token:string,
    tokenType:string
    date:Date
    attempts?:number
}

const MAX_TOKEN_ATTEMPTS = 5;

export const ADMIN_SESSION_MS = 48 * 60 * 60 * 1000; // 48 hours

//#todo need to crate a seprate model file for all models for easy access instead of this 
interface admin_model{
    username:string,
    adminEmail:string,
    active: boolean
}


export interface session_model{
    userEmail:string,
    sessionType: "admin" | "defaultUser"
    sessionHash: string
    ExpiryDate: Date
}


type tokenType = "passwordReset" | "emailVerification" | "AdminVerfication"

type TokenStatus = {
    status: boolean,
    message: string,
    sessionHash?: string
}






async function GenerateNewToken(email:string,tokenType:tokenType): Promise<boolean>
{
    /////////////////////
    //IMPROVEMENTS NEEDED
    // refactor for fire and forget for emails  slowing down res time to 2.5s with all the await chains.
    /////////////////////

    if(!email){return false}

    // for now bypass unitl i fix the db for admins as also users 
    if(tokenType !== "AdminVerfication"){
        var checkUserExists = await getUserData(email);
        if(!checkUserExists){return false};
    }

    // check if past token existed  and delete it if route gets called again 

    var pastToken = await db.collection<token_model>("tokens").findOneAndDelete({email,tokenType:tokenType})

    //needs logger for cron if fails 
    /////////////////

    const today = new Date();

    var newToken :token_model =
    {
        // base 36  = "0.q5x8..."
        // take the second index ignore 0.
        // sets up 6 Alpha Numeric code
        

        tokenID: crypto.randomUUID(),
        email: email,
        token: Math.random().toString(36).substring(2, 8).toUpperCase(),
        tokenType:tokenType,
        date: today

    }


    try{

        switch(tokenType){
            // this can also eventuly needs to be cleaned up
            case tokenType = "passwordReset":
                var token = await db.collection<token_model>("tokens").insertOne(newToken);
                if(!token){return false;}
                await sendEmail(email,"password reset : Lumus",`Your verification Code: ${newToken.token}`); // needs check
                return true;
            

            case tokenType = "emailVerification":
                token = await db.collection<token_model>("tokens").insertOne(newToken);
                if(!token){return false;}
                await sendEmail(email,"Email Verification : Lumus",`Your verification Code: ${newToken.token}`); // needs check
                return true;

            case tokenType = "AdminVerfication":
                token = await db.collection<token_model>("tokens").insertOne(newToken);
                if(!token){return false;}
                await sendEmail(email,"Admin Verification : Lumus",`Your verification Code: ${newToken.token}`); // needs check
                return true;
                
            default:
                // no token type
                return false;

        }
        

    }catch(err){
        throw new Error('failed to save token and send')
    }
}

// consume = false only checks the token (used to validate a reset code before the new password is sent)
async function checkToken(email:string, tokenType:tokenType, token:string, consume:boolean = true): Promise<TokenStatus>
{


    var Status: TokenStatus= {
        status:false,
        message: "init"

    }

    function setStatus(status:boolean,message:string){
        Status.status = status;
        Status.message = message;

    }

    var Token = await db.collection<token_model>("tokens").findOne({email, tokenType: tokenType})
    console.log(Token)
    if(!Token){
        setStatus(false,"invalid Email or Verification Code");
        return Status;
    }

    const today = new Date();
    const expirationTime = new Date(Token.date);
    expirationTime.setHours(expirationTime.getHours() + 24);

    if(today > expirationTime){
        setStatus(false,"Verification Code expired please Generate a new one");
        return Status;
    }

    if (Token?.token == token && Token?.tokenType == tokenType){
        setStatus(true,"Token Validated");
        if(consume) await db.collection<token_model>("tokens").findOneAndDelete({email, tokenType: tokenType})
        // add a logger for internal clean up if needed later on a cronjob if deletion failed #feat
        return Status;
        
    }


    
    // $inc json type allows us to incrment by defualt 

    const updated = await db.collection<token_model>("tokens").findOneAndUpdate({_id: Token._id}, {$inc: {attempts: 1}}, {returnDocument: "after"});

    if (!updated || (updated.attempts ?? 0) >= MAX_TOKEN_ATTEMPTS) {

        await db.collection<token_model>("tokens").deleteOne({_id: Token._id});

        setStatus(false,"Too many attempts please Generate a new Verification Code");

        return Status;
    }

    setStatus(false,"invalid Email or Verification Code");
    return Status;
}


 // this also validates the admin username acc!
// could have been seprated mabie a fueture refactor - shay
export async function SendAuthSessionTokenAdmin(credentails:any) :Promise <TokenStatus> {
    


    const username = credentails.username;

    const Status: TokenStatus = {
        status: false,
        message: ""
    };


    // #todo need to make this a global function later on!
    function setStatus(status:boolean,message:string){
        Status.status = status;
        Status.message = message;

    }

    if (!username) {
        setStatus(false,"username is null!")
        return Status;
    }


    var validAdmin = await db.collection<admin_model>("AdminUsers").findOne({username})


    //was going to fo hey admin not exists but to much info for non validated users 
    // up to interpertation later on if needed.  
    
    if(!validAdmin){setStatus(false,"Invalid admin username or password "); return Status} 
    if (!validAdmin?.adminEmail){setStatus(false,"please contact admin sevices"); return Status}




    var sendToken = await GenerateNewToken(validAdmin?.adminEmail,"AdminVerfication");

    if(!sendToken){setStatus(false,"failed to send email!"); return Status}


    setStatus(true,"success!");
    return Status
}




//#todo needs a type! for validation!
export async function validateAdminAuthSessionToken(credentails:any) :Promise<TokenStatus> {
    const Status: TokenStatus = {
        status: false,
        message: "",
        sessionHash:""
    };
    // #todo need to make this a global function later on!
    function setStatus(status:boolean,message:string,hash: string = ""){
        Status.status = status;
        Status.message = message;
        Status.sessionHash = hash;

    }
    const username = credentails.username;
    if (!username) {
        setStatus(false,"username is null!")
        return Status;
    }
    
    var validAdmin = await db.collection<admin_model>("AdminUsers").findOne({username})

    if (!validAdmin?.adminEmail){setStatus(false,"email is null!");return Status;}

     // consume always for admin high risk

    var check = await checkToken(validAdmin?.adminEmail,"AdminVerfication",credentails.token,true)
    
    if(!check.status){setStatus(false,check.message);return Status;}
    

    const ExpiryDate = new Date(Date.now() + ADMIN_SESSION_MS);
    
    // web does not support radombytes had to import here 
    const hash = randomBytes(16).toString("hex");
    
    var newSession = await db.collection<session_model>("sessions").insertOne(
    {
        userEmail: validAdmin.adminEmail,
        sessionType: "admin",
        sessionHash: hash,
        ExpiryDate: ExpiryDate
    });

    
    setStatus(true,"success!",hash);
    return Status
}









////////////////////////////////////////////////////////////////////////////////////////////////////////
// reset flow


router.post('/sendResetPasswordToken', async (req:Request, res:Response)=>{
    const {email} = req.body;
    var ok = await GenerateNewToken(email,"passwordReset");
    if(ok){
        return res.status(200).json({"success": true});
    }
    else{
        res.status(400).json({"success": false, "message": "User does not exist with this email."});
    }
});


// checks a reset code without using it up, so the client can confirm it before asking for a new password
router.post('/verifyResetPasswordToken', async (req:Request, res:Response) => {
    const {email,token} = req.body;

    var data = await checkToken(email,"passwordReset",token,false)

    if(!data.status){return res.status(401).json({"success": false,"message":data.message});}

    return res.status(200).json({"success": true});
});


router.post('/resetPassword', async (req:Request, res:Response) => {
    const {email,token,password} = req.body;

    var data = await checkToken(email,"passwordReset",token)

    if(!data.status){return res.status(401).json({"success": false,"message":data.message});}
    
    const hash = await bcrypt.hash(password, 10);

    await db.collection("users").updateOne({email},{$set:{password: hash}})

    return res.status(200).json({"success": true});
});



//////////////////////////////////////////////////////////////////////////////
//email verification

router.post('/verifyEmail', async (req:Request,res:any) =>{

    //// doing this for the sake of it in case there is some delay etc 
    /// don't want to waste resources here.

    const user = await getUserData(express)
    
    if(user?.emailVerified == true){
        return res.status(200).json({"success": true, "message": "already verified"});
    }
  

    const {email,token} = req.body;

    var data = await checkToken(email, "emailVerification",token)

    if(!data.status){return res.status(401).json({"success": false,"message":data.message});}

    //#bug review needed make sure that status of the update went threw or create a cron job in the future
    await db.collection("users").updateOne({email},{$set:{emailVerified: true}}) 


    return res.status(200).json({"success": true});
})

router.post('/sendEmailVerificationToken' ,async (req:Request, res:any) =>{
    const {email} = req.body    

    var token = await GenerateNewToken(email,"emailVerification")

    if(!token){return res.status(500).json({"success": false,"message":"could not create token!"})}
    
    
    return res.status(200).json({"success": true});

});






//////////////////////////////////////////////////////////////////////////////







//google



router.get('/google',passport.authenticate('google',{scope:['email'], session: false})); 

router.get('/google/callback', gmailPassportOptions, async(req: Request, res: Response) => {

    const profile = (req as any).user;
    
    if (!profile) {
      return redirectToApp(res, {success: false, message: 'No email returned by Google'});
    }

    // check if user exists 
    var user = await getUserData(profile.email)

    
    //check init auth provider if its email or github use that instead avoid broken privilege escalation by 
    //broken access what if users google account gets hacked does this mean anyone with his google account 
    // can use this account conversely with github or any auth.
    if (user && user?.authProvider == "google"){
        return redirectToApp(res, {success: true, data: user})
    }

    if(user){return redirectToApp(res, {success: false, message: "Please sign in using your original sign in method."})}


    try{
        // email is verified by 0Auth already
        const user = await createUser({email: profile.email, authProvider:"google",emailVerified:true}) 
        return redirectToApp(res, { success: true, data: user });
    }
    catch(error){
        return redirectToApp(res, {success: false, message: 'Server error'})
    }
  }
);



//////////////////////////////////////////////////////////////////////////////
//github


router.get('/github',passport.authenticate('github',{scope: ['user:email']}));  // github needs this specific scope for email


  
    

router.get('/github/callback',passport.authenticate('github', {session: false}), async (req: Request, res: Response) => {
        
    const profile = (req as any).user;
    if (!profile) {
        return redirectToApp(res, {success: false, message: 'No profile returned by GitHub'});
    }
    var user = await getUserData(profile.email)

    
    if (user && user?.authProvider == "github"){
        return redirectToApp(res, {success: true, data: user})
    }
    if(user){return redirectToApp(res, {success: false, message: "Please sign in using your original sign in method."})}

    try{
        const user = await createUser({email: profile.email, authProvider:"github",emailVerified:true})
        return redirectToApp(res, { success: true,data: user });
    }
    catch(error){
        return redirectToApp(res, {success: false, message: 'Server error'})
    }
  });


export default router;


