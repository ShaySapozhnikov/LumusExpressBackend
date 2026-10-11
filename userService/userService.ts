
const express = require('express');

const router = express.Router();




router.get('/ping', (req:any ,res:any) =>{
    res.send('Pong from user services')
})


// user removal etc or more user data like fetch users pets , inventory stats can go here







module.exports = router;

