const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

router.post("/payment", async (req, res) => {
  try {
    // console.log(req.body);
    const { amount, title } = req.body;
    const stripeToken = req.body.token;
    // console.log(title, amount, stripeToken);
    const response = await stripe.charges.create({
      amount: Number(amount) * 100,
      currency: "eur",
      description: title,
      source: stripeToken,
    });
    // console.log(response);
    res.json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
    // console.log(error.response.data);
  }
});
module.exports = router;
