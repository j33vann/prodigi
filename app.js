const express = require('express')
const session = require("express-session")
const body = require("body-parser")
const mongoose = require('mongoose')
const app = express()
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")
const findOrCreate = require("mongoose-findorcreate")
var MongoStore = require('connect-mongo');
const fileUpload = require('express-fileupload');
const { ObjectId } = require('bson')

app.use(body.urlencoded({extended: true}))
app.use(fileUpload())
app.set("view engine", "ejs")

app.use(express.static("public"))

app.use(session({
    store: MongoStore.create({mongoUrl: "mongodb://localhost/prodigi"}),
    secret: "Jeevan2k20",
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 99999999999999
    }
}))

app.use(passport.initialize());
app.use(passport.session())

mongoose.set("strictQuery", false)
mongoose.connect("mongodb://localhost/prodigi", {useNewUrlParser:true, useUnifiedTopology:true})

const userSchema = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    delivery_address: {
        mobile_number: Number,
        house_address: String,
        address_city: String,
        address_pincode: String,
        address_state: String,
        address_country: String
    },
    user_cart: Array,
    isAdmin: Boolean
})

const productSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: String,
    image: String,
    time: String,
})

const couponSchema = new mongoose.Schema({
    code: String,
    off: String
})

const orderSchema = new mongoose.Schema({
    time: String,
    productid: Array,
    userid: String,
    coupon: String,
    done: Boolean,
    affiliate: String
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User = new mongoose.model("user", userSchema)
const Product = new mongoose.model("product", productSchema)
const Coupon = new mongoose.model("coupon", couponSchema)
const Order = new mongoose.model("order", orderSchema)

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

app.get('/', function (req, res) {
    Product.find({}, function(err, doc){
        if(req.isAuthenticated()){
            res.render('index', {auth: "true", id: req.user.id, product: doc})
        } else {
            res.render('index', {auth: "false", product: doc})
        }
    }).sort({time: -1}).limit(4)
})

app.get("/login", function(req, res){
    if(!req.isAuthenticated()){
        res.render("login")
    } else {
        res.redirect("/")
    }
})

app.post("/login", function(req, res, next) {

    User.findOne({username: req.body.username}, function(err, foundUser){
        if(foundUser){
            passport.authenticate('local', function(err, user, info) {
                if (err) { return next(err); }
                if (!user) { console.log("Wrong pawwrod"); return res.redirect("/") }
                req.logIn(user, function(err) {
                  if (err) { console.log(err) } else { return res.redirect("/"); }
                });
              })(req, res, next);
        } else {
            User.register({username: req.body.username, isAdmin: false}, req.body.password, function(err, foundUser){
                if(!err){
                    passport.authenticate('local', function(err, user, info) {
                        if (err) { return next(err); }
                        if (!user) { console.log("Wrong pawwrod"); return res.redirect("/") }
                        req.logIn(user, function(err) {
                          if (err) { console.log(err) } else { return res.redirect("/"); }
                        });
                      })(req, res, next);
                } else {
                    console.log("errror" + err)
                }
            })
        }
    })

})

app.get("/admin-login", function(req, res) {
    res.render("admin-login")
})

app.post("/admin-login", function (req, res, next){
    // User.register({username: req.body.username, isAdmin: true}, req.body.password, function(err, foundUser){
    //     if(!err){
    //         console.log("HEllo")
    //         passport.authenticate('local', function(err, user, info) {
    //             if (err) { return next(err); }
    //             if (!user) { console.log("Wrong pawwrod"); return res.redirect("/") }
    //             req.logIn(user, function(err) {
    //               if (err) { console.log(err) } else { return res.redirect("/"); }
    //             });
    //           })(req, res, next);
    //     } else {
    //         console.log("errror" + err)
    //     }
    // })

    
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { console.log("Wrong pawwrod"); return res.redirect("/") }
        req.logIn(user, function(err) {
          if (err) { console.log(err) } else { return res.redirect("/"); }
        });
      })(req, res, next);

})

app.get("/admin-chat", function(req, res) {
    if(req.isAuthenticated() && req.user.isAdmin == true){
        res.render("admin-chat")
    }
})

app.get("/upload-product", function(req, res) {
    if(req.isAuthenticated() && req.user.isAdmin == true){
        res.render("upload-product")
    }
})

app.post("/upload-product", function(req, res) {
    // Get the file that was set to our field named "image"
    const { image } = req.files;

    // If no image submitted, exit
    //if (!image) return res.sendStatus(400);

    // If does not have image mime type prevent from uploading
    //if (/^image/.test(image.mimetype)) return res.sendStatus(400);

    // Move the uploaded image to our upload folder
    image.mv(__dirname + '/public/upload/' + image.name);

    var product = {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        image: (image.name),
        time: Date.now(),
    }

    Product.create(product, function(err, doc) {
        if(!err){
            res.redirect("/product/" + doc._id)
        } else {
            res.redirect("/")
        }
    })
})

app.get("/product/:url", function(req, res) {
    var ref = "none"
    if(req.query.aff){
        ref = req.query.aff
    }
    Product.findOne({_id: ObjectId(req.params.url)}, function(err, doc) {
        if(!err){
            var uid = "none"
            var auth = "false"
            if(req.isAuthenticated()){
                uid = req.user.id
                auth = "true"
            }
            res.render("product", {img: doc.image, title: doc.title, description: doc.description, price: doc.price, ref: ref, uid: uid, auth: auth})
        } else {
            console.log(err)
        }
    })
})

app.post("/product/:url", function(req, res) {
    if(req.isAuthenticated()){
        var aff = req.params.aff
        User.updateOne({_id: req.user._id}, {$push: {user_cart: {id: req.params.url, quantity: req.body.quantity, affiliate: aff}}}, function(err){
            if(err) {
                res.redirect("/")
            } else {
                res.redirect("/cart")
            }
        })
    } else {
        res.redirect("/login")
    }
})

app.get("/cart", function(req, res){
    if(req.isAuthenticated()) {
        var doc = req.user.user_cart
        var quantarr = []
        var arr = []
        var j = 0
        var i = 0
        var uid = req.user._id
        cartProduct(arr, quantarr, j, i, doc, res, uid)
    } else {
        res.redirect("/login")
    }
})

function cartProduct(arr, quantarr, j, i, doc, res, uid){
    if(i == (doc.length)){
        res.render("cart", {cart: arr, quant: quantarr, uid: uid})
    } else {
        Product.findOne({_id: doc[i].id}, function(err, found) {
            if(!err && found) {
                arr[j] = found
                quantarr[j] = doc[i].quantity
                j += 1
                i += 1
                cartProduct(arr, quantarr, j, i, doc, res, uid)
            } else {
                res.redirect("/")
            }
        })
    }
}

app.post("/coupon", function(req, res) {
    Coupon.findOne({code: req.body.code}, function(err, doc){
        if(!err && doc){
            res.send(doc.off)
        } else {
            res.send("no")
        }
    })
})

app.get("/pay/:id/:disc", function(req, res){
    User.findOne({_id: req.params.id}, function(err, data){
        if(!err && data){
            //console.log(data.delivery_address)
            var i = 0
            var total = 0
            var deli
            if(Object.keys(data.delivery_address).length > 0 && data.delivery_address.address_city != undefined){
                deli = "yes"
            } else {
                if(req.isAuthenticated() && req.params.id == req.user.id){
                    deli = "no"
                } else {
                    //res.redirect("/")
                }
            }
            //console.log(deli + " HAHA " + data.delivery_address.address_city)
            payPro(data.user_cart, i, req.params.disc, res, total, deli)
        }
    })
})

function payPro(doc, i, coup, res, total, deli){
    if(i == (doc.length)){
        Coupon.findOne({code: coup}, function(err, dodo){
            var re = total
            if(!err && dodo){
                re = total - (total * (dodo.off/100))
            } 
            console.log(deli)
            res.render("pay", {amount: re, deli: deli})
        })
    } else {
        Product.findOne({_id: doc[i].id}, function(err, found) {
            if(!err && found) {
                var prop = parseInt(found.price) * parseInt(doc[i].quantity)
                total += prop 
                i += 1
                payPro(doc, i, coup, res, total, deli)
            } else {
                res.redirect("/")
            }
        })
    }
}

app.get("/search", function(req, res){
    Product.find({}, function(err, found){
        if(!err && found){
            res.render("search", {product: found})
        }
    })
})

// app.post("/search", function (req, res){
//     console.log(req.body.searchterm)
//     Product.find({"$text": {"$search": /glossy/i}}, function(err, found){
//         if(!err && found){
//             console.log(found)
//             res.render("search", {product: found})
//         }
//     })
// })

app.get("/admin", function(req, res){
    if(req.isAuthenticated() && req.user.isAdmin == true) {
        res.render("admin")
    } else {
        res.redirect("/")
    }
})

app.post("/add-coupon", function(req, res){
    if(req.body.code != ""){
        var coup = {
            code: req.body.code,
            off: req.body.off
        }

        Coupon.create(coup, function(err){
            if(!err){
                res.redirect("/admin")
            } else {
                res.redirect("/")
            }
        })
    }
})

app.post("/delete-coupon", function(req, res){
    if(req.body.code != ""){

        Coupon.deleteOne({code: req.body.code}, function(err){
            if(!err) {
                res.redirect("/admin")
            } else {
                res.redirect("/")
            }
        })

    }
})

app.post("/create-order", function(req, res){
    if(req.body.city){

        var doc = {
            mobile_number: req.body.number,
            house_address: req.body.address,
            address_city: req.body.city,
            address_pincode: req.body.pincode,
            address_state: req.body.state,
            address_country: req.body.country
        }

        User.updateOne({_id: req.user._id}, {$set: {delivery_address: doc}, $set: {user_cart: []}}, function(err){
            if(!err){
                res.redirect("/")
            } else {
                console.log(err)
            }
        })

    } 
    // else {
    //     User.updateOne({_id: req.user._id}, {$set: {user_cart: []}}, function(err){
    //         if(err){
    //             console.log(err)
    //         }
    //     })
    // }
    var ord = {
        time: Date.now(),
        userid: req.user._id,
        productid: req.user.user_cart,
        coupon: req.body.coupon,
        done: false,
        affiliate: req.query.affiliate
    }
    Order.create(ord, function(err){
        if(!err){
            res.redirect("/")
        }
    })
})

app.get("/current-orders", function(req, res){
    if(req.isAuthenticated() && req.user.isAdmin == true){
        Order.find({done: false}, function(err, doc) {
            if(!err){
                res.render("orders", {doc: doc})
            }
        }).sort({time: -1})
    }
})

app.post("/get-address", function(req, res){
    User.findOne({_id: req.body.id}, function(err, found){
        if(!err){
            res.send(found.delivery_address)
        }
    })
})

app.post("/update-order-done", function(req, res){
    Order.updateOne({_id: req.body.id}, {done: true}, function(err){
        if(!err){
            res.send("done")
        }
    })
})

app.get("/past-orders", function(req, res){
    if(req.isAuthenticated() && req.user.isAdmin == true){
        Order.find({done: true}, function(err, doc) {
            if(!err){
                res.render("orders", {doc: doc})
            }
        }).sort({time: -1})
    }
})

app.get("/logout", function(req, res){
    req.logout(function(err){
        if(!err){
            res.redirect("/")
        }
    })
})

app.listen(3000, function () {
    console.log("Server up and running in port 3000")
})