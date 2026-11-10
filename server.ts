

require('dotenv').config();

//services imports 

import authRoutes from './AuthService/AuthService';

const userRoutes = require('./userService/userService')

import adminRoutes from './AdminService/AdminService';

import webRoutes from './WebService/WebService'; // the Lumus website pages

import nunjucks from 'nunjucks';

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
   
    // Passport // also bypass we dont need auth here thank you regex
    if (/^\/(google|github)(\/callback)?$/.test(req.path) || req.path === '/failed') return next();

    const key = req.get('API-Key');
    if (key == process.env.API_KEY) { next(); }
    else { res.status(401).json({ "Error": "unauthorized" }); }
})



////////////////////////





const express = require('express');

const app = express();

const port = process.env.PORT;


// views/ templates (.njk), autoescape so user data can't inject html
// noCache in dev so template edits show up without a restart
nunjucks.configure(path.join(__dirname, 'views'), {
    autoescape: true,
    express: app,
    noCache: process.env.NODE_ENV !== 'production'
});
app.set('view engine', 'njk');




app.use(responseTime()); // curl -I X-Response-Time header 




app.use(express.json()); // i am not creating my own json parser lol

app.use(express.urlencoded({ extended: true })); // html form bodies etc

app.use(cookieParser()); // fills req.cookies so i dont need to make a custom parser 

app.use(passport.initialize());

app.use('/auth', requireApiKey,authRoutes)

app.use('/user',requireApiKey, userRoutes)


app.use('/admin', adminRoutes) // login/logout are open, the router's guard blocks the rest of /admin


// public static files requirment tecnicly render/vercel automaticly can do this but for the sake of the requirment here u go
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', webRoutes); // website pages: /, /get-started, /verify-email, /forgot-password, /home, /api/*



// 404 
app.use((req: Request, res: Response) => {
    res.status(404).render('pages/error.njk', {status: 404});
});

// 500 
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).render('pages/error.njk', {status: 500}, (renderErr: any, html: string) => {
        // if the error page itself breaks fall back to the plain static one
        if (renderErr) return res.sendFile(path.join(__dirname, 'public/500.html'));
        res.send(html);
    });
});



//#todo create a health check for init server 
// to make sure api key is set all env values are valid and exist etc


app.listen(port, ()=>{console.log(`Lumus server running on ${port}`);});




