

require('dotenv').config();

//services imports 

const authRoutes = require('./AuthService/AuthService');

const userRoutes = require('./userService/userService')






///////////////////////
//middle wares 
var responseTime = require('response-time'); // for future analytics.




////////////////////////





const express = require('express');

const app = express();

const port = process.env.PORT;



//todo add a API key middleware for auth + user services only
app.use(responseTime()); // curl -I X-Response-Time header 




app.use(express.json());

app.use('/auth', authRoutes)
app.use('/user', userRoutes)


app.listen(port, ()=>{console.log(`Lumus server running on ${port}`);});




