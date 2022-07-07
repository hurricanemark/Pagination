## Pagination

Given a structured data source in the form of a json array, we can write a middleware function to dice and slice it and return a whole or subset of the same array base on the requested page number and amount of records.  

We can also include processing statistics such as average, total records, etc., in the returned JSON object.  Since the paginated function is a generalized function, processing statistics will be hit and miss.  Missing elements will yield *null* which is perfectly okay.  Ah, this is encroaching upon data minning isn't it!

### Steps to Glue it Together

1. Start a nodeJS project from scratch

`npm init -y`

`npm install express dotenv`

`npm install --save-dev nodemon`

2. Edit package.json file to specify how the project runs.

```
"script" = {
    "dev": "nodemon server.js",
    "start": "node server.sj"
}
```

3. Create file *.env* and specify environment variables that can not be exposed at runtime.  e.g. PORT, NODE_ENV, SECRET, etc.

* Generate random bytes string for use as SECRET

```
PS D:\DEVEL\NODEJS\> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
d7fce4f57c65b2d7617f9ed4600d4f8f4bce7bddc954a73330560a1d8bf32a93
```

<br>   

* Sample content of .env file.  If you elect to use MongoAtlas, then MONGO_URI should be defined in .env 

```
PORT=1975
NODE_ENV=development
SECRET=d7fce4f57c65b2d7617f9ed4600d4f8f4bce7bddc954a73330560a1d8bf32a93
```

<br>   

4.  Create file *server.js* and put up the minimum neccessary server code.

```
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const PORT = process.env.PORT || 3000;
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send("Oy, what's cooking?");
});

app.listen(PORT, () => {console.log("Listening on port %d...", PORT)});
```

5. Test that node project is ready for development.

`npm run dev`

<br>   

<strong>Let's build the middleware!</strong>

1. <strong>A small crossroad:</strong>  Choosing between local MongoDB or cloud hosted MongoAtlas

-  Option 1: By setting up a local mongodb server, you can be free of space/transaction limitation

-  Option 2: By using the hosted MongoAtlas, you are constrained by the limit of one cluster by which storage and transactions are monitored.  Additional charges incurred once you surpassed the upper limits.
    * Create an account with MongoAtlas
    * Copy the URI token into *.env* file

Alas, we choose option 1 by setting up a local db using the [MongoDB Community Server](https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-5.0.9-signed.msi) for windows.

Either option above should provide you with the local agent *MongoDB Compass* which displays connection and collections (ie. tables).

<br>  

2. Create data schemas (mongoose.Schema) in file *./data.js* and export the models.  We want two collections: pagination.Users and pagination.Employees.  Your code should look close to the following:

```
const mongoose = require('mongoose');

const userDataSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true }
});
const userModel = mongoose.model('Users', userDataSchema);


const employeeDataSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: { type: Number, required: true },
    role: { type: String, required: true },
    hobbies: { type: [String], required: true }
});
const employeeModel = mongoose.model('Employees', employeeDataSchema);

module.exports = {
    usermodel: userModel,
    employeemodel: employeeModel
}
```


3. In file *server.js*, implement db connection and populate with data for testing. 

```
/* instantiate collection models */
const Users = require('./data.js').usermodel;        // model in db schema to be used as paramter to middleware function paginatedArrayOfObjects()
const Employees = require('./data.js').employeemodel;     // another model in db schema to be used as paramter to middleware function paginatedArrayOfObjects()

...

/* connect to db server */
const uri = 'mongodb://localhost/pagination';
mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true})
const localMongooseDB = mongoose.connection // get the connection

/* populate data once */
localMongooseDB.once('open', async () => {
    if (await Users.countDocuments().exec() > 0) return

    // populate dabase table with Employees data
    Promise.all([
        Employees.create({ name: 'Mark', age: 30, role: 'Developer', hobbies: ['Coding', 'Gaming']}),
        Employees.create({ name: 'Emily', age: 25, role: 'Designer', hobbies: ['Drawing', 'Singing']}),
        Employees.create({ name: 'Roland', age: 35, role: 'Developer', hobbies: ['Hunting', 'Fishing']}),
        Employees.create({ name: 'Carol', age: 40, role: 'HR', hobbies: ['Reading', 'Swimming'] }),

        Users.create({ name: 'John', email: 'john@mail.com' }),
        Users.create({ name: 'Jane', email: 'jane@mail.com' }),
        Users.create({ name: 'Bob', email: 'bob@mail.com' }),
        Users.create({ name: 'Mary', email: 'mary@mail.com' }),
        Users.create({ name: 'Tom', email: 'tom@mail.com' }),
        Users.create({ name: 'Jack', email: 'jack@mail.com' }),
        Users.create({ name: 'Jill', email: 'jill@mail.com' }),
        Users.create({ name: 'Bill', email: 'bill@email.com' })
    ])
})
```

At the start of server.js, two collections will be populated to batabase named 'pagination'.  You can views them with *MongoDB Compass*.

![pagination data](./public/MongoDB_Compass.PNG)





4. Setup Test Driven Development in VSCode by creating file *request.rest*
This file makes use of REST Client extension and will grow with new test cases as you code along.  Here is a sample:


```
@baseUrl = http://localhost:1975



### Test landing page ###
# @name = LandingPage
GET {{baseUrl}} 
Content-Type: application/x-www-form-urlencoded

###====== TEST Pagination for users data ======###
### return the users array.  We don't know how many users there are, so we just return the first 100 users ###
# @name = UpTo100Records
GET {{baseUrl}}/users?page=1&limit=100 HTTP/1.1


### return the first user.  set page=1 and limit=1.  Notice that the previous page = null
# @name = FirstUser
GET {{baseUrl}}/users?page=1&limit=1&order=asc HTTP/1.1

### return the second user.  Set page=2 and limit=1
# @name = SecondUser
GET {{baseUrl}}/users?page=2&limit=1 HTTP/1.1


### return the last user.  Set page=8 and limit=1.  Notice that next page = null
# @name = LastUser
GET {{baseUrl}}/users?page=8&limit=1&order=desc HTTP/1.1
```

<br>  


### Programming the pagination middleware

The purpose of this is to make the middleware function generalized enough that collection of various models could be injected.  We created two data schemas above to demonstrate this functionality.

Given a data model, function paginatedArrayOfObjects(model) returns a diced and sliced (paginated) result in *res.paginatedResult*

```
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
            
            /* Additional statistic: total records */
            retObj.total =  retObj.results.length;

            /* Additional statistic: averageAge */
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

```

<br>  


<strong>Inject the function into API methods as middleware</strong>

```
app.get('/users', paginatedArrayOfObjects(Users), (req, res) => {
    res.json(res.paginatedResults);
});


app.get('/employees', paginatedArrayOfObjects(Employees), (req, res) => {
    res.json(res.paginatedResults);
});
```

<br>  

#### Tests

<strong>Query:</strong>

```
@baseUrl = http://localhost:1975

### get first 4 employees, starting from the second employee ###
# @name = UpTo100Records
GET {{baseUrl}}/employees?page=2&limit=4 HTTP/1.1
```

<br>   

<strong>Output</strong>

```
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 600
ETag: W/"258-L/WP6BAlmR45NQwftLqa7mrFGKU"
Date: Wed, 06 Jul 2022 09:21:19 GMT
Connection: close

{
  "next": {
    "page": 3,
    "limit": 4
  },
  "previous": {
    "page": 1,
    "limit": 4
  },
  "results": [
    {
      "_id": "62c54bc696b2d22060ae258b",
      "name": "Kyle",
      "age": 45,
      "role": "Staff Engineer",
      "hobbies": [
        "Travel",
        "Youtubing"
      ],
      "__v": 0
    },
    {
      "_id": "62c54bc696b2d22060ae258c",
      "name": "Jack",
      "age": 50,
      "role": "Maintenance",
      "hobbies": [
        "Jogging",
        "Photography"
      ],
      "__v": 0
    },
    {
      "_id": "62c54bc696b2d22060ae258d",
      "name": "Tim",
      "age": 55,
      "role": "CTO",
      "hobbies": [
        "Coding",
        "Sleeping",
        "Eating"
      ],
      "__v": 0
    },
    {
      "_id": "62c54bc696b2d22060ae258f",
      "name": "Samuel",
      "age": 65,
      "role": "Marketing",
      "hobbies": [
        "Volunteering",
        "Callecting Rocks"
      ],
      "__v": 0
    }
  ],
  "total": 4,
  "averageAge": 53.75
}
```

<br>  

## Conclusion

Pagination is used in many popular websites to display similar data in sequential manner.  Youtube is a good example. Google search engine has numbering pages at the bottom.  Picture thumbnail is a pagination.  Carousel cards in web frame is pagination.  

It no doubt enables better user experience and is one of the best navigation methods for human GUI. When you take time to step through the neccessary pieces of the purzle, your skills get stacked with another layer, the pagination layer. 