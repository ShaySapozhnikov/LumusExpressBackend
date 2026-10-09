


import { emailLogin } from "./AuthOptions/emailLogin";
const express = require('express');
const router = express.Router();





const emailAuth = new emailLogin();

// #todo service health test check
router.get('/ping' , (req : any,res: any) =>{
    res.send('pong from auth');

});




router.post('/emailLogin', async (req:any, res:any) => {
    
    const {email, password } = req.body; 

    if (!email || !password) {return res.status(400).json({ error: 'Email and password required' })};

    try {
        const ok = await emailAuth.getAuth({email,password});
        
        if(!ok){
            return res.status(401).json({success: false});

        }

        return res.status(200).json({ success: true });
    

    }
    catch(error){
        console.log("Login Error: ",error);
        return res.status(500).json({error: "server error"});
    }
});

module.exports = router;


