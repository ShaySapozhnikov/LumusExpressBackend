

require('dotenv').config();

//services imports 

const authRoutes = require('./AuthService/AuthService');

const userRoutes = require('./userService/userService')






///////////////////////
//middle wares 
var responseTime = require('response-time'); // for future analytics.

import {Request,Response,NextFunction } from 'express';
import passport from './AuthService/passport';


/// api key middleware flexible due to public api routes for future users calls for modding etc 
// i want user data to be fetchable to anyone if they create a custom key for themselves (#todo)


const requireApiKey = ((req: Request, res: Response, next: NextFunction) =>{
    const key = req.get('API-Key');   

    if(key == process.env.API_KEY){next();}

    else{
        res.status(401).json({"Error":"unauthorized"});
    }
})



////////////////////////





const express = require('express');

const app = express();

const port = process.env.PORT;




app.use(responseTime()); // curl -I X-Response-Time header 




app.use(express.json()); // i am not creating my own json parser lol 

app.use(passport.initialize());

app.use('/auth',requireApiKey, authRoutes)

app.use('/user',requireApiKey, userRoutes)



//#todo create a health check for init server 
// to make sure api key is set all env values are valid and exist etc


app.listen(port, ()=>{console.log(`Lumus server running on ${port}`);});




