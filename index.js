const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId, ObjectID } = require('mongodb');
const jwt = require('jsonwebtoken');

require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l5x6aei.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}


async function run() {
  try {
    const productCollection = client.db('SocialMedia').collection('productCollection');
    const categoryCollection = client.db('SocialMedia').collection('categoryCollection');
    const userCollection = client.db('SocialMedia').collection('userCollection');
    const bookProductCollection = client.db('SocialMedia').collection('bookProductCollection');
    const paymentsCollection = client.db('SocialMedia').collection('payments');

    app.get('/categoryCollection', async (req, res) => {

      const query = {};
      const options = await categoryCollection.find(query).toArray();
      res.send(options);
    });

    app.get('/category/:id', async (req, res) => {
      const id = req.params.id;
      const query = { category_id: id };
      const category_product = await productCollection.find(query).toArray();
      res.send(category_product);
    })

    // app.get("/productcategory", async (req, res) => {
    //   const query = {};
    //   const result = await categoryCollection
    //     .find(query)
    //     .project({ name: 1 })
    //     .toArray();
    //   res.send(result);
    // });


    app.get('/product', async (req, res) => {
      const query = {};
      const product = await productCollection.find(query).toArray();
      res.send(product);
    });
    app.post("/product", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '5d' })
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: '' })
    });
    //payment
    app.post('/create-payment-intent', async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: 'usd',
        amount: amount,
        "payment_method_types": [
          "card"
        ]
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId
      const filter = { _id: ObjectId(id) }
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId
        }
      }
      const updatedResult = await bookProductCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })
    //payment

    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    })
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(filter);
      res.send(result);
    })


    app.get("/bookedProduct", async (req, res) => {
      const email = req.query.email;
      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }

      const query = { email: email };
      const bookings = await bookProductCollection.find(query).toArray();
      res.send(bookings);
    });

    app.get("/bookedProduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const bookings = await bookProductCollection.findOne(query).toArray();
      res.send(bookings);
    });

    app.get("/myProduct", async (req, res) => {
      const seller = req.query.seller;
      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }

      const query = { seller: seller };
      const myProduct = await productCollection.find(query).toArray();
      res.send(myProduct);
    });


    app.post('/bookedProduct', async (req, res) => {
      const product = req.body;
      const result = await bookProductCollection.insertOne(product);
      res.send(result);
    })

    app.get('/users', async (req, res) => {
      const query = {};
      const users = await userCollection.find(query).toArray();
      res.send(users);
    });
    app.get('/allbuyer', async (req, res) => {

      const query = { usertype: 'buyer' };
      // console.log('usdaas',usertype);
      const users = await userCollection.find(query).toArray();
      res.send(users);
    });

    app.get('/allSeller', async (req, res) => {

      const query = { usertype: 'seller' };

      const users = await userCollection.find(query).toArray();
      res.send(users);
    });

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email }
      const user = await userCollection.findOne(query);
      res.send({ isAdmin: user?.usertype });
    })

    // app.get('/users/verify/:email', async (req, res) => {
    //   const email = req.params.email;
    //   const query = { email }
    //   const user = await userCollection.findOne(query);
    //   res.send({ isAdmin: user?.usertype === 'verify' });
    // });


    // app.put('/users/verify/:id', async (req, res) => {
    //   // const decodedEmail = req.decoded.email;
    //   // const query = { email: decodedEmail };
    //   const user = await userCollection.findOne(query);

    //   // if (user?.usertype !== 'verify') {
    //   //   return res.status(403).send({ message: 'forbidden access' })
    //   // }

    //   const id = req.params.id;
    //   const filter = { _id: ObjectId(id) }
    //   const options = { upsert: true };
    //   const updatedDoc = {
    //     $set: {
    //       usertype: 'verify'
    //     }
    //   }
    //   const result = await userCollection.updateOne(filter, updatedDoc, options);
    //   res.send(result);
    // })


  }
  finally {

  }
}
run().catch(console.log);





app.get('/', (req, res) => {
  res.send('SocialMedia server response');
});

app.get('/categoryCollection', (req, res) => {
  res.send();
});




app.listen(PORT, () => console.log(`SocialMedia server running ${PORT}`));
