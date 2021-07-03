import asyncHandler from "express-async-handler";
import generateToken from "../utils/generateToken.js";
import User from "../models/userModel.js";
import { sendMail } from "../utils/sendMailCotroller.js";
import History from "../models/historyModel.js";
// @desc    Auth user & get token
// @route   POST /api/v1/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
      refreshToken: generateToken(user._id, "refreshToken"),
      accountID: user.accountId,
      isVerified: user.isVerified,
      balance: user.balance,
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});
// @desc    Register User
// @route   POST /api/v1/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, pin, balance } = req.body;

  const userExists = await User.findOne({ email });

  let user;
  if (userExists) {
    res.status(400).json("User already exists");
  } else {
    const createAccountId = await User.findOne(
      {},
      { sort: { _id: -1 }, limit: 1 },
      async (err, lastUser) => {
        // res.json({ name: lastUser + "last User" });
        if (lastUser) {
          const { _id } = lastUser;
          const getPrevUser = await User.findById(_id);
          const prevAccountId = getPrevUser.accountId;
          const accountId = prevAccountId + 1;
          user = await User.create({
            name,
            email,
            password,
            pin,
            accountId: accountId,
          });
          console.log(user);

          if (user) {
            res.json(user);
          } else {
            res.status(400).json("Invalid user data");
          }
        } else {
          user = await User.create({
            name,
            email,
            password,
            pin,
            accountId: 110011,
            balance: balance ? balance : 0,
          });
          res.json(user);
        }
      }
    );
  }
});

// @desc    Get user profile
// @route   GET /api/v1/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -pin");

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Get all users
// @route   GET /api/v1/register
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const { user } = req;
  if (user) {
    await user.remove();
    res.json({ message: "User removed" });
  } else {
    res.status(404).json("User not found");
  }
});
const deleteAllUser = asyncHandler(async (req, res) => {
  const user = await User.deleteMany({});
  const history = await History.deleteMany({});
  if (user) {
    // await user.remove();
    res.json({ message: "User removed" });
  } else {
    res.status(404);
    throw new Error("deleted successfully not found");
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.isAdmin = req.body.isAdmin;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Send Reset Password
// @route   POST /api/v1/send_reset_password
// @access  PUBLIC

const sendResetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  // console.log(user, email);
  if (user) {
    const { _id } = user;
    const g = verifyToken();
    user.refresh = g;

    await user.save();

    const text = `<p>Your reset code code <br/> <h2>${g}</h2></p>`;
    const subject = "Reset Your Password";
    sendMail({ email: user.email, text, subject });
    res.json("Email sent!!");
  } else res.status(401).json({ status: "Error", message: "Email not valid" });
});
const resetPassword = asyncHandler(async (req, res) => {
  const { reset_token } = req.body;
  if (reset_token) {
    const user = await User.findOne(user.id);
    if (user) {
      res.status(201).json("Password Reset Successfully");
      //come back here

      // res.redirect("https://google.com");
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  }
});

function verifyToken() {
  return Math.floor(1000 + Math.random() * 9000);
}
const verifyEmail = asyncHandler(async (req, res) => {
  const { user } = req;

  if (user && user.isVerified !== "true") {
    const { _id } = user;
    const user_ = await User.findOne({ email: user.email });
    let g = verifyToken();
    if (user_) {
      user_.isVerified = g;
      console.log(user_);

      await user_.save();
    }

    const text = `<p>Your Verification Code is <h2>${g}</h2> </p>`;
    const subject = "Verify your account";
    sendMail({ email: user.email, text, subject });
    //come back here
    res.json(`email sent to ${user.email} successfully`);
  } else if (user.isVerified === "true")
    res.status(403).json("User already verify");
  else {
    res.status(403);
    throw new Error("No user Found");
  }
});

const verifyUser = asyncHandler(async (req, res) => {
  const { verify_token } = req.body;
  const { user } = req;
  // console.log(user);
  if (user && verify_token && user.isVerified === verify_token) {
    // const user = await User.findById(id).select("-password");
    user.isVerified = true;

    await user.save();
    //come back here
    res.json("User verified");
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

export {
  loginUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  deleteUser,
  getUserById,
  verifyUser,
  updateUser,
  verifyEmail,
  resetPassword,
  deleteAllUser,
  sendResetPassword,
};
