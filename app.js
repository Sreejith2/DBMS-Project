const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const app = express();
const port =8000;

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(session({
    secret: "your-secret-key", 
    resave: false,
    saveUninitialized: true
}));
const buses = [
];
mongoose.connect("mongodb://127.0.0.1:27017/busDB", { useNewUrlParser: true });

// Define a user schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true }
});

//Define busSchema
const busSchema = new mongoose.Schema({
    busId:{type:String,required:true},
    from:{type:String,required:true},
    to:{type:String,required:true},
    date:{type:Date,required:true},
    totalSeats:{type:Number,required:true},
    availSeats:{type:Number,required:true},
});

//Define myBookingSchema
const myBookingsSchema = new mongoose.Schema({
    username:{type:String,required:true},
    date:{type:Date,required:true},
    busName:{type:String,required:true},
    from:{type:String,required:true},
    to:{type:String,required:true},
    no_of_tickets:{type:Number,required:true}
});

const myBookings = mongoose.model("bookingDetails",myBookingsSchema);
const User = mongoose.model("users", userSchema);
const Bus = new mongoose.model("buses",busSchema);

app.get("/",(req,res)=>{
    res.render("index",{Heading:"Login"});
});

app.get("/signup",(req,res)=>{
    res.render("signup",{Heading:"SignUp"});
});

app.get("/home",(req,res)=>{
    res.render("home");
});

app.get("/book",(req,res)=>{
    res.render("book",{buses:buses});
});

app.post("/login",async (req,res)=>{
    const{username,password}=req.body;
    try{
        const user = await User.findOne({username:username});
        if(!user){
            console.log("Not a user");
            res.render("error",{Heading:"Error",Errormsg:"Not a user"});
        }else{
            if(user.password===password){
                req.session.username = username;
                res.redirect("/home");
                console.log("You are logged in");
            }else{
                console.log("Incorrect login credentials");
                res.render("error",{Heading:"Error",Errormsg:"Incorrect login credentials"});
            }
        }
    }catch(err){
        console.log(err);
    }
});


app.post("/signup",async (req,res)=>{
    const{username,password}=req.body;
    try{
        const existingUser = await User.findOne({username:username});
        if(existingUser){
            console.log("Username already exist");
            res.render("error",{Heading:"Error",Errormsg:"Username already exist"});
        }else{
            newUser = new User({
                username:username,
                password:password
            });
            await newUser.save();
            console.log("You are added");
            res.render("error",{Heading:"Successful",Errormsg:"You are added"});
        }
    }catch(err){
        console.log(err);
    }
});



app.post("/book",async(req,res)=>{
    const{from,to,date}=req.body;
    try{
        const filteredBuses = await Bus.find({
            from:from,
            to:to,
            date:date
        });
        res.render("book",{buses:filteredBuses});
    }catch(err){
        console.log(err);
    }
});

app.post("/book/:busId", async (req, res) => {
    const { busId } = req.params;
    const user = req.session.username;
    console.log(user);
    const { quantity } = req.body;

    try {
        const bus = await Bus.findById(busId);

        if (!bus) {
            return res.status(404).send("Bus not found");
        }

        if (quantity > bus.availSeats) {
            return res.status(400).send("Not enough available seats");
        }

        bus.availSeats = bus.availSeats-parseInt(quantity);
        await bus.save();
        const alreadyBooked = await myBookings.findOne({username:user,date:bus.date,busName:bus.busId,from:bus.from,to:bus.to});
        if(!alreadyBooked){
            newBooking = new myBookings({
                username:user,
                date:bus.date,
                busName:bus.busId,
                from:bus.from,
                to:bus.to,
                no_of_tickets:quantity
            });
            await newBooking.save();
        }else{
            alreadyBooked.no_of_tickets = alreadyBooked.no_of_tickets+ parseInt(quantity);
            await alreadyBooked.save();
        }
        res.redirect("/book"); 

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.get("/myBookings",async(req,res)=>{
    const user = req.session.username;
    try{
        const bookings = await myBookings.find({username:user});
        res.render("myBookings",{bookings:bookings});
    }catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.post("/cancel-ticket/:ticketId", async (req, res) => {
    const { ticketId } = req.params;
    try {
        const booking = await myBookings.findById(ticketId);

        if (!booking) {
            return res.status(404).send("Ticket not found");
        }

        const numTicketsToCancel = booking.no_of_tickets;

        const bus = await Bus.findOne({
            busId: booking.busName,
            date: booking.date,
            from: booking.from,
            to: booking.to,
        });

        if (!bus) {
            return res.status(500).send("Bus information not found");
        }

        bus.availSeats += numTicketsToCancel;

        await bus.save();

        await myBookings.deleteOne({ _id: ticketId });

        res.redirect("/myBookings");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});


app.listen(process.env.PORT|port,()=>{
    console.log(`Server initiated at ${port}`);
});
