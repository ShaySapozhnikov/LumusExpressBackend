import {Request, Response, NextFunction} from 'express';



////////////////////////////////////////////////
// AdminService
// for security email verfication to admin user

// #todo add server stats functions here !
// for now just haveing download basic stat file
// #todo create an admin creation service curently validates only env vars but has ability to do db cross validation!
////////////////////////////////////////////////

const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const router = express.Router();

import {db} from '../dbServices/mongoClient';

import {SendAuthSessionTokenAdmin, validateAdminAuthSessionToken, session_model, ADMIN_SESSION_MS} from "../AuthService/AuthService"


const COOKIE_NAME = 'admin_session';


/// 1000ms in a sec
const SESSION_MS = ADMIN_SESSION_MS; // 48 hours, same as the session in the db

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;


const cookieOptions = {
    httpOnly: true,  //cant do document.cookie lol
    secure: process.env.NODE_ENV === "production", // serve the cookie threw https if logged                              
    sameSite: 'strict' as const, // only my site                   
    path: '/admin',
};



// cookie is stored as json {date, hash}, cookie-parser in server.ts parses it back into an object
function getAdminCookie(req: Request): {date: number, hash: string} | null {
    const value = req.cookies?.[COOKIE_NAME];
    if (!value || typeof value !== 'object') return null;

    const {date, hash} = value;
    if (typeof date !== 'number' || typeof hash !== 'string' || !hash) return null;

    return {date, hash};
}


// check with the db if its valid and not expired
//"guard"
async function isAdminLoggedIn(req: Request): Promise<boolean> {
    const cookie = getAdminCookie(req);
    if (!cookie || cookie.date < Date.now()) return false;

    const session = await db.collection<session_model>("sessions").findOne({sessionHash: cookie.hash, sessionType: "admin"});
    if (!session || new Date(session.ExpiryDate) < new Date()) return false;

    return true;
}




// send page func easy access to error updates etc /defult empty only use message for errors
async function sendPage(res: Response, file: string, message: string = "") {
    const html = await fs.readFile(path.join(__dirname, '../views', file), 'utf8');
    return res.send(html.replace('{{status}}', message));
}




// login + verify + logout are registered before the guard at the bottom, otherwise you'd need to be logged in to log in

// GET /admin/login: show the form (or skip it if already logged in)
router.get('/login', async (req: Request, res: Response) => {
    if (await isAdminLoggedIn(req)) return res.redirect('/admin/');
    return sendPage(res, 'admin-login.html');
});


router.get('/verify', async (req: Request, res: Response) => {
    return sendPage(res, 'admin-verify.html'); // null will just handle 
});





router.post('/adminlogin', async (req: Request, res: Response) => {

    //skips
    if (await isAdminLoggedIn(req)) return res.redirect(303, '/admin/');

    const {username, password} = req.body;


    // env checks so an unset or empty ADMIN_USERNAME / ADMIN_PASSWORD never lets anyone in
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD || username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return sendPage(res, 'admin-login.html', 'Invalid admin username or password'); // debateing adding more info
    }

    // validates the admin username and sends the code to the admin email
    const sent = await SendAuthSessionTokenAdmin({username}); 
    
    if (!sent.status) return sendPage(res, 'admin-login.html', sent.message);

    return res.redirect(303, '/admin/verify');  // send them to the page 
});


// POST /admin/verify: check the email code, create the session and set the cookie
router.post('/verify', async (req: Request, res: Response) => {

    if (!ADMIN_USERNAME) return sendPage(res, 'admin-login.html', 'Invalid admin username or password'); // LOOP BACK

    const check = await validateAdminAuthSessionToken({username: ADMIN_USERNAME, token: req.body.token});

    if (!check.status || !check.sessionHash) return sendPage(res, 'admin-verify.html', check.message);

    
    // we are all good!
    res.cookie(COOKIE_NAME, {
        date: Date.now() + SESSION_MS, hash: check.sessionHash
    }, {...cookieOptions, maxAge: SESSION_MS}); 



    return res.redirect(303, '/admin/'); // can now fianly go to admin
});


router.post('/logout', async (req: Request, res: Response) => {
    // no point i think for a cookie null check 
    const cookie = getAdminCookie(req);
    // kill session
    if (cookie) await db.collection<session_model>("sessions").deleteOne({sessionHash: cookie.hash, sessionType: "admin"});

    res.clearCookie(COOKIE_NAME, cookieOptions);
    return res.json({success: true});
});




// middle ware for all the routes here hey please have cookie! for all req,res
router.use(async (req: Request, res: Response, next: NextFunction) => {
    if (await isAdminLoggedIn(req)) return next();
    return res.redirect('/admin/login');
});


// GET /admin/serverStats: downloads the latest server stats as a json file
// only the title and server time for now, more stats get added here later
router.get('/serverStats', (req: Request, res: Response) => {
    const now = new Date();

    const stats = {
        title: "Server Stats",
        serverDate: now.toLocaleDateString(),
        serverTime: now.toLocaleTimeString(),
        timestamp: now.toISOString()
    };

    res.attachment("serverStats.json"); // makes the browser download it instead of showing it
    return res.send(JSON.stringify(stats, null, 2)); // json // replaceing any by regez/ how many spaces beten each key:value
});




async function sendDashboard(res: Response, greeting: string) {
    const html = await fs.readFile(path.join(__dirname, '../views/admin/index.html'), 'utf8');
    return res.send(html.replace('{{greeting}}', greeting));
}


async function sendLocked(res: Response, message: string) {
    const html = await fs.readFile(path.join(__dirname, '../views/admin-locked.html'), 'utf8');
    return res.status(403).send(html.replace('{{message}}', message));
}


// the AdminUsers record check  "the guard already checked the session is valid"
async function getSessionAdmin(req: Request) {
    const cookie = getAdminCookie(req);
    if (!cookie) return null;

    const session = await db.collection<session_model>("sessions").findOne({sessionHash: cookie.hash, sessionType: "admin"});
    if (!session) return null;

    return db.collection<{username: string, adminEmail: string, active: boolean}>("AdminUsers").findOne({adminEmail: session.userEmail});
}

function adminUrl(admin: {username: string, active: boolean}) {
    return `/admin/${encodeURIComponent(admin.username)}/${admin.active === true}`;
}




// Guard condition inaase user just /  so they wouldent get {{greeting}}
router.get('/', async (req: Request, res: Response) => {
    const admin = await getSessionAdmin(req);

    // valid session but no admin behind it, show locked instead of login
    if (!admin?.active) return sendLocked(res, 'Unknown admin status, please contact the administrator.');

    return res.redirect(adminUrl(admin));
});



router.get('/:adminname{/:adminstatus}', async (req: Request, res: Response) => {
    const admin = await getSessionAdmin(req);
    if (!admin) return sendLocked(res, 'Unknown admin status, please contact the administrator.');

    //bounce to the real one cross check 
    if (req.params.adminname !== admin.username || req.params.adminstatus !== String(admin.active === true)) {
        return res.redirect(adminUrl(admin));
    }

    if (admin.active === true) return sendDashboard(res, `Hello ${(admin.username)}`); // html we are replaceing

    return sendLocked(res, 'Account has been deactivated, please contact the administrator.');
});



export default router;
