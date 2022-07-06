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