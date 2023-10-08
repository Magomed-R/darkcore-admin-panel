import { Schema, model } from "mongoose"; 

let buttonSchema = new Schema({
    order: Number,
    text: String,
    url: String
})

const Button = model("button", buttonSchema)

export default Button