import {Request, Response, NextFunction} from 'express';
import passport from '../AuthService/passport';
import {GenerateNewToken, checkToken, verifyEmailWithToken, resetPasswordWithToken, TokenStatus} from '../AuthService/AuthService';

////////////////////////////////////////////////
// WebService
// the Lumus website (was the SvelteKit app), rendered with Nunjucks from /views/pages
// calls the auth functions directly instead of going over http with the API key
////////////////////////////////////////////////

const express = require('express');
const path = require('path');

const router = express.Router();

const CODE_LENGTH = 6;
const MIN_PASSWORD = 8;

type VerificationType = 'EmailVerfication' | 'PasswordReset';
type Step = 'email' | 'code' | 'password' | 'done';

const titles: Record<VerificationType, Partial<Record<Step, string>>> = {
    EmailVerfication: {code: 'Verify your email', done: 'Email verified'},
    PasswordReset: {email: 'Forgot your password?', code: 'Check your email', password: 'Set a new password', done: 'Password updated'}
};

// blog posts live here until there is a db collection for them
// {category, title, excerpt, readingTime, paragraphs: string[]}
const posts: {category: string, title: string, excerpt: string, readingTime: string, paragraphs: string[]}[] = [];


//////////////////////////////////////////////////////////////////////////////
// helpers

const isEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email);

function normalizeEmail(value: unknown) {
    return String(value ?? '').trim().toLowerCase();
}

function asString(value: unknown) {
    return typeof value === 'string' ? value : '';
}

// the code comes in as 6 separate inputs named "code" (array) or one pasted string
function readCode(value: unknown) {
    const raw = Array.isArray(value) ? value.join('') : String(value ?? '');
    return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

// Only these fields go in the URL i dont need the @mong ID
function homeUrl(user: any) {
    const safe = {
        accountId: user?.accountId,
        email: user?.email,
        username: user?.username,
        authProvider: user?.authProvider,
        emailVerified: user?.emailVerified
    };
    return `/home?user=${encodeURIComponent(JSON.stringify(safe))}`;
}

function verifyEmailUrl(email: string, message?: string) {
    const params = new URLSearchParams({email});
    if (message) params.set('message', message);
    return `/verify-email?${params}`;
}

// runs one of the passport local strategies and hands back the result instead of answering the request
function authenticateLocal(strategy: string, req: Request, res: Response, next: NextFunction): Promise<{user: any, info: any}> {
    return new Promise((resolve, reject) => {
        passport.authenticate(strategy, {session: false}, (err: any, user: any, info: any) => {
            if (err) return reject(err);
            resolve({user, info});
        })(req, res, next);
    });
}

// sending an email can throw, the page should show a message instead of the 500 page
async function sendCode(email: string, type: 'emailVerification' | 'passwordReset'): Promise<boolean> {
    try {
        return await GenerateNewToken(email, type);
    } catch (err) {
        console.error(err);
        return false;
    }
}

// turns a rejected token into something the user can act on
function codeMessage(check: TokenStatus) {
    if (check.message.includes('expired')) return 'That code has expired. Request a new one.';
    if (check.message.includes('Too many')) return 'Too many attempts. Request a new code.';
    return 'That code is incorrect. Check it and try again.';
}


//////////////////////////////////////////////////////////////////////////////
// landing page (home / blog / shop views switch client side, see public/js/landing.js)

router.get('/', (req: Request, res: Response) => {
    res.render('pages/landing.njk', {posts});
});


//////////////////////////////////////////////////////////////////////////////
// sign in / sign up

function renderGetStarted(res: Response, status: number, data: Record<string, unknown> = {}) {
    return res.status(status).render('pages/get-started.njk', {
        mode: 'signin', email: '', formError: '', emailError: '', passwordError: '',
        ...data
    });
}

router.get('/get-started', (req: Request, res: Response) => {
    // a failed OAuth sign-in comes back here with ?message=...
    return renderGetStarted(res, 200, {
        mode: req.query.mode === 'signup' ? 'signup' : 'signin',
        formError: asString(req.query.message)
    });
});

router.post('/get-started', async (req: Request, res: Response, next: NextFunction) => {
    const mode = req.body.mode === 'signup' ? 'signup' : 'signin';
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password ?? '');

    const invalid = (errors: Record<string, string>) => renderGetStarted(res, 400, {mode, email, ...errors});

    if (!isEmail(email)) return invalid({emailError: 'Enter a valid email address.'});
    if (!password) return invalid({passwordError: 'Enter your password.'});
    if (mode === 'signup' && password.length < MIN_PASSWORD) return invalid({passwordError: `Use at least ${MIN_PASSWORD} characters.`});

    // passport reads these off the body
    req.body.email = email;
    req.body.password = password;

    if (mode === 'signin') {
        const {user, info} = await authenticateLocal('email-login', req, res, next);

        // Account exists but the email was never confirmed: send a fresh code and finish verification
        if (info?.message === 'NotVerified') {
            const sent = await sendCode(email, 'emailVerification');
            return res.redirect(303, verifyEmailUrl(email, sent ? undefined : 'Could not send a code. Use "resend code" below.'));
        }
        if (!user) return invalid({formError: info?.message || 'Incorrect email or password.'});

        return res.redirect(303, homeUrl(user));
    }

    const {user, info} = await authenticateLocal('email-signup', req, res, next);
    if (!user) return invalid({formError: info?.message || 'Could not create your account.'});

    // Sign-up doesn't send the code itself, so request it before showing the code screen
    const sent = await sendCode(email, 'emailVerification');
    return res.redirect(303, verifyEmailUrl(email, sent ? undefined : 'Could not send a code. Use "resend code" below.'));
});


//////////////////////////////////////////////////////////////////////////////
// code verification pages
// EmailVerfication: code -> done
// PasswordReset:    email -> code -> password -> done
// each step is a form post, the page re-renders on the next step (hidden inputs carry email/code forward)

function renderVerify(res: Response, status: number, type: VerificationType, step: Step, data: Record<string, unknown> = {}) {
    return res.status(status).render('pages/verify-code.njk', {
        type, step,
        isReset: type === 'PasswordReset',
        action: type === 'PasswordReset' ? '/forgot-password' : '/verify-email',
        title: titles[type][step],
        codeLength: CODE_LENGTH,
        minPassword: MIN_PASSWORD,
        email: '', code: '',
        formError: '', emailError: '', codeError: '', passwordError: '', confirmError: '', notice: '',
        // the code was just sent when landing on the code step, so the resend link starts on cooldown
        startCooldown: step === 'code',
        ...data
    });
}

router.get('/verify-email', (req: Request, res: Response) => {
    // Sign-up redirects here with ?email=...
    return renderVerify(res, 200, 'EmailVerfication', 'code', {
        email: normalizeEmail(req.query.email),
        formError: asString(req.query.message)
    });
});

router.post('/verify-email', async (req: Request, res: Response) => {
    const email = normalizeEmail(req.body.email);
    const render = (status: number, step: Step, data: Record<string, unknown> = {}) =>
        renderVerify(res, status, 'EmailVerfication', step, {email, ...data});

    if (!isEmail(email)) return render(400, 'code', {formError: 'Enter a valid email address.', startCooldown: false});

    if (req.body.intent === 'resend') {
        const sent = await sendCode(email, 'emailVerification');
        if (!sent) return render(400, 'code', {formError: 'Could not send the code. Please try again.', startCooldown: false});
        return render(200, 'code', {notice: `A new code is on its way to ${email}.`});
    }

    const code = readCode(req.body.code);
    if (code.length !== CODE_LENGTH) {
        return render(400, 'code', {codeError: `Please enter the complete ${CODE_LENGTH} character verification code.`, startCooldown: false});
    }

    const check = await verifyEmailWithToken(email, code);
    if (!check.status) return render(400, 'code', {codeError: codeMessage(check), startCooldown: false});

    return render(200, 'done');
});


router.get('/forgot-password', (req: Request, res: Response) => {
    return renderVerify(res, 200, 'PasswordReset', 'email', {
        email: normalizeEmail(req.query.email),
        formError: asString(req.query.message)
    });
});

router.post('/forgot-password', async (req: Request, res: Response) => {
    const email = normalizeEmail(req.body.email);
    const intent = asString(req.body.intent);
    const render = (status: number, step: Step, data: Record<string, unknown> = {}) =>
        renderVerify(res, status, 'PasswordReset', step, {email, ...data});

    if (!isEmail(email)) return render(400, 'email', {emailError: 'Enter a valid email address.'});

    // step 1 (and resend): send the code
    if (intent === 'send' || intent === 'resend') {
        const sent = await sendCode(email, 'passwordReset');
        if (!sent) {
            const formError = 'Could not send the code. Check the email address and try again.';
            return intent === 'send' ? render(400, 'email', {formError}) : render(400, 'code', {formError, startCooldown: false});
        }
        return render(200, 'code', intent === 'resend' ? {notice: `A new code is on its way to ${email}.`} : {});
    }

    const code = readCode(req.body.code);
    if (code.length !== CODE_LENGTH) {
        return render(400, 'code', {codeError: `Please enter the complete ${CODE_LENGTH} character verification code.`, startCooldown: false});
    }

    // step 2: only check the code here; the reset step checks it again and uses it up
    if (intent === 'verify') {
        const check = await checkToken(email, 'passwordReset', code, false);
        if (!check.status) return render(400, 'code', {codeError: codeMessage(check), startCooldown: false});
        return render(200, 'password', {code});
    }

    // step 3: new password
    if (intent === 'reset') {
        const password = String(req.body.password ?? '');
        const confirmPassword = String(req.body.confirmPassword ?? '');

        if (password.length < MIN_PASSWORD) return render(400, 'password', {code, passwordError: `Use at least ${MIN_PASSWORD} characters.`});
        if (password !== confirmPassword) return render(400, 'password', {code, confirmError: "Passwords don't match."});

        const check = await resetPasswordWithToken(email, code, password);
        // Wrong or expired code: send the user back to re-enter it
        if (!check.status) return render(400, 'code', {codeError: codeMessage(check), startCooldown: false});

        return render(200, 'done');
    }

    return render(400, 'email', {formError: 'Something went wrong. Please try again.'});
});


//////////////////////////////////////////////////////////////////////////////
// signed in page (TEMP: user comes in the query string until sessions are in place)

router.get('/home', (req: Request, res: Response) => {
    let user: Record<string, unknown> | null = null;
    try {
        const raw = asString(req.query.user);
        if (raw) user = JSON.parse(raw);
    } catch {
        user = null;
    }
    return res.render('pages/home.njk', {user});
});


//////////////////////////////////////////////////////////////////////////////
// public api

// The AuthService OAuth callbacks redirect here with ?result=<JSON>.
router.get('/api/auth/callback', (req: Request, res: Response) => {
    const raw = asString(req.query.result);
    if (!raw) return res.redirect(303, '/get-started');

    let result;
    try {
        result = JSON.parse(raw);
        // may be JSON-encoded twice; unwrap if so
        if (typeof result === 'string') result = JSON.parse(result);
    } catch {
        return res.redirect(303, '/get-started');
    }

    if (!result?.success) {
        return res.redirect(303, `/get-started?message=${encodeURIComponent(result?.message ?? 'Unknown error')}`);
    }

    return res.redirect(303, homeUrl(result.data));
});

router.get('/api/getImage', (req: Request, res: Response) => {
    res.set({'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600'});
    return res.type('image/jpeg').sendFile(path.join(__dirname, '../public/site-image.jpg'));
});

router.get('/api/getName', (req: Request, res: Response) => {
    res.set('Access-Control-Allow-Origin', '*');
    return res.json({name: 'Lumus'});
});


export default router;
