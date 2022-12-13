let model = require("./../models/userModel");
let Email = require("./../utils/email");
let JWT = require("jsonwebtoken");
let AsyncError = require("./../utils/catchAsync");

let sharp = require("sharp");
let multer = require("multer");

function generateToken(user) {
  return JWT.sign({ id: user._id, cpa: "Techkey" }, process.env.TOKENSECRETE, {
    expiresIn: process.env.TOKENDURATION,
  });
}
function generateCookie(res, token, req) {
  let options = {
    expires: new Date(Date.now() + process.env.COOKIEDURATION + 24 + 60 + 60),
    //secure: process.env.NODE_ENV == 'production' ? true : false,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    httpOnly: true,
  };
  res.cookie("JWT", token, options);
}

exports.getUsers = AsyncError(async function name(req, res, next) {
  let users = await model.find();
  res
    .status(200)
    .json({ status: "successs", results: users.length, data: users });
});

exports.addUser = AsyncError(async function (req, res) {
  try {
    let newDoc = await model.create(req.body);

    let id = String(newDoc._id);
    // new Email(newDoc, " ").sendEmailVerification(newDoc.verificationNumber);
    // res.status(200).json({ status: "success", data: newDoc });
    res
      .status(200)
      .json({ status: "success", message: "Successfully Registered", id });
  } catch (err) {
    res.json({ status: "failed", message: err.message });
  }
});

exports.getOneUser = AsyncError(async function name(req, res, next) {
  let user = await model.findById(req.params.id);
  res.status(200).json({ status: "successs", user });
});

exports.deletUser = AsyncError(async function (req, res, next) {
  let deleted = await model.findOneAndDelete({ _id: req.params.id });
  res.status(204).json({ status: "success", data: null });
});

exports.updateUser = AsyncError(async function (req, res, next) {
  let updated = await model.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true,
    runvalidators: true,
  });
  res.status(200).json({ status: "success", data: updated });
});
exports.updateProfile = AsyncError(async function (req, res, next) {
  let updated = await model.findOneAndUpdate({ _id: req.user._id }, req.body, {
    new: true,
    runvalidators: true,
  });
  if (updated) {
    res
      .status(200)
      .json({ status: "success", message: "update received", data: updated });
  } else {
    res.status(200).json({ status: "failed", message: "update failed" });
  }
});

exports.getme = AsyncError(async function (req, res, next) {
  let doc = await model.find({ _id: req.user.id });
  res.status(200).json({
    status: "success",
    data: doc,
  });
});
exports.resendCode = AsyncError(async function (req, res, next) {
  let user = await model.findById(req.body.url);
  if (!user) {
    res.status(200).json({
      status: "failed",
      message: "User not Found",
    });
  } else {
    try {
      // new Email(user, " ").sendEmailVerification(user.verificationNumber);

      res.status(200).json({
        status: "success",
        message: "Verification Code Resent",
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        status: "failed",
      });
      // return next(
      //   new appError("There was an error sending the email try again later", 500)
      // );
    }
  }
});
exports.usercontact = AsyncError(async function (req, res, next) {
  let name = req.body.name;
  let email = req.body.email;
  let subject = req.body.subject;
  let message = req.body.message;

  try {
    // new Email(" ", " ").sendContactForm(name, email, subject, message);
  } catch (err) {
    console.log("TC-1245", err);
    res.status(200).json({ status: "Failed" });
  }

  // res.status(200).json({ status: "success", data: newDoc });
  res.status(200).json({ status: "success" });
});
exports.verifyMe = AsyncError(async function (req, res, next) {
  let user = await model.findById(req.body.id);

  if (user) {
    let userVerificationNumber = user.verificationNumber;

    if (userVerificationNumber == req.body.code) {
      user.isVerified = true;
      await user.save({ validateBeforeSave: false });

      let token = generateToken(user);
      generateCookie(res, token, req);
      res.locals.user = user;

      try {
        // new Email(user, " ").sendVerifiedEmail();
      } catch (err) {
        console.log("TC-09121", err);
      }

      res.status(200).json({
        status: "success",
        message: "User Verified",
        token,
        user: {
          name: user.name,
          phone: user.phone,
          role: user.role,
          photo: user.photo,
          email: user.email,
        },
      });
    } else {
      res.status(200).json({
        status: "failed",
        message: "invalid Verification Code",
      });
    }
  } else {
    res.status(200).json({
      status: "failed",
      message: "User not registed",
    });
  }
});

let multerStorage = multer.memoryStorage();
let multerfilter = function (res, file, cb) {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new appError("File uploaded is not an image", 500));
  }
};
// let upload = multer({ dest: 'public/img/' });
let upload = multer({ storage: multerStorage, fileFilter: multerfilter });

exports.uploadimage = upload.single("profilePhotoUpload");

exports.resizePhoto = function (req, res, next) {
  if (!req.file) {
    return next();
  } else {
    try {
      req.file.filename = `${req.user.id}-${Date.now()}.jpeg`;
      sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`public/img/users/${req.file.filename}`);
    } catch (err) {
      console.log("TC-214", err);
    }
    next();
  }
};

exports.uploadImage = AsyncError(async function (req, res, next) {
  try {
    let updated = await model.findOneAndUpdate(
      { _id: req.user.id },
      { photo: req.file.filename },
      {
        new: true,
        runvalidators: true,
      }
    );
    res.status(200).json({ status: "success" });
  } catch (error) {
    res.status(200).json({ status: "Failed" });
  }
});
