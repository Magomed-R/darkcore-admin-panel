import { Schema, model } from "mongoose"; 

let groupSchema = new Schema({
    group: String
})

const Group = model("group", groupSchema)

export default Group