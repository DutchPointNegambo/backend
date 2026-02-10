import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    firstName:{
        type: String,
        required: true,
        trim: true,
    },
    lastName:{
        type: String,
        required: true,
        trim: true,
    },
    email:{
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    phone:{
        type: String,
        required: true,
        trim: true,
    },
    password:{
        type: String,
        required: true,
        minlength: 6,
    },
    role:{
        type: String,
        enum: ['guest', 'staff', 'admin'],
        default: 'guest',
    },
}, {
    timestamps: true,
})

userSchema.pre('save', async function(next) {
    if(!this.isModified('password')){
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
})
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
}
const User = mongoose.model('User', userSchema);

export default User;