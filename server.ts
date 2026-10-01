
require('dotenv').config();

const express = require('express');

const app = express();

const port = process.env.PORT;


app.get('/ping' , (req : any,res: any) =>{
    res.send('pong');

});

app.listen(port, ()=>{
    console.log(`Lumus server running on ${port}`);

});



