require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
var _ = require('lodash');
const ejs = require('ejs');

/* Local Modules */
const date = require(__dirname + "/modules/date.js");

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static('public'));

const day = date.getDate();

// Connection (to database) URL
mongoose.connect(process.env.URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const itemsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "String cannot be blank!"]
    }
});

const Item = mongoose.model('Item', itemsSchema);

const item1 = new Item({
    name: "Welcome to your ToDo List!"
});

const item2 = new Item({
    name: "Press + to add a new todo"
});


const item3 = new Item({
    name: "<-- press this button to delete"
});

const defaultItems = [item1, item2, item3];

// Create  a new schema for each single list
// retrieving the items array from itemsSchema
const listSchema = new mongoose.Schema({
    name: String,
    items: [itemsSchema]
});

const List = mongoose.model('List', listSchema);

app.route('/')
    .get((req, res) => {

        Item.find({}, (err, foundItem) => {
            if (foundItem.length === 0) {
                Item.insertMany(defaultItems, (err) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("Element load successfully");
                    }
                });
                res.redirect('/'); // Show finally the items in the list (if run for the first time)
            } else {
                res.render('list', {
                    currentDay: day,
                    itemsList: foundItem,
                    listTitle: "Main"
                });
            }
        });
    })
    .post((req, res) => {
        const itemName = req.body.newItem;
        const listName = req.body.list;

        const item = new Item({
            name: itemName
        });

        if (listName === "Main") {
            item.save();
            res.redirect('/');
        } else {
            List.findOne({
                name: listName
            }, (err, foundList) => {
                foundList.items.push(item); // push items into listSchema array
                foundList.save();
                res.redirect('/lists/' + listName);
            });
        }
    });


// Custom list route
app.get('/lists/:customListName', (req, res) => {

    const customListName = _.capitalize(req.params.customListName);

    List.findOne({
        name: customListName
    }, (err, foundList) => {
        if (err) console.log(err)
        else {
            if (foundList) {
                // Show an existing list
                res.render('list', {
                    currentDay: day,
                    itemsList: foundList.items,
                    listTitle: customListName
                });
            } else {
                // Create a new list
                const list = new List({
                    name: customListName,
                    items: defaultItems
                });

                list.save();

                res.redirect('/lists/' + customListName);
            }
        }
    });
});


app.post('/delete', (req, res) => {
    const itemID = req.body.submit;
    const listName = req.body.listName;

    if (listName === "Main") {
        Item.findByIdAndRemove(itemID, (err) => {
            if (err) {
                console.log(err)
            }
            res.redirect('/');
        });
    } else {
        // Pull from the items array the item with corresponding id
        List.findOneAndUpdate({
            name: listName
        }, {
            $pull: {
                items: {
                    _id: itemID
                }
            }
        }, (err, foundList) => {
            if (!err) {
                res.redirect('/lists/' + listName);
            }
        });
    }


});

let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}

app.listen(port, () => console.log("Server is running on port " + port));