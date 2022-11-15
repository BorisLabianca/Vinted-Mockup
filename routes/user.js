const express = require("express");
const router = express.Router();
const fileUpload = require("express-fileupload");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;

const User = require("../models/User");
const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};
router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    const { username, email, password, newsletter } = req.body;

    // console.log(req.body);
    if (!username || !password || !email) {
      return res.status(400).json({
        message: "One or more parameters are missing",
      });
    }
    const doesUserExist = await User.findOne({ email: email });
    if (doesUserExist) {
      return res.status(409).json({
        message: "This email address is already linked to an account",
      });
    }

    const salt = uid2(16);
    const hash = SHA256(salt + password).toString(encBase64);
    // console.log(salt + password);
    // console.log(hash);
    const token = uid2(64);
    const picture = convertToBase64(req.files.avatar);
    const newUser = new User({
      email: email,
      account: { username: username },
      newsletter: newsletter,
      token: token,
      hash: hash,
      salt: salt,
    });
    // await newUser.save();
    // const savedData = await User.findOne({ email: email });
    // console.log(savedData._id);
    const userId = newUser.id;
    const uploadedPicture = await cloudinary.uploader.upload(picture, {
      folder: `/vinted/user/${userId}`,
    });
    newUser.account.avatar = uploadedPicture;
    await newUser.save();
    res
      .status(200)
      .json({ _id: newUser._id, token: token, account: newUser.account });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    // console.log(loginInfo);

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Both your email address and password are required" });
    }
    const savedInfo = await User.findOne({ email: email });
    // console.log(savedInfo);
    if (!savedInfo) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const newHash = SHA256(savedInfo.salt + password).toString(encBase64);
    // console.log(newHash);
    // console.log(savedInfo.hash);
    if (newHash !== savedInfo.hash) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.status(200).json({
      _id: savedInfo._id,
      token: savedInfo.token,
      account: savedInfo.account,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
module.exports = router;
