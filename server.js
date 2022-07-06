'use strict';
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const PORT = process.env.PORT || 4000;
const express = require('express');
const app = express();

const mongoose = require('mongoose');
const Users = require('./data.js').usermodel;        // model in db schema to be used as paramter to middleware function paginatedArrayOfObjects()
const Employees = require('./data.js').employeemodel;     // another model in db schema to be used as paramter to middleware function paginatedArrayOfObjects()

// Set up mongoose connection locally because .env doesn't have MONGO_URI defined in this code base.
// IMPORTANT: If this is a localhost connection.  you must run the mongodb server locally before running this server.
const uri = process.env.MONGO_URI || 'mongodb://localhost/pagination';
mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true})
    .then(console.log(`MongoDB database connected with readyState = ${mongoose.connection.readyState}`))
	.catch(error => console.log(error))

const localMongooseDB = mongoose.connection // get the connection

// populate the database with some data only once
localMongooseDB.once('open', async () => {
    if (await Users.countDocuments().exec() > 0) return

    // populate dabase table with Employees data
    Promise.all([
        Users.create({ name: 'John', email: 'john@abc.com' }),
        Users.create({ name: 'Jane', email: 'jane@abc.com' }),
        Users.create({ name: 'Bob', email: 'bob@abc.com' }),
        Users.create({ name: 'Mary', email: 'mary@abc.com' }),
        Users.create({ name: 'Tom', email: 'tom@abc.com' }),
        Users.create({ name: 'Jack', email: 'jack@abc.com' }),
        Users.create({ name: 'Jill', email: 'jill@abc.com' }),
        Users.create({ name: 'Bill', email: 'bill@email.com' }),
        Employees.create({ name: 'Mark', age: 30, role: 'Developer', hobbies: ['Coding', 'Gaming']}),
        Employees.create({ name: 'Emily', age: 25, role: 'Designer', hobbies: ['Drawing', 'Singing']}),
        Employees.create({ name: 'Roland', age: 35, role: 'Developer', hobbies: ['Hunting', 'Fishing']}),
        Employees.create({ name: 'Carol', age: 40, role: 'HR', hobbies: ['Reading', 'Swimming'] }),
        Employees.create({ name: 'Kyle', age: 45, role: 'Staff Engineer', hobbies: ['Travel', 'Youtubing']}),
        Employees.create({ name: 'Jack', age: 50, role: 'Maintenance', hobbies: ['Jogging', 'Photography']}),
        Employees.create({ name: 'Tim', age: 55, role: 'CTO', hobbies: ['Coding', 'Sleeping', 'Eating']}),
        Employees.create({ name: 'Jay', age: 60, role: 'Sale', hobbies: ['Shopping', 'Travelling']}),
        Employees.create({ name: 'Samuel', age: 65, role: 'Marketing', hobbies: ['Volunteering', 'Callecting Rocks']}),
        Employees.create({ name: 'Candy', age: 70, role: 'Operation Manager', hobbies: ['Yelling', 'Smilling while yelling']})
    ]).then(() => {
        console.log('Just did it.  Database is populated with Users collection and Employees collection.');
    }).catch(MongooseError => {
        console.log("MongooseError: ", MongooseError);
    }).catch(err => {
        console.log("localMongooseDB error: ", err);
    });

});




/* Landing page */
// app.get('/', (req, res) => {
//     res.send('Hello World!');
// });

app.get('/', (req, res) => {
    res.send("Oy, what's cooking?");
});


/*
 Retrieve all or some users via middleware function passing in the users array.
 The middleware function will return the paginated results to the response object.
 Passing parameter Users (a model defined in mongoose schema) in ./data.js
*/
app.get('/users', paginatedArrayOfObjects(Users), (req, res) => {
    res.json(res.paginatedResults);
});



/* 
 Retrieve all or some employees via middleware function passing in the users array.
 The middleware function will return the paginated results to the response object.
 Passing parameter (model) Employees in ./data.js
 */
app.get('/employees', paginatedArrayOfObjects(Employees), (req, res) => {
    res.json(res.paginatedResults);
});

/*
 Generalized middleware function that paginates through an array of objects.
 If the page number is not provided, it will default to 1.
 If the limit is not provided, it will default to 10.
 Return keys might be null if the array elemenets do not have the same keys.
 for example, retObj.averageAge might be null if the array elements do not have the same age property.
*/
function paginatedArrayOfObjects(model) {
    return async (req, res, next) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const startIndex = (page -1) * limit;
        const endIndex = page * limit;

        const retObj = {}
        try {
            if (endIndex < await model.countDocuments().exec()) {
                retObj.next = {
                    page: page + 1,
                    limit: limit
                }
            } else {
                retObj.next = null;
            }
        } catch (err) {
            console.log(err);
        }

        if (startIndex > 0) {
            retObj.previous = {
                page: page - 1,
                limit: limit
            }
        } else {
            retObj.previous = null;
        }

        try {
            retObj.results = await model.find().limit(limit).skip(startIndex).exec();
            
            retObj.total =  retObj.results.length;

            retObj.averageAge = retObj.results.reduce((acc, curr) => {
                return acc + curr.age;
            } , 0) / retObj.results.length;

            res.paginatedResults = retObj;  // Attach the paginated results to the response object (res.paginatedResults) to be returned.
            next();

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}


app.listen(PORT, () => {
    console.log('Pagination app listening on port ' + PORT +' ...');
});