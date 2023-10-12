import { Schema, model } from "mongoose"; 

let mailingSchema = new Schema({
    text: String,
    status: String
})

const Mailing = model("mailing", mailingSchema)

export default Mailing