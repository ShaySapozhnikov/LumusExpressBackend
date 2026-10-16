

require('dotenv').config();

//services imports 

import authRoutes from './AuthService/AuthService';

const userRoutes = require('./userService/userService')

import adminRoutes from './AdminService/AdminService';

const path = require('path');






///////////////////////
//middle wares 
var responseTime = require('response-time'); // for future analytics.
const cookieParser = require('cookie-parser');

import {Request,Response,NextFunction } from 'express';
import passport from './AuthService/passport';


/// api key middleware flexible due to public api routes for future users calls for modding etc 
// i want user data to be fetchable to anyone if they create a custom key for themselves (#todo)

const requireApiKey = ((req: Request, res: Response, next: NextFunction) => {
   
    // Passport verifies these by exchanging the code with the provider.
    if (/^\/(google|github)(\/callback)?$/.test(req.path) || req.path === '/failed') return next();

    const key = req.get('API-Key');
    if (key == process.env.API_KEY) { next(); }
    else { res.status(401).json({ "Error": "unauthorized" }); }
})



////////////////////////





const express = require('express');

const app = express();

const port = process.env.PORT;




app.use(responseTime()); // curl -I X-Response-Time header 




app.use(express.json()); // i am not creating my own json parser lol

app.use(express.urlencoded({ extended: true })); // html form bodies etc

app.use(cookieParser()); // fills req.cookies so i dont need to make a custom parser 

app.use(passport.initialize());

app.use('/auth', requireApiKey,authRoutes)

app.use('/user',requireApiKey, userRoutes)


app.use('/admin', adminRoutes) // login/logout are open, the router's guard blocks the rest of /admin



// 404 
app.use((req: Request, res: Response) => {
    res.status(404).sendFile(path.join(__dirname, 'public/404.html'));
});

// 500 
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).sendFile(path.join(__dirname, 'public/500.html'));
});



//#todo create a health check for init server 
// to make sure api key is set all env values are valid and exist etc


app.listen(port, ()=>{console.log(`Lumus server running on ${port}`);});




