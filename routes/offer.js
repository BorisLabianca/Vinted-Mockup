const express = require("express");
const router = express.Router();
const fileUpload = require("express-fileupload");
const isAuthenticated = require("../middlewares/isAuthenticated");
const cloudinary = require("cloudinary").v2;

const Offer = require("../models/Offer");
const User = require("../models/User");
const convertToBase64 = require("../functions/convertToBase64");

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      const { title, description, price, condition, city, brand, size, color } =
        req.body;
      if (
        !title ||
        !description ||
        !price ||
        !condition ||
        !city ||
        !brand ||
        !size ||
        !color ||
        !req.files
      ) {
        return res.status(400).json({ message: "Missing parameters." });
      }
      if (description.length > 500) {
        return res.status(404).json({
          message: "The description must be shorter than 500 characters",
        });
      }
      if (title.length > 50) {
        return res.status(404).json({
          message: "The title must be shorter than 50 characters",
        });
      }
      if (price > 100000) {
        return res.status(404).json({
          message: "The price must be lower than 100000 euros",
        });
      }
      // console.log(uploadedPicture);
      // console.log(uploadedPicture);
      // console.log(picture);
      // console.log(req.user);
      // console.log(req.files);
      // console.log(req.body);
      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          { marque: brand },
          { taille: size },
          { état: condition },
          { couleur: color },
          { emplacement: city },
        ],
        owner: req.user,
      });
      if (req.files?.image) {
        const uploadedPicture = await cloudinary.uploader.upload(
          convertToBase64(req.files.image),
          {
            folder: `/vinted/offer/${newOffer.id}`,
          }
        );
        newOffer.product_image = uploadedPicture;
      } else {
        return res.status(404).json({
          message: "A product picture is required to submit the offer.",
        });
      }
      // if (req.files?.picture && req.files.picture.length !== 0) {
      //   const arrayOfPicturesUrl = [];
      //   req.files.picture.forEach(async (file) => {
      //     const result = await cloudinary.uploader.upload(
      //       convertToBase64(file),
      //       { folder: `/vinted/offer/${newOffer.id}` }
      //     );
      //     arrayOfPicturesUrl.push(result.secure_url);
      //     if (arrayOfPicturesUrl.length === req.files.picture.length) {
      //       return arrayOfPicturesUrl;
      //     }
      //     console.log(arrayOfPicturesUrl);
      //   });
      //   newOffer.product_pictures = arrayOfPicturesUrl;
      // }
      if (req.files?.picture && req.files.picture.length !== 0) {
        const arrayOfPicturesUrl = [];
        // console.log(req.files?.picture);
        // const getUrls = async () => {
        for (let i = 0; i < req.files.picture.length; i++) {
          let result = await cloudinary.uploader.upload(
            convertToBase64(req.files.picture[i]),
            {
              folder: `/vinted/offer/${newOffer.id}`,
            }
          );
          arrayOfPicturesUrl.push(result.secure_url);

          // if (arrayOfPicturesUrl.length === req.files.picture.length) {
          //   return arrayOfPicturesUrl;
          // }
        }

        // };
        // console.log(arrayOfPicturesUrl);
        newOffer.product_pictures = arrayOfPicturesUrl;
      }

      // console.log(newOffer);
      // await newOffer.save();
      // console.log(req.files.picture);
      // const picture = convertToBase64(req.files.picture);

      await newOffer.save();
      // const userInfoToDisplay = await Offer.findById(offerId).populate(
      //   "owner",
      //   "account"
      // );
      // // console.log(userInfoToDisplay);
      // const infoToSend = {
      //   product_name: newOffer.product_name,
      //   product_description: newOffer.product_description,
      //   product_price: newOffer.product_price,
      //   product_details: newOffer.product_details,
      //   owner: {
      //     account: userInfoToDisplay.owner.account,
      //     _id: req.user.id,
      //   },
      //   product_image: newOffer.product_image.secure_url,
      // };
      res.status(200).json(newOffer);
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: error.message });
    }
  }
);

router.get("/offers", async (req, res) => {
  try {
    const { title, priceMin, priceMax, sort, limit, page } = req.query;
    // console.log(page);
    const regExp = new RegExp(title, "i");
    const filter = {};
    if (title) {
      filter.product_name = regExp;
    }
    // let priceTag = {};

    if (priceMin && priceMax) {
      filter.product_price = { $gte: priceMin, $lte: priceMax };
    } else if (priceMin && !priceMax) {
      filter.product_price = { $gte: priceMin };
    } else if (!priceMin && priceMax) {
      filter.product_price = { $lte: priceMax };
    }
    // console.log(filter);
    let skip = 0;
    if (!page) {
      skip = 0;
    } else {
      skip = (Number(page) - 1) * limit;
    }
    // console.log(skip);
    const sorting = {};
    if (sort === "price-desc") {
      sorting.product_price = "desc";
    } else if (sort === "price-asc") {
      sorting.product_price = "asc";
    }
    // console.log(sorting);

    const allOffers = await Offer.find(filter)
      .sort(sorting)
      .skip(skip)
      .limit(limit)
      .select()
      .populate("owner", "account _id");
    const offerCount = await Offer.countDocuments(filter);
    res.status(200).json({ count: offerCount, offers: allOffers });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    if (!req.params) {
      return res.status(400).json({ message: error.message });
    }
    // console.log(req.params);
    const offerById = await Offer.findById(req.params.id).populate(
      "owner",
      "account"
    );
    // console.log(offerById);
    res.status(200).json(offerById);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
});

router.put("/offer/update", isAuthenticated, async (req, res) => {
  try {
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
});

router.delete("/offer/delete", isAuthenticated, async (req, res) => {
  try {
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
