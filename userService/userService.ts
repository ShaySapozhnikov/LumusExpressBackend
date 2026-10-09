import { createUser } from "./userServiceFunctions";

const express = require('express');

const router = express.Router();




router.get('/ping', (req:any ,res:any) =>{
    res.send('Pong from user services')
})



router.post('/createUser', async (req:any,res:any) =>{
    const {email,username,password,authProvider} = req.body;
    
    const user = await createUser({email,username,password,authProvider});

    if(!user){
        res.status(500).json({error: "failed to create user"});
    }

    // authenticate the user with get auth

    res.send(user)
    // store the user in cache so we can use oop userFunctions later on;
});




module.exports = router;

